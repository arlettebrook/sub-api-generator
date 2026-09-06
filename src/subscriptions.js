import {
  DEFAULT_BLACKLIST,
  isPlainObject,
  KV_KEY_APIS,
  KV_KEY_BLACKLIST,
  KV_KEY_SUBS,
  normalizeBlacklist,
  normalizeKvData,
  normalizeSourceKey,
} from "./config.js";
import { textResponse, withSecurityHeaders } from "./http.js";

const OUTBOUND_TIMEOUT_MS = 15000;
const FIXED_UUID = "00000000-0000-4000-8000-000000000000";
const FIXED_HOST = "example.com";
const UA_SUBS_FETCH = "v2r" + "ayN/edget" + "unnel (https://github.com/c" + "mliu/edget" + "unnel)";
const UA_APIS_FETCH = "v2r" + "ayN/edg" + "e";
const HTTP_PROTOCOL_REGEX = /^https?:\/\//i;
const NODE_ADDRESS_REGEX = /:\/\/[^@]+@([^?]+)/;
const NODE_REMARK_REGEX = /#(.+)$/;
const NODE_MATCH_REGEX = /(\[?\d{1,3}(?:\.\d{1,3}){3}\]?|\[[0-9a-fA-F:]+\]|[a-zA-Z0-9.-]+):(\d+)/;
const LINE_CLEAN_REGEX = /(\s*@.*|加入.*|telegram.*)$/i;
const AGGREGATE_CACHE_TTL_MS = 15000;
const UPSTREAM_RETRY_DELAYS_MS = [200, 600];
const aggregateCache = new Map();
const sourceInflight = new Map();
const blacklistRegexCache = new Map();

