import test from "node:test";
import assert from "node:assert/strict";
import {
  getRuntimeConfig,
  normalizeBlacklist,
  normalizeFilterRules,
  normalizeKvData,
  normalizeSourceKey,
  readJsonObject,
  validateApiPathPayload,
  validateConfigPayload,
  validateBlacklistPayload,
} from "../src/config.js";

const kv = { get() {}, put() {} };

test("normalizes legacy boolean KV entries", () => {
  assert.deepEqual(normalizeKvData({
    "one.example": true,
    "two.example": { enabled: false, remark: "test" },
    ignored: "invalid",
  }), {
    "one.example": { enabled: true, remark: "" },
    "two.example": { enabled: false, remark: "test" },
  });
});

test("validates and normalizes configuration payloads", () => {
  assert.deepEqual(validateConfigPayload({
    "one.example": true,
    "two.example": { enabled: 1, remark: "x".repeat(250) },
  }), {
    "one.example": { enabled: true, remark: "" },
    "two.example": { enabled: false, remark: "x".repeat(200) },
  });
  assert.throws(() => validateConfigPayload([]), /配置必须是 JSON 对象/);
  assert.throws(() => validateConfigPayload({ bad: null }), /配置项无效/);
});

test("normalizes blacklist entries and falls back to defaults", () => {
  assert.deepEqual(normalizeBlacklist([" foo ", "FOO", "", 1, "bar"]), ["foo", "bar"]);
  assert.ok(normalizeBlacklist(null).length > 0);
  assert.deepEqual(validateBlacklistPayload([" foo ", "FOO", "bar"]), ["foo", "bar"]);
  assert.throws(() => validateBlacklistPayload({}), /字符串数组/);
  assert.throws(() => validateBlacklistPayload([""]), /非空字符串/);
});

test("normalizes configurable remark filter rules", () => {
  assert.deepEqual(normalizeFilterRules([" 🐲 ", "🐲", "", 1, "-VIP"]), ["🐲", "-VIP"]);
  assert.ok(normalizeFilterRules(null).includes("符号"));
});

test("normalizes source identifiers at the configuration boundary", () => {
  assert.equal(normalizeSourceKey("subs", " HTTPS://E.YE.GS/// "), "e.ye.gs");
  assert.equal(normalizeSourceKey("apis", " HTTPS://API.Example.COM/v1 "), "https://api.example.com/v1");
  assert.deepEqual(validateApiPathPayload({
    "source-test": {
      enabled: true,
      sourceMode: "selected",
      sources: [
        { type: "subs", key: "https://E.YE.GS/" },
        { type: "subs", key: "e.ye.gs" },
        { type: "apis", key: "HTTPS://API.Example.COM/v1" },
      ],
    },
  })["source-test"].sources, [
    { type: "subs", key: "e.ye.gs" },
    { type: "apis", key: "https://api.example.com/v1" },
  ]);
});

test("normalizes subscription and API source configuration keys", () => {
  assert.deepEqual(normalizeKvData({ "https://E.YE.GS/": true }, "subs"), {
    "e.ye.gs": { enabled: true, remark: "" },
  });
  assert.deepEqual(normalizeKvData({ "HTTPS://API.Example.COM/v1": true }, "apis"), {
    "https://api.example.com/v1": { enabled: true, remark: "" },
  });
  assert.throws(() => validateConfigPayload({
    "e.ye.gs": true,
    "https://E.YE.GS/": true,
  }, "subs"), /配置键重复/);
});

test("validates custom API access paths", () => {
  assert.deepEqual(validateApiPathPayload({ "/my-api": {
    enabled: true,
    remark: "测试",
    sources: [
      { type: "subs", key: "sub.example.com" },
      { type: "apis", key: "https://api.example.com" },
      { type: "subs", key: "sub.example.com" },
    ],
  } }), {
    "my-api": {
      enabled: true,
      remark: "测试",
      sourceMode: "selected",
      sources: [
        { type: "subs", key: "sub.example.com" },
        { type: "apis", key: "https://api.example.com" },
      ],
    },
  });
  assert.throws(() => validateApiPathPayload({ "admin": true }), /访问路径无效/);
  assert.throws(() => validateApiPathPayload({ "bad/path": true }), /访问路径无效/);
  assert.deepEqual(validateApiPathPayload({
    first: { enabled: true },
    second: { enabled: true, sources: null },
  }), {
    first: { enabled: true, remark: "", sourceMode: "all-enabled", sources: [] },
    second: { enabled: true, remark: "", sourceMode: "all-enabled", sources: [] },
  });
});

test("reads and validates JSON request bodies", async () => {
  const request = new Request("https://example.test/api/subs", {
    method: "POST",
    body: JSON.stringify({ "one.example": true }),
    headers: { "content-type": "application/json" },
  });
  assert.deepEqual(await readJsonObject(request), {
    "one.example": { enabled: true, remark: "" },
  });
});

test("requires Pages runtime configuration", () => {
  assert.match(getRuntimeConfig({}).error, /KV/);
  assert.match(getRuntimeConfig({ KV: kv }).error, /UUID/);
  assert.match(getRuntimeConfig({ KV: kv, UUID: "bad/path", PASSWORD: "secret" }).error, /UUID/);
  assert.deepEqual(getRuntimeConfig({ KV: kv, UUID: "test-sub", PASSWORD: "secret" }), {
    uuid: "test-sub",
    password: "secret",
  });
});
