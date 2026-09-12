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

function createD1(rows = []) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async run() { calls.push({ sql, values }); return { success: true }; },
            async all() { calls.push({ sql, values }); return { results: rows }; },
            async first() { calls.push({ sql, values }); return { total: rows.length }; },
          };
        },
      };
    },
  };
}

function env(overrides = {}) {
  return {
    KV: createKv(),
    PASSWORD: "secret",
    ...overrides,
  };
}

test("returns a clear error when Pages variables are missing", async () => {
  const response = await worker.fetch(new Request("https://example.test/"), { KV: createKv() });
  assert.equal(response.status, 503);
  assert.match(await response.text(), /PASSWORD/);
});

test("does not expose a default preview endpoint", async () => {
  const runtime = env({ KV: createKv({ subs: {}, apis: {} }) });
  const loginPage = await worker.fetch(new Request("https://example.test/"), runtime);
  assert.equal(loginPage.status, 200);
  assert.match(await loginPage.text(), /管理员密码/);

  const hash = await sha256Hex("secret");
  const response = await worker.fetch(new Request("https://example.test/api/preview", {
    headers: { Cookie: `auth=${hash}` },
  }), runtime);
  assert.equal(response.status, 404);
});

test("keeps camouflage disabled by default and supports a private admin path", async () => {
  const runtime = env({ KV: createKv({ subs: {}, apis: {} }) });
  const defaultHome = await worker.fetch(new Request("https://example.test/"), runtime);
  assert.equal(defaultHome.status, 200);
  assert.match(await defaultHome.text(), /管理员密码/);

  const hash = await sha256Hex("secret");
  const settingsResponse = await worker.fetch(new Request("https://example.test/api/settings", {
    method: "POST",
    headers: { Cookie: `auth=${hash}`, "content-type": "application/json" },
    body: JSON.stringify({ enabled: true, accessPath: "private-entry", redirectUrl: "https://example.com/landing" }),
  }), runtime);
  assert.equal(settingsResponse.status, 200);

  const redirected = await worker.fetch(new Request("https://example.test/"), runtime);
  assert.equal(redirected.status, 303);
  assert.equal(redirected.headers.get("location"), "https://example.com/landing");

  const privateEntry = await worker.fetch(new Request("https://example.test/private-entry", {
  }), runtime);
  assert.equal(privateEntry.status, 200);
  assert.match(await privateEntry.text(), /action="\/private-entry"/);

  const loginResponse = await worker.fetch(new Request("https://example.test/private-entry", {
    method: "POST",
    body: new URLSearchParams({ password: "secret" }),
  }), runtime);
  assert.equal(loginResponse.status, 303);
  assert.equal(loginResponse.headers.get("location"), "https://example.test/private-entry");

  const authenticatedEntry = await worker.fetch(new Request("https://example.test/private-entry", {
    headers: { Cookie: `auth=${hash}` },
  }), runtime);
  assert.equal(authenticatedEntry.status, 200);
  assert.match(await authenticatedEntry.text(), /data-admin-base-path="\/private-entry"/);

  const standardAdmin = await worker.fetch(new Request("https://example.test/admin", {
    headers: { Cookie: `auth=${hash}` },
  }), runtime);
  assert.equal(standardAdmin.status, 303);
  assert.equal(standardAdmin.headers.get("location"), "https://example.com/landing");
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
    assert.match(html, /href="\/admin\.css\?v=[a-z0-9]+"/);
    assert.match(html, /src="\/admin-client\.js\?v=[a-z0-9]+"/);
    if (page === "manage") {
      assert.match(html, /id="subsSection"/);
      assert.match(html, /id="apisSection"/);
      assert.match(html, /id="sourceStatusSection"/);
      assert.match(html, /id="preferredDomainsSection"/);
      assert.match(html, /id="newPreferredDomain"/);
      assert.match(html, /data-nav-page="manage"/);
      assert.ok(html.indexOf('id="sourceStatusSection"') < html.indexOf('id="subsSection"'));
      assert.ok(html.indexOf('id="sourceStatusSection"') < html.indexOf('id="preferredDomainsSection"'));
    }
    if (page === "overview") assert.doesNotMatch(html, /id="sourceStatusSection"/);
    if (page === "customApis") {
      assert.match(html, /id="customApiSection"/);
      assert.match(html, /data-nav-page="customApis"/);
      assert.match(adminClientScript, /page === 'customApis'/);
      assert.match(adminClientScript, /loadCustomApis\(true\)/);
    }
  }
});

