import test from "node:test";
import assert from "node:assert/strict";
import { fetchPreferredSubs, filterPreferredIps } from "../src/subscriptions.js";

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
