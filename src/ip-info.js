// 优选 IP 归属地查询：为没有备注的优选域名 IP 自动补齐备注。
// 默认调用 ip-api.com 的批量接口（免费、无需 API Key、支持中文返回）；
// 结果按「接口 + IP」缓存，避免每次生成订阅都重复请求外部接口。
import { DEFAULT_IP_REMARK_ENDPOINT, DEFAULT_IP_REMARK_TEMPLATE } from "./config.js";

const IP_INFO_TIMEOUT_MS = 5000;
const IP_INFO_BATCH_SIZE = 100;
const IP_INFO_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const IP_INFO_CACHE_MAX_ENTRIES = 4096;
// ip-api.com 字段白名单：只取生成备注需要的字段，减少响应体积。
const IP_INFO_FIELDS = Object.freeze(["status", "message", "country", "countryCode", "regionName", "city", "isp", "org", "as", "query"]);
const ENDPOINT_IP_PLACEHOLDER = "{ip}";
const IPV4_REGEX = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const IPV6_REGEX = /^[0-9a-fA-F:]+$/;
const REMARK_UNSAFE_REGEX = /[\u0000-\u001F\u007F#]/gu;
const REMARK_EDGE_REGEX = /^[\s\-–—|,，、·/]+|[\s\-–—|,，、·/]+$/gu;
const REMARK_MAX_LENGTH = 120;

const ipInfoCache = new Map();

// 测试与排查时可以清空内存缓存，强制重新查询。
export function clearIpInfoCache() {
  ipInfoCache.clear();
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isIpLiteral(value) {
  const text = String(value ?? "").trim();
  if (!text) return false;
  if (IPV4_REGEX.test(text)) return text.split(".").every((part) => Number(part) <= 255);
  if (!text.includes(":")) return false;
  return IPV6_REGEX.test(text) && text.split(":").length >= 3;
}

function normalizeIpKey(value) {
  return String(value ?? "").trim().replace(/^\[|\]$/g, "").toLowerCase();
}

function splitAddressPort(base) {
  const text = String(base ?? "").trim();
  const bracketed = /^\[([^\]]+)\]:(\d+)$/.exec(text);
  if (bracketed) return { host: bracketed[1] };
  const plain = /^([^:\s]+):(\d+)$/.exec(text);
  if (plain) return { host: plain[1] };
  return null;
}

// 把节点字符串拆成「地址」和「是否已有备注」，只识别 ip:port[#remark] 形式。
function parseNodeLine(value) {
  const line = String(value ?? "").trim();
  if (!line) return null;
  const hashIndex = line.indexOf("#");
  const address = splitAddressPort(hashIndex >= 0 ? line.slice(0, hashIndex) : line);
  if (!address) return null;
  return { host: address.host, hasRemark: hashIndex >= 0 && line.slice(hashIndex + 1).trim().length > 0 };
}

function readIpInfoCache(cacheKey, now) {
  const cached = ipInfoCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= now) {
    ipInfoCache.delete(cacheKey);
    return null;
  }
  return cached.info;
}

function writeIpInfoCache(cacheKey, info) {
  if (!ipInfoCache.has(cacheKey) && ipInfoCache.size >= IP_INFO_CACHE_MAX_ENTRIES) {
    const oldest = ipInfoCache.keys().next().value;
    if (oldest !== undefined) ipInfoCache.delete(oldest);
  }
  ipInfoCache.set(cacheKey, { info, expiresAt: Date.now() + IP_INFO_CACHE_TTL_MS });
}

// 自定义接口原样使用；留空时使用 ip-api.com 批量接口并补上字段与语言参数。
function resolveIpInfoEndpoint(endpoint) {
  const configured = typeof endpoint === "string" ? endpoint.trim() : "";
  if (configured) {
    return { url: configured, raw: configured, single: configured.includes(ENDPOINT_IP_PLACEHOLDER) };
  }
  const url = new URL(DEFAULT_IP_REMARK_ENDPOINT);
  url.searchParams.set("fields", IP_INFO_FIELDS.join(","));
  url.searchParams.set("lang", "zh-CN");
  const resolved = url.toString();
  return { url: resolved, raw: resolved, single: false };
}

async function fetchIpInfo(url, init, fetchImpl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IP_INFO_TIMEOUT_MS);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function pickString(source, keys) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

// 兼容 ip-api.com / ipinfo.io / ip.sb 等常见返回结构，失败状态一律视为无数据。
function normalizeIpInfo(raw) {
  if (!isPlainObject(raw)) return null;
  const status = typeof raw.status === "string" ? raw.status.trim().toLowerCase() : "";
  if (status === "fail" || status === "error") return null;
  const info = {
    country: pickString(raw, ["country", "country_name", "countryName"]),
    countryCode: pickString(raw, ["countryCode", "country_code", "country_code2"]),
    region: pickString(raw, ["regionName", "region_name", "region", "state"]),
    city: pickString(raw, ["city", "city_name"]),
    isp: pickString(raw, ["isp", "isp_name"]),
    org: pickString(raw, ["org", "organization", "organisation", "asn_organization"]),
    as: pickString(raw, ["as", "asn", "as_number"]),
  };
  return Object.values(info).some(Boolean) ? info : null;
}

