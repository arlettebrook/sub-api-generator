import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalizeManualNodeLine,
  compareManualEntries,
  formatManualEntry,
  isIpv4Literal,
  isIpv6Literal,
  normalizeManualNodeLine,
  parseManualEntry,
} from "../src/manual-nodes.js";

test("detects address literals", () => {
  assert.equal(isIpv4Literal("1.2.3.4"), true);
  assert.equal(isIpv4Literal("255.255.255.255"), true);
  assert.equal(isIpv4Literal("1.2.3.256"), false);
  assert.equal(isIpv4Literal("1.2.3"), false);
  assert.equal(isIpv4Literal("1.2.3.4.5"), false);
  assert.equal(isIpv4Literal("example.com"), false);
  // IPv6 支持缩写、尾部 IPv4 混写和 zone id。
  assert.equal(isIpv6Literal("2a0a:d687:f001::d8"), true);
  assert.equal(isIpv6Literal("::1"), true);
  assert.equal(isIpv6Literal("::ffff:1.2.3.4"), true);
  assert.equal(isIpv6Literal("fe80::1%eth0"), true);
  assert.equal(isIpv6Literal("1.2.3.4"), false);
  assert.equal(isIpv6Literal("example.com"), false);
});

test("parses manual entries with optional port and remark", () => {
  assert.deepEqual(parseManualEntry("1.2.3.4:8443#香港"), { host: "1.2.3.4", port: "8443", remark: "香港" });
  // 省略端口时默认 443，省略备注也能识别。
  assert.deepEqual(parseManualEntry("  www.example.com  "), { host: "www.example.com", port: "443", remark: "" });
  assert.deepEqual(parseManualEntry("1.2.3.4#备注"), { host: "1.2.3.4", port: "443", remark: "备注" });
  // IPv6 可以带方括号，也可以不带方括号；不带方括号时只能用默认端口。
  assert.deepEqual(parseManualEntry("[2001:db8::1]:8443#v6"), { host: "2001:db8::1", port: "8443", remark: "v6" });
  assert.deepEqual(parseManualEntry("[2001:db8::1]"), { host: "2001:db8::1", port: "443", remark: "" });
  assert.deepEqual(parseManualEntry("2a0a:d687:f001::d8"), { host: "2a0a:d687:f001::d8", port: "443", remark: "" });
  assert.deepEqual(parseManualEntry("2a0a:d687:f001::d8#IPv6"), { host: "2a0a:d687:f001::d8", port: "443", remark: "IPv6" });
  // 端口去掉前导零，避免同一条节点出现多种写法。
  assert.deepEqual(parseManualEntry("1.2.3.4:0443"), { host: "1.2.3.4", port: "443", remark: "" });
  // 空行、纯备注、非法端口和无效文本都解析不出节点。
  assert.equal(parseManualEntry(""), null);
  assert.equal(parseManualEntry("   "), null);
  assert.equal(parseManualEntry("#只有备注"), null);
  assert.equal(parseManualEntry("1.2.3.4:0"), null);
  assert.equal(parseManualEntry("1.2.3.4:70000"), null);
  assert.equal(parseManualEntry("1.2.3.4:8443extra"), null);
  assert.equal(parseManualEntry("not-an-entry"), null);
});

test("formats manual entries without the default 443 port or IPv6 brackets", () => {
  assert.equal(formatManualEntry({ host: "1.2.3.4", port: "443", remark: "美国01" }), "1.2.3.4#美国01");
  assert.equal(formatManualEntry({ host: "1.2.3.4", port: "8443", remark: "" }), "1.2.3.4:8443");
  assert.equal(formatManualEntry({ host: "2001:db8::1", port: "443", remark: "v6" }), "2001:db8::1#v6");
  // 带其它端口时 IPv6 必须保留方括号，否则 “地址:端口” 的冒号会和地址自身的冒号混淆。
  assert.equal(formatManualEntry({ host: "2001:db8::1", port: "8443", remark: "" }), "[2001:db8::1]:8443");
  assert.equal(formatManualEntry({ host: "example.com" }), "example.com");
  assert.equal(formatManualEntry({ host: "" }), "");
});

