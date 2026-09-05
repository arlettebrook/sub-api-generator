import test from "node:test";
import assert from "node:assert/strict";
import { filterPreferredIps } from "../src/subscriptions.js";

test("filters invalid, blacklisted, and duplicate nodes", () => {
  assert.deepEqual(filterPreferredIps([
    "1.2.3.4:443#good",
    "1.2.3.4:443#good",
    "5.6.7.8:8443#telegram",
    "not-a-node",
    "9.9.9.9:443#good @extra",
  ]), ["1.2.3.4:443#good", "9.9.9.9:443#good"]);
});
