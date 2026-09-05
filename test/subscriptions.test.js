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
    assert.match(decodeURIComponent(response.headers.get("x-source-errors")), /broken\.example\.com/);
    assert.equal(await response.text(), "");

    const cachedResponse = await handleRoot(runtime);
    assert.match(decodeURIComponent(cachedResponse.headers.get("x-source-errors")), /HTTP 503/);
    assert.equal(fetchCount, 6, "failed empty results should not be cached and each request retries upstream");
  } finally {
    clearAggregateCache();
    globalThis.fetch = originalFetch;
  }
});