test("canonicalizes manual lines for storage and display", () => {
  assert.equal(canonicalizeManualNodeLine("104.156.239.15:443#美国01"), "104.156.239.15#美国01");
  assert.equal(canonicalizeManualNodeLine("1.2.3.4:443"), "1.2.3.4");
  assert.equal(canonicalizeManualNodeLine("1.2.3.4:0443"), "1.2.3.4");
  assert.equal(canonicalizeManualNodeLine("[2602:100:1234::d8]:443#v6"), "2602:100:1234::d8#v6");
  assert.equal(canonicalizeManualNodeLine("2a0a:d687:f001::d8"), "2a0a:d687:f001::d8");
  assert.equal(canonicalizeManualNodeLine("  www.example.com#AI  "), "www.example.com#AI");
  // 非 443 端口保持原样。
  assert.equal(canonicalizeManualNodeLine("1.2.3.4:8443#企业"), "1.2.3.4:8443#企业");
  assert.equal(canonicalizeManualNodeLine("[2001:db8::1]:8443#v6"), "[2001:db8::1]:8443#v6");
  // 无法识别的行只去掉首尾空白，交由过滤流程判为无效。
  assert.equal(canonicalizeManualNodeLine("  not-an-entry  "), "not-an-entry");
  assert.equal(canonicalizeManualNodeLine("   "), "");
});

test("normalizes manual node lines into address:port form", () => {
  assert.equal(normalizeManualNodeLine("www.example.com"), "www.example.com:443");
  assert.equal(normalizeManualNodeLine("www.example.com#香港"), "www.example.com:443#香港");
  assert.equal(normalizeManualNodeLine("1.2.3.4"), "1.2.3.4:443");
  assert.equal(normalizeManualNodeLine("[2001:db8::1]"), "[2001:db8::1]:443");
  assert.equal(normalizeManualNodeLine("2a0a:d687:f001::d8"), "[2a0a:d687:f001::d8]:443");
  assert.equal(normalizeManualNodeLine("2a0a:d687:f001::d8#IPv6"), "[2a0a:d687:f001::d8]:443#IPv6");
  assert.equal(normalizeManualNodeLine("1.2.3.4:8443#企业"), "1.2.3.4:8443#企业");
  assert.equal(normalizeManualNodeLine("[2001:db8::1]:8443#v6"), "[2001:db8::1]:8443#v6");
  assert.equal(normalizeManualNodeLine("not-an-entry"), "not-an-entry");
});

test("sorts entries by address family, address value, port and remark", () => {
  const sorted = [
    "104.156.239.27:443#b",
    "2.2.2.2:8443#a",
    "104.156.239.15:443#b",
    "104.156.239.15:443#a",
    "[2a0a:d687:f001::d8]:443#v6",
    "1.2.3.4:443#a",
    "[2602:100:1234::d8]:443#v6",
    "example.com:8443#d",
    "example.com:443#d",
  ]
    .map((line) => parseManualEntry(line))
    .sort(compareManualEntries)
    .map((entry) => formatManualEntry(entry));
  assert.deepEqual(sorted, [
    // IPv4 按每段数值排序，不按字符串比较（104 排在 2 之后是因为 2 < 104）。
    "1.2.3.4#a",
    "2.2.2.2:8443#a",
    "104.156.239.15#a",
    "104.156.239.15#b",
    "104.156.239.27#b",
    // IPv6 用大小写无关的地址字符串排序。
    "2602:100:1234::d8#v6",
    "2a0a:d687:f001::d8#v6",
    // 域名排在最后，先比端口再比备注。
    "example.com#d",
    "example.com:8443#d",
  ]);
});
