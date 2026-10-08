import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_IP_REMARK_TEMPLATE,
  defaultIpRemarkSettings,
  getRuntimeConfig,
  normalizeBlacklist,
  normalizeFilterRules,
  normalizeIpRemarkSettings,
  normalizeSettings,
  normalizeKvData,
  normalizeSourceFilterFields,
  normalizeSourceKey,
  readJsonObject,
  validateApiPathPayload,
  validateConfigPayload,
  validateBlacklistPayload,
  validateIpRemarkSettings,
  validateSourceFilterFields,
  validateSettingsPayload,
} from "../src/config.js";

const kv = { get() {}, put() {} };

test("normalizes legacy boolean KV entries", () => {
  assert.deepEqual(normalizeKvData({
    "one.example": true,
    "two.example": { enabled: false, remark: "test" },
    "three.example": { enabled: "no", remark: "kept" },
    ignored: "invalid",
  }), {
    "one.example": { remark: "" },
    "two.example": { remark: "test", enabled: false },
    "three.example": { remark: "kept" },
  });
});

test("preserves source-level filter rules while normalizing configuration", () => {
  const source = {
    "edge.example": {
      remark: "边缘",
      enabled: false,
      blacklist: [" Blocked ", "blocked"],
      filterRules: [" | "],
    },
  };
  assert.deepEqual(normalizeKvData(source, "subs"), {
    "edge.example": {
      remark: "边缘",
      blacklist: ["Blocked"],
      filterRules: ["|"],
      enabled: false,
    },
  });
  assert.deepEqual(validateConfigPayload(source, "subs"), {
    "edge.example": {
      remark: "边缘",
      enabled: false,
      blacklist: ["Blocked"],
      filterRules: ["|"],
    },
  });
});

test("validates and normalizes configuration payloads", () => {
  assert.deepEqual(validateConfigPayload({
    "one.example": true,
    "two.example": { enabled: 1, remark: "x".repeat(250) },
    "three.example": { enabled: false, remark: "y" },
  }), {
    "one.example": { remark: "" },
    "two.example": { remark: "x".repeat(200) },
    "three.example": { remark: "y", enabled: false },
  });
  assert.throws(() => validateConfigPayload([]), /配置必须是 JSON 对象/);
  assert.throws(() => validateConfigPayload({ bad: null }), /配置项无效/);
});

test("normalizes blacklist entries and uses an empty default", () => {
  assert.deepEqual(normalizeBlacklist([" foo ", "FOO", "", 1, "bar"]), ["foo", "bar"]);
  assert.deepEqual(normalizeBlacklist(null), []);
  assert.deepEqual(validateBlacklistPayload([" foo ", "FOO", "bar"]), ["foo", "bar"]);
  assert.throws(() => validateBlacklistPayload({}), /字符串数组/);
  assert.throws(() => validateBlacklistPayload([""]), /非空字符串/);
});

test("normalizes configurable remark filter rules", () => {
  assert.deepEqual(normalizeFilterRules([" 🐲 ", "🐲", "", 1, "-VIP"]), ["🐲", "-VIP"]);
  const defaults = normalizeFilterRules(null);
  assert.deepEqual(defaults, []);
});

test("normalizes and validates source-level filter rules", () => {
  assert.deepEqual(normalizeSourceFilterFields({
    blacklist: [" Blocked ", "blocked"],
    filterRules: [" | ", "|"],
    ignored: true,
  }), {
    blacklist: ["Blocked"],
    filterRules: ["|"],
  });
  assert.deepEqual(validateSourceFilterFields({
    blacklist: ["Blocked"],
    filterRules: ["|"],
  }), {
    blacklist: ["Blocked"],
    filterRules: ["|"],
  });
  assert.throws(() => validateSourceFilterFields({ blacklist: "Blocked" }), /字符串数组/);
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
    "e.ye.gs": { remark: "" },
  });
  assert.deepEqual(normalizeKvData({ "HTTPS://API.Example.COM/v1": true }, "apis"), {
    "https://api.example.com/v1": { remark: "" },
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
      blacklist: [],
      filterRules: [],
    },
  });
  assert.throws(() => validateApiPathPayload({ "admin": true }), /访问路径无效/);
  assert.throws(() => validateApiPathPayload({ "bad/path": true }), /访问路径无效/);
  assert.deepEqual(Object.keys(validateApiPathPayload({ "/@MikuNaNChannel": true })), ["@MikuNaNChannel"]);
  assert.deepEqual(Object.keys(validateApiPathPayload({ "@channel": true })), ["@channel"]);
  assert.throws(() => validateApiPathPayload({ "bad@path/x": true }), /访问路径无效/);
  assert.deepEqual(validateApiPathPayload({
    first: { enabled: true },
    second: { enabled: true, sources: null },
  }), {
    first: { enabled: true, remark: "", sourceMode: "all", sources: [], blacklist: [], filterRules: [] },
    second: { enabled: true, remark: "", sourceMode: "all", sources: [], blacklist: [], filterRules: [] },
  });
});

test("normalizes optional custom API result suffix settings", () => {
  assert.deepEqual(validateApiPathPayload({
    "suffix-api": {
      enabled: true,
      prefix: "VIP-",
      suffix: "-后缀",
    },
  })["suffix-api"], {
    enabled: true,
    remark: "",
    prefix: "VIP-",
    suffix: "-后缀",
    sourceMode: "all",
    sources: [],
    blacklist: [],
    filterRules: [],
  });
});

test("rejects unsafe custom API output labels and unknown strategies", () => {
  assert.throws(() => validateApiPathPayload({ safe: { suffix: "bad\nvalue" } }), /控制字符/);
  assert.throws(() => validateApiPathPayload({ safe: { suffixStrategy: "unknown" } }), /追加策略无效/);
});

test("reads and validates JSON request bodies", async () => {
  const request = new Request("https://example.test/api/subs", {
    method: "POST",
    body: JSON.stringify({ "one.example": true }),
    headers: { "content-type": "application/json" },
  });
  assert.deepEqual(await readJsonObject(request), {
    "one.example": { remark: "" },
  });
});

test("requires Pages runtime configuration", () => {
  assert.match(getRuntimeConfig({}).error, /KV/);
  assert.match(getRuntimeConfig({ KV: kv }).error, /PASSWORD/);
  assert.deepEqual(getRuntimeConfig({ KV: kv, LEGACY_PATH: "ignored", PASSWORD: "secret" }), {
    password: "secret",
  });
});

test("normalizes camouflage settings with a disabled default", () => {
  assert.deepEqual(normalizeSettings(null), {
    enabled: false,
    accessPath: "",
    redirectUrl: "/",
    ipRemark: { enabled: false, endpoint: "", template: DEFAULT_IP_REMARK_TEMPLATE },
  });
  assert.deepEqual(validateSettingsPayload({
    enabled: true,
    accessPath: "/secure-admin/",
    redirectUrl: "https://example.com/landing",
  }), {
    enabled: true,
    accessPath: "secure-admin",
    redirectUrl: "https://example.com/landing",
    ipRemark: { enabled: false, endpoint: "", template: DEFAULT_IP_REMARK_TEMPLATE },
  });
  assert.throws(() => validateSettingsPayload({ enabled: true, accessPath: "bad/path" }), /管理入口路径无效/);
  assert.throws(() => validateSettingsPayload({ redirectUrl: "javascript:alert(1)" }), /跳转地址无效/);
});

test("normalizes and validates preferred IP auto-remark settings", () => {
  assert.deepEqual(normalizeSettings(null).ipRemark, { enabled: false, endpoint: "", template: DEFAULT_IP_REMARK_TEMPLATE });
  // 空模板回退到默认值，接口地址去掉首尾空白。
  assert.deepEqual(normalizeIpRemarkSettings({ enabled: true, endpoint: "  https://ip.example/lookup  ", template: "   " }), {
    enabled: true,
    endpoint: "https://ip.example/lookup",
    template: DEFAULT_IP_REMARK_TEMPLATE,
  });
  // 非法接口地址会被安全地回退成默认值，不抛错。
  assert.deepEqual(normalizeIpRemarkSettings({ enabled: true, endpoint: "ftp://nope" }), defaultIpRemarkSettings());
  assert.deepEqual(normalizeIpRemarkSettings({ enabled: true, endpoint: "not a url" }), defaultIpRemarkSettings());
  // 保存流程使用严格校验，非法输入抛出中文错误。
  assert.throws(() => validateIpRemarkSettings({ endpoint: "ftp://nope" }), /http\(s\)/);
  assert.throws(() => validateIpRemarkSettings({ endpoint: "https://bad\n.example" }), /控制字符/);
  assert.throws(() => validateIpRemarkSettings({ endpoint: 123 }), /字符串/);
  assert.throws(() => validateIpRemarkSettings({ template: "x".repeat(200) }), /备注模板不能超过/);
  assert.deepEqual(validateIpRemarkSettings({ enabled: true, endpoint: "", template: "{city} {isp}" }), {
    enabled: true,
    endpoint: "",
    template: "{city} {isp}",
  });
});

test("merges camouflage and auto-remark settings without clobbering each other", () => {
  const existing = {
    enabled: true,
    accessPath: "secure-admin",
    redirectUrl: "https://example.com/landing",
    ipRemark: { enabled: true, endpoint: "http://ip-api.com/batch", template: "{country} {isp}" },
  };
  // 只提交伪装字段时保留已有的自动备注配置。
  assert.deepEqual(validateSettingsPayload({ enabled: false, accessPath: "", redirectUrl: "/" }, existing), {
    enabled: false,
    accessPath: "",
    redirectUrl: "/",
    ipRemark: { enabled: true, endpoint: "http://ip-api.com/batch", template: "{country} {isp}" },
  });
  // 只提交 ipRemark 时保留已有的伪装配置。
  assert.deepEqual(validateSettingsPayload({ ipRemark: { enabled: true, endpoint: "", template: "{city}" } }, existing), {
    enabled: true,
    accessPath: "secure-admin",
    redirectUrl: "https://example.com/landing",
    ipRemark: { enabled: true, endpoint: "", template: "{city}" },
  });
  assert.throws(() => validateSettingsPayload({}, existing), /设置内容无效/);
});
