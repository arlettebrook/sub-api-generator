import test from "node:test";
import assert from "node:assert/strict";
import { clearAggregateCache, fetchPreferredSubs, filterPreferredIps, handleRoot } from "../src/subscriptions.js";

test("filters invalid, blacklisted, and duplicate nodes", () => {
  assert.deepEqual(filterPreferredIps([
    "1.2.3.4:443#good",
    "1.2.3.4:443#good",
    "5.6.7.8:8443#telegram",
    "not-a-node",
    "9.9.9.9:443#good @extra",
  ]), ["1.2.3.4:443#good", "9.9.9.9:443#good"]);
});

test("parses Base64 responses from preferred subscription providers", async () => {
  const originalFetch = globalThis.fetch;
  const source = [
    "vless://00000000-0000-4000-8000-000000000000@43.129.217.38:443?security=tls&sni=example.com#CN",
    "vless://00000000-0000-4000-8000-000000000000@43.161.236.173:8443?security=tls&sni=example.com#HK",
  ].join("\n");
  globalThis.fetch = async (url) => {
    assert.equal(url, "https://e.ye.gs/sub?host=example.com&uuid=00000000-0000-4000-8000-000000000000");
    return new Response(btoa(source), { status: 200 });
  };
  try {
    assert.deepEqual(await fetchPreferredSubs("e.ye.gs"), [
      "43.129.217.38:443#CN",
      "43.161.236.173:8443#HK",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("removes emoji and trademark symbols attached to preferred remarks", async () => {
  const originalFetch = globalThis.fetch;
  const remark = encodeURIComponent("HK🐲™️");
  const source = `vless://00000000-0000-4000-8000-000000000000@8.218.36.133:9010?security=tls&sni=example.com#${remark}`;
  globalThis.fetch = async () => new Response(btoa(source), { status: 200 });
  try {
    assert.deepEqual(await fetchPreferredSubs("e.ye.gs"), ["8.218.36.133:9010#HK"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("decodes Base64 responses from API sources", async () => {
  const originalFetch = globalThis.fetch;
  const source = "vless://00000000-0000-4000-8000-000000000000@43.129.217.38:443?security=tls&sni=example.com#API";
  globalThis.fetch = async () => new Response(btoa(source), { status: 200 });
  const runtime = {
    KV: {
      async get(key) {
        if (key === "subs") return {};
        if (key === "apis") return { "https://api.example/source": { enabled: true } };
        return null;
      },
    },
  };
  try {
    clearAggregateCache();
    const response = await handleRoot(runtime, [{ type: "apis", key: "https://api.example/source" }]);
    assert.match(await response.text(), /vless:\/\/00000000-0000-4000-8000-000000000000@43\.129\.217\.38:443/);
  } finally {
    clearAggregateCache();
    globalThis.fetch = originalFetch;
  }
});

test("filters blacklisted API source lines while preserving allowed output", async () => {
  const originalFetch = globalThis.fetch;
  const values = {
    subs: {},
    apis: { "https://api.example/source": { enabled: true } },
    blacklist: ["blocked"],
  };
  globalThis.fetch = async () => new Response([
    "trojan://blocked.example:443#blocked",
    "trojan://allowed.example:443#allowed",
  ].join("\n"), { status: 200 });
  const runtime = { KV: { async get(key) { return values[key] ?? null; } } };
  try {
    clearAggregateCache();
    const response = await handleRoot(runtime, [{ type: "apis", key: "https://api.example/source" }]);
    assert.equal(await response.text(), "trojan://allowed.example:443#allowed");
  } finally {
    clearAggregateCache();
    globalThis.fetch = originalFetch;
  }
});

test("applies configurable remark filter rules to preferred sources", async () => {
  const originalFetch = globalThis.fetch;
  const source = "vless://00000000-0000-4000-8000-000000000000@8.218.36.133:9010?security=tls&sni=example.com#HK-VIP";
  globalThis.fetch = async () => new Response(btoa(source), { status: 200 });
  const runtime = {
    KV: {
      async get(key) {
        if (key === "subs") return { "e.ye.gs": { enabled: true } };
        if (key === "apis") return {};
        if (key === "filter_rules") return ["-VIP"];
        return null;
      },
    },
  };
  try {
    clearAggregateCache();
    const response = await handleRoot(runtime);
    assert.equal(await response.text(), "8.218.36.133:9010#HK");
  } finally {
    clearAggregateCache();
    globalThis.fetch = originalFetch;
  }
});

test("matches selected subscription sources across protocol and slash variants", async () => {
  const originalFetch = globalThis.fetch;
  const source = "vless://00000000-0000-4000-8000-000000000000@43.129.217.38:443?security=tls&sni=example.com#API";
  globalThis.fetch = async () => new Response(btoa(source), { status: 200 });
  const runtime = {
    KV: {
      async get(key) {
        if (key === "subs") return { "https://e.ye.gs/": { enabled: true } };
        if (key === "apis") return {};
        return null;
      },
    },
  };
  try {
    clearAggregateCache();
    const response = await handleRoot(runtime, [{ type: "subs", key: "e.ye.gs" }]);
    assert.match(await response.text(), /43\.129\.217\.38:443/);
  } finally {
    clearAggregateCache();
    globalThis.fetch = originalFetch;
  }
});

test("allows custom APIs to use sources disabled for the UUID path", async () => {
  const originalFetch = globalThis.fetch;
  const source = "vless://00000000-0000-4000-8000-000000000000@43.129.217.38:443?security=tls&sni=example.com#API";
  globalThis.fetch = async () => new Response(btoa(source), { status: 200 });
  const runtime = {
    KV: {
      async get(key) {
        if (key === "subs") return { "e.ye.gs": { enabled: false } };
        if (key === "apis") return {};
        return null;
      },
    },
  };
  try {
    clearAggregateCache();
    const response = await handleRoot(runtime, [{ type: "subs", key: "e.ye.gs" }]);
    assert.match(await response.text(), /43\.129\.217\.38:443/);
  } finally {
    clearAggregateCache();
    globalThis.fetch = originalFetch;
  }
});

test("invalidates aggregate cache when blacklist configuration changes", async () => {
  const originalFetch = globalThis.fetch;
  const source = "vless://00000000-0000-4000-8000-000000000000@43.129.217.38:443?security=tls&sni=example.com#blocked";
  const values = {
    subs: { "e.ye.gs": { enabled: true } },
    apis: {},
    blacklist: ["blocked"],
  };
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(btoa(source), { status: 200 });
  };
  const runtime = { KV: { async get(key) { return values[key] ?? null; } } };
  try {
    clearAggregateCache();
    const first = await handleRoot(runtime);
    assert.equal(await first.text(), "");
    values.blacklist = [];
    const second = await handleRoot(runtime);
    assert.match(await second.text(), /43\.129\.217\.38:443/);
    assert.equal(calls, 2);
  } finally {
    clearAggregateCache();
    globalThis.fetch = originalFetch;
  }
});

test("reuses aggregate cache when selected source order changes", async () => {
  const originalFetch = globalThis.fetch;
  const values = {
    subs: {},
    apis: {
      "https://api.example/one": { enabled: true },
      "https://api.example/two": { enabled: true },
    },
    blacklist: [],
  };
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls += 1;
    return new Response(url.endsWith("/one") ? "1.2.3.4:443#one" : "5.6.7.8:443#two", { status: 200 });
  };
  const runtime = { KV: { async get(key) { return values[key] ?? null; } } };
  const firstSelection = [
    { type: "apis", key: "https://api.example/one" },
    { type: "apis", key: "https://api.example/two" },
  ];
  const secondSelection = [...firstSelection].reverse();
  try {
    clearAggregateCache();
    const first = await handleRoot(runtime, firstSelection);
    const second = await handleRoot(runtime, secondSelection);
    assert.match(await first.text(), /1\.2\.3\.4:443/);
    assert.match(await second.text(), /5\.6\.7\.8:443/);
    assert.equal(calls, 2);
  } finally {
    clearAggregateCache();
    globalThis.fetch = originalFetch;
  }
});

test("bounds aggregate cache entries and evicts the least recently used selection", async () => {
  const originalFetch = globalThis.fetch;
  const apis = Object.fromEntries(Array.from({ length: 129 }, (_, index) => [
    `https://api.example/${index}`,
    { enabled: true },
  ]));
  const runtime = {
    KV: {
      async get(key) {
        if (key === "subs") return {};
        if (key === "apis") return apis;
        if (key === "blacklist") return [];
        return null;
      },
    },
  };
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls += 1;
    const index = Number(new URL(url).pathname.slice(1));
    return new Response(`192.0.2.${(index % 254) + 1}:443#${index}`, { status: 200 });
  };
  try {
    clearAggregateCache();
    for (let index = 0; index < 129; index += 1) {
      await handleRoot(runtime, [{ type: "apis", key: `https://api.example/${index}` }]);
    }
    await handleRoot(runtime, [{ type: "apis", key: "https://api.example/0" }]);
    assert.equal(calls, 130);
  } finally {
    clearAggregateCache();
    globalThis.fetch = originalFetch;
  }
});

test("retries an empty preferred subscription response", async () => {
  const originalFetch = globalThis.fetch;
  const source = "vless://00000000-0000-4000-8000-000000000000@43.129.217.38:443?security=tls&sni=example.com#CN";
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(calls === 1 ? "" : btoa(source), { status: 200 });
  };
  try {
    assert.deepEqual(await fetchPreferredSubs("e.ye.gs"), ["43.129.217.38:443#CN"]);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("coalesces concurrent requests for the same preferred source", async () => {
  const originalFetch = globalThis.fetch;
  const source = "vless://00000000-0000-4000-8000-000000000000@43.129.217.38:443?security=tls&sni=example.com#CN";
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return new Response(btoa(source), { status: 200 });
  };
  try {
    const results = await Promise.all([
      fetchPreferredSubs("e.ye.gs"),
      fetchPreferredSubs("e.ye.gs"),
    ]);
    assert.deepEqual(results[0], results[1]);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reports failed sources without discarding healthy source output", async () => {
  const originalFetch = globalThis.fetch;
  const values = {
    subs: {
      "broken.example.com": { enabled: true, remark: "故障订阅源" },
    },
    apis: {},
  };
  let fetchCount = 0;
  globalThis.fetch = async () => {
    fetchCount += 1;
    return new Response("upstream unavailable", { status: 503 });
  };
  const runtime = {
    KV: {
      async get(key) { return values[key] ?? null; },
    },
  };
  try {
    clearAggregateCache();
    const response = await handleRoot(runtime);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-source-errors"), null);
    assert.equal(await response.text(), "");

    const cachedResponse = await handleRoot(runtime);
    assert.equal(cachedResponse.headers.get("x-source-errors"), null);
    assert.equal(fetchCount, 6, "failed empty results should not be cached and each request retries upstream");
  } finally {
    clearAggregateCache();
    globalThis.fetch = originalFetch;
  }
});

test("returns healthy output silently when one of multiple sources fails", async () => {
  const originalFetch = globalThis.fetch;
  const values = {
    subs: {},
    apis: {
      "https://api.example/healthy": { enabled: true },
      "https://api.example/broken": { enabled: true },
    },
  };
  globalThis.fetch = async (url) => {
    if (String(url).endsWith("/broken")) return new Response("unavailable", { status: 503 });
    return new Response("trojan://healthy.example:443#healthy", { status: 200 });
  };
  const runtime = { KV: { async get(key) { return values[key] ?? null; } } };
  try {
    clearAggregateCache();
    const response = await handleRoot(runtime);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "trojan://healthy.example:443#healthy");
    assert.equal(response.headers.get("x-source-errors"), null);
  } finally {
    clearAggregateCache();
    globalThis.fetch = originalFetch;
  }
});