test("keeps the generated admin script valid JavaScript", () => {
  assert.doesNotThrow(() => new vm.Script(adminClientScript));
  assert.match(adminClientScript, /preview-api-data/);
  assert.match(adminClientScript, /formatPreviewNodeLine/);
  assert.match(adminClientScript, /entry\.remark \? entry\.remark \+ ' \(\/' \+ path/);
  const overviewStart = adminClientScript.indexOf("} else if (page === 'overview') {");
  const customApiLoad = adminClientScript.indexOf("void loadCustomApis()", overviewStart);
  const nodeLoad = adminClientScript.indexOf("return fetchNodes();", customApiLoad);
  assert.ok(overviewStart >= 0 && customApiLoad > overviewStart && nodeLoad > customApiLoad);
  assert.equal(adminClientScript.indexOf("void fetchNodes();", overviewStart), -1);
  assert.doesNotMatch(adminClientScript, /updates\.api\s*=/);
});

test("serves admin frontend assets", async () => {
  const css = await worker.fetch(new Request("https://example.test/admin.css?v=cache-test"));
  assert.equal(css.status, 200);
  assert.match(css.headers.get("content-type"), /text\/css/);
  assert.equal(css.headers.get("cache-control"), "public, max-age=31536000, immutable");
  const cssText = await css.text();
  assert.match(cssText, /--accent-primary/);
  assert.match(cssText, /@media screen and \(max-width: 768px\)/);

  const script = await worker.fetch(new Request("https://example.test/admin-client.js?v=cache-test"));
  assert.equal(script.status, 200);
  assert.match(script.headers.get("content-type"), /javascript/);
  assert.equal(script.headers.get("cache-control"), "public, max-age=31536000, immutable");
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
      sourceMode: "selected",
      sources: [{ type: "subs", key: "sub.example.com" }],
    },
  });

  const publicResponse = await worker.fetch(new Request("https://example.test/my-api"), runtime);
  assert.equal(publicResponse.status, 500);
  assert.match(await publicResponse.text(), /KV 未配置 subs/);
});

