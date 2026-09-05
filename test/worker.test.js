import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import worker from "../src/index.js";
import { adminHTML } from "../src/admin-page.js";
import { adminClientScript } from "../src/admin-client.js";
import { sha256Hex } from "../src/auth.js";

function createKv(values = {}) {
  return {
    async get(key) { return values[key] ?? null; },
    async put(key, value) { values[key] = JSON.parse(value); },
  };
}

function env(overrides = {}) {
  return {
    KV: createKv(),
    UUID: "test-sub",
    PASSWORD: "secret",
    ...overrides,
  };
}

test("returns a clear error when Pages variables are missing", async () => {
  const response = await worker.fetch(new Request("https://example.test/"), { KV: createKv() });
  assert.equal(response.status, 503);
  assert.match(await response.text(), /UUID/);
});

test("serves the login page and authenticated UUID endpoint", async () => {
  const runtime = env();
  const loginPage = await worker.fetch(new Request("https://example.test/"), runtime);
  assert.equal(loginPage.status, 200);
  assert.match(await loginPage.text(), /管理员密码/);

  const hash = await sha256Hex("secret");
  const response = await worker.fetch(new Request("https://example.test/api/uuid", {
    headers: { Cookie: `auth=${hash}` },
  }), runtime);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { uuid: "test-sub" });
});

test("serves separate responsive admin pages", async () => {
  const hash = await sha256Hex("secret");
  for (const [path, page] of [["/admin", "overview"], ["/admin/manage", "manage"], ["/admin/custom-apis", "customApis"], ["/admin/settings", "settings"], ["/admin/subs", "subs"], ["/admin/apis", "apis"]]) {
    const response = await worker.fetch(new Request(`https://example.test${path}`, {
      headers: { Cookie: `auth=${hash}` },
    }), env());
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, new RegExp(`data-page="${page}"`));
    assert.match(html, /class="admin-nav"/);
    assert.match(html, /href="\/admin\.css"/);
    assert.match(html, /src="\/admin-client\.js"/);
    if (page === "manage") {
      assert.match(html, /id="subsSection"/);
      assert.match(html, /id="apisSection"/);
      assert.match(html, /data-nav-page="manage"/);
    }
    if (page === "customApis") {
      assert.match(html, /id="customApiSection"/);
      assert.match(html, /data-nav-page="customApis"/);
      assert.match(adminClientScript, /page === 'customApis'\) loadCustomApis\(true\)/);
    }
  }
});

test("keeps the generated admin script valid JavaScript", () => {
  assert.doesNotThrow(() => new vm.Script(adminClientScript));
});

test("serves admin frontend assets", async () => {
  const css = await worker.fetch(new Request("https://example.test/admin.css"));
  assert.equal(css.status, 200);
  assert.match(css.headers.get("content-type"), /text\/css/);
  const cssText = await css.text();
  assert.match(cssText, /--accent-primary/);
  assert.match(cssText, /@media screen and \(max-width: 768px\)/);

  const script = await worker.fetch(new Request("https://example.test/admin-client.js"));
  assert.equal(script.status, 200);
  assert.match(script.headers.get("content-type"), /javascript/);
  assert.match(await script.text(), /DOMContentLoaded/);
});

test("creates and serves custom API access paths", async () => {
  const runtime = env();
  const hash = await sha256Hex("secret");
  const headers = { Cookie: `auth=${hash}`, "content-type": "application/json" };
  const saveResponse = await worker.fetch(new Request("https://example.test/api/custom-apis", {
    method: "POST",
    headers,
    body: JSON.stringify({ "/my-api": {
      enabled: true,
      remark: "测试 API",
      sources: [{ type: "subs", key: "sub.example.com" }],
    } }),
  }), runtime);
  assert.equal(saveResponse.status, 200);

  const configResponse = await worker.fetch(new Request("https://example.test/api/custom-apis", {
    headers: { Cookie: `auth=${hash}` },
  }), runtime);
  assert.deepEqual(await configResponse.json(), {
    "my-api": {
      enabled: true,
      remark: "测试 API",
      sources: [{ type: "subs", key: "sub.example.com" }],
    },
  });

  const publicResponse = await worker.fetch(new Request("https://example.test/my-api"), runtime);
  assert.equal(publicResponse.status, 500);
  assert.match(await publicResponse.text(), /KV 未配置 subs/);
});

