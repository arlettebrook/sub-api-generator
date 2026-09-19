import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import worker from "../src/index.js";
import { resolvePreferredDomainRecords } from "../src/subscriptions.js";
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
      assert.match(html, /id="preferredManualSection"/);
      assert.match(html, /id="preferredManualText"/);
      assert.match(html, /id="preferredManualAppendButton"/);
      assert.match(html, /id="preferredManualOverwriteButton"/);
      assert.match(html, /id="preferredManualSortButton"/);
      assert.match(html, /id="preferredManualCopyButton"/);
      assert.match(html, /id="preferredManualClearButton"/);
      assert.match(html, /id="preferredManualUndoButton"/);
      assert.match(html, /data-nav-page="manage"/);
      assert.ok(html.indexOf('id="sourceStatusSection"') < html.indexOf('id="subsSection"'));
      assert.ok(html.indexOf('id="sourceStatusSection"') < html.indexOf('id="preferredDomainsSection"'));
      assert.ok(html.indexOf('id="preferredManualSection"') < html.indexOf('id="preferredDomainsSection"'));
    }
    if (page === "overview") assert.doesNotMatch(html, /id="sourceStatusSection"/);
    if (page === "overview") assert.doesNotMatch(html, /id="preferredManualSection"/);
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
      sources: [{ type: "subs", key: "sub.example.com" }, { type: "manual", key: "任意值" }],
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
      // 手动优选是全局唯一数据源，key 统一归一为 manual。
      sources: [{ type: "subs", key: "sub.example.com" }, { type: "manual", key: "manual" }],
    },
  });

  const publicResponse = await worker.fetch(new Request("https://example.test/my-api"), runtime);
  assert.equal(publicResponse.status, 500);
  assert.match(await publicResponse.text(), /KV 未配置 subs/);

  const invalidSource = await worker.fetch(new Request("https://example.test/api/custom-apis", {
    method: "POST",
    headers,
    body: JSON.stringify({ "/bad-api": { enabled: true, sources: [{ type: "unknown", key: "x" }] } }),
  }), runtime);
  assert.equal(invalidSource.status, 400);
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

test("keeps source enabled state when loading the admin configuration", () => {
  assert.equal((adminClientScript.match(/typeof data\[key\]\.enabled === 'boolean'/g) || []).length, 2);
});

