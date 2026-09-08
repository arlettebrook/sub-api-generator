import {
  DEFAULT_BLACKLIST,
  DEFAULT_FILTER_RULES,
  isPlainObject,
  KV_KEY_APIS,
  KV_KEY_BLACKLIST,
  KV_KEY_FILTER_RULES,
  KV_KEY_SUBS,
  normalizeFilterRules,
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
const REMARK_SYMBOL_REGEX = /[\p{So}\uFE0F]+/gu;
const AGGREGATE_CACHE_TTL_MS = 15000;
const AGGREGATE_CACHE_MAX_ENTRIES = 128;
const SOURCE_CHECK_CONCURRENCY = 6;
const UPSTREAM_RETRY_DELAYS_MS = [200, 600];
const aggregateCache = new Map();
const sourceInflight = new Map();
const blacklistRegexCache = new Map();
const sourceStatus = new Map();

async function fetchWithTimeout(resource, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OUTBOUND_TIMEOUT_MS);
  try {
    return await fetch(resource, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error("请求超时（15 秒）");
      timeoutError.code = "TIMEOUT";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function cleanPreferredRemark(value, filterRules = []) {
  let remark = value;
  if (remark.includes("%")) {
    try { remark = decodeURIComponent(remark); } catch { /* keep the original remark */ }
  }
  let cutIndex = -1;
  for (const rule of filterRules) {
    if (rule === "符号") continue;
    const index = rule === "空格" ? remark.search(/\s/u) : remark.toLowerCase().indexOf(rule.toLowerCase());
    if (index >= 0 && (cutIndex < 0 || index < cutIndex)) cutIndex = index;
  }
  if (cutIndex >= 0) remark = remark.slice(0, cutIndex);
  if (filterRules.includes("符号")) remark = remark.replace(REMARK_SYMBOL_REGEX, "");
  return remark.trim();
}

function parsePreferredIpLine(line, filterRules = DEFAULT_FILTER_RULES) {
  if (!line.includes(FIXED_UUID) || !line.includes(FIXED_HOST)) return null;
  const addressMatch = NODE_ADDRESS_REGEX.exec(line);
  if (!addressMatch) return null;

  let result = addressMatch[1];
  const remarkMatch = NODE_REMARK_REGEX.exec(line);
  if (remarkMatch) {
    const remark = cleanPreferredRemark(remarkMatch[1], filterRules);
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

async function fetchPreferredSubs(host, filterRules = DEFAULT_FILTER_RULES) {
  const rawHost = String(host || "").trim().replace(/\/+$/, "");
  const baseHost = HTTP_PROTOCOL_REGEX.test(rawHost) ? rawHost : `https://${rawHost}`;
  const response = await fetchSourceText(`${baseHost}/sub?host=${FIXED_HOST}&uuid=${FIXED_UUID}`, {
    headers: { "User-Agent": UA_SUBS_FETCH },
  }, "订阅源");

  const rawContent = decodeSubscriptionBody(response.content);
  const result = [];
  const unfilteredNodes = [];
  for (const line of rawContent.split(/\r?\n/)) {
    const unfiltered = parsePreferredIpLine(line, []);
    if (unfiltered) unfilteredNodes.push(unfiltered);
    const parsed = parsePreferredIpLine(line, filterRules);
    if (parsed) result.push(parsed);
  }
  Object.defineProperty(result, "statusCode", { value: response.statusCode, enumerable: false });
  Object.defineProperty(result, "unfilteredNodes", { value: unfilteredNodes, enumerable: false });
  return result;
}

function recordSourceStatus(type, key, details) {
  const normalizedKey = normalizeSourceKey(type, key);
  if (!normalizedKey) return;
  const previous = sourceStatus.get(`${type}:${normalizedKey}`) || {};
  sourceStatus.set(`${type}:${normalizedKey}`, {
    ...previous,
    type,
    key: normalizedKey,
    ...details,
  });
}

export function getSourceStatuses(subsConfig, apisConfig) {
  const result = { subs: {}, apis: {} };
  for (const [type, config] of [["subs", subsConfig], ["apis", apisConfig]]) {
    const normalized = normalizeKvData(config, type);
    for (const [key, entry] of Object.entries(normalized)) {
      const remark = isPlainObject(entry) && typeof entry.remark === "string" ? entry.remark : "";
      result[type][key] = {
        state: "idle",
        nodeCount: 0,
        rawNodeCount: 0,
        durationMs: null,
        error: "",
        errorType: "",
        statusCode: null,
        lastAttemptAt: null,
        lastSuccessAt: null,
        lastSuccessNodeCount: 0,
        lastSuccessRawNodeCount: 0,
        ...(sourceStatus.get(`${type}:${key}`) || {}),
        remark,
      };
    }
  }
  return result;
}

export function restoreSourceStatuses(snapshot) {
  if (!isPlainObject(snapshot)) return;
  for (const type of ["subs", "apis"]) {
    for (const [key, status] of Object.entries(snapshot[type] || {})) {
      if (isPlainObject(status)) sourceStatus.set(`${type}:${normalizeSourceKey(type, key)}`, { ...status });
    }
  }
}

async function fetchApiSubs(apiUrl) {
  const response = await fetchSourceText(apiUrl, {
    headers: { "User-Agent": UA_APIS_FETCH },
  }, "API 源");
  const result = decodeSubscriptionBody(response.content).split(/\r?\n/).filter((line) => line.trim() !== "");
  const unfilteredNodes = [];
  for (const value of result) {
    const line = value.trim();
    const match = NODE_MATCH_REGEX.exec(line);
    if (!match) continue;
    const hashIndex = line.indexOf("#");
    const remark = hashIndex > -1 ? cleanPreferredRemark(line.slice(hashIndex + 1), []) : "";
    unfilteredNodes.push(remark ? `${match[0]}#${remark}` : match[0]);
  }
  Object.defineProperty(result, "statusCode", { value: response.statusCode, enumerable: false });
  Object.defineProperty(result, "unfilteredNodes", { value: unfilteredNodes, enumerable: false });
  return result;
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
  lastError.code = "EMPTY_RESPONSE";
  for (let attempt = 0; attempt <= UPSTREAM_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetchWithTimeout(resource, options);
      if (!response.ok) {
        lastError = new Error(`${label} HTTP ${response.status}`);
        lastError.code = "HTTP_ERROR";
        lastError.statusCode = response.status;
        const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
        if (!retryable) break;
      } else {
        const content = await response.text();
        if (content.trim()) return { content, statusCode: response.status };
        lastError = new Error(`${label}返回空数据`);
        lastError.code = "EMPTY_RESPONSE";
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (!lastError.code) lastError.code = "NETWORK_ERROR";
    }
    if (attempt < UPSTREAM_RETRY_DELAYS_MS.length) {
      await new Promise((resolve) => setTimeout(resolve, UPSTREAM_RETRY_DELAYS_MS[attempt]));
    }
  }
  throw lastError;
}

function getBlacklistRegex(normalizedBlacklist) {
  const cacheKey = normalizedBlacklist.join("\u0000").toLowerCase();
  if (blacklistRegexCache.has(cacheKey)) return blacklistRegexCache.get(cacheKey);
  const regex = normalizedBlacklist.length
    ? new RegExp(normalizedBlacklist.map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "i")
    : null;
  if (blacklistRegexCache.size >= 16) blacklistRegexCache.delete(blacklistRegexCache.keys().next().value);
  blacklistRegexCache.set(cacheKey, regex);
  return regex;
}

function isBlacklisted(value, blacklistRegex) {
  if (!blacklistRegex) return false;
  if (blacklistRegex.test(value)) return true;
  if (!value.includes("%")) return false;
  try {
    return blacklistRegex.test(decodeURIComponent(value));
  } catch {
    return false;
  }
}

function filterBlacklistedLines(lines, blacklist = DEFAULT_BLACKLIST, preparedRegex = null, filterRules = []) {
  const blacklistRegex = preparedRegex || getBlacklistRegex(normalizeBlacklist(blacklist));
  const result = [];
  const stats = { inputCount: 0, invalidCount: 0, blacklistedCount: 0, duplicateCount: 0, outputCount: 0 };
  for (const value of lines) {
    stats.inputCount += 1;
    if (!value) { stats.invalidCount += 1; continue; }
    if (isBlacklisted(value, blacklistRegex)) { stats.blacklistedCount += 1; continue; }
    const hashIndex = value.indexOf("#");
    if (hashIndex < 0) {
      result.push(value);
      continue;
    }
    const remark = cleanPreferredRemark(value.slice(hashIndex + 1), filterRules);
    result.push(`${value.slice(0, hashIndex)}${remark ? `#${remark}` : ""}`);
  }
  stats.outputCount = result.length;
  Object.defineProperty(result, "filterStats", { value: stats, enumerable: false });
  return result;
}

function filterPreferredIps(lines, blacklist = DEFAULT_BLACKLIST, preparedRegex = null, filterRules = DEFAULT_FILTER_RULES) {
  const result = [];
  const seen = new Set();
  const stats = { inputCount: 0, invalidCount: 0, blacklistedCount: 0, duplicateCount: 0, outputCount: 0 };
  const blacklistRegex = preparedRegex || getBlacklistRegex(normalizeBlacklist(blacklist));
  for (const value of lines) {
    stats.inputCount += 1;
    if (!value) continue;
    const line = value.trim();
    const match = NODE_MATCH_REGEX.exec(line);
    if (!match) { stats.invalidCount += 1; continue; }
    const node = match[0];
    const hashIndex = line.indexOf("#");
    const rawRemark = hashIndex > -1 ? line.slice(hashIndex + 1) : "";
    const rawFull = rawRemark ? `${node}#${rawRemark}` : node;
    if (isBlacklisted(rawFull, blacklistRegex)) { stats.blacklistedCount += 1; continue; }
    const remark = rawRemark ? cleanPreferredRemark(rawRemark, filterRules) : "";
    const cleaned = remark ? `${node}#${remark}` : node;
    if (seen.has(cleaned)) { stats.duplicateCount += 1; continue; }
    seen.add(cleaned);
    result.push(cleaned);
  }
  stats.outputCount = result.length;
  Object.defineProperty(result, "filterStats", { value: stats, enumerable: false });
  return result;
}

function sourceEntries(config) {
  if (!isPlainObject(config)) return [];
  return Object.entries(config).filter(([, entry]) => entry === true || isPlainObject(entry));
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

function makeAggregateCacheKey(sourceSelection, subsConfig, apisConfig, blacklist, filterRules) {
  return stableSerialize({
    selection: normalizeSourceSelection(sourceSelection),
    subs: subsConfig,
    apis: apisConfig,
    blacklist,
    filterRules,
  });
}

function pruneAggregateCache(now = Date.now()) {
  for (const [key, entry] of aggregateCache) {
    if (entry.expiresAt <= now) aggregateCache.delete(key);
  }
  while (aggregateCache.size > AGGREGATE_CACHE_MAX_ENTRIES) {
    const oldestKey = aggregateCache.keys().next().value;
    if (oldestKey === undefined) break;
    aggregateCache.delete(oldestKey);
  }
}

async function allSettledWithConcurrency(tasks, limit = SOURCE_CHECK_CONCURRENCY) {
  const results = new Array(tasks.length);
  let nextIndex = 0;
  async function runWorker() {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      try {
        results[index] = { status: "fulfilled", value: await tasks[index]() };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => runWorker()));
  return results;
}

export async function handleRoot(env, sourceSelection, options = {}) {
  try {
    const [subsConfig, apisConfig, blacklistConfig, filterRulesConfig] = await Promise.all([
      env.KV.get(KV_KEY_SUBS, "json"),
      env.KV.get(KV_KEY_APIS, "json"),
      env.KV.get(KV_KEY_BLACKLIST, "json"),
      env.KV.get(KV_KEY_FILTER_RULES, "json"),
    ]);
    if (!isPlainObject(subsConfig)) {
      return textResponse("KV 未配置 subs", 500, { "cache-control": "no-store" });
    }

    const blacklist = normalizeBlacklist(blacklistConfig);
    const filterRules = normalizeFilterRules(filterRulesConfig);
    const cacheKey = makeAggregateCacheKey(sourceSelection, subsConfig, apisConfig, blacklist, filterRules);
    pruneAggregateCache();
    const cached = aggregateCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      // Refresh insertion order so active entries are retained when the cache is full.
      aggregateCache.delete(cacheKey);
      aggregateCache.set(cacheKey, cached);
      const headers = {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      };
      if (cached.nodeSources?.length) headers["x-node-sources"] = encodeURIComponent(JSON.stringify(cached.nodeSources));
      return new Response(cached.output, {
        headers: withSecurityHeaders(headers),
      });
    }

    const selected = Array.isArray(sourceSelection) ? sourceSelection : null;
    const selectedKeys = selected
      ? new Set(selected.map((source) => `${source?.type}:${normalizeSourceKey(source?.type, source?.key)}`))
      : null;
    const selectedEntries = (config, type) => {
      const entries = selectedKeys === null ? sourceEntries(config) : sourceEntries(config);
      return entries.filter(([key, entry]) => {
        if (selectedKeys === null) return true;
        // Explicit selections on a custom API limit the configured source set.
        return selectedKeys.has(`${type}:${normalizeSourceKey(type, key)}`)
          && (typeof entry === "boolean" || isPlainObject(entry));
      });
    };
    const blacklistRegex = getBlacklistRegex(blacklist);
    const sourceTasks = [];
    selectedEntries(subsConfig, "subs").forEach(([host, entry]) => sourceTasks.push(async () => {
        const startedAt = Date.now();
        try {
          const rawValues = await fetchPreferredSubs(host, filterRules);
          const values = filterPreferredIps(rawValues, blacklist, blacklistRegex, filterRules);
          const timestamp = new Date().toISOString();
          recordSourceStatus("subs", host, {
            state: values.length > 0 ? "success" : (rawValues.length ? "filtered" : "empty"),
            nodeCount: values.length,
            rawNodeCount: rawValues.length,
            durationMs: Date.now() - startedAt,
            error: "",
            errorType: "",
            statusCode: rawValues.statusCode || null,
            lastAttemptAt: timestamp,
            ...(values.length > 0 ? {
              lastSuccessAt: timestamp,
              lastSuccessNodeCount: values.length,
              lastSuccessRawNodeCount: rawValues.length,
            } : {}),
          });
          return { type: "subs", key: host, remark: isPlainObject(entry) ? entry.remark || "" : "", values, unfilteredNodes: rawValues.unfilteredNodes || [], filterStats: values.filterStats || { inputCount: rawValues.length, outputCount: values.length } };
        } catch (error) {
          const failure = error instanceof Error ? error : new Error(String(error));
          failure.sourceType = "subs";
          failure.sourceKey = host;
          recordSourceStatus("subs", host, {
            state: sourceFailureState(failure),
            nodeCount: 0,
            rawNodeCount: 0,
            durationMs: Date.now() - startedAt,
            error: sourceErrorMessage(failure),
            errorType: failure.code || "NETWORK_ERROR",
            statusCode: failure.statusCode || null,
            lastAttemptAt: new Date().toISOString(),
          });
          throw failure;
        }
      }));
    selectedEntries(apisConfig, "apis").forEach(([apiUrl, entry]) => sourceTasks.push(async () => {
        const startedAt = Date.now();
        try {
          const rawValues = await fetchApiSubs(apiUrl);
          const values = filterBlacklistedLines(rawValues, blacklist, blacklistRegex, filterRules);
          const timestamp = new Date().toISOString();
          recordSourceStatus("apis", apiUrl, {
            state: values.length > 0 ? "success" : (rawValues.length ? "filtered" : "empty"),
            nodeCount: values.length,
            rawNodeCount: rawValues.length,
            durationMs: Date.now() - startedAt,
            error: "",
            errorType: "",
            statusCode: rawValues.statusCode || null,
            lastAttemptAt: timestamp,
            ...(values.length > 0 ? {
              lastSuccessAt: timestamp,
              lastSuccessNodeCount: values.length,
              lastSuccessRawNodeCount: rawValues.length,
            } : {}),
          });
          return { type: "apis", key: apiUrl, remark: isPlainObject(entry) ? entry.remark || "" : "", values, unfilteredNodes: rawValues.unfilteredNodes || [], filterStats: values.filterStats || { inputCount: rawValues.length, outputCount: values.length } };
        } catch (error) {
          const failure = error instanceof Error ? error : new Error(String(error));
          failure.sourceType = "apis";
          failure.sourceKey = apiUrl;
          recordSourceStatus("apis", apiUrl, {
            state: sourceFailureState(failure),
            nodeCount: 0,
            rawNodeCount: 0,
            durationMs: Date.now() - startedAt,
            error: sourceErrorMessage(failure),
            errorType: failure.code || "NETWORK_ERROR",
            statusCode: failure.statusCode || null,
            lastAttemptAt: new Date().toISOString(),
          });
          throw failure;
        }
      }));
    const sourceResults = await allSettledWithConcurrency(sourceTasks);
    const subsResults = sourceResults.filter((result) => result.status === "fulfilled" ? result.value.type === "subs" : result.reason?.sourceType === "subs");
    const apiResults = sourceResults.filter((result) => result.status === "fulfilled" ? result.value.type === "apis" : result.reason?.sourceType === "apis");

    const preferred = [];
    const nodeSources = [];
    const sourceErrors = [];
    if (selected && selected.length === 0) {
      sourceErrors.push({ type: "config", key: "", message: "未选择任何数据源" });
    }
    for (const result of subsResults) {
      if (result.status === "fulfilled") {
        preferred.push(...result.value.values);
        result.value.values.forEach((value) => nodeSources.push({ value, type: "subs", key: result.value.key, remark: result.value.remark }));
      }
      else sourceErrors.push({ type: "subs", key: result.reason?.sourceKey || "", message: sourceErrorMessage(result.reason) });
    }
    const extra = [];
    for (const result of apiResults) {
      if (result.status === "fulfilled") {
        extra.push(...result.value.values);
        result.value.values.forEach((value) => nodeSources.push({ value, type: "apis", key: result.value.key, remark: result.value.remark }));
      }
      else sourceErrors.push({ type: "apis", key: result.reason?.sourceKey || "", message: sourceErrorMessage(result.reason) });
    }

    const filtered = [...new Set(preferred)];
    const output = [...filtered, ...extra].join("\n");
    // 空结果不缓存，避免上游短暂异常时需要等待缓存过期才能恢复。
    if (output.trim()) {
      aggregateCache.set(cacheKey, { output, sourceErrors, nodeSources, expiresAt: Date.now() + AGGREGATE_CACHE_TTL_MS });
      pruneAggregateCache();
    } else {
      aggregateCache.delete(cacheKey);
    }
    const headers = {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    };
    if (nodeSources.length) headers["x-node-sources"] = encodeURIComponent(JSON.stringify(nodeSources.slice(0, 1000)));
    if (options.includeRaw) {
      options.rawSources = sourceResults
        .filter((result) => result.status === "fulfilled")
        .map((result) => ({ type: result.value.type, key: result.value.key, remark: result.value.remark, nodes: result.value.unfilteredNodes || [], filterStats: result.value.filterStats || null }));
      options.nodeSources = nodeSources;
    }
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
  if (error.code === "EMPTY_RESPONSE") return "返回空数据";
  if (error.code === "TIMEOUT" || error.name === "AbortError") return "请求超时（15 秒）";
  if (error.code === "HTTP_ERROR" && error.statusCode) return `HTTP 错误（${error.statusCode}）`;
  return typeof error.message === "string" && error.message ? error.message.slice(0, 160) : "请求失败";
}

function sourceFailureState(error) {
  if (error?.code === "EMPTY_RESPONSE") return "empty";
  if (error?.code === "TIMEOUT" || error?.name === "AbortError") return "timeout";
  if (error?.code === "HTTP_ERROR") return "http-error";
  return "network-error";
}

function setSourceErrorHeaders(headers, errors) {
  if (!errors.length) return;
  headers["x-source-errors"] = encodeURIComponent(JSON.stringify(errors.slice(0, 50)));
}

export function clearAggregateCache() {
  aggregateCache.clear();
}

export { decodeSubscriptionBody, fetchWithTimeout, fetchPreferredSubs, filterPreferredIps, normalizeKvData, parsePreferredIpLine };
