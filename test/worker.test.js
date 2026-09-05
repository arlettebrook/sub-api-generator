import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";
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
  for (const [path, page] of [["/admin", "overview"], ["/admin/manage", "manage"], ["/admin/settings", "settings"], ["/admin/subs", "subs"], ["/admin/apis", "apis"]]) {
    const response = await worker.fetch(new Request(`https://example.test${path}`, {
      headers: { Cookie: `auth=${hash}` },
    }), env());
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, new RegExp(`data-page="${page}"`));
    assert.match(html, /class="admin-nav"/);
    assert.match(html, /@media screen and \(max-width: 768px\)/);
    assert.match(html, /body > \.admin-nav \{\s*position: fixed !important;/);
    if (page === "manage") {
      assert.match(html, /id="subsSection"/);
      assert.match(html, /id="apisSection"/);
      assert.match(html, /data-nav-page="manage"/);
    }
  }
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