test("renaming configured sources keeps custom API selections in sync", async () => {
  const values = {
    subs: { "old.example": { remark: "旧订阅", enabled: false } },
    apis: { "https://old-api.example/data": { remark: "旧 API" } },
    preferred_domains: { "old-domain.example": { domain: "old-domain.example", remark: "旧域名", records: { A: ["1.2.3.4"], AAAA: [], CNAME: [] } } },
    custom_apis: {
      selected: {
        enabled: true,
        remark: "同步测试",
        sourceMode: "selected",
        sources: [
          { type: "subs", key: "old.example" },
          { type: "apis", key: "https://old-api.example/data" },
          { type: "domains", key: "old-domain.example" },
        ],
      },
    },
  };
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const headers = { Cookie: `auth=${hash}`, "content-type": "application/json" };
  const rename = (body) => worker.fetch(new Request("https://example.test/api/source-rename", {
    method: "POST", headers, body: JSON.stringify(body),
  }), runtime);

  const sub = await rename({ type: "subs", oldKey: "old.example", newKey: "new.example" });
  assert.equal(sub.status, 200);
  assert.equal(values.subs["new.example"].remark, "旧订阅");
  assert.equal(values.subs["new.example"].enabled, false);

  const api = await rename({ type: "apis", oldKey: "https://old-api.example/data", newKey: "https://new-api.example/data" });
  assert.equal(api.status, 200);

  const domain = await worker.fetch(new Request("https://example.test/api/preferred-domains", {
    method: "POST", headers,
    body: JSON.stringify({ domain: "new-domain.example", previousDomain: "old-domain.example", remark: "新域名", resolve: false }),
  }), runtime);
  assert.equal(domain.status, 200);
  assert.equal(values.preferred_domains["new-domain.example"].remark, "新域名");
  assert.equal(values.preferred_domains["new-domain.example"].records.A[0], "1.2.3.4");

  assert.deepEqual(values.custom_apis.selected.sources, [
    { type: "subs", key: "new.example" },
    { type: "apis", key: "https://new-api.example/data" },
    { type: "domains", key: "new-domain.example" },
  ]);
  assert.equal(values.custom_apis.selected.remark, "同步测试");
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
    assert.deepEqual(result.filteredNodes, ["5.6.7.8:443#blocked"]);
    assert.deepEqual(result.filteredSources, [{ type: "apis", key: sourceKey, remark: "预览源", nodes: ["5.6.7.8:443#blocked"] }]);
    assert.deepEqual(result.unfilteredNodes, ["1.2.3.4:443#ok", "5.6.7.8:443#blocked"]);
    assert.equal(result.status.filterStats.inputCount, 2);
    assert.equal(result.status.filterStats.blacklistedCount, 1);
    assert.equal(result.status.filterStats.outputCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reports which rule filtered each node", async () => {
  const apiKey = "https://filter-reason.example/data";
  const apiKey2 = "https://filter-reason-second.example/data";
  const remarkApiKey = "https://filter-reason-remark.example/data";
  const encodedApiKey = "https://filter-reason-encoded.example/data";
  const subKey = "reason.example.com";
  const subRemarkKey = "reason-remark.example.com";
  const values = {
    subs: { [subKey]: { remark: "订阅源" }, [subRemarkKey]: { remark: "备注清理订阅源" } },
    apis: { [apiKey]: { remark: "API 源" }, [apiKey2]: { remark: "API 源二" }, [remarkApiKey]: { remark: "备注清理源" }, [encodedApiKey]: { remark: "编码备注源" } },
    blacklist: ["Ad-Node"],
    custom_apis: {
      reason_preview: { enabled: true, sourceMode: "selected", sources: [{ type: "apis", key: apiKey }, { type: "apis", key: apiKey2 }] },
    },
  };
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const headers = { Cookie: `auth=${hash}`, "content-type": "application/json" };
  const originalFetch = globalThis.fetch;
  const subLine = "vless://00000000-0000-4000-8000-000000000000@43.129.217.38:443?security=tls&sni=example.com#dup";
  globalThis.fetch = async (resource) => {
    const url = String(resource);
    if (url.includes("/sub?host=")) return new Response(btoa([subLine, subLine].join("\n")), { status: 200 });
    if (url.includes("filter-reason-remark")) return new Response("6.6.6.6:443#A|B", { status: 200 });
    if (url.includes("filter-reason-encoded")) return new Response("5.5.5.5:443#SG%20%5B%E4%BC%98%E9%80%89%5D%2075.7ms", { status: 200 });
    return new Response("1.1.1.1:443#ok\n2.2.2.2:443#ad-node-1", { status: 200 });
  };
  const preview = (body) => worker.fetch(new Request("https://example.test/api/source-raw", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }), runtime);
  try {
    // API 源：命中黑名单时回填具体规则名（大小写不敏感匹配，显示配置里的写法）
    const apiPreview = await preview({ type: "apis", key: apiKey });
    assert.equal(apiPreview.status, 200);
    const apiResult = await apiPreview.json();
    assert.deepEqual(apiResult.filteredNodes, ["2.2.2.2:443#ad-node-1"]);
    assert.deepEqual(apiResult.filterDetails, [
      { type: "apis", key: apiKey, node: "2.2.2.2:443#ad-node-1", reason: "blacklist", rule: "Ad-Node" },
    ]);

    // 订阅源：同一节点重复出现时标记为重复节点
    const subPreview = await preview({ type: "subs", key: subKey });
    assert.equal(subPreview.status, 200);
    const subResult = await subPreview.json();
    assert.deepEqual(subResult.filteredNodes, ["43.129.217.38:443#dup"]);
    assert.deepEqual(subResult.filterDetails, [
      { type: "subs", key: subKey, node: "43.129.217.38:443#dup", reason: "duplicate", rule: "" },
    ]);

    // 备注规则：命中的节点仍然输出截断后的备注，同时在过滤节点里标注命中的规则
    const remarkPreview = await preview({ type: "apis", key: remarkApiKey, filterRules: ["|"] });
    assert.equal(remarkPreview.status, 200);
    const remarkResult = await remarkPreview.json();
    assert.deepEqual(remarkResult.nodes, ["6.6.6.6:443#A"]);
    assert.deepEqual(remarkResult.filteredNodes, ["6.6.6.6:443#A|B"]);
    assert.deepEqual(remarkResult.filterDetails, [
      { type: "apis", key: remarkApiKey, node: "6.6.6.6:443#A|B", reason: "remark", rule: "|" },
    ]);
    assert.equal(remarkResult.status.filterStats.remarkCount, 1);

    // 订阅源同样会把备注命中的节点与规则带进过滤节点，两个来源行清理后重复的节点仍标记为重复
    const subRemarkPreview = await preview({ type: "subs", key: subRemarkKey, filterRules: ["dup"] });
    assert.equal(subRemarkPreview.status, 200);
    const subRemarkResult = await subRemarkPreview.json();
    assert.deepEqual(subRemarkResult.nodes, ["43.129.217.38:443"]);
    assert.deepEqual(subRemarkResult.filteredNodes, ["43.129.217.38:443", "43.129.217.38:443#dup"]);
    assert.deepEqual(subRemarkResult.filterDetails, [
      { type: "subs", key: subRemarkKey, node: "43.129.217.38:443", reason: "duplicate", rule: "" },
      { type: "subs", key: subRemarkKey, node: "43.129.217.38:443#dup", reason: "remark", rule: "dup" },
    ]);
    assert.equal(subRemarkResult.status.filterStats.remarkCount, 1);

    // 上游备注是百分号编码时，过滤节点展示解码后的备注，方便阅读
    const encodedPreview = await preview({ type: "apis", key: encodedApiKey, filterRules: ["空格"] });
    assert.equal(encodedPreview.status, 200);
    const encodedResult = await encodedPreview.json();
    assert.deepEqual(encodedResult.nodes, ["5.5.5.5:443#SG"]);
    assert.deepEqual(encodedResult.filteredNodes, ["5.5.5.5:443#SG [优选] 75.7ms"]);
    assert.deepEqual(encodedResult.filterDetails, [
      { type: "apis", key: encodedApiKey, node: "5.5.5.5:443#SG [优选] 75.7ms", reason: "remark", rule: "空格" },
    ]);

    // 优选 API：跨来源重复的节点归回后出现的来源，并标记为与其他来源重复
    const customPreview = await worker.fetch(new Request("https://example.test/api/custom-api-preview", {
      method: "POST",
      headers,
      body: JSON.stringify({ path: "reason_preview" }),
    }), runtime);
    assert.equal(customPreview.status, 200);
    const customResult = await customPreview.json();
    assert.deepEqual(customResult.nodes, ["1.1.1.1:443#ok"]);
    assert.deepEqual(customResult.filterDetails, [
      { type: "apis", key: apiKey, node: "2.2.2.2:443#ad-node-1", reason: "blacklist", rule: "Ad-Node" },
      { type: "apis", key: apiKey2, node: "2.2.2.2:443#ad-node-1", reason: "blacklist", rule: "Ad-Node" },
      { type: "apis", key: apiKey2, node: "1.1.1.1:443#ok", reason: "cross-duplicate", rule: "" },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("records unparsable upstream lines as format-invalid filter details", async () => {
  const values = {
    subs: {},
    apis: {},
    blacklist: [],
    // 手动优选里混入上游文本（例如到期提示），过去这类行只会被丢弃，看不出上游发了什么。
    preferred_manual: { content: "1.1.1.1:443#ok\nnot-a-node\n订阅内容已变更，请更新订阅" },
    custom_apis: { invalid_preview: { enabled: true, sourceMode: "selected", sources: [{ type: "manual", key: "manual" }] } },
  };
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const headers = { Cookie: `auth=${hash}`, "content-type": "application/json" };
  const response = await worker.fetch(new Request("https://example.test/api/custom-api-preview", {
    method: "POST",
    headers,
    body: JSON.stringify({ path: "invalid_preview" }),
  }), runtime);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result.nodes, ["1.1.1.1:443#ok"]);
  assert.deepEqual(result.filteredNodes, ["not-a-node", "订阅内容已变更，请更新订阅"]);
  assert.deepEqual(result.filterDetails, [
    { type: "manual", key: "manual", node: "not-a-node", reason: "invalid", rule: "" },
    { type: "manual", key: "manual", node: "订阅内容已变更，请更新订阅", reason: "invalid", rule: "" },
  ]);
  assert.deepEqual(result.rawSources, [
    { type: "manual", key: "manual", remark: "手动优选", nodes: ["1.1.1.1:443#ok", "not-a-node", "订阅内容已变更，请更新订阅"], filterStats: { inputCount: 3, outputCount: 1, invalidCount: 2, blacklistedCount: 0, duplicateCount: 0, remarkCount: 0 } },
  ]);
});

test("counts raw nodes from upstream lines so raw is never below kept", async () => {
  const apiKey = "https://raw-lines.example/data";
  const subKey = "raw-lines.example.com";
  const uuid = "00000000-0000-4000-8000-000000000000";
  const subLine = `vless://${uuid}@1.1.1.1:443?security=tls&sni=example.com#CN`;
  const values = {
    subs: { [subKey]: { remark: "订阅源" } },
    apis: { [apiKey]: { remark: "API 源" } },
    blacklist: [],
    preferred_manual: { content: "9.9.9.9:443#手动" },
    custom_apis: { raw_lines: { enabled: true, sourceMode: "all", sources: [] } },
  };
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const headers = { Cookie: `auth=${hash}`, "content-type": "application/json" };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (resource) => {
    const url = String(resource);
    if (url.includes("/sub?host=")) return new Response([subLine, "订阅已过期，请续费"].join("\n"), { status: 200 });
    return new Response(["2.2.2.2:443#api", "vmess://eyJhZGQiOiJ4In0="].join("\n"), { status: 200 });
  };
  try {
    const response = await worker.fetch(new Request("https://example.test/api/custom-api-preview", {
      method: "POST",
      headers,
      body: JSON.stringify({ path: "raw_lines" }),
    }), runtime);
    assert.equal(response.status, 200);
    const result = await response.json();
    // 上游共 5 行（订阅源 2 行含 1 行坏行、API 源 2 行含 1 行无法解析、手动优选 1 行），最终输出 4 条。
    assert.equal(result.status.rawNodeCount, 5);
    assert.equal(result.status.nodeCount, 4);
    assert.equal(result.status.filterStats.inputCount, 5);
    assert.equal(result.status.filterStats.invalidCount, 1);
    assert.deepEqual(result.rawSources.map((source) => source.nodes.length), [2, 2, 1]);
    // 「未过滤节点」就是上游原文，订阅源不再只显示解析成功的节点。
    assert.deepEqual(result.unfilteredNodes, [subLine, "订阅已过期，请续费", "2.2.2.2:443#api", "vmess://eyJhZGQiOiJ4In0=", "9.9.9.9:443#手动"]);
    assert.deepEqual(result.filterDetails, [
      { type: "subs", key: subKey, node: "订阅已过期，请续费", reason: "invalid", rule: "" },
    ]);
    // API 源保留整行输出，所以「原始」和「可用」都是 2 条，不会再出现可用比原始多。
    assert.deepEqual(result.rawSources[1], {
      type: "apis",
      key: apiKey,
      remark: "API 源",
      nodes: ["2.2.2.2:443#api", "vmess://eyJhZGQiOiJ4In0="],
      filterStats: { inputCount: 2, outputCount: 2, invalidCount: 0, blacklistedCount: 0, duplicateCount: 0, remarkCount: 0 },
    });

    // 单个订阅源的查看同样按上游原始行数显示。
    const subPreview = await worker.fetch(new Request("https://example.test/api/source-raw", {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "subs", key: subKey }),
    }), runtime);
    const subResult = await subPreview.json();
    assert.equal(subResult.status.rawNodeCount, 2);
    assert.equal(subResult.status.nodeCount, 1);
    assert.deepEqual(subResult.unfilteredNodes, [subLine, "订阅已过期，请续费"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("applies view-only blacklist and remark filters without touching global config", async () => {
  const globalKey = "https://view-global.example/data";
  const overrideKey = "https://view-override.example/data";
  const emptyKey = "https://view-empty.example/data";
  const values = {
    apis: { [globalKey]: { remark: "全局预览源" }, [overrideKey]: { remark: "独立规则源" }, [emptyKey]: { remark: "空规则源" } },
    subs: {},
    blacklist: ["global-block"],
    filter_rules: ["官网"],
    custom_apis: {},
  };
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const headers = { Cookie: `auth=${hash}`, "content-type": "application/json" };
  const originalFetch = globalThis.fetch;
  const upstream = "1.1.1.1:443#local-block\n2.2.2.2:443#global-block\n3.3.3.3:443#高速官网地址\n4.4.4.4:443#ok";
  globalThis.fetch = async () => new Response(upstream, { status: 200 });
  const preview = (body) => worker.fetch(new Request("https://example.test/api/source-raw", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }), runtime);
  try {
    // 全局设置：只过滤 global-block，并按“官网”截断备注
    const globalPreview = await preview({ type: "apis", key: globalKey });
    assert.equal(globalPreview.status, 200);
    const globalResult = await globalPreview.json();
    assert.deepEqual(globalResult.nodes, ["1.1.1.1:443#local-block", "3.3.3.3:443#高速", "4.4.4.4:443#ok"]);
    assert.equal(globalResult.localFilterOverride, undefined);
    assert.equal(values.source_status.apis[globalKey].nodeCount, 3);

    // 本次查看独立规则：过滤 local-block，并按“高速”截断备注
    const localPreview = await preview({ type: "apis", key: overrideKey, blacklist: ["local-block"], filterRules: ["高速"] });
    assert.equal(localPreview.status, 200);
    const localResult = await localPreview.json();
    assert.deepEqual(localResult.nodes, ["2.2.2.2:443#global-block", "3.3.3.3:443", "4.4.4.4:443#ok"]);
    // 备注被“高速”截断的节点仍会输出，但会带着命中的规则出现在过滤节点里。
    assert.deepEqual(localResult.filteredNodes, ["1.1.1.1:443#local-block", "3.3.3.3:443#高速官网地址"]);
    assert.deepEqual(localResult.filterDetails, [
      { type: "apis", key: overrideKey, node: "1.1.1.1:443#local-block", reason: "blacklist", rule: "local-block" },
      { type: "apis", key: overrideKey, node: "3.3.3.3:443#高速官网地址", reason: "remark", rule: "高速" },
    ]);
    assert.deepEqual(localResult.unfilteredNodes, upstream.split("\n"));
    assert.equal(localResult.localFilterOverride, true);
    assert.equal(localResult.status.state, "success");
    assert.equal(localResult.status.filterStats.blacklistedCount, 1);
    assert.equal(localResult.status.filterStats.remarkCount, 1);

    // 空数组覆盖表示“本次查看不过滤”，而不是回退到全局规则
    const emptyPreview = await preview({ type: "apis", key: emptyKey, blacklist: [], filterRules: [] });
    assert.equal(emptyPreview.status, 200);
    const emptyResult = await emptyPreview.json();
    assert.deepEqual(emptyResult.nodes, upstream.split("\n"));
    assert.deepEqual(emptyResult.filteredNodes, []);
    assert.equal(emptyResult.localFilterOverride, true);

    // 全局配置与全局源状态都不受本次查看影响
    assert.deepEqual(values.blacklist, ["global-block"]);
    assert.deepEqual(values.filter_rules, ["官网"]);
    // 独立规则的检测不会把源状态从 idle 更新为 success
    assert.equal(values.source_status.apis[overrideKey].state, "idle");
    assert.equal(values.source_status.apis[emptyKey].state, "idle");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects invalid view-only filter payloads", async () => {
  const sourceKey = "https://view-invalid.example/data";
  const values = { apis: { [sourceKey]: { remark: "API 源" } }, subs: {}, blacklist: ["global-block"], custom_apis: {} };
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const headers = { Cookie: `auth=${hash}`, "content-type": "application/json" };
  const response = await worker.fetch(new Request("https://example.test/api/source-raw", {
    method: "POST",
    headers,
    body: JSON.stringify({ type: "apis", key: sourceKey, blacklist: "not-an-array" }),
  }), runtime);
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "INVALID_FILTER_OVERRIDE");
  assert.deepEqual(values.blacklist, ["global-block"]);
});

test("keeps view-only filters isolated for custom API previews", async () => {
  const sourceKey = "https://view-filter-api.example/data";
  const values = {
    apis: { [sourceKey]: { remark: "API 源" } },
    subs: {},
    blacklist: ["global-block"],
    filter_rules: [],
    custom_apis: {
      view_filter_global: { enabled: true, sourceMode: "selected", sources: [{ type: "apis", key: sourceKey }] },
      view_filter_local: { enabled: true, sourceMode: "selected", sources: [{ type: "apis", key: sourceKey }] },
    },
  };
  const db = createD1();
  const runtime = env({ KV: createKv(values), DB: db });
  const hash = await sha256Hex("secret");
  const headers = { Cookie: `auth=${hash}`, "content-type": "application/json" };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("5.5.5.5:443#local-block\n6.6.6.6:443#global-block", { status: 200 });
  const preview = (body) => worker.fetch(new Request("https://example.test/api/custom-api-preview", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }), runtime);
  const historyInserts = () => db.calls.filter((call) => /INSERT INTO detection_history/i.test(call.sql)).length;
  try {
    const globalPreview = await preview({ path: "view_filter_global" });
    assert.equal(globalPreview.status, 200);
    const globalResult = await globalPreview.json();
    assert.deepEqual(globalResult.nodes, ["5.5.5.5:443#local-block"]);
    assert.equal(globalResult.localFilterOverride, undefined);
    assert.equal(historyInserts(), 1);

    const localPreview = await preview({ path: "view_filter_local", blacklist: ["local-block"] });
    assert.equal(localPreview.status, 200);
    const localResult = await localPreview.json();
    assert.deepEqual(localResult.nodes, ["6.6.6.6:443#global-block"]);
    assert.deepEqual(localResult.filteredNodes, ["5.5.5.5:443#local-block"]);
    assert.equal(localResult.localFilterOverride, true);
    // 独立规则的检测不写入全局检测历史，也不修改全局配置
    assert.equal(historyInserts(), 1);
    assert.deepEqual(values.blacklist, ["global-block"]);
    assert.deepEqual(values.filter_rules, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("previews disabled custom APIs and rate-limits repeated checks", async () => {
  const sourceKey = "https://custom-preview.example/data";
  const values = {
    apis: { [sourceKey]: { remark: "API 源" } },
    subs: {},
    blacklist: ["blocked"],
    custom_apis: { disabled_preview: { enabled: false, sourceMode: "selected", sources: [{ type: "apis", key: sourceKey }] } },
  };
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("9.9.9.9:443#custom\n8.8.8.8:443#blocked", { status: 200 });
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
    assert.deepEqual(result.filteredNodes, ["8.8.8.8:443#blocked"]);
    assert.deepEqual(result.filteredSources, [{ type: "apis", key: sourceKey, remark: "API 源", nodes: ["8.8.8.8:443#blocked"] }]);
    assert.deepEqual(result.unfilteredNodes, ["9.9.9.9:443#custom", "8.8.8.8:443#blocked"]);
    assert.deepEqual(result.rawSources, [{ type: "apis", key: sourceKey, remark: "API 源", nodes: ["9.9.9.9:443#custom", "8.8.8.8:443#blocked"], filterStats: { inputCount: 2, outputCount: 1, invalidCount: 0, blacklistedCount: 1, duplicateCount: 0, remarkCount: 0 } }]);
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

test("backs up and restores all configuration data", async () => {
  const values = {
    subs: { "https://Sub.Example/a/": { remark: "sub" } },
    apis: { "https://API.Example/v1": true },
    custom_apis: { "my-api": { enabled: true, remark: "x", sourceMode: "selected", sources: [{ type: "subs", key: "https://Sub.Example/a/" }] } },
    blacklist: [" foo ", "bar"],
    filter_rules: ["|"],
    preferred_domains: { "Example.COM.": { remark: "d", records: { A: ["1.2.3.4"] } } },
    preferred_manual: { content: "5.6.7.8:443#x\n9.9.9.9:443#y", updatedAt: 1757800000000 },
    settings: { enabled: false, accessPath: "old-entry", redirectUrl: "/" },
    source_status: { subs: { "https://sub.example/a/": { state: "success" } } },
  };
  const hash = await sha256Hex("secret");
  const authHeaders = { Cookie: `auth=${hash}` };

  const unauthenticated = await worker.fetch(new Request("https://example.test/api/backup"), env({ KV: createKv(values) }));
  assert.equal(unauthenticated.status, 200);
  assert.match(await unauthenticated.text(), /管理员密码/);

  const runtime = env({ KV: createKv(values) });
  const backupResponse = await worker.fetch(new Request("https://example.test/api/backup", { headers: authHeaders }), runtime);
  assert.equal(backupResponse.status, 200);
  const backup = await backupResponse.json();
  assert.equal(backup.app, "sub-api-generator");
  assert.equal(backup.version, 1);
  assert.ok(!Number.isNaN(Date.parse(backup.exportedAt)));
  assert.deepEqual(backup.data.subs, { "sub.example/a": { remark: "sub" } });
  assert.deepEqual(backup.data.apis, { "https://api.example/v1": { remark: "" } });
  assert.equal(backup.data.customApis["my-api"].enabled, true);
  assert.deepEqual(backup.data.customApis["my-api"].sources, [{ type: "subs", key: "sub.example/a" }]);
  assert.deepEqual(backup.data.blacklist, ["foo", "bar"]);
  assert.deepEqual(backup.data.filterRules, ["|"]);
  assert.deepEqual(backup.data.preferredDomains["example.com"].records.A, ["1.2.3.4"]);
  assert.equal(backup.data.preferredManual.content, "5.6.7.8:443#x\n9.9.9.9:443#y");
  assert.equal(backup.data.settings.accessPath, "old-entry");

  const restoredKv = {};
  const restoreRuntime = env({ KV: createKv(restoredKv) });
  const restoreResponse = await worker.fetch(new Request("https://example.test/api/restore", {
    method: "POST",
    headers: { ...authHeaders, "content-type": "application/json" },
    body: JSON.stringify(backup),
  }), restoreRuntime);
  assert.equal(restoreResponse.status, 200);
  const restoreResult = await restoreResponse.json();
  assert.equal(restoreResult.ok, true);
  assert.equal(restoreResult.restored.subs, 1);
  assert.equal(restoreResult.restored.preferredManual, 2);
  assert.equal(restoreResult.restored.settings, true);

  assert.deepEqual(restoredKv.source_status, {});
  assert.equal(restoredKv.preferred_manual.content, "5.6.7.8:443#x\n9.9.9.9:443#y");
  const subsResponse = await worker.fetch(new Request("https://example.test/api/subs", { headers: authHeaders }), restoreRuntime);
  assert.deepEqual(await subsResponse.json(), { "sub.example/a": { remark: "sub" } });
  const settingsResponse = await worker.fetch(new Request("https://example.test/api/settings", { headers: authHeaders }), restoreRuntime);
  assert.deepEqual(await settingsResponse.json(), { enabled: false, accessPath: "old-entry", redirectUrl: "/" });

  const invalidResponse = await worker.fetch(new Request("https://example.test/api/restore", {
    method: "POST",
    headers: { ...authHeaders, "content-type": "application/json" },
    body: JSON.stringify({ version: 1, data: { subs: "nope" } }),
  }), restoreRuntime);
  assert.equal(invalidResponse.status, 400);

  const emptyResponse = await worker.fetch(new Request("https://example.test/api/restore", {
    method: "POST",
    headers: { ...authHeaders, "content-type": "application/json" },
    body: JSON.stringify({ version: 1, data: {} }),
  }), restoreRuntime);
  assert.equal(emptyResponse.status, 400);
});

test("configures WebDAV and backs up and restores through it", async () => {
  const values = {};
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const authHeaders = { Cookie: `auth=${hash}` };
  const jsonHeaders = { ...authHeaders, "content-type": "application/json" };

  const defaultResponse = await worker.fetch(new Request("https://example.test/api/backup/webdav", { headers: authHeaders }), runtime);
  assert.equal(defaultResponse.status, 200);
  assert.deepEqual(await defaultResponse.json(), { url: "", username: "", filename: "sub-api-generator-backup.json", passwordSet: false });

  const notConfigured = await worker.fetch(new Request("https://example.test/api/backup/webdav/upload", {
    method: "POST", headers: authHeaders,
  }), runtime);
  assert.equal(notConfigured.status, 400);

  const testUnconfigured = await worker.fetch(new Request("https://example.test/api/backup/webdav/test", {
    method: "POST", headers: jsonHeaders,
    body: JSON.stringify({}),
  }), runtime);
  assert.equal(testUnconfigured.status, 400);

  const saveResponse = await worker.fetch(new Request("https://example.test/api/backup/webdav", {
    method: "POST", headers: jsonHeaders,
    body: JSON.stringify({ url: "https://dav.example.com/backup/", username: "user", password: "pass", filename: "my-backup.json" }),
  }), runtime);
  assert.equal(saveResponse.status, 200);
  const savedConfig = await saveResponse.json();
  assert.equal(savedConfig.passwordSet, true);
  assert.equal(savedConfig.password, undefined);
  assert.equal(values.webdav_backup.password, "pass");

  const keepPasswordResponse = await worker.fetch(new Request("https://example.test/api/backup/webdav", {
    method: "POST", headers: jsonHeaders,
    body: JSON.stringify({ url: "https://dav.example.com/backup/", username: "user", password: "", filename: "my-backup.json" }),
  }), runtime);
  assert.equal(keepPasswordResponse.status, 200);
  assert.equal(values.webdav_backup.password, "pass");

  const invalidResponse = await worker.fetch(new Request("https://example.test/api/backup/webdav", {
    method: "POST", headers: jsonHeaders,
    body: JSON.stringify({ url: "not-a-url" }),
  }), runtime);
  assert.equal(invalidResponse.status, 400);

  await worker.fetch(new Request("https://example.test/api/blacklist", {
    method: "POST", headers: jsonHeaders, body: JSON.stringify(["foo"]),
  }), runtime);

  const webdavRequests = [];
  let putAttempts = 0;
  let getOverride = null;
  const storedFiles = {};
  const oldBackupNames = ["my-backup.json"];
  for (let i = 1; i <= 11; i += 1) {
    oldBackupNames.push(`my-backup-202501${String(i).padStart(2, "0")}-000001.json`);
  }
  const xmlListing = () => '<?xml version="1.0" encoding="utf-8"?><D:multistatus xmlns:D="DAV:">'
    + [...oldBackupNames, ...Object.keys(storedFiles).map((url) => url.split("/").pop())]
      .map((name, index) => `<D:response><D:href>/backup/${name}</D:href><D:propstat><D:prop><D:getcontentlength>${1024 * (index + 1)}</D:getcontentlength><D:getlastmodified>${name === "my-backup.json" ? "Mon, 01 Sep 2024 00:00:00 GMT" : "Mon, 01 Sep 2025 00:00:00 GMT"}</D:getlastmodified></D:prop></D:propstat></D:response>`)
      .join("")
    + "</D:multistatus>";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (resource, init = {}) => {
    const url = String(resource);
    const method = init.method || "GET";
    webdavRequests.push({ url, method, headers: init.headers, body: init.body });
    if (method === "PUT") {
      putAttempts += 1;
      // 第一次 PUT 因目录不存在返回 409，触发 MKCOL 后重试成功。
      if (putAttempts === 1) return new Response(null, { status: 409 });
      storedFiles[url] = init.body;
      return new Response(null, { status: 201 });
    }
    if (method === "PROPFIND") return new Response(xmlListing(), { status: 207 });
    if (method === "GET") {
      if (getOverride) return getOverride(url);
      if (storedFiles[url] !== undefined) return new Response(storedFiles[url], { status: 200 });
      return new Response(null, { status: 404 });
    }
    if (method === "DELETE") return new Response(null, { status: 204 });
    return new Response(null, { status: 405 });
  };
  try {
    const uploadResponse = await worker.fetch(new Request("https://example.test/api/backup/webdav/upload", {
      method: "POST", headers: authHeaders,
    }), runtime);
    assert.equal(uploadResponse.status, 200);
    const uploadJson = await uploadResponse.json();
    assert.match(uploadJson.filename, /^my-backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/);
    assert.equal(putAttempts, 2);
    assert.ok(webdavRequests.some((request) => request.method === "MKCOL" && request.url === "https://dav.example.com/backup/"));
    assert.ok(webdavRequests.some((request) => request.method === "MKCOL" && request.url === "https://dav.example.com/backup/sub-api-generator-backup/"));
    const put = webdavRequests.find((request) => request.method === "PUT");
    assert.match(put.url, /^https:\/\/dav\.example\.com\/backup\/sub-api-generator-backup\/my-backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/);
    assert.equal(put.headers.Authorization, "Basic " + btoa("user:pass"));
    const uploaded = JSON.parse(put.body);
    assert.equal(uploaded.version, 1);
    assert.deepEqual(uploaded.data.blacklist, ["foo"]);
    // 云端最多保留 10 份：13 份中删除最旧的 3 份（无时间戳旧文件和最早的两份）。
    assert.equal(uploadJson.pruned, 3);
    const deletes = webdavRequests.filter((request) => request.method === "DELETE").map((request) => request.url);
    assert.equal(deletes.length, 3);
    assert.ok(deletes.includes("https://dav.example.com/backup/sub-api-generator-backup/my-backup.json"));
    assert.ok(deletes.includes("https://dav.example.com/backup/sub-api-generator-backup/my-backup-20250101-000001.json"));
    assert.ok(deletes.includes("https://dav.example.com/backup/sub-api-generator-backup/my-backup-20250102-000001.json"));

    // 连接测试：密码留空时沿用已保存密码；401 提示账号密码错误；407 类失败返回 ok:false；非法地址返回 400。
    const savedFetchMock = globalThis.fetch;
    globalThis.fetch = async () => new Response(null, { status: 401 });
    const unauthorizedTest = await worker.fetch(new Request("https://example.test/api/backup/webdav/test", {
      method: "POST", headers: jsonHeaders,
      body: JSON.stringify({ url: "https://dav.example.com/backup/", username: "user", password: "", filename: "my-backup.json" }),
    }), runtime);
    assert.equal(unauthorizedTest.status, 200);
    const unauthorizedJson = await unauthorizedTest.json();
    assert.equal(unauthorizedJson.ok, false);
    assert.match(unauthorizedJson.message, /账号或密码错误/);

    globalThis.fetch = async () => new Response(null, { status: 207 });
    const okTest = await worker.fetch(new Request("https://example.test/api/backup/webdav/test", {
      method: "POST", headers: jsonHeaders,
      body: JSON.stringify({ url: "https://dav.example.com/backup/", username: "user", password: "", filename: "my-backup.json" }),
    }), runtime);
    assert.equal(okTest.status, 200);
    assert.equal((await okTest.json()).ok, true);

    const invalidUrlTest = await worker.fetch(new Request("https://example.test/api/backup/webdav/test", {
      method: "POST", headers: jsonHeaders,
      body: JSON.stringify({ url: "ftp://dav.example.com/" }),
    }), runtime);
    assert.equal(invalidUrlTest.status, 400);
    globalThis.fetch = savedFetchMock;

    const restoreValues = {};
    restoreValues.webdav_backup = values.webdav_backup;
    const restoreRuntime = env({ KV: createKv(restoreValues) });
    const restoreResponse = await worker.fetch(new Request("https://example.test/api/backup/webdav/restore", {
      method: "POST", headers: authHeaders,
    }), restoreRuntime);
    assert.equal(restoreResponse.status, 200);
    const restoreJson = await restoreResponse.json();
    assert.equal(restoreJson.filename, uploadJson.filename);
    assert.deepEqual(restoreJson.restored, {
      subs: 0,
      apis: 0,
      customApis: 0,
      blacklist: 1,
      filterRules: 0,
      preferredDomains: 0,
      preferredManual: 0,
      settings: true,
    });
    assert.deepEqual(restoreValues.blacklist, ["foo"]);
    assert.deepEqual(restoreValues.source_status, {});

    // 云端备份列表：按时间从新到旧，包含文件名、大小和修改时间。
    const listResponse = await worker.fetch(new Request("https://example.test/api/backup/webdav/list", { headers: authHeaders }), restoreRuntime);
    assert.equal(listResponse.status, 200);
    const listJson = await listResponse.json();
    assert.equal(listJson.ok, true);
    assert.equal(listJson.items[0].filename, uploadJson.filename);
    assert.equal(typeof listJson.items[0].size, "number");
    assert.equal(listJson.items[0].lastModified, Date.parse("Mon, 01 Sep 2025 00:00:00 GMT"));
    assert.ok(listJson.items.length >= 10);

    // 手动选择指定备份恢复：恢复更旧的一份。
    const olderFilename = "my-backup-20250103-000001.json";
    storedFiles[`https://dav.example.com/backup/sub-api-generator-backup/${olderFilename}`] = JSON.stringify({
      app: "sub-api-generator",
      version: 1,
      exportedAt: "2025-01-03T00:00:00.000Z",
      data: { blacklist: ["old-thing"] },
    });
    const restoreValues2 = {};
    restoreValues2.webdav_backup = values.webdav_backup;
    const restoreRuntime2 = env({ KV: createKv(restoreValues2) });
    const pickRestoreResponse = await worker.fetch(new Request("https://example.test/api/backup/webdav/restore", {
      method: "POST",
      headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ filename: olderFilename }),
    }), restoreRuntime2);
    assert.equal(pickRestoreResponse.status, 200);
    const pickRestoreJson = await pickRestoreResponse.json();
    assert.equal(pickRestoreJson.filename, olderFilename);
    assert.deepEqual(pickRestoreJson.restored.blacklist, 1);
    assert.deepEqual(restoreValues2.blacklist, ["old-thing"]);

    const invalidPickResponse = await worker.fetch(new Request("https://example.test/api/backup/webdav/restore", {
      method: "POST",
      headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ filename: "evil.json" }),
    }), restoreRuntime2);
    assert.equal(invalidPickResponse.status, 400);

    // 手动下载指定备份。
    const downloadResponse = await worker.fetch(new Request("https://example.test/api/backup/webdav/download", {
      method: "POST",
      headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ filename: uploadJson.filename }),
    }), restoreRuntime2);
    assert.equal(downloadResponse.status, 200);
    assert.match(downloadResponse.headers.get("content-disposition"), new RegExp(uploadJson.filename));
    assert.deepEqual(await downloadResponse.json(), uploaded);

    const invalidDownloadResponse = await worker.fetch(new Request("https://example.test/api/backup/webdav/download", {
      method: "POST",
      headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ filename: "evil.json" }),
    }), restoreRuntime2);
    assert.equal(invalidDownloadResponse.status, 400);

    // 手动删除指定云端备份。
    const deleteResponse = await worker.fetch(new Request("https://example.test/api/backup/webdav/delete", {
      method: "POST",
      headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ filename: olderFilename }),
    }), restoreRuntime2);
    assert.equal(deleteResponse.status, 200);
    assert.deepEqual(await deleteResponse.json(), { ok: true, filename: olderFilename });
    assert.ok(webdavRequests.some((request) => request.method === "DELETE" && request.url === `https://dav.example.com/backup/sub-api-generator-backup/${olderFilename}`));

    const invalidDeleteResponse = await worker.fetch(new Request("https://example.test/api/backup/webdav/delete", {
      method: "POST",
      headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ filename: "evil.json" }),
    }), restoreRuntime2);
    assert.equal(invalidDeleteResponse.status, 400);

    const savedForDelete = globalThis.fetch;
    globalThis.fetch = async () => new Response(null, { status: 500 });
    const failedDeleteResponse = await worker.fetch(new Request("https://example.test/api/backup/webdav/delete", {
      method: "POST",
      headers: { ...authHeaders, "content-type": "application/json" },
      body: JSON.stringify({ filename: olderFilename }),
    }), restoreRuntime2);
    assert.equal(failedDeleteResponse.status, 502);
    globalThis.fetch = savedForDelete;

    getOverride = () => new Response("not-json", { status: 200 });
    const brokenResponse = await worker.fetch(new Request("https://example.test/api/backup/webdav/restore", {
      method: "POST", headers: authHeaders,
    }), restoreRuntime);
    assert.equal(brokenResponse.status, 400);

    getOverride = () => new Response(null, { status: 404 });
    const missingResponse = await worker.fetch(new Request("https://example.test/api/backup/webdav/restore", {
      method: "POST", headers: authHeaders,
    }), restoreRuntime);
    assert.equal(missingResponse.status, 502);
    assert.match(await missingResponse.text(), /没有找到备份文件/);
  } finally {
    globalThis.fetch = originalFetch;
  }
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

    const savedStatus = await worker.fetch(new Request("https://example.test/api/source-status", { headers }), runtime);
    const savedStatusResult = await savedStatus.json();
    assert.deepEqual(savedStatusResult.domains["example.com"].dnsRecordCounts, { A: 1, AAAA: 1, CNAME: 1 });
    assert.equal(savedStatusResult.domains["example.com"].state, "success");

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

test("updates remark without re-resolving DNS records", async () => {
  const values = {};
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const headers = { Cookie: `auth=${hash}`, "content-type": "application/json" };
  let dnsRequests = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (resource) => {
    const url = new URL(String(resource));
    if (url.searchParams.get("name") !== undefined && url.searchParams.get("type")) dnsRequests += 1;
    const type = url.searchParams.get("type");
    const payloads = {
      A: { Status: 0, Answer: [{ type: 1, data: "1.2.3.4" }] },
      AAAA: { Status: 0, Answer: [{ type: 28, data: "2001:db8::1" }] },
      CNAME: { Status: 0, Answer: [{ type: 5, data: "edge.example.net." }] },
    };
    return new Response(JSON.stringify(payloads[type]), { status: 200 });
  };
  try {
    const added = await worker.fetch(new Request("https://example.test/api/preferred-domains", {
      method: "POST", headers, body: JSON.stringify({ domain: "remark.example.com", remark: "旧备注" }),
    }), runtime);
    assert.equal(added.status, 200);
    const resolvedCount = dnsRequests;
    assert.ok(resolvedCount >= 3);

    const updated = await worker.fetch(new Request("https://example.test/api/preferred-domains", {
      method: "POST", headers, body: JSON.stringify({ domain: "remark.example.com", remark: "新备注", resolve: false }),
    }), runtime);
    assert.equal(updated.status, 200);
    const entry = await updated.json();
    assert.equal(entry.remark, "新备注");
    assert.deepEqual(entry.records.A, ["1.2.3.4"]);
    assert.equal(dnsRequests, resolvedCount);
    assert.equal(values.preferred_domains["remark.example.com"].remark, "新备注");
    assert.deepEqual(values.preferred_domains["remark.example.com"].records.A, ["1.2.3.4"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("saves and serves manual preferred entries", async () => {
  const values = {};
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const headers = { Cookie: `auth=${hash}`, "content-type": "application/json" };

  const empty = await worker.fetch(new Request("https://example.test/api/preferred-manual", { headers }), runtime);
  assert.equal(empty.status, 200);
  assert.deepEqual(await empty.json(), { content: "", updatedAt: null, count: 0 });

  const saved = await worker.fetch(new Request("https://example.test/api/preferred-manual", {
    method: "POST",
    headers,
    body: JSON.stringify({ content: "  104.156.239.15:443#美国01  \n\n104.156.239.16:8443#美国02\n" }),
  }), runtime);
  assert.equal(saved.status, 200);
  const savedResult = await saved.json();
  assert.equal(savedResult.ok, true);
  assert.equal(savedResult.content, "104.156.239.15:443#美国01\n104.156.239.16:8443#美国02");
  assert.equal(savedResult.count, 2);
  assert.ok(savedResult.updatedAt > 0);
  assert.equal(values.preferred_manual.content, "104.156.239.15:443#美国01\n104.156.239.16:8443#美国02");

  const readBack = await worker.fetch(new Request("https://example.test/api/preferred-manual", { headers }), runtime);
  const readBackResult = await readBack.json();
  assert.equal(readBackResult.count, 2);
  assert.equal(readBackResult.updatedAt, values.preferred_manual.updatedAt);

  const unauthenticated = await worker.fetch(new Request("https://example.test/api/preferred-manual", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: "1.2.3.4:443" }),
  }), runtime);
  assert.equal(unauthenticated.status, 200);
  assert.match(await unauthenticated.text(), /管理员密码/);

  const tooMany = await worker.fetch(new Request("https://example.test/api/preferred-manual", {
    method: "POST",
    headers,
    body: JSON.stringify({ content: Array.from({ length: 501 }, (_, i) => `1.2.3.${i % 256}:${40000 + i}#x`).join("\n") }),
  }), runtime);
  assert.equal(tooMany.status, 400);

  const invalid = await worker.fetch(new Request("https://example.test/api/preferred-manual", {
    method: "POST",
    headers,
    body: JSON.stringify({ content: 42 }),
  }), runtime);
  assert.equal(invalid.status, 400);
});

test("merges manual preferred entries into custom API output by source mode", async () => {
  const values = {
    subs: {},
    apis: { "https://api.example/source": { remark: "api" } },
    blacklist: ["blocked"],
    preferred_manual: { content: "104.156.239.15:443#manual1\n1.2.3.4:443#api\n2.2.2.2:443\nnot-an-entry\n3.3.3.3:443#blocked" },
    custom_apis: {
      // 手动选择模式未勾选“手动优选”：手动条目不参与输出。
      sel_api: { enabled: true, remark: "", sourceMode: "selected", sources: [{ type: "apis", key: "https://api.example/source" }] },
      // 手动选择模式勾选“手动优选”：仅输出手动条目。
      sel_manual: { enabled: true, remark: "", sourceMode: "selected", sources: [{ type: "manual", key: "manual" }] },
      // 全部数据源模式：手动条目追加到输出末尾。
      all_api: { enabled: true, remark: "", sourceMode: "all", sources: [] },
    },
  };
  const runtime = env({ KV: createKv(values) });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("1.2.3.4:443#api", { status: 200 });
  try {
    const selResponse = await worker.fetch(new Request("https://example.test/sel_api"), runtime);
    assert.equal(selResponse.status, 200);
    assert.equal(await selResponse.text(), "1.2.3.4:443#api");

    const selManualResponse = await worker.fetch(new Request("https://example.test/sel_manual"), runtime);
    assert.equal(selManualResponse.status, 200);
    // 仅手动优选来源：输出手动内容本身（1.2.3.4:443#api 也是手动条目之一），无效行和黑名单行被过滤。
    assert.equal(await selManualResponse.text(), "104.156.239.15:443#manual1\n1.2.3.4:443#api\n2.2.2.2:443");

    const allResponse = await worker.fetch(new Request("https://example.test/all_api"), runtime);
    assert.equal(allResponse.status, 200);
    assert.equal(await allResponse.text(), "1.2.3.4:443#api\n104.156.239.15:443#manual1\n2.2.2.2:443");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("serves custom API output from manual preferred entries alone", async () => {
  const values = {
    preferred_manual: { content: "104.156.239.15:443#manual1" },
    custom_apis: { manual_only: { enabled: true, remark: "", sourceMode: "all", sources: [] } },
  };
  const runtime = env({ KV: createKv(values) });
  const response = await worker.fetch(new Request("https://example.test/manual_only"), runtime);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "104.156.239.15:443#manual1");
});

test("disabling a preferred domain hides it from custom API output", async () => {
  // 预览接口对同一路径有冷却限制，三个阶段各用一个路径避免被限流。
  const paths = ["all_api_a", "all_api_b", "all_api_c"];
  const values = {
    subs: {},
    apis: {},
    preferred_domains: {},
    custom_apis: Object.fromEntries(paths.map((path) => [path, { enabled: true, remark: "", sourceMode: "all", sources: [] }])),
  };
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const headers = { Cookie: `auth=${hash}`, "content-type": "application/json" };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (resource) => {
    const url = new URL(String(resource));
    if (url.hostname === "cloudflare-dns.com") {
      const type = url.searchParams.get("type");
      const payloads = {
        A: { Status: 0, Answer: [{ type: 1, data: "1.2.3.4" }] },
        AAAA: { Status: 0, Answer: [{ type: 28, data: "2001:db8::1" }] },
        CNAME: { Status: 0, Answer: [{ type: 5, data: "edge.example.net." }] },
      };
      return new Response(JSON.stringify(payloads[type]), { status: 200 });
    }
    return originalFetch(resource);
  };
  const postDomain = (body) => worker.fetch(new Request("https://example.test/api/preferred-domains", {
    method: "POST", headers, body: JSON.stringify(body),
  }), runtime);
  const preview = (path) => worker.fetch(new Request("https://example.test/api/custom-api-preview", {
    method: "POST", headers, body: JSON.stringify({ path }),
  }), runtime);
  const previewNodes = async (path) => (await (await preview(path)).json()).nodes || [];
  try {
    const added = await postDomain({ domain: "toggle.example.com" });
    assert.equal(added.status, 200);
    const addedEntry = await added.json();
    assert.equal(addedEntry.enabled, true);

    assert.ok((await previewNodes(paths[0])).length > 0);

    // 管理端脚本提供启用开关，并在优选 API 源选择中过滤禁用域名。
    assert.match(adminClientScript, /setPreferredDomainEnabled/);
    assert.match(adminClientScript, /source-disabled-row/);

    // 禁用时 resolve:false 保留解析结果，仅切换状态。
    const disabled = await postDomain({ domain: "toggle.example.com", remark: "备注", resolve: false, enabled: false });
    assert.equal(disabled.status, 200);
    const disabledEntry = await disabled.json();
    assert.equal(disabledEntry.enabled, false);
    assert.deepEqual(disabledEntry.records.A, ["1.2.3.4"]);
    assert.equal(values.preferred_domains["toggle.example.com"].enabled, false);

    // 仅更新备注时保留禁用状态。
    const remarkOnly = await postDomain({ domain: "toggle.example.com", remark: "新备注", resolve: false });
    assert.equal((await remarkOnly.json()).enabled, false);

    assert.deepEqual(await previewNodes(paths[1]), []);

    const backup = await worker.fetch(new Request("https://example.test/api/backup", { headers }), runtime);
    const backupData = await backup.json();
    assert.equal(backupData.data.preferredDomains["toggle.example.com"].enabled, false);

    const enabled = await postDomain({ domain: "toggle.example.com", resolve: false, enabled: true });
    assert.equal((await enabled.json()).enabled, true);
    assert.ok((await previewNodes(paths[2])).length > 0);

    const invalid = await postDomain({ domain: "toggle.example.com", resolve: false, enabled: "yes" });
    assert.equal(invalid.status, 400);
    assert.match(await invalid.text(), /启用状态必须是布尔值/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("disabling a preferred subscription hides it from custom API output", async () => {
  // 预览接口对同一路径有冷却限制，两个阶段各用一个路径避免被限流。
  const paths = ["subs_api_a", "subs_api_b"];
  const values = {
    subs: {},
    apis: {},
    preferred_domains: {},
    custom_apis: Object.fromEntries(paths.map((path) => [path, { enabled: true, remark: "", sourceMode: "all", sources: [] }])),
  };
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const headers = { Cookie: `auth=${hash}`, "content-type": "application/json" };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("vless://00000000-0000-4000-8000-000000000000@1.2.3.4:443?security=tls&sni=example.com#sub", { status: 200 });
  const postSubs = (body) => worker.fetch(new Request("https://example.test/api/subs", {
    method: "POST", headers, body: JSON.stringify(body),
  }), runtime);
  const preview = (path) => worker.fetch(new Request("https://example.test/api/custom-api-preview", {
    method: "POST", headers, body: JSON.stringify({ path }),
  }), runtime);
  const previewNodes = async (path) => (await (await preview(path)).json()).nodes || [];
  try {
    // 禁用的订阅源不参与优选 API 输出。
    const saved = await postSubs({ "sub.example.com": { remark: "订阅源", enabled: false } });
    assert.equal(saved.status, 200);
    assert.deepEqual(await previewNodes(paths[0]), []);

    // 重新启用后节点恢复输出，GET 配置时 enabled 字段保留。
    const enabled = await postSubs({ "sub.example.com": { remark: "订阅源", enabled: true } });
    assert.equal(enabled.status, 200);
    assert.ok((await previewNodes(paths[1])).length > 0);
    const list = await worker.fetch(new Request("https://example.test/api/subs", { headers }), runtime);
    assert.equal((await list.json())["sub.example.com"].enabled, true);

    // 仅改备注时 enabled 缺省视为启用（兼容旧数据）。
    await postSubs({ "sub.example.com": { remark: "新备注" } });
    assert.equal(values.subs["sub.example.com"].enabled, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("disabling a preferred API source hides it from custom API output", async () => {
  const paths = ["apis_api_a", "apis_api_b"];
  const values = {
    subs: {},
    apis: { "https://api.example.com/data": { remark: "API 源", enabled: false } },
    preferred_domains: {},
    custom_apis: Object.fromEntries(paths.map((path) => [path, { enabled: true, remark: "", sourceMode: "all", sources: [] }])),
  };
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const headers = { Cookie: `auth=${hash}`, "content-type": "application/json" };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("5.6.7.8:443#api", { status: 200 });
  const preview = (path) => worker.fetch(new Request("https://example.test/api/custom-api-preview", {
    method: "POST", headers, body: JSON.stringify({ path }),
  }), runtime);
  const previewNodes = async (path) => (await (await preview(path)).json()).nodes || [];
  try {
    assert.deepEqual(await previewNodes(paths[0]), []);

    const enabled = await worker.fetch(new Request("https://example.test/api/apis", {
      method: "POST", headers, body: JSON.stringify({ "https://api.example.com/data": { remark: "API 源", enabled: true } }),
    }), runtime);
    assert.equal(enabled.status, 200);
    assert.ok((await previewNodes(paths[1])).length > 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("deletes preferred domains in one batch request", async () => {
  const values = {};
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const headers = { Cookie: `auth=${hash}`, "content-type": "application/json" };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (resource) => {
    const url = new URL(String(resource));
    const type = url.searchParams.get("type");
    return new Response(JSON.stringify({ Status: 0, Answer: [{ type: type === "A" ? 1 : type === "AAAA" ? 28 : 5, data: "1.2.3.4" }] }), { status: 200 });
  };
  try {
    for (const domain of ["batch-one.example.com", "batch-two.example.com"]) {
      await worker.fetch(new Request("https://example.test/api/preferred-domains", {
        method: "POST", headers, body: JSON.stringify({ domain }),
      }), runtime);
    }
    const batch = await worker.fetch(new Request("https://example.test/api/preferred-domains/delete-batch", {
      method: "POST", headers, body: JSON.stringify({ domains: ["batch-one.example.com", "batch-two.example.com", "missing.example.com"] }),
    }), runtime);
    assert.equal(batch.status, 200);
    const result = await batch.json();
    assert.equal(result.deleted, 2);
    assert.deepEqual(result.missing, ["missing.example.com"]);
    assert.deepEqual(values.preferred_domains, {});
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("imports preferred domains without triggering DNS resolution", async () => {
  const values = {};
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const headers = { Cookie: `auth=${hash}`, "content-type": "application/json" };
  let dnsRequests = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (resource) => {
    const url = new URL(String(resource));
    if (url.searchParams.get("name") !== undefined && url.searchParams.get("type")) dnsRequests += 1;
    return new Response(JSON.stringify({ Status: 0, Answer: [] }), { status: 200 });
  };
  try {
    const imported = await worker.fetch(new Request("https://example.test/api/preferred-domains/import", {
      method: "POST", headers,
      body: JSON.stringify({
        "import-one.example.com": { remark: "一", records: { A: ["1.1.1.1"] }, checkedAt: 1700000000000 },
        "import-two.example.com": { remark: "二" },
        "invalid domain": { remark: "坏" },
      }),
    }), runtime);
    assert.equal(imported.status, 400);

    const okImport = await worker.fetch(new Request("https://example.test/api/preferred-domains/import", {
      method: "POST", headers,
      body: JSON.stringify({
        "import-one.example.com": { remark: "一", records: { A: ["1.1.1.1"] }, checkedAt: 1700000000000 },
        "import-two.example.com": { remark: "二" },
      }),
    }), runtime);
    assert.equal(okImport.status, 200);
    assert.equal(dnsRequests, 0);
    const stored = values.preferred_domains;
    assert.equal(stored["import-one.example.com"].remark, "一");
    assert.deepEqual(stored["import-one.example.com"].records.A, ["1.1.1.1"]);
    assert.equal(stored["import-one.example.com"].checkedAt, 1700000000000);
    assert.equal(stored["import-two.example.com"].remark, "二");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("refreshes preferred domain status after detection instead of keeping preview data", async () => {
  const values = {};
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const headers = { Cookie: `auth=${hash}`, "content-type": "application/json" };
  let address = "1.2.3.4";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (resource) => {
    const type = new URL(String(resource)).searchParams.get("type");
    const answer = type === "A"
      ? [{ type: 1, data: address }]
      : type === "AAAA"
        ? [{ type: 28, data: "2001:db8::1" }]
        : [{ type: 5, data: "edge.example.net." }];
    return new Response(JSON.stringify({ Status: 0, Answer: answer }), { status: 200 });
  };
  try {
    await worker.fetch(new Request("https://example.test/api/preferred-domains", {
      method: "POST", headers, body: JSON.stringify({ domain: "refresh.example.com" }),
    }), runtime);
    await worker.fetch(new Request("https://example.test/api/source-raw", {
      method: "POST", headers, body: JSON.stringify({ type: "domains", key: "refresh.example.com" }),
    }), runtime);

    address = "9.8.7.6";
    const detected = await worker.fetch(new Request("https://example.test/api/preferred-domains", {
      method: "POST", headers, body: JSON.stringify({ domain: "refresh.example.com" }),
    }), runtime);
    assert.equal((await detected.json()).records.A[0], "9.8.7.6");

    const statusResponse = await worker.fetch(new Request("https://example.test/api/source-status", { headers }), runtime);
    const status = await statusResponse.json();
    assert.equal(status.domains["refresh.example.com"].dnsRecords.A[0], "9.8.7.6");
    assert.equal(status.domains["refresh.example.com"].durationMs >= 0, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("keeps preferred domain statuses isolated when checking one domain", async () => {
  const values = {};
  const runtime = env({ KV: createKv(values) });
  const hash = await sha256Hex("secret");
  const headers = { Cookie: `auth=${hash}`, "content-type": "application/json" };
  const addresses = { "one-isolated.example": "192.0.2.11", "two-isolated.example": "192.0.2.22" };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (resource) => {
    const url = new URL(String(resource));
    const domain = url.searchParams.get("name");
    const type = url.searchParams.get("type");
    const address = addresses[domain] || "192.0.2.99";
    const answer = type === "A"
      ? [{ type: 1, data: address }]
      : type === "AAAA"
        ? [{ type: 28, data: `2001:db8::${address.endsWith("11") ? "11" : address.endsWith("22") ? "22" : "99"}` }]
        : [{ type: 5, data: `target.${domain}.` }];
    return new Response(JSON.stringify({ Status: 0, Answer: answer }), { status: 200 });
  };
  try {
    for (const domain of Object.keys(addresses)) {
      await worker.fetch(new Request("https://example.test/api/preferred-domains", {
        method: "POST", headers, body: JSON.stringify({ domain }),
      }), runtime);
    }
    const before = await (await worker.fetch(new Request("https://example.test/api/source-status", { headers }), runtime)).json();
    addresses["one-isolated.example"] = "192.0.2.111";
    const checked = await worker.fetch(new Request("https://example.test/api/source-status/check", {
      method: "POST", headers, body: JSON.stringify({ scope: "selected", sources: [{ type: "domains", key: "one-isolated.example" }] }),
    }), runtime);
    assert.equal(checked.status, 200);
    const after = await checked.json();
    assert.equal(after.domains["one-isolated.example"].dnsRecords.A[0], "192.0.2.111");
    assert.equal(after.domains["two-isolated.example"].dnsRecords.A[0], before.domains["two-isolated.example"].dnsRecords.A[0]);
    assert.equal(after.domains["two-isolated.example"].lastAttemptAt, before.domains["two-isolated.example"].lastAttemptAt);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("uses DNS provider failover and short cache with classified errors", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (resource) => {
    const url = new URL(String(resource));
    requests.push(url.hostname);
    if (url.hostname === "cloudflare-dns.com") return new Response("unavailable", { status: 503 });
    if (url.hostname === "dns.google") {
      const type = url.searchParams.get("type");
      const typeCode = type === "A" ? 1 : type === "AAAA" ? 28 : 5;
      return new Response(JSON.stringify({ Status: 0, Answer: [{ type: typeCode, data: type === "A" ? "192.0.2.10" : type === "AAAA" ? "2001:db8::10" : "fallback.example.net." }] }));
    }
    return new Response("unavailable", { status: 503 });
  };
  try {
    const first = await resolvePreferredDomainRecords("failover-cache.example");
    assert.deepEqual(first.providers, { A: "google", AAAA: "google", CNAME: "google" });
    assert.deepEqual(first.records.A, ["192.0.2.10"]);
    assert.equal(requests.filter((host) => host === "cloudflare-dns.com").length, 3);
    assert.equal(requests.filter((host) => host === "dns.google").length, 3);
    const requestCount = requests.length;
    const second = await resolvePreferredDomainRecords("failover-cache.example");
    assert.deepEqual(second.records, first.records);
    assert.equal(requests.length, requestCount);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("classifies DNS failures after all providers are unavailable", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("unavailable", { status: 503 });
  try {
    const result = await resolvePreferredDomainRecords("dns-errors.example");
    assert.equal(result.errors.length, 3);
    assert.ok(result.errors.every((item) => item.code === "DNS_ALL_PROVIDERS_FAILED"));
    assert.ok(result.errors.every((item) => item.attempts.length === 3));
    assert.ok(result.errors.every((item) => item.attempts.some((attempt) => attempt.code === "DNS_HTTP_ERROR")));
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