async function fetchWithTimeout(resource, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OUTBOUND_TIMEOUT_MS);
  try {
    return await fetch(resource, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function parsePreferredIpLine(line) {
  if (!line.includes(FIXED_UUID) || !line.includes(FIXED_HOST)) return null;
  const addressMatch = NODE_ADDRESS_REGEX.exec(line);
  if (!addressMatch) return null;

  let result = addressMatch[1];
  const remarkMatch = NODE_REMARK_REGEX.exec(line);
  if (remarkMatch) {
    let remark = remarkMatch[1];
    try { remark = decodeURIComponent(remark); } catch { /* keep the original remark */ }
    remark = remark
      .split(" ")[0]
      .split("【")[0]
      .split("|")[0]
      .trim();
    result += `#${remark}`;
  }
  return result;
}

function decodeSubscriptionBody(content) {
  const text = content.replace(/^\uFEFF/, "").trim();
  if (!text) return "";
  try {
    const encoded = /\s/.test(text) ? text.replace(/\s+/g, "") : text;
    const decoded = atob(encoded);
    if (decoded.includes("://") || decoded.includes("\n")) return decoded;
  } catch {
    // Some providers return plain text instead of Base64.
  }
  return text;
}

async function fetchPreferredSubs(host) {
  const rawHost = String(host || "").trim().replace(/\/+$/, "");
  const baseHost = HTTP_PROTOCOL_REGEX.test(rawHost) ? rawHost : `https://${rawHost}`;
  const content = await fetchSourceText(`${baseHost}/sub?host=${FIXED_HOST}&uuid=${FIXED_UUID}`, {
    headers: { "User-Agent": UA_SUBS_FETCH },
  }, "订阅源");

  const rawContent = decodeSubscriptionBody(content);
  const result = [];
  for (const line of rawContent.split(/\r?\n/)) {
    const parsed = parsePreferredIpLine(line);
    if (parsed) result.push(parsed);
  }
  return result;
}

async function fetchApiSubs(apiUrl) {
  const content = await fetchSourceText(apiUrl, {
    headers: { "User-Agent": UA_APIS_FETCH },
  }, "API 源");
  return decodeSubscriptionBody(content).split(/\r?\n/).filter((line) => line.trim() !== "");
}

async function fetchSourceText(resource, options, label) {
  const key = String(resource);
  const pending = sourceInflight.get(key);
  if (pending) return pending;

  const request = fetchSourceTextUncached(resource, options, label);
  sourceInflight.set(key, request);
  try {
    return await request;
  } finally {
    if (sourceInflight.get(key) === request) sourceInflight.delete(key);
  }
}

async function fetchSourceTextUncached(resource, options, label) {
  let lastError = new Error(`${label}返回空数据`);
  for (let attempt = 0; attempt <= UPSTREAM_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetchWithTimeout(resource, options);
      if (!response.ok) {
        lastError = new Error(`${label} HTTP ${response.status}`);
        const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
        if (!retryable) break;
      } else {
        const content = await response.text();
        if (content.trim()) return content;
        lastError = new Error(`${label}返回空数据`);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
    if (attempt < UPSTREAM_RETRY_DELAYS_MS.length) {
      await new Promise((resolve) => setTimeout(resolve, UPSTREAM_RETRY_DELAYS_MS[attempt]));
    }
  }
  throw lastError;
}

function getBlacklistRegex(blacklist) {
  const normalized = normalizeBlacklist(blacklist);
  const cacheKey = normalized.join("\u0000").toLowerCase();
  if (blacklistRegexCache.has(cacheKey)) return blacklistRegexCache.get(cacheKey);
  const regex = normalized.length
    ? new RegExp(normalized.map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "i")
    : null;
  if (blacklistRegexCache.size >= 16) blacklistRegexCache.delete(blacklistRegexCache.keys().next().value);
  blacklistRegexCache.set(cacheKey, regex);
  return regex;
}

function filterPreferredIps(lines, blacklist = DEFAULT_BLACKLIST) {
  const result = [];
  const seen = new Set();
  const blacklistRegex = getBlacklistRegex(blacklist);
  for (const value of lines) {
    if (!value) continue;
    const line = value.trim();
    const match = NODE_MATCH_REGEX.exec(line);
    if (!match) continue;
    const node = match[0];
    const hashIndex = line.indexOf("#");
    const remark = hashIndex > -1 ? line.slice(hashIndex + 1) : "";
    const full = remark ? `${node}#${remark}` : node;
    if (blacklistRegex?.test(full)) continue;
    const cleaned = full.replace(LINE_CLEAN_REGEX, "").trim();
    if (seen.has(cleaned)) continue;
    seen.add(cleaned);
    result.push(cleaned);
  }
  return result;
}

function enabledEntries(config) {
  if (!isPlainObject(config)) return [];
  return Object.entries(config).filter(([, entry]) => {
    return typeof entry === "object" && entry !== null && "enabled" in entry
      ? entry.enabled === true
      : entry === true;
  });
}

function stableSerialize(value) {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function normalizeSourceSelection(sourceSelection) {
  if (!Array.isArray(sourceSelection)) return null;
  const unique = new Map();
  for (const source of sourceSelection) {
    const type = source?.type;
    if (!["subs", "apis"].includes(type)) continue;
    const key = normalizeSourceKey(type, source?.key);
    if (!key) continue;
    unique.set(`${type}:${key}`, { type, key });
  }
  return [...unique.values()].sort((left, right) => {
    const a = `${left.type}:${left.key}`;
    const b = `${right.type}:${right.key}`;
    return a.localeCompare(b);
  });
}

function makeAggregateCacheKey(sourceSelection, subsConfig, apisConfig, blacklistConfig) {
  return stableSerialize({
    selection: normalizeSourceSelection(sourceSelection),
    subs: subsConfig,
    apis: apisConfig,
    blacklist: normalizeBlacklist(blacklistConfig),
  });
}

export async function handleRoot(env, sourceSelection) {
  try {
    const [subsConfig, apisConfig, blacklistConfig] = await Promise.all([
      env.KV.get(KV_KEY_SUBS, "json"),
      env.KV.get(KV_KEY_APIS, "json"),
      env.KV.get(KV_KEY_BLACKLIST, "json"),
    ]);
    if (!isPlainObject(subsConfig)) {
      return textResponse("KV 未配置 subs", 500, { "cache-control": "no-store" });
    }

    const cacheKey = makeAggregateCacheKey(sourceSelection, subsConfig, apisConfig, blacklistConfig);
    const cached = aggregateCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      const headers = {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      };
      setSourceErrorHeaders(headers, cached.sourceErrors || []);
      return new Response(cached.output, {
        headers: withSecurityHeaders(headers),
      });
    }

    const selected = Array.isArray(sourceSelection) ? sourceSelection : null;
    const selectedKeys = selected
      ? new Set(selected.map((source) => `${source?.type}:${normalizeSourceKey(source?.type, source?.key)}`))
      : null;
    const selectedEntries = (config, type) => {
      const entries = selectedKeys === null ? enabledEntries(config) : Object.entries(config || {});
      return entries.filter(([key, entry]) => {
        if (selectedKeys === null) return entry === true || (isPlainObject(entry) && entry.enabled === true);
        // Explicit selections on a custom API are independent from UUID source toggles.
        return selectedKeys.has(`${type}:${normalizeSourceKey(type, key)}`)
          && (typeof entry === "boolean" || isPlainObject(entry));
      });
    };
    const [subsResults, apiResults] = await Promise.all([
      Promise.allSettled(selectedEntries(subsConfig, "subs").map(async ([host]) => {
        try {
          return { key: host, values: await fetchPreferredSubs(host) };
        } catch (error) {
          const failure = error instanceof Error ? error : new Error(String(error));
          failure.sourceKey = host;
          throw failure;
        }
      })),
      Promise.allSettled(selectedEntries(apisConfig, "apis").map(async ([apiUrl]) => {
        try {
          return { key: apiUrl, values: await fetchApiSubs(apiUrl) };
        } catch (error) {
          const failure = error instanceof Error ? error : new Error(String(error));
          failure.sourceKey = apiUrl;
          throw failure;
        }
      })),
    ]);

    const preferred = [];
    const sourceErrors = [];
    if (selected && selected.length === 0) {
      sourceErrors.push({ type: "config", key: "", message: "未选择任何数据源" });
    }
    for (const result of subsResults) {
      if (result.status === "fulfilled") preferred.push(...result.value.values);
      else sourceErrors.push({ type: "subs", key: result.reason?.sourceKey || "", message: sourceErrorMessage(result.reason) });
    }
    const extra = [];
    for (const result of apiResults) {
      if (result.status === "fulfilled") extra.push(...result.value.values);
      else sourceErrors.push({ type: "apis", key: result.reason?.sourceKey || "", message: sourceErrorMessage(result.reason) });
    }

    const filtered = filterPreferredIps(preferred, normalizeBlacklist(blacklistConfig));
    const output = filtered.join("\n") + (extra.length ? `\n${extra.join("\n")}` : "");
    // 空结果不缓存，避免上游短暂异常时需要等待缓存过期才能恢复。
    if (output.trim()) {
      aggregateCache.set(cacheKey, { output, sourceErrors, expiresAt: Date.now() + AGGREGATE_CACHE_TTL_MS });
    } else {
      aggregateCache.delete(cacheKey);
    }
    const headers = {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    };
    setSourceErrorHeaders(headers, sourceErrors);
    return new Response(output, {
      headers: withSecurityHeaders(headers),
    });
  } catch (error) {
    return textResponse("！！！！！优选订阅生成器异常：" + error.message, 500, {
      "cache-control": "no-store",
    });
  }
}

function sourceErrorMessage(error) {
  if (!error) return "未知错误";
  if (error.name === "AbortError") return "请求超时（15 秒）";
  return typeof error.message === "string" && error.message ? error.message.slice(0, 160) : "请求失败";
}

function setSourceErrorHeaders(headers, errors) {
  if (!errors.length) return;
  headers["x-source-errors"] = encodeURIComponent(JSON.stringify(errors.slice(0, 50)));
}

export function clearAggregateCache() {
  aggregateCache.clear();
}

export { decodeSubscriptionBody, fetchWithTimeout, fetchPreferredSubs, filterPreferredIps, normalizeKvData, parsePreferredIpLine };