test("keeps multiple custom API paths independently usable", async () => {
  const values = {
    subs: {
      "one.example": { remark: "one" },
      "two.example": { remark: "two" },
    },
    apis: { "https://api.example/source": { remark: "api" } },
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
      auto: { enabled: true, remark: "自动选择", sources: [] },
    }),
  }), runtime);
  assert.equal(saveResponse.status, 200);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes("/sub?")) {
      const host = String(url).startsWith("https://two.example/") ? "5.6.7.8:443" : "1.2.3.4:443";
      const remark = String(url).startsWith("https://two.example/") ? "two" : "one";
      return new Response(btoa(`vless://00000000-0000-4000-8000-000000000000@${host}?security=tls&sni=example.com#${remark}`), { status: 200 });
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
    const autoResponse = await worker.fetch(new Request("https://example.test/auto"), runtime);
    assert.equal(autoResponse.status, 200);
    const autoText = await autoResponse.text();
    assert.match(autoText, /1\.2\.3\.4:443#one/);
    assert.match(autoText, /trojan:\/\/example\.com:443#api/);
    assert.match(autoText, /5\.6\.7\.8:443#two/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reads source status without contacting upstream sources", async () => {
  const values = {
    subs: { "status-read-only.example": { remark: "只读状态测试" } },
    apis: {},
    custom_apis: {},
  };
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const originalFetch = globalThis.fetch;
  let upstreamCalls = 0;
  globalThis.fetch = async () => {
    upstreamCalls += 1;
    throw new Error("GET 不应访问上游");
  };
  try {
    const response = await worker.fetch(new Request("https://example.test/api/source-status", {
      headers: { Cookie: `auth=${hash}` },
    }), runtime);
    assert.equal(response.status, 200);
    const status = await response.json();
    assert.equal(status.subs["status-read-only.example"].state, "idle");
    assert.equal(status.subs["status-read-only.example"].lastAttemptAt, null);
    assert.equal(upstreamCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("manually checks and reports source status", async () => {
  const values = {
    subs: { "e.ye.gs": { remark: "e.ye.gs" } },
    apis: {},
    custom_apis: {},
  };
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(btoa(
    "vless://00000000-0000-4000-8000-000000000000@1.2.3.4:443?security=tls&sni=example.com#ok",
  ), { status: 200 });
  try {
    const statusResponse = await worker.fetch(new Request("https://example.test/api/source-status/check", {
      method: "POST",
      headers: { Cookie: `auth=${hash}`, "content-type": "application/json" },
      body: JSON.stringify({ scope: "all" }),
    }), runtime);
    assert.equal(statusResponse.status, 200);
    const status = await statusResponse.json();
    assert.equal(status.subs["e.ye.gs"].state, "success");
    assert.equal(status.subs["e.ye.gs"].nodeCount, 1);
    assert.equal(status.subs["e.ye.gs"].statusCode, 200);
    assert.equal(typeof status.subs["e.ye.gs"].durationMs, "number");
    assert.match(status.subs["e.ye.gs"].lastAttemptAt, /^20/);
    assert.equal(values.source_status.subs["e.ye.gs"].lastSuccessNodeCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("checks only sources used by enabled custom APIs by default", async () => {
  const values = {
    subs: {
      "used.example": { remark: "使用中" },
      "unused.example": { remark: "未使用" },
    },
    apis: {},
    custom_apis: {
      demo: {
        enabled: true,
        sourceMode: "selected",
        sources: [{ type: "subs", key: "used.example" }],
      },
    },
  };
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (resource) => {
    requests.push(String(resource));
    return new Response(btoa(
      "vless://00000000-0000-4000-8000-000000000000@1.2.3.4:443?security=tls&sni=example.com#ok",
    ), { status: 200 });
  };
  try {
    const response = await worker.fetch(new Request("https://example.test/api/source-status/check", {
      method: "POST",
      headers: { Cookie: `auth=${hash}`, "content-type": "application/json" },
      body: JSON.stringify({ scope: "used" }),
    }), runtime);
    assert.equal(response.status, 200);
    assert.equal(requests.length, 1);
    assert.match(requests[0], /used\.example/);
    const status = await response.json();
    assert.equal(status.subs["used.example"].state, "success");
    assert.equal(status.subs["unused.example"].state, "idle");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("classifies HTTP failures and preserves the last successful result", async () => {
  const sourceKey = "status-history.example";
  const values = { subs: { [sourceKey]: { remark: "历史状态" } }, apis: {}, custom_apis: {} };
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const originalFetch = globalThis.fetch;
  let fail = false;
  globalThis.fetch = async () => {
    if (fail) return new Response("error", { status: 503 });
    return new Response(btoa("vless://00000000-0000-4000-8000-000000000000@1.2.3.4:443?security=tls&sni=example.com#ok"), { status: 200 });
  };
  const request = () => worker.fetch(new Request("https://example.test/api/source-status/check", {
    method: "POST",
    headers: { Cookie: `auth=${hash}`, "content-type": "application/json" },
    body: JSON.stringify({ scope: "all" }),
  }), runtime);
  try {
    const first = await request();
    assert.equal((await first.json()).subs[sourceKey].state, "success");
    fail = true;
    const second = await request();
    const status = (await second.json()).subs[sourceKey];
    assert.equal(status.state, "http-error");
    assert.equal(status.statusCode, 503);
    assert.equal(status.lastSuccessNodeCount, 1);
    assert.match(status.lastSuccessAt, /^20/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("previews a source with nodes, raw content, and filtering statistics", async () => {
  const sourceKey = "https://preview-source.example/data";
  const values = { apis: { [sourceKey]: { remark: "预览源" } }, subs: {}, blacklist: ["blocked"], custom_apis: {} };
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    "1.2.3.4:443#ok\n5.6.7.8:443#blocked",
    { status: 200 },
  );
  try {
    const response = await worker.fetch(new Request("https://example.test/api/source-raw", {
      method: "POST",
      headers: { Cookie: `auth=${hash}`, "content-type": "application/json" },
      body: JSON.stringify({ type: "apis", key: sourceKey }),
    }), runtime);
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.deepEqual(result.nodes, ["1.2.3.4:443#ok"]);
    assert.deepEqual(result.unfilteredNodes, ["1.2.3.4:443#ok", "5.6.7.8:443#blocked"]);
    assert.equal(result.status.filterStats.inputCount, 2);
    assert.equal(result.status.filterStats.blacklistedCount, 1);
    assert.equal(result.status.filterStats.outputCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("previews disabled custom APIs and rate-limits repeated checks", async () => {
  const sourceKey = "https://custom-preview.example/data";
  const values = {
    apis: { [sourceKey]: { remark: "API 源" } },
    subs: {},
    custom_apis: { disabled_preview: { enabled: false, sourceMode: "selected", sources: [{ type: "apis", key: sourceKey }] } },
  };
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("9.9.9.9:443#custom", { status: 200 });
  const request = () => worker.fetch(new Request("https://example.test/api/custom-api-preview", {
    method: "POST",
    headers: { Cookie: `auth=${hash}`, "content-type": "application/json" },
    body: JSON.stringify({ path: "disabled_preview" }),
  }), runtime);
  try {
    const first = await request();
    assert.equal(first.status, 200);
    const result = await first.json();
    assert.deepEqual(result.nodes, ["9.9.9.9:443#custom"]);
    assert.deepEqual(result.unfilteredNodes, ["9.9.9.9:443#custom"]);
    assert.deepEqual(result.rawSources, [{ type: "apis", key: sourceKey, remark: "API 源", nodes: ["9.9.9.9:443#custom"], filterStats: { inputCount: 1, outputCount: 1, invalidCount: 0, blacklistedCount: 0, duplicateCount: 0 } }]);
    assert.deepEqual(result.sourceMeta, [{ type: "apis", key: sourceKey, remark: "API 源" }]);
    assert.deepEqual(result.nodeSources, [{ value: "9.9.9.9:443#custom", type: "apis", key: sourceKey, remark: "API 源" }]);
    const second = await request();
    assert.equal(second.status, 429);
    assert.equal((await second.json()).code, "RATE_LIMITED");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("persists and reads custom API detection history through D1", async () => {
  const sourceKey = "https://d1-history.example/data";
  const path = "d1_history_preview";
  const values = {
    apis: { [sourceKey]: { remark: "D1 测试源" } },
    subs: {},
    custom_apis: { [path]: { enabled: true, sourceMode: "selected", sources: [{ type: "apis", key: sourceKey }] } },
  };
  const db = createD1();
  const runtime = env({ KV: createKv(values), DB: db });
  const hash = await sha256Hex("secret");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("7.7.7.7:443#history", { status: 200 });
  try {
    const preview = await worker.fetch(new Request("https://example.test/api/custom-api-preview", {
      method: "POST",
      headers: { Cookie: `auth=${hash}`, "content-type": "application/json" },
      body: JSON.stringify({ path }),
    }), runtime);
    assert.equal(preview.status, 200);
    const insert = db.calls.find((call) => /INSERT INTO detection_history/i.test(call.sql));
    assert.ok(insert);
    assert.equal(insert.values[2], 1);
    assert.equal(insert.values[3], 1);

    const historyDb = createD1([{
      id: 9,
      api_path: path,
      detected_at: 1700000000000,
      raw_count: 2,
      kept_count: 1,
      filtered_count: 1,
      error_count: 0,
      nodes_json: '["1.1.1.1:443#ok"]',
      raw_nodes_json: '["1.1.1.1:443#ok","2.2.2.2:443#blocked"]',
      raw_sources_json: '[]',
      node_sources_json: '[]',
      source_meta_json: '[]',
    }]);
    const response = await worker.fetch(new Request(`https://example.test/api/detection-history?path=${path}&limit=1`, {
      headers: { Cookie: `auth=${hash}` },
    }), env({ KV: createKv(values), DB: historyDb }));
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.available, true);
    assert.equal(result.total, 1);
    assert.deepEqual(result.items[0].nodes, ["1.1.1.1:443#ok"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("limits concurrent custom API previews independently", async () => {
  const sourceKey = "https://custom-concurrency.example/data";
  const paths = ["custom_parallel_a", "custom_parallel_b", "custom_parallel_c"];
  const values = {
    apis: { [sourceKey]: { remark: "并发测试源" } },
    subs: {},
    custom_apis: Object.fromEntries(paths.map((path) => [path, {
      enabled: true,
      sourceMode: "selected",
      sources: [{ type: "apis", key: sourceKey }],
    }])),
  };
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
    return new Response("8.8.8.8:443#parallel", { status: 200 });
  };
  const request = (path) => worker.fetch(new Request("https://example.test/api/custom-api-preview", {
    method: "POST",
    headers: { Cookie: `auth=${hash}`, "content-type": "application/json" },
    body: JSON.stringify({ path }),
  }), runtime);
  try {
    const responses = await Promise.all(paths.map(request));
    assert.equal(responses.filter((response) => response.status === 200).length, 2);
    assert.equal(responses.filter((response) => response.status === 429).length, 1);
    const busy = responses.find((response) => response.status === 429);
    assert.equal((await busy.json()).code, "BUSY");
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
  assert.deepEqual(await defaultResponse.json(), []);

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

test("reads and updates remark filter rules", async () => {
  const values = {};
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const authHeaders = { Cookie: `auth=${hash}` };

  const defaultResponse = await worker.fetch(new Request("https://example.test/api/filter-rules", {
    headers: authHeaders,
  }), runtime);
  assert.equal(defaultResponse.status, 200);
  assert.deepEqual(await defaultResponse.json(), []);

  const saveResponse = await worker.fetch(new Request("https://example.test/api/filter-rules", {
    method: "POST",
    headers: { ...authHeaders, "content-type": "application/json" },
    body: JSON.stringify([" -VIP ", "-VIP", "🐲"]),
  }), runtime);
  assert.equal(saveResponse.status, 200);

  const savedResponse = await worker.fetch(new Request("https://example.test/api/filter-rules", {
    headers: authHeaders,
  }), runtime);
  assert.deepEqual(await savedResponse.json(), ["-VIP", "🐲"]);
});

test("manages preferred domains and resolves A, AAAA, and CNAME records", async () => {
  const values = {};
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (resource) => {
    const url = new URL(String(resource));
    const type = url.searchParams.get("type");
    const payloads = {
      A: { Status: 0, Answer: [{ type: 1, data: "1.2.3.4" }] },
      AAAA: { Status: 0, Answer: [{ type: 28, data: "2001:db8::1" }] },
      CNAME: { Status: 0, Answer: [{ type: 5, data: "edge.example.net." }] },
    };
    return new Response(JSON.stringify(payloads[type]), { status: 200, headers: { "content-type": "application/json" } });
  };
  const headers = { Cookie: `auth=${hash}`, "content-type": "application/json" };
  try {
    const empty = await worker.fetch(new Request("https://example.test/api/preferred-domains", { headers }), runtime);
    assert.deepEqual(await empty.json(), {});

    const added = await worker.fetch(new Request("https://example.test/api/preferred-domains", {
      method: "POST", headers, body: JSON.stringify({ domain: " Example.COM. " }),
    }), runtime);
    assert.equal(added.status, 200);
    const entry = await added.json();
    assert.equal(entry.domain, "example.com");
    assert.deepEqual(entry.records, {
      A: ["1.2.3.4"],
      AAAA: ["2001:db8::1"],
      CNAME: ["edge.example.net."],
    });
    assert.deepEqual(values.preferred_domains["example.com"].records, entry.records);

    const raw = await worker.fetch(new Request("https://example.test/api/source-raw", {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "domains", key: "example.com" }),
    }), runtime);
    assert.equal(raw.status, 200);
    const rawResult = await raw.json();
    assert.deepEqual(rawResult.records, {
      A: ["1.2.3.4"],
      AAAA: ["2001:db8::1"],
      CNAME: ["edge.example.net"],
    });
    assert.equal(rawResult.rawSources[0].records.CNAME[0], "edge.example.net");

    const deleted = await worker.fetch(new Request("https://example.test/api/preferred-domains?domain=example.com", {
      method: "DELETE", headers,
    }), runtime);
    assert.equal(deleted.status, 200);
    assert.deepEqual(values.preferred_domains, {});
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects invalid preferred domains", async () => {
  const hash = await sha256Hex("secret");
  const response = await worker.fetch(new Request("https://example.test/api/preferred-domains", {
    method: "POST",
    headers: { Cookie: `auth=${hash}`, "content-type": "application/json" },
    body: JSON.stringify({ domain: "https://example.com/path" }),
  }), env());
  assert.equal(response.status, 400);
  assert.match(await response.text(), /域名格式无效/);
});

test("uses preferred domains as selectable live sources with port 443", async () => {
  const values = {
    subs: {},
    apis: {},
    preferred_domains: { "edge.example.com": { domain: "edge.example.com", remark: "边缘域名" } },
    custom_apis: { domain_api: { enabled: true, sourceMode: "selected", sources: [{ type: "domains", key: "edge.example.com" }] } },
  };
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (resource) => {
    const url = new URL(String(resource));
    if (url.hostname !== "cloudflare-dns.com") return originalFetch(resource);
    requests.push(url.searchParams.get("type"));
    const type = url.searchParams.get("type");
    const answers = type === "A"
      ? [{ type: 1, data: "1.2.3.4" }]
      : type === "AAAA"
        ? [{ type: 28, data: "2001:db8::1" }]
        : [{ type: 5, data: "target.example.net." }];
    return new Response(JSON.stringify({ Status: 0, Answer: answers }), { status: 200 });
  };
  try {
    const response = await worker.fetch(new Request("https://example.test/domain_api", { headers: { Cookie: `auth=${hash}` } }), runtime);
    assert.equal(response.status, 200);
    assert.deepEqual((await response.text()).split("\n"), ["1.2.3.4:443", "[2001:db8::1]:443", "target.example.net:443"]);
    assert.deepEqual(requests.sort(), ["A", "AAAA", "CNAME"]);

    requests.length = 0;
    const statusResponse = await worker.fetch(new Request("https://example.test/api/source-status/check", {
      method: "POST",
      headers: { Cookie: `auth=${hash}`, "content-type": "application/json" },
      body: JSON.stringify({ scope: "selected", sources: [{ type: "domains", key: "edge.example.com" }] }),
    }), runtime);
    assert.equal(statusResponse.status, 200);
    const status = await statusResponse.json();
    assert.deepEqual(status.domains["edge.example.com"].dnsRecordCounts, { A: 1, AAAA: 1, CNAME: 1 });
    assert.deepEqual(status.domains["edge.example.com"].dnsRecords, {
      A: ["1.2.3.4"],
      AAAA: ["2001:db8::1"],
      CNAME: ["target.example.net"],
    });
    assert.deepEqual(requests.sort(), ["A", "AAAA", "CNAME"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
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
  const response = await worker.fetch(new Request("https://example.test/api/source-status", {
    method: "PUT",
    headers: { Cookie: `auth=${hash}` },
  }), env());
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET");

  const checkResponse = await worker.fetch(new Request("https://example.test/api/source-status/check", {
    method: "GET",
    headers: { Cookie: `auth=${hash}` },
  }), env());
  assert.equal(checkResponse.status, 405);
  assert.equal(checkResponse.headers.get("allow"), "POST");
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
