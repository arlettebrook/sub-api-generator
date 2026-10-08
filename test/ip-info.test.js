import test from "node:test";
import assert from "node:assert/strict";
import {
  applyIpRemarks,
  clearIpInfoCache,
  formatIpRemark,
  isIpLiteral,
  lookupIpInfo,
} from "../src/ip-info.js";

function jsonResponse(body, ok = true) {
  return { ok, async json() { return body; } };
}

test("recognizes IPv4 and IPv6 literals", () => {
  assert.equal(isIpLiteral("1.2.3.4"), true);
  assert.equal(isIpLiteral("255.255.255.255"), true);
  assert.equal(isIpLiteral("256.1.1.1"), false);
  assert.equal(isIpLiteral("2001:db8::1"), true);
  assert.equal(isIpLiteral("edge.example.com"), false);
  assert.equal(isIpLiteral(""), false);
});

test("renders remarks from the template", () => {
  const info = { country: "美国", countryCode: "US", region: "加州", city: "圣何塞", isp: "Cloudflare, Inc.", org: "", as: "AS13335" };
  assert.equal(formatIpRemark(info, "{country} {isp}"), "美国 Cloudflare, Inc.");
  assert.equal(formatIpRemark(info, "{countryCode}-{city}-{as}"), "US-圣何塞-AS13335");
  // 未知占位符与空字段会被省略，避免多余空白。
  assert.equal(formatIpRemark(info, "{unknown} {org} {city}"), "圣何塞");
  // 空模板回退到默认模板，非对象返回空字符串。
  assert.equal(formatIpRemark(info, ""), "美国 Cloudflare, Inc.");
  assert.equal(formatIpRemark(null, "{country}"), "");
  // # 会破坏 ip:port#remark 结构，必须被清理掉。
  assert.equal(formatIpRemark({ country: "美国", isp: "A#B" }, "{country} {isp}"), "美国 A B");
});

test("caches lookups per endpoint and ip", async () => {
  clearIpInfoCache();
  let calls = 0;
  const fetchImpl = async (url, init) => {
    calls += 1;
    const ips = JSON.parse(init.body);
    return jsonResponse(ips.map((ip) => ({ status: "success", query: ip, country: "日本", isp: "Example" })));
  };
  const first = await lookupIpInfo(["9.9.9.9"], {}, fetchImpl);
  assert.equal(first.get("9.9.9.9").country, "日本");
  const second = await lookupIpInfo(["9.9.9.9"], {}, fetchImpl);
  assert.equal(second.get("9.9.9.9").country, "日本");
  assert.equal(calls, 1);
});

test("supports single-IP endpoints via the {ip} placeholder", async () => {
  clearIpInfoCache();
  const seen = [];
  const fetchImpl = async (url) => {
    seen.push(String(url));
    return jsonResponse({ status: "success", country: "新加坡", isp: "SG" });
  };
  const map = await lookupIpInfo(["8.8.8.8"], { endpoint: "https://ip.example/{ip}" }, fetchImpl);
  assert.deepEqual(seen, ["https://ip.example/8.8.8.8"]);
  assert.equal(map.get("8.8.8.8").country, "新加坡");
});

test("adds remarks only to nodes that have none", async () => {
  clearIpInfoCache();
  const bodies = [];
  const fetchImpl = async (url, init) => {
    const ips = JSON.parse(init.body);
    bodies.push(ips);
    return jsonResponse(ips.map((ip) => ({ status: "success", query: ip, country: "美国", isp: "Cloudflare, Inc." })));
  };
  const values = ["1.2.3.4:443", "5.6.7.8:443#已有备注", "1.2.3.4:443"];
  const next = await applyIpRemarks(values, { enabled: true, endpoint: "", template: "{country} {isp}" }, fetchImpl);
  assert.deepEqual(next, ["1.2.3.4:443#美国 Cloudflare, Inc.", "5.6.7.8:443#已有备注", "1.2.3.4:443#美国 Cloudflare, Inc."]);
  // 同一个 IP 只查询一次，已有备注的 IP 不参与查询。
  assert.deepEqual(bodies, [["1.2.3.4"]]);
});

test("adds remarks to IPv6 nodes", async () => {
  clearIpInfoCache();
  const fetchImpl = async (url, init) => jsonResponse(JSON.parse(init.body).map((ip) => ({ status: "success", query: ip, country: "德国", isp: "Hetzner" })));
  const values = ["[2001:db8::1]:443"];
  const next = await applyIpRemarks(values, { enabled: true, template: "{country}" }, fetchImpl);
  assert.deepEqual(next, ["[2001:db8::1]:443#德国"]);
});

test("returns the original array when disabled or when the lookup fails", async () => {
  clearIpInfoCache();
  const values = ["1.2.3.4:443"];
  assert.equal(await applyIpRemarks(values, { enabled: false }, async () => { throw new Error("should not be called"); }), values);
  const failing = async () => { throw new Error("network down"); };
  assert.equal(await applyIpRemarks(values, { enabled: true }, failing), values);
});

test("ignores failed lookup entries", async () => {
  clearIpInfoCache();
  const fetchImpl = async (url, init) => jsonResponse(JSON.parse(init.body).map((ip) => ({ status: "fail", message: "reserved", query: ip })));
  const values = ["1.2.3.4:443"];
  assert.equal(await applyIpRemarks(values, { enabled: true }, fetchImpl), values);
});