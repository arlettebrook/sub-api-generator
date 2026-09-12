import {
  KV_KEY_CUSTOM_APIS,
  KV_KEY_APIS,
  KV_KEY_BLACKLIST,
  KV_KEY_FILTER_RULES,
  KV_KEY_SETTINGS,
  KV_KEY_SUBS,
  KV_KEY_SOURCE_STATUS,
  KV_KEY_PREFERRED_DOMAINS,
  MAX_CONFIG_ENTRIES,
  getRuntimeConfig as getPagesRuntimeConfig,
  isAllowedApiPath,
  normalizeCustomApiData,
  normalizeBlacklist,
  normalizeFilterRules,
  normalizeSettings,
  normalizeKvData,
  isPlainObject,
  readJsonObject as readPagesJsonObject,
  SOURCE_MODE_SELECTED,
  validateApiPathPayload,
  validateBlacklistPayload,
  validateFilterRulesPayload,
  validateSettingsPayload,
} from "./config.js";
import {
  jsonResponse as pagesJsonResponse,
  methodNotAllowed as pagesMethodNotAllowed,
  redirectResponse,
  textResponse as pagesTextResponse,
  withSecurityHeaders as pagesSecurityHeaders,
} from "./http.js";
import * as auth from "./auth.js";
import * as subscriptions from "./subscriptions.js";
import { adminHTML } from "./admin-page.js";
import { adminClientScript } from "./admin-client.js";
import { adminStyle } from "./admin-style.js";
import { loginPage } from "./login-page.js";

function makeAssetVersion(...contents) {
  let hash = 2166136261;
  for (const content of contents) {
    for (let index = 0; index < content.length; index += 1) {
      hash ^= content.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
  }
  return (hash >>> 0).toString(36);
}

const ADMIN_ASSET_VERSION = makeAssetVersion(adminStyle, adminClientScript);
const previewActive = new Map();
const previewRecent = new Map();
const previewActiveByScope = new Map();
const PREVIEW_MAX_CONCURRENT = 4;
const PREVIEW_SCOPE_LIMITS = { source: 3, custom: 2 };
const PREVIEW_COOLDOWN_MS = 2500;
const HISTORY_DEFAULT_LIMIT = 10;
const HISTORY_MAX_LIMIT = 50;
const historySchemaPromises = new WeakMap();

async function ensureDetectionHistorySchema(env) {
  const db = getHistoryDb(env);
  if (!db) return false;
  if (!historySchemaPromises.has(db)) {
    const promise = (async () => {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS detection_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          api_path TEXT NOT NULL,
          detected_at INTEGER NOT NULL,
          raw_count INTEGER NOT NULL DEFAULT 0,
          kept_count INTEGER NOT NULL DEFAULT 0,
          filtered_count INTEGER NOT NULL DEFAULT 0,
          error_count INTEGER NOT NULL DEFAULT 0,
          nodes_json TEXT NOT NULL DEFAULT '[]',
          raw_nodes_json TEXT NOT NULL DEFAULT '[]',
          raw_sources_json TEXT NOT NULL DEFAULT '[]',
          node_sources_json TEXT NOT NULL DEFAULT '[]',
          source_meta_json TEXT NOT NULL DEFAULT '[]'
        )
      `).bind().run();
      await db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_detection_history_api_time
          ON detection_history(api_path, detected_at DESC, id DESC)
      `).bind().run();
    })().catch((error) => {
      historySchemaPromises.delete(db);
      throw error;
    });
    historySchemaPromises.set(db, promise);
  }
  await historySchemaPromises.get(db);
  return true;
}

function getHistoryDb(env) {
  return env?.DB && typeof env.DB.prepare === "function" ? env.DB : null;
}

async function saveDetectionHistory(env, path, result) {
  const db = getHistoryDb(env);
  if (!db) return;
  try {
    await ensureDetectionHistorySchema(env);
    const rawNodeCount = Number(result.status?.rawNodeCount ?? result.unfilteredNodes.length) || 0;
    await db.prepare(`
      INSERT INTO detection_history
        (api_path, detected_at, raw_count, kept_count, filtered_count, error_count,
         nodes_json, raw_nodes_json, raw_sources_json, node_sources_json, source_meta_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      path,
      Date.now(),
      rawNodeCount,
      result.nodes.length,
      Math.max(0, rawNodeCount - result.nodes.length),
      result.status.errors.length,
      JSON.stringify(result.nodes),
      JSON.stringify(result.unfilteredNodes),
      JSON.stringify(result.rawSources),
      JSON.stringify(result.nodeSources),
      JSON.stringify(result.sourceMeta),
    ).run();
    await db.prepare(`
      DELETE FROM detection_history
      WHERE api_path = ?
        AND id NOT IN (
          SELECT id FROM detection_history
          WHERE api_path = ? ORDER BY detected_at DESC, id DESC LIMIT ?
        )
    `).bind(path, path, HISTORY_MAX_LIMIT).run();
  } catch {
    // History persistence must not make an otherwise successful preview fail.
  }
}

async function readDetectionHistory(request, env) {
  const db = getHistoryDb(env);
  if (!db) return pagesJsonResponse({ items: [], total: 0, available: false });
  const url = new URL(request.url);
  const path = (url.searchParams.get("path") || "").trim().replace(/^\/+/, "");
  if (!path || !isAllowedApiPath(path)) return pagesTextResponse("优选 API 路径无效", 400);
  const requestedLimit = Number(url.searchParams.get("limit") || HISTORY_DEFAULT_LIMIT);
  const limit = Math.min(HISTORY_MAX_LIMIT, Math.max(1, Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : HISTORY_DEFAULT_LIMIT));
  const requestedOffset = Number(url.searchParams.get("offset") || 0);
  const offset = Math.max(0, Number.isFinite(requestedOffset) ? Math.floor(requestedOffset) : 0);
  try {
    await ensureDetectionHistorySchema(env);
    const [rows, count] = await Promise.all([
      db.prepare(`
        SELECT id, api_path, detected_at, raw_count, kept_count, filtered_count, error_count,
               nodes_json, raw_nodes_json, raw_sources_json, node_sources_json, source_meta_json
        FROM detection_history
        WHERE api_path = ?
        ORDER BY detected_at DESC, id DESC
        LIMIT ? OFFSET ?
      `).bind(path, limit, offset).all(),
      db.prepare("SELECT COUNT(*) AS total FROM detection_history WHERE api_path = ?").bind(path).first(),
    ]);
    const items = (rows.results || []).map((row) => ({
      id: row.id,
      at: row.detected_at,
      raw: row.raw_count,
      kept: row.kept_count,
      filtered: row.filtered_count,
      errors: row.error_count,
      nodes: parseJsonArray(row.nodes_json),
      unfilteredNodes: parseJsonArray(row.raw_nodes_json),
      rawSources: parseJsonArray(row.raw_sources_json),
      nodeSources: parseJsonArray(row.node_sources_json),
      sourceMeta: parseJsonArray(row.source_meta_json),
    }));
    return pagesJsonResponse({ items, total: Number(count?.total || 0), available: true, limit, offset });
  } catch {
    return pagesJsonResponse({ items: [], total: 0, available: false });
  }
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function acquirePreviewProtection(scope, key) {
  const guardKey = scope + ':' + key;
  const now = Date.now();
  const last = previewRecent.get(guardKey) || 0;
  if (now - last < PREVIEW_COOLDOWN_MS) return { error: pagesJsonResponse({ error: "检测过于频繁，请稍后重试", code: "RATE_LIMITED", retryAfterMs: PREVIEW_COOLDOWN_MS - (now - last) }, 429) };
  const scopeActive = previewActiveByScope.get(scope) || 0;
  if (previewActive.size >= PREVIEW_MAX_CONCURRENT || scopeActive >= (PREVIEW_SCOPE_LIMITS[scope] || PREVIEW_MAX_CONCURRENT)) return { error: pagesJsonResponse({ error: "检测任务繁忙，请稍后重试", code: "BUSY" }, 429) };
  previewRecent.set(guardKey, now);
  previewActive.set(guardKey, (previewActive.get(guardKey) || 0) + 1);
  previewActiveByScope.set(scope, scopeActive + 1);
  return { release() {
    const count = (previewActive.get(guardKey) || 1) - 1;
    if (count > 0) previewActive.set(guardKey, count); else previewActive.delete(guardKey);
    const nextScopeActive = (previewActiveByScope.get(scope) || 1) - 1;
    if (nextScopeActive > 0) previewActiveByScope.set(scope, nextScopeActive); else previewActiveByScope.delete(scope);
  } };
}

async function handleGetSubs(env) {
  const data = await env.KV.get(KV_KEY_SUBS, "json");
  return pagesJsonResponse(normalizeKvData(data, "subs"));
}

async function handlePostSubs(request, env) {
  const body = await readPagesJsonObject(request, "subs");
  await env.KV.put(KV_KEY_SUBS, JSON.stringify(body));
  subscriptions.clearAggregateCache();
  return pagesJsonResponse({ ok: true });
}

async function handleGetApis(env) {
  const data = await env.KV.get(KV_KEY_APIS, "json");
  return pagesJsonResponse(normalizeKvData(data, "apis"));
}

async function getSourceStatusSnapshot(env, restore = true) {
  const [subs, apis, domains, persisted] = await Promise.all([
    env.KV.get(KV_KEY_SUBS, "json"),
    env.KV.get(KV_KEY_APIS, "json"),
    env.KV.get(KV_KEY_PREFERRED_DOMAINS, "json"),
    env.KV.get(KV_KEY_SOURCE_STATUS, "json"),
  ]);
  if (restore) subscriptions.restoreSourceStatuses(persisted);
  return subscriptions.getSourceStatuses(subs, apis, domains);
}

async function readSourceStatuses(env) {
  return pagesJsonResponse(await getSourceStatusSnapshot(env));
}

async function handleGetSourceStatuses(env) {
  return readSourceStatuses(env);
}

const DNS_RECORD_TYPES = [
  { name: "A", code: 1 },
  { name: "AAAA", code: 28 },
  { name: "CNAME", code: 5 },
];
const DOMAIN_LABEL_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

function normalizePreferredDomain(value) {
  if (typeof value !== "string") throw new Error("域名必须是字符串");
  const domain = value.trim().replace(/\.+$/, "").toLowerCase();
  if (!domain || domain.length > 253 || domain.includes("/") || domain.includes(":")) {
    throw new Error("域名格式无效");
  }
  const labels = domain.split(".");
  if (labels.length < 2 || labels.some((label) => !DOMAIN_LABEL_REGEX.test(label))) {
    throw new Error("域名格式无效");
  }
  return domain;
}

async function queryPreferredDomain(domain) {
  const results = {};
  const errors = {};
  await Promise.all(DNS_RECORD_TYPES.map(async ({ name, code }) => {
    try {
      const endpoint = new URL("https://cloudflare-dns.com/dns-query");
      endpoint.searchParams.set("name", domain);
      endpoint.searchParams.set("type", name);
      const response = await fetch(endpoint, {
        headers: { Accept: "application/dns-json" },
      });
      if (!response.ok) throw new Error(`DNS 服务返回 HTTP ${response.status}`);
      const payload = await response.json();
      if (Number(payload.Status) !== 0) {
        throw new Error(payload.Comment || `DNS 查询失败（状态 ${payload.Status}）`);
      }
      results[name] = (Array.isArray(payload.Answer) ? payload.Answer : [])
        .filter((answer) => Number(answer.type) === code && typeof answer.data === "string")
        .map((answer) => answer.data.trim())
        .filter(Boolean);
    } catch (error) {
      results[name] = [];
      errors[name] = error.message || "DNS 查询失败";
    }
  }));
  return {
    records: Object.fromEntries(DNS_RECORD_TYPES.map(({ name }) => [name, results[name] || []])),
    errors,
  };
}

async function handleGetPreferredDomains(env) {
  const data = await env.KV.get(KV_KEY_PREFERRED_DOMAINS, "json");
  return pagesJsonResponse(isPlainObject(data) ? data : {});
}

async function handlePostPreferredDomain(request, env) {
  let body;
  try { body = await request.json(); } catch { return pagesTextResponse("请求 JSON 无效", 400); }
  let domain;
  try { domain = normalizePreferredDomain(body?.domain); } catch (error) { return pagesTextResponse(error.message, 400); }
  const current = await env.KV.get(KV_KEY_PREFERRED_DOMAINS, "json");
  const configured = isPlainObject(current) ? current : {};
  if (!Object.prototype.hasOwnProperty.call(configured, domain) && Object.keys(configured).length >= MAX_CONFIG_ENTRIES) {
    return pagesTextResponse(`优选域名不能超过 ${MAX_CONFIG_ENTRIES} 个`, 400);
  }
  const result = await queryPreferredDomain(domain);
  const entry = {
    domain,
    remark: typeof body?.remark === "string" ? body.remark.trim().slice(0, 200) : (isPlainObject(configured[domain]) ? configured[domain].remark || "" : ""),
    records: result.records,
    errors: result.errors,
    checkedAt: Date.now(),
  };
  configured[domain] = entry;
  await env.KV.put(KV_KEY_PREFERRED_DOMAINS, JSON.stringify(configured));
  return pagesJsonResponse(entry);
}

async function handleDeletePreferredDomain(request, env) {
  const url = new URL(request.url);
  let domain;
  try { domain = normalizePreferredDomain(url.searchParams.get("domain") || ""); } catch (error) { return pagesTextResponse(error.message, 400); }
  const current = await env.KV.get(KV_KEY_PREFERRED_DOMAINS, "json");
  const configured = isPlainObject(current) ? current : {};
  if (!Object.prototype.hasOwnProperty.call(configured, domain)) return pagesTextResponse("域名不存在", 404);
  delete configured[domain];
  await env.KV.put(KV_KEY_PREFERRED_DOMAINS, JSON.stringify(configured));
  return pagesJsonResponse({ ok: true });
}

async function checkSourceStatuses(env, request) {
  subscriptions.clearAggregateCache();
  let body = {};
  if (request) {
    try {
      body = await request.json();
    } catch {
      return pagesTextResponse("请求 JSON 无效", 400);
    }
  }
  const scope = body?.scope || "used";
  let sourceSelection = null;
  if (scope === "all") {
    sourceSelection = null;
  } else if (scope === "selected") {
    if (!Array.isArray(body?.sources)) return pagesTextResponse("数据源选择无效", 400);
    sourceSelection = body.sources.filter((source) => source && ["subs", "apis", "domains"].includes(source.type) && typeof source.key === "string");
  } else if (scope === "used") {
    const [customApis, subs, apis, domains] = await Promise.all([
      env.KV.get(KV_KEY_CUSTOM_APIS, "json"),
      env.KV.get(KV_KEY_SUBS, "json"),
      env.KV.get(KV_KEY_APIS, "json"),
      env.KV.get(KV_KEY_PREFERRED_DOMAINS, "json"),
    ]);
    const configuredSources = [];
    let usesAllSources = false;
    for (const entry of Object.values(normalizeCustomApiData(customApis))) {
      if (entry.enabled !== true) continue;
      if (entry.sourceMode !== SOURCE_MODE_SELECTED) {
        usesAllSources = true;
        break;
      }
      configuredSources.push(...(entry.sources || []));
    }
    if (usesAllSources) sourceSelection = null;
    else sourceSelection = configuredSources;
    // Ensure malformed source configuration does not cause a broad check.
    if (!isPlainObject(subs) && !isPlainObject(apis) && !isPlainObject(domains)) sourceSelection = [];
  } else {
    return pagesTextResponse("检测范围无效", 400);
  }
  await getSourceStatusSnapshot(env);
  const checkResponse = await subscriptions.handleRoot(env, sourceSelection);
  if (!checkResponse.ok) return checkResponse;
  const snapshot = await getSourceStatusSnapshot(env, false);
  await env.KV.put(KV_KEY_SOURCE_STATUS, JSON.stringify(snapshot));
  return pagesJsonResponse(snapshot);
}

async function handlePostApis(request, env) {
  const body = await readPagesJsonObject(request, "apis");
  await env.KV.put(KV_KEY_APIS, JSON.stringify(body));
  subscriptions.clearAggregateCache();
  return pagesJsonResponse({ ok: true });
}

async function handleSourceRaw(request, env) {
  let body;
  try { body = await request.json(); } catch { return pagesTextResponse("请求 JSON 无效", 400); }
  const type = body?.type;
  const key = typeof body?.key === "string" ? body.key.trim() : "";
  if (!["subs", "apis", "domains"].includes(type) || !key) return pagesTextResponse("数据源参数无效", 400);
  const configured = await env.KV.get(type === "subs" ? KV_KEY_SUBS : type === "apis" ? KV_KEY_APIS : KV_KEY_PREFERRED_DOMAINS, "json");
  const normalized = normalizeKvData(configured, type);
  if (!Object.prototype.hasOwnProperty.call(normalized, key)) return pagesTextResponse("数据源不存在", 404);
  const guard = acquirePreviewProtection('source', type + ':' + key);
  if (guard.error) return guard.error;
  subscriptions.clearAggregateCache();
  try {
    const resultOptions = { includeRaw: true };
    const response = await subscriptions.handleRoot(env, [{ type, key }], resultOptions);
    const snapshot = await getSourceStatusSnapshot(env, false);
    await env.KV.put(KV_KEY_SOURCE_STATUS, JSON.stringify(snapshot));
    const text = await response.text();
    const nodes = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const rawSources = resultOptions.rawSources || [];
    const unfilteredNodes = rawSources.flatMap((source) => source.nodes || []);
    const records = type === "domains"
      ? rawSources.find((source) => source.type === "domains")?.records || {}
      : null;
    const filterStats = rawSources.reduce((total, source) => {
      for (const [key, value] of Object.entries(source.filterStats || {})) total[key] = (total[key] || 0) + (Number(value) || 0);
      return total;
    }, {});
    return pagesJsonResponse({
      nodes,
      rawSources,
      unfilteredNodes,
      ...(type === "domains" ? { records } : {}),
      status: { ...(snapshot[type]?.[key] || {}), filterStats },
    }, response.ok ? 200 : response.status);
  } catch (error) {
    return pagesJsonResponse({ error: error.message || "数据源检测失败", code: error.code || "ERROR" }, error.statusCode >= 400 ? error.statusCode : 502);
  } finally {
    guard.release();
  }
}

async function handleCustomApiPreview(request, env) {
  let body;
  try { body = await request.json(); } catch { return pagesTextResponse("请求 JSON 无效", 400); }
  const path = typeof body?.path === "string" ? body.path.trim().replace(/^\/+/, "") : "";
  if (!path) return pagesTextResponse("优选 API 路径无效", 400);
  const configured = normalizeCustomApiData(await env.KV.get(KV_KEY_CUSTOM_APIS, "json"));
  const entry = configured[path];
  if (!entry) return pagesTextResponse("优选 API 不存在", 404);
  const guard = acquirePreviewProtection('custom', path);
  if (guard.error) return guard.error;
  try {
  let sourceSelection = entry.sources;
  if (entry.sourceMode !== SOURCE_MODE_SELECTED) {
    const [subs, apis, domains] = await Promise.all([
      env.KV.get(KV_KEY_SUBS, "json"),
      env.KV.get(KV_KEY_APIS, "json"),
      env.KV.get(KV_KEY_PREFERRED_DOMAINS, "json"),
    ]);
    sourceSelection = [
      ...Object.keys(normalizeKvData(subs, "subs")).map((key) => ({ type: "subs", key })),
      ...Object.keys(normalizeKvData(apis, "apis")).map((key) => ({ type: "apis", key })),
      ...Object.keys(normalizeKvData(domains, "domains")).map((key) => ({ type: "domains", key })),
    ];
  }
  subscriptions.clearAggregateCache();
  const startedAt = Date.now();
  const resultOptions = {
    includeRaw: true,
    prefix: entry.prefix,
    suffix: entry.suffix,
    suffixStrategy: entry.suffixStrategy,
  };
  const response = await subscriptions.handleRoot(env, sourceSelection, resultOptions);
  const text = await response.text();
  const nodes = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rawSources = resultOptions.rawSources || [];
  const unfilteredNodes = rawSources.flatMap((source) => source.nodes || []);
  const nodeSources = resultOptions.nodeSources || [];
  const filterStats = rawSources.reduce((total, source) => {
    for (const [key, value] of Object.entries(source.filterStats || {})) total[key] = (total[key] || 0) + (Number(value) || 0);
    return total;
  }, {});
  const snapshot = await getSourceStatusSnapshot(env, false);
  await env.KV.put(KV_KEY_SOURCE_STATUS, JSON.stringify(snapshot));
  const sourceMeta = (sourceSelection || []).map((source) => ({ type: source.type, key: source.key, remark: snapshot[source.type]?.[source.key]?.remark || "" }));
  const selectedStatuses = (sourceSelection || []).map((source) => snapshot[source.type]?.[source.key]).filter(Boolean);
  const rawNodeCount = selectedStatuses.reduce((count, status) => count + (status.rawNodeCount || 0), 0);
  const errors = response.headers.get("x-source-errors");
  let errorList = [];
  if (errors) {
    try { errorList = JSON.parse(decodeURIComponent(errors)); } catch { /* ignore malformed diagnostics */ }
  }
  if (!errorList.length) {
    errorList = selectedStatuses
      .filter((status) => status.state && !["success", "idle"].includes(status.state))
      .map((status) => ({ type: status.type, key: status.key, message: status.error || status.state }));
  }
  const previewResult = {
    nodes,
    rawSources,
    unfilteredNodes,
    nodeSources,
    sourceMeta,
    status: {
      state: nodes.length ? "success" : (errorList.length ? "error" : "empty"),
      nodeCount: nodes.length,
      rawNodeCount,
      durationMs: Date.now() - startedAt,
      statusCode: response.status,
      error: errorList.map((item) => item.message).filter(Boolean).join("；"),
      errors: errorList,
      filterStats,
    },
  };
  await saveDetectionHistory(env, path, previewResult);
  return pagesJsonResponse(previewResult, response.ok ? 200 : response.status);
  } finally {
    guard.release();
  }
}

async function handleGetBlacklist(env) {
  const data = await env.KV.get(KV_KEY_BLACKLIST, "json");
  return pagesJsonResponse(normalizeBlacklist(data));
}

async function handlePostBlacklist(request, env) {
  let body;
  try {
    body = validateBlacklistPayload(await request.json());
  } catch (error) {
    throw new Error(`请求 JSON 无效: ${error.message}`);
  }
  await env.KV.put(KV_KEY_BLACKLIST, JSON.stringify(body));
  subscriptions.clearAggregateCache();
  return pagesJsonResponse({ ok: true });
}

async function handleGetFilterRules(env) {
  const data = await env.KV.get(KV_KEY_FILTER_RULES, "json");
  return pagesJsonResponse(normalizeFilterRules(data));
}

async function handlePostFilterRules(request, env) {
  let body;
  try {
    body = validateFilterRulesPayload(await request.json());
  } catch (error) {
    throw new Error(`请求 JSON 无效: ${error.message}`);
  }
  await env.KV.put(KV_KEY_FILTER_RULES, JSON.stringify(body));
  subscriptions.clearAggregateCache();
  return pagesJsonResponse({ ok: true });
}

async function handleGetSettings(env) {
  return pagesJsonResponse(normalizeSettings(await env.KV.get(KV_KEY_SETTINGS, "json")));
}

async function handlePostSettings(request, env) {
  let body;
  try {
    body = validateSettingsPayload(await request.json());
  } catch (error) {
    throw new Error(`请求 JSON 无效: ${error.message}`);
  }
  await env.KV.put(KV_KEY_SETTINGS, JSON.stringify(body));
  return pagesJsonResponse(body);
}

async function handleGetCustomApis(env) {
  const data = await env.KV.get(KV_KEY_CUSTOM_APIS, "json");
  return pagesJsonResponse(normalizeCustomApiData(data));
}

async function handlePostCustomApis(request, env) {
  let body;
  try {
    body = validateApiPathPayload(await request.json());
  } catch (error) {
    throw new Error(`请求 JSON 无效: ${error.message}`);
  }
  await env.KV.put(KV_KEY_CUSTOM_APIS, JSON.stringify(body));
  subscriptions.clearAggregateCache();
  return pagesJsonResponse({ ok: true });
}

async function handleCustomApiPath(path, env) {
  const apiPath = path.slice(1);
  if (!isAllowedApiPath(apiPath)) return null;
  const data = await env.KV.get(KV_KEY_CUSTOM_APIS, "json");
  const configured = normalizeCustomApiData(data);
  if (!configured[apiPath]?.enabled) return null;
  const api = configured[apiPath];
  let sourceSelection = api.sources;
  if (api.sourceMode !== SOURCE_MODE_SELECTED) {
    const [subs, apis] = await Promise.all([
      env.KV.get(KV_KEY_SUBS, "json"),
      env.KV.get(KV_KEY_APIS, "json"),
    ]);
    sourceSelection = [
      ...Object.keys(normalizeKvData(subs, "subs")).map((key) => ({ type: "subs", key })),
      ...Object.keys(normalizeKvData(apis, "apis")).map((key) => ({ type: "apis", key })),
    ];
  }
  return subscriptions.handleRoot(env, sourceSelection, {
    diagnostics: true,
    prefix: api.prefix,
    suffix: api.suffix,
    suffixStrategy: api.suffixStrategy,
  });
}

function handleAdmin(page = "overview", adminBasePath = "/admin") {
  const html = renderAdminPage(page, adminBasePath);
  return new Response(html, {
    headers: pagesSecurityHeaders({
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    }),
  });
}

function renderAdminPage(page, adminBasePath = "/admin") {
  const activeSections = new Set(page === "manage" ? ["subs", "apis", "sourceStatus", "preferredDomains"] : [page]);
  let html = adminHTML
    .replaceAll("__ADMIN_ASSET_VERSION__", ADMIN_ASSET_VERSION)
    .replaceAll("__ADMIN_BASE_PATH__", adminBasePath)
    .replace('data-page="__PAGE__"', `data-page="${page}"`);
  html = html.replace(/<!-- ADMIN_SECTION:([A-Za-z0-9_-]+):START -->[\s\S]*?<!-- ADMIN_SECTION:\1:END -->/g, (block, section) => {
    if (section === "customApiDialog") return activeSections.has("customApis") ? block : "";
    return activeSections.has(section) ? block : "";
  });
  return html;
}

function resolveAdminPage(path, settings) {
  if (settings.enabled) {
    if (!settings.accessPath) return null;
    const base = `/${settings.accessPath}`;
    if (path === base) return { page: "overview", basePath: base };
    const pages = {
      "/subs": "subs",
      "/apis": "apis",
      "/manage": "manage",
      "/custom-apis": "customApis",
      "/settings": "settings",
    };
    const suffix = path.startsWith(`${base}/`) ? path.slice(base.length) : "";
    if (pages[suffix]) return { page: pages[suffix], basePath: base };
    return null;
  }
  const pages = {
    "/": "overview",
    "/admin": "overview",
    "/admin/subs": "subs",
    "/admin/apis": "apis",
    "/admin/manage": "manage",
    "/admin/custom-apis": "customApis",
    "/admin/settings": "settings",
  };
  return pages[path] ? { page: pages[path], basePath: "/admin" } : null;
}

function shouldCamouflageRedirect(path, method, settings) {
  if (!settings.enabled) return false;
  if (method !== "GET" && method !== "HEAD") return false;
  if (path.startsWith("/api/") || path === "/login" || path === "/logout" || path === "/admin.css" || path === "/admin-client.js") return false;
  return resolveAdminPage(path, settings) === null;
}

function assetResponse(content, contentType, cacheControl = "public, max-age=300, must-revalidate") {
  return new Response(content, {
    headers: pagesSecurityHeaders({
      "content-type": contentType,
      "cache-control": cacheControl,
    }),
  });
}

// ========================= 主入口 =========================
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    if (path === "/admin.css") {
      if (method !== "GET") return pagesMethodNotAllowed("GET");
      return assetResponse(adminStyle, "text/css; charset=utf-8", "public, max-age=31536000, immutable");
    }
    if (path === "/admin-client.js") {
      if (method !== "GET") return pagesMethodNotAllowed("GET");
      return assetResponse(adminClientScript, "application/javascript; charset=utf-8", "public, max-age=31536000, immutable");
    }
    const config = getPagesRuntimeConfig(env);

    if (config.error) {
      return pagesTextResponse(config.error, 503, { "cache-control": "no-store" });
    }

    const settings = normalizeSettings(await env.KV.get(KV_KEY_SETTINGS, "json"));
    const adminRoute = resolveAdminPage(path, settings);
    const validPwdHash = await auth.sha256Hex(config.password);

    // ========== 免认证接口 ==========
    if (path === "/login" && method === "POST") {
      return await auth.handleLogin(request, validPwdHash, loginPage);
    }
    if (settings.enabled && adminRoute && method === "POST") {
      return await auth.handleLogin(request, validPwdHash, (message) => loginPage(message, path), path);
    }
    if (path === "/logout" && method === "POST") {
      return auth.handleLogout(request);
    }
    if (path === "/login" || path === "/logout") {
      return pagesMethodNotAllowed("POST");
    }
    if (method === "GET" && !adminRoute) {
      const customApiResponse = await handleCustomApiPath(path, env);
      if (customApiResponse) return customApiResponse;
    }

    if (shouldCamouflageRedirect(path, method, settings)) {
      return redirectResponse(request, settings.redirectUrl, { "cache-control": "no-store" });
    }

    // ========== 未认证统一返回登录页 ==========
    if (!auth.isAuthenticated(request, validPwdHash)) {
      const loginAction = settings.enabled && adminRoute ? path : "/login";
      return new Response(await loginPage("", loginAction), {
        headers: pagesSecurityHeaders({
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        }),
      });
    }

    // ========== 已认证路由分发 ==========
    try {
      if (adminRoute) {
        if (method !== "GET") return pagesMethodNotAllowed("GET");
        return handleAdmin(adminRoute.page, adminRoute.basePath);
      }
      switch (path) {
        case "/api/subs":
          if (method === "GET") return await handleGetSubs(env);
          if (method === "POST") return await handlePostSubs(request, env);
          return pagesMethodNotAllowed("GET, POST");
        case "/api/apis":
          if (method === "GET") return await handleGetApis(env);
          if (method === "POST") return await handlePostApis(request, env);
          return pagesMethodNotAllowed("GET, POST");
        case "/api/source-status":
          if (method === "GET") return await handleGetSourceStatuses(env);
          return pagesMethodNotAllowed("GET");
        case "/api/source-status/check":
          if (method === "POST") return await checkSourceStatuses(env, request);
          return pagesMethodNotAllowed("POST");
        case "/api/preferred-domains":
          if (method === "GET") return await handleGetPreferredDomains(env);
          if (method === "POST") return await handlePostPreferredDomain(request, env);
          if (method === "DELETE") return await handleDeletePreferredDomain(request, env);
          return pagesMethodNotAllowed("GET, POST, DELETE");
        case "/api/source-raw":
          if (method === "POST") return await handleSourceRaw(request, env);
          return pagesMethodNotAllowed("POST");
        case "/api/custom-api-preview":
          if (method === "POST") return await handleCustomApiPreview(request, env);
          return pagesMethodNotAllowed("POST");
        case "/api/detection-history":
          if (method === "GET") return await readDetectionHistory(request, env);
          return pagesMethodNotAllowed("GET");
        case "/api/blacklist":
          if (method === "GET") return await handleGetBlacklist(env);
          if (method === "POST") return await handlePostBlacklist(request, env);
          return pagesMethodNotAllowed("GET, POST");
        case "/api/filter-rules":
          if (method === "GET") return await handleGetFilterRules(env);
          if (method === "POST") return await handlePostFilterRules(request, env);
          return pagesMethodNotAllowed("GET, POST");
        case "/api/settings":
          if (method === "GET") return await handleGetSettings(env);
          if (method === "POST") return await handlePostSettings(request, env);
          return pagesMethodNotAllowed("GET, POST");
        case "/api/custom-apis":
          if (method === "GET") return await handleGetCustomApis(env);
          if (method === "POST") return await handlePostCustomApis(request, env);
          return pagesMethodNotAllowed("GET, POST");
        default:
          return pagesTextResponse("Not Found", 404);
      }
    } catch (error) {
      const status = error.message.startsWith("请求 JSON 无效") ? 400 : 500;
      return pagesTextResponse("Error: " + error.message, status);
    }
  },
};
