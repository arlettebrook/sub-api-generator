import test from "node:test";
import assert from "node:assert/strict";
import {
  getRuntimeConfig,
  normalizeKvData,
  readJsonObject,
  validateApiPathPayload,
  validateConfigPayload,
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

test("validates custom API access paths", () => {
  assert.deepEqual(validateApiPathPayload({ "/my-api": true }), {
    "my-api": { enabled: true, remark: "" },
  });
  assert.throws(() => validateApiPathPayload({ "admin": true }), /访问路径无效/);
  assert.throws(() => validateApiPathPayload({ "bad/path": true }), /访问路径无效/);
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
