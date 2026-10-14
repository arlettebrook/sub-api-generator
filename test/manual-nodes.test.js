import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalizeManualNodeLine,
  compareManualEntries,
  formatManualEntry,
  ipv6SortKey,
  isIpv4Literal,
  isIpv6Literal,
  normalizeManualNodeLine,
  parseManualEntry,
  pickManualNodeLines,
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


test("parses bare IPv6 entries that carry an inline port", () => {
  // 用户直接粘贴的写法：不带方括号的 IPv6 末尾可以接端口。
  assert.deepEqual(parseManualEntry("2a0e:97c0:3f0:1::156b:443"), { host: "2a0e:97c0:3f0:1::156b", port: "443", remark: "" });
  assert.deepEqual(parseManualEntry("2a0e:97c0:3f0:1::156b:8443"), { host: "2a0e:97c0:3f0:1::156b", port: "8443", remark: "" });
  assert.deepEqual(parseManualEntry("2a0e:97c0:3f0:1::156b:443#香港"), { host: "2a0e:97c0:3f0:1::156b", port: "443", remark: "香港" });
  // 去掉 “:端口” 后不是合法 IPv6 时整段按地址解析：末段是纯数字的地址请写方括号。
  assert.deepEqual(parseManualEntry("2a0e:97c0:3f0:1::1234"), { host: "2a0e:97c0:3f0:1::1234", port: "443", remark: "" });
  assert.deepEqual(parseManualEntry("2a0e:97c0:3f0:1::156b:0"), { host: "2a0e:97c0:3f0:1::156b:0", port: "443", remark: "" });
  assert.deepEqual(parseManualEntry("[2a0e:97c0:3f0:1::1234]:8443"), { host: "2a0e:97c0:3f0:1::1234", port: "8443", remark: "" });
  // IPv4 混写的大小写写法都能识别。
  assert.deepEqual(parseManualEntry("::FFFF:1.2.3.4"), { host: "::FFFF:1.2.3.4", port: "443", remark: "" });
});

test("deduplicates equivalent IPv6 writings through the canonical form", () => {
  // “带 443 端口”“不带端口”“带方括号”都整理成同一条，一键排序因此能去重。
  const canonical = [...new Set([
    "2a0e:97c0:3f0:1::156b:443",
    "2a0e:97c0:3f0:1::156b",
    "2a0e:97c0:3f0:1::156b",
    "[2a0e:97c0:3f0:1::156b]:443",
  ].map((line) => canonicalizeManualNodeLine(line)))];
  assert.deepEqual(canonical, ["2a0e:97c0:3f0:1::156b"]);
  assert.equal(canonicalizeManualNodeLine("2a0e:97c0:3f0:1::156b:443"), "2a0e:97c0:3f0:1::156b");
  // 非 443 端口保留方括号，避免和地址自身的冒号混淆。
  assert.equal(canonicalizeManualNodeLine("2a0e:97c0:3f0:1::156b:8443"), "[2a0e:97c0:3f0:1::156b]:8443");
});

test("builds fixed-width IPv6 sort keys for numeric ordering", () => {
  assert.equal(ipv6SortKey("2a0e:97c0:3f0:1::156b"), "2a0e97c003f00001000000000000156b");
  assert.equal(ipv6SortKey("2a0e:97c0:3f0:1::46e"), "2a0e97c003f00001000000000000046e");
  assert.equal(ipv6SortKey("::1"), "00000000000000000000000000000001");
  // 按 128 位数值比较：46e < 156b（按字符串比较会得出 “156b” < “46e” 的反向结果）。
  assert.ok(ipv6SortKey("2a0e:97c0:3f0:1::46e") < ipv6SortKey("2a0e:97c0:3f0:1::156b"));
  // 尾部 IPv4 混写和 zone id 也能展开。
  assert.equal(ipv6SortKey("::FFFF:1.2.3.4"), "00000000000000000000ffff01020304");
  assert.equal(ipv6SortKey("fe80::1%eth0"), "fe800000000000000000000000000001");
  // 非 IPv6 没有排序键，排序时退回字符串比较。
  assert.equal(ipv6SortKey("104.156.239.15"), null);
  assert.equal(ipv6SortKey("example.com"), null);
});

test("keeps IPv4, IPv6 and domain groups separated when sorting", () => {
  // IPv4 在前、IPv6 其次、域名最后，输入顺序错乱也不会混在一起。
  const sorted = [
    "example.com",
    "2a0e:97c0:3f0:1::156b:443",
    "104.156.239.15:443#美国",
    "2a0e:97c0:3f0:1::46e",
    "1.2.3.4",
    "www.example.com:8443",
  ].map((line) => parseManualEntry(line)).sort(compareManualEntries).map(formatManualEntry);
  assert.deepEqual(sorted, [
    "1.2.3.4",
    "104.156.239.15#美国",
    "2a0e:97c0:3f0:1::46e",
    "2a0e:97c0:3f0:1::156b",
    "example.com",
    "www.example.com:8443",
  ]);
});


test("picks IPv4 or IPv6 lines for the manual preferred copy menu", () => {
  const content = [
    "# 注释行不算条目",
    "1.1.1.1",
    "example.com:8443#备用",
    "104.156.239.15:443#美国",
    "2a0e:97c0:3f0:1::156b:443",
    "[2a0e:97c0:3f0:1::156b]:8443#v6",
    "::1",
    "1.1.1.1:443",
    "   ",
  ].join("\n");
  // 只留对应地址族，并整理成规范写法：保留非 443 端口和备注、省略 443 端口，
  // 所以 1.1.1.1 与 1.1.1.1:443、2a0e:97c0:3f0:1::156b:443 与不带端口的写法都会合并成一条。
  assert.deepEqual(pickManualNodeLines(content, "ipv4"), ["1.1.1.1", "104.156.239.15#美国"]);
  assert.deepEqual(pickManualNodeLines(content, "ipv6"), [
    "2a0e:97c0:3f0:1::156b",
    "[2a0e:97c0:3f0:1::156b]:8443#v6",
    "::1",
  ]);
  // 域名、注释和空行都不属于 IPv4/IPv6。
  assert.deepEqual(pickManualNodeLines("example.com\n# 注释\n", "ipv4"), []);
  assert.deepEqual(pickManualNodeLines("", "ipv6"), []);
});