test("keeps multiple custom API paths independently usable", async () => {
  const values = {
    subs: { "one.example": { enabled: true, remark: "one" } },
    apis: { "https://api.example/source": { enabled: true, remark: "api" } },
    custom_apis: {},
  };
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const authHeaders = { Cookie: `auth=${hash}` };
  const saveResponse = await worker.fetch(new Request("https://example.test/api/custom-apis", {
    method: "POST",
    headers: { ...authHeaders, "content-type": "application/json" },
    body: JSON.stringify({
      first: { enabled: true, remark: "订阅 API", sources: [{ type: "subs", key: "one.example" }] },
      second: { enabled: true, remark: "普通 API", sources: [{ type: "apis", key: "https://api.example/source" }] },
    }),
  }), runtime);
  assert.equal(saveResponse.status, 200);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes("/sub?")) {
      return new Response(btoa("vless://00000000-0000-4000-8000-000000000000@1.2.3.4:443?security=tls&sni=example.com#one"), { status: 200 });
    }
    return new Response("trojan://example.com:443#api", { status: 200 });
  };
  try {
    const firstResponse = await worker.fetch(new Request("https://example.test/first"), runtime);
    const secondResponse = await worker.fetch(new Request("https://example.test/second"), runtime);
    assert.equal(firstResponse.status, 200);
    assert.equal(secondResponse.status, 200);
    assert.match(await firstResponse.text(), /1\.2\.3\.4:443#one/);
    assert.match(await secondResponse.text(), /trojan:\/\/example\.com:443#api/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reads and updates blacklist configuration", async () => {
  const values = {};
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const authHeaders = { Cookie: `auth=${hash}` };

  const defaultResponse = await worker.fetch(new Request("https://example.test/api/blacklist", {
    headers: authHeaders,
  }), runtime);
  assert.equal(defaultResponse.status, 200);
  assert.ok((await defaultResponse.json()).includes("官网"));

  const saveResponse = await worker.fetch(new Request("https://example.test/api/blacklist", {
    method: "POST",
    headers: { ...authHeaders, "content-type": "application/json" },
    body: JSON.stringify([" foo ", "FOO", "bar"]),
  }), runtime);
  assert.equal(saveResponse.status, 200);

  const savedResponse = await worker.fetch(new Request("https://example.test/api/blacklist", {
    headers: authHeaders,
  }), runtime);
  assert.deepEqual(await savedResponse.json(), ["foo", "bar"]);
});

test("rejects invalid blacklist payloads", async () => {
  const runtime = env();
  const hash = await sha256Hex("secret");
  const response = await worker.fetch(new Request("https://example.test/api/blacklist", {
    method: "POST",
    headers: { Cookie: `auth=${hash}`, "content-type": "application/json" },
    body: JSON.stringify({ bad: true }),
  }), runtime);
  assert.equal(response.status, 400);
  assert.match(await response.text(), /黑名单必须是字符串数组/);
});

test("rejects unsupported methods", async () => {
  const hash = await sha256Hex("secret");
  const response = await worker.fetch(new Request("https://example.test/api/uuid", {
    method: "POST",
    headers: { Cookie: `auth=${hash}` },
  }), env());
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET");
});

test("logs out authenticated sessions", async () => {
  const hash = await sha256Hex("secret");
  const response = await worker.fetch(new Request("https://example.test/logout", {
    method: "POST",
    headers: { Cookie: `auth=${hash}` },
  }), env());
  assert.equal(response.status, 303);
  assert.match(response.headers.get("set-cookie"), /auth=;.*Max-Age=0/);
});