function ipInfoKey(raw, index, ips) {
  const candidates = [raw.query, raw.ip, raw.address, ips.length === 1 ? ips[0] : "", ips[index]];
  for (const candidate of candidates) {
    const key = normalizeIpKey(candidate);
    if (key) return key;
  }
  return "";
}

async function lookupSingleIp(endpoint, ip, fetchImpl) {
  const url = endpoint.replace(ENDPOINT_IP_PLACEHOLDER, encodeURIComponent(ip));
  try {
    const response = await fetchIpInfo(url, { headers: { accept: "application/json" } }, fetchImpl);
    if (!response.ok) return null;
    return normalizeIpInfo(await response.json());
  } catch {
    return null;
  }
}

async function lookupIpBatch(endpoint, ips, fetchImpl) {
  const result = new Map();
  let payload;
  try {
    const response = await fetchIpInfo(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(ips),
    }, fetchImpl);
    if (!response.ok) return result;
    payload = await response.json();
  } catch {
    return result;
  }
  const items = Array.isArray(payload) ? payload : isPlainObject(payload) ? [payload] : [];
  items.forEach((item, index) => {
    const info = normalizeIpInfo(item);
    if (!info) return;
    const key = ipInfoKey(item, index, ips);
    if (!key) return;
    result.set(key, info);
  });
  return result;
}

// 查询一组 IP 的归属地信息，返回 ip -> info 的 Map；查询失败的 IP 不会出现在结果里。
export async function lookupIpInfo(ips, settings = {}, fetchImpl = fetch) {
  const result = new Map();
  const list = Array.isArray(ips) ? ips : [];
  if (!list.length) return result;
  const endpoint = resolveIpInfoEndpoint(settings?.endpoint);
  const now = Date.now();
  const pending = [];
  const seen = new Set();
  for (const value of list) {
    const ip = normalizeIpKey(value);
    if (!ip || !isIpLiteral(ip) || seen.has(ip)) continue;
    seen.add(ip);
    const cacheKey = `${endpoint.raw}|${ip}`;
    const cached = readIpInfoCache(cacheKey, now);
    if (cached) {
      result.set(ip, cached);
      continue;
    }
    pending.push({ ip, cacheKey });
  }
  if (!pending.length) return result;
  if (endpoint.single) {
    await Promise.all(pending.map(async ({ ip, cacheKey }) => {
      const info = await lookupSingleIp(endpoint.url, ip, fetchImpl);
      if (!info) return;
      writeIpInfoCache(cacheKey, info);
      result.set(ip, info);
    }));
    return result;
  }
  for (let index = 0; index < pending.length; index += IP_INFO_BATCH_SIZE) {
    const chunk = pending.slice(index, index + IP_INFO_BATCH_SIZE);
    const batch = await lookupIpBatch(endpoint.url, chunk.map((item) => item.ip), fetchImpl);
    for (const { ip, cacheKey } of chunk) {
      const info = batch.get(ip);
      if (!info) continue;
      writeIpInfoCache(cacheKey, info);
      result.set(ip, info);
    }
  }
  return result;
}

// 按模板拼接备注，例如 "{country} {isp}" -> "美国 Cloudflare, Inc."。
export function formatIpRemark(info, template = DEFAULT_IP_REMARK_TEMPLATE) {
  if (!isPlainObject(info)) return "";
  const source = typeof template === "string" && template.trim() ? template.trim() : DEFAULT_IP_REMARK_TEMPLATE;
  const rendered = source.replace(/\{(\w+)\}/g, (match, key) => {
    const value = info[key];
    return typeof value === "string" ? value : "";
  });
  return rendered
    .replace(REMARK_UNSAFE_REGEX, " ")
    .replace(/\s+/g, " ")
    .replace(REMARK_EDGE_REGEX, "")
    .trim()
    .slice(0, REMARK_MAX_LENGTH);
}

function copyHiddenProperties(source, target) {
  for (const name of Object.getOwnPropertyNames(source)) {
    if (name === "length") continue;
    const descriptor = Object.getOwnPropertyDescriptor(source, name);
    if (!descriptor || descriptor.enumerable) continue;
    Object.defineProperty(target, name, descriptor);
  }
  return target;
}

// 为「没有备注的 IP 节点」补上查询到的备注；已有备注的节点原样保留。
export async function applyIpRemarks(values, settings = {}, fetchImpl = fetch) {
  const list = Array.isArray(values) ? values : [];
  if (settings?.enabled !== true || !list.length) return values;
  const targets = [];
  const targetSeen = new Set();
  for (const value of list) {
    const parsed = parseNodeLine(value);
    if (!parsed || parsed.hasRemark) continue;
    const ip = normalizeIpKey(parsed.host);
    if (!ip || targetSeen.has(ip)) continue;
    targetSeen.add(ip);
    targets.push(ip);
  }
  if (!targets.length) return values;
  const infoMap = await lookupIpInfo(targets, settings, fetchImpl);
  if (!infoMap.size) return values;
  const template = typeof settings.template === "string" ? settings.template : DEFAULT_IP_REMARK_TEMPLATE;
  const next = list.map((value) => {
    const parsed = parseNodeLine(value);
    if (!parsed || parsed.hasRemark) return value;
    const info = infoMap.get(normalizeIpKey(parsed.host));
    if (!info) return value;
    const remark = formatIpRemark(info, template);
    return remark ? `${value}#${remark}` : value;
  });
  if (next.every((value, index) => value === list[index])) return values;
  return copyHiddenProperties(list, next);
}