import {
  KV_KEY_CUSTOM_APIS,
  KV_KEY_APIS,
  KV_KEY_BLACKLIST,
  KV_KEY_FILTER_RULES,
  KV_KEY_SETTINGS,
  KV_KEY_WEBDAV_BACKUP,
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
  normalizeSourceKey,
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
import {
  DEFAULT_WEBDAV_FILENAME,
  isWebdavConfigured,
  isValidBackupFilename,
  normalizeWebdavConfig,
  publicWebdavConfig,
  sortBackupFilenames,
  timestampedBackupFilename,
  validateWebdavConfigPayload,
  webdavDownload,
  webdavListBackupEntries,
  webdavListBackups,
  webdavPruneBackups,
  webdavTestConnection,
  webdavUpload,
} from "./webdav.js";

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

async function persistPreferredDomainStatuses(env, snapshot, sourceSelection = null) {
  const current = await env.KV.get(KV_KEY_PREFERRED_DOMAINS, "json");
  if (!isPlainObject(current)) return current;
  const configured = { ...current };
  const selectedKeys = sourceSelection === null
    ? new Set(Object.keys(configured).map((key) => normalizeSourceKey("domains", key)).filter(Boolean))
    : new Set((Array.isArray(sourceSelection) ? sourceSelection : [])
      .filter((source) => source?.type === "domains")
      .map((source) => normalizeSourceKey("domains", source.key))
      .filter(Boolean));
  let changed = false;
  for (const key of selectedKeys) {
    const status = snapshot?.domains?.[key];
    if (!isPlainObject(status)) continue;
    const previous = isPlainObject(configured[key]) ? configured[key] : {};
    const records = isPlainObject(status.dnsRecords)
      ? Object.fromEntries(["A", "AAAA", "CNAME"].map((type) => [type, Array.isArray(status.dnsRecords[type]) ? status.dnsRecords[type] : []]))
      : { A: [], AAAA: [], CNAME: [] };
    const checkedAt = Date.parse(status.lastAttemptAt || "");
    const next = {
      ...previous,
      domain: key,
      records,
      errors: isPlainObject(status.dnsErrors) ? status.dnsErrors : {},
      dnsErrorCodes: isPlainObject(status.dnsErrorCodes) ? status.dnsErrorCodes : {},
      dnsProviders: isPlainObject(status.dnsProviders) ? status.dnsProviders : {},
      ...(Number.isFinite(checkedAt) && checkedAt > 0 ? { checkedAt } : {}),
      ...(Number.isFinite(Number(status.durationMs)) && Number(status.durationMs) >= 0 ? { durationMs: Number(status.durationMs) } : {}),
    };
    if (JSON.stringify(previous) !== JSON.stringify(next)) {
      configured[key] = next;
      changed = true;
    }
  }
  if (changed) await env.KV.put(KV_KEY_PREFERRED_DOMAINS, JSON.stringify(configured));
  return configured;
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
  const previous = isPlainObject(configured[domain]) ? configured[domain] : null;
  const remark = typeof body?.remark === "string" ? body.remark.trim().slice(0, 200) : (previous ? previous.remark || "" : "");
  let entry;
  if (body?.resolve === false) {
    // 仅更新备注：保留已有解析结果，不触发 DNS 查询。
    entry = {
      domain,
      remark,
      ...(previous ? {
        records: isPlainObject(previous.records) ? previous.records : { A: [], AAAA: [], CNAME: [] },
        errors: isPlainObject(previous.errors) ? previous.errors : {},
        dnsErrorCodes: isPlainObject(previous.dnsErrorCodes) ? previous.dnsErrorCodes : {},
        dnsProviders: isPlainObject(previous.dnsProviders) ? previous.dnsProviders : {},
        ...(Number(previous.checkedAt) > 0 ? { checkedAt: Number(previous.checkedAt) } : {}),
        ...(Number.isFinite(Number(previous.durationMs)) && Number(previous.durationMs) >= 0 ? { durationMs: Number(previous.durationMs) } : {}),
      } : {}),
    };
  } else {
    const startedAt = Date.now();
    const result = await subscriptions.resolvePreferredDomainRecords(domain, { force: true });
    const errors = Object.fromEntries((result.errors || []).map((item) => [item.recordType, item.message || "DNS 查询失败"]));
    entry = {
      domain,
      remark,
      records: result.records,
      errors,
      dnsErrorCodes: Object.fromEntries((result.errors || []).map((item) => [item.recordType, item.code || "DNS_ERROR"])),
      dnsProviders: result.providers || {},
      checkedAt: Date.now(),
      ...(Number.isFinite(Number(result.durationMs)) && Number(result.durationMs) >= 0 ? { durationMs: Date.now() - startedAt } : {}),
    };
    subscriptions.recordPreferredDomainStatus(domain, result, Date.now() - startedAt);
  }
  configured[domain] = entry;
  await env.KV.put(KV_KEY_PREFERRED_DOMAINS, JSON.stringify(configured));
  const snapshot = subscriptions.getSourceStatuses(await env.KV.get(KV_KEY_SUBS, "json"), await env.KV.get(KV_KEY_APIS, "json"), configured);
  await env.KV.put(KV_KEY_SOURCE_STATUS, JSON.stringify(snapshot));
  return pagesJsonResponse(entry);
}

async function handleDeletePreferredDomainsBatch(request, env) {
  let body;
  try { body = await request.json(); } catch { return pagesTextResponse("请求 JSON 无效", 400); }
  if (!Array.isArray(body?.domains)) return pagesTextResponse("请求 JSON 无效", 400);
  const domains = [];
  for (const value of body.domains.slice(0, MAX_CONFIG_ENTRIES)) {
    let domain;
    try { domain = normalizePreferredDomain(typeof value === "string" ? value : ""); } catch {
      return pagesTextResponse(`域名格式无效: ${String(value).slice(0, 100)}`, 400);
    }
    if (!domains.includes(domain)) domains.push(domain);
  }
  const current = await env.KV.get(KV_KEY_PREFERRED_DOMAINS, "json");
  const configured = isPlainObject(current) ? current : {};
  const deleted = [];
  for (const domain of domains) {
    if (Object.prototype.hasOwnProperty.call(configured, domain)) {
      delete configured[domain];
      deleted.push(domain);
    }
  }
  if (deleted.length) {
    await env.KV.put(KV_KEY_PREFERRED_DOMAINS, JSON.stringify(configured));
    subscriptions.clearAggregateCache();
  }
  return pagesJsonResponse({ ok: true, deleted: deleted.length, missing: domains.filter((domain) => !deleted.includes(domain)) });
}

async function handleImportPreferredDomains(request, env) {
  let body;
  try { body = await request.json(); } catch { return pagesTextResponse("请求 JSON 无效", 400); }
  if (!isPlainObject(body)) return pagesTextResponse("配置必须是 JSON 对象", 400);
  const entries = Object.entries(body);
  if (entries.length > MAX_CONFIG_ENTRIES) {
    return pagesTextResponse(`优选域名不能超过 ${MAX_CONFIG_ENTRIES} 个`, 400);
  }
  const current = await env.KV.get(KV_KEY_PREFERRED_DOMAINS, "json");
  const configured = isPlainObject(current) ? current : {};
  for (const [rawDomain, rawEntry] of entries) {
    let domain;
    try { domain = normalizePreferredDomain(rawDomain); } catch {
      return pagesTextResponse(`域名格式无效: ${String(rawDomain).slice(0, 100)}`, 400);
    }
    const normalized = normalizeKvData({ [domain]: isPlainObject(rawEntry) ? rawEntry : { remark: "" } }, "domains")[domain];
    if (!normalized) return pagesTextResponse(`域名配置无效: ${String(rawDomain).slice(0, 100)}`, 400);
    configured[domain] = { domain, ...normalized };
  }
  await env.KV.put(KV_KEY_PREFERRED_DOMAINS, JSON.stringify(configured));
  subscriptions.clearAggregateCache();
  return pagesJsonResponse({ ok: true, count: entries.length });
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
  const checkResponse = await subscriptions.handleRoot(env, sourceSelection, { forceDns: true });
  if (!checkResponse.ok) return checkResponse;
  const snapshot = await getSourceStatusSnapshot(env, false);
  await persistPreferredDomainStatuses(env, snapshot, sourceSelection);
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
    await persistPreferredDomainStatuses(env, snapshot, [{ type, key }]);
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
  await persistPreferredDomainStatuses(env, snapshot, sourceSelection);
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

function normalizePreferredDomainBackup(data) {
  if (!isPlainObject(data)) return {};
  const normalized = {};
  for (const [rawDomain, rawEntry] of Object.entries(data)) {
    let domain;
    try { domain = normalizePreferredDomain(rawDomain); } catch { continue; }
    const entry = normalizeKvData({ [domain]: isPlainObject(rawEntry) ? rawEntry : { remark: "" } }, "domains")[domain];
    if (entry) normalized[domain] = { domain, ...entry };
  }
  return normalized;
}

const BACKUP_SECTIONS = [
  { key: "subs", aliases: ["subs"], sourceType: "subs", kvKey: KV_KEY_SUBS },
  { key: "apis", aliases: ["apis"], sourceType: "apis", kvKey: KV_KEY_APIS },
  { key: "customApis", aliases: ["customApis", "custom_apis"], kvKey: KV_KEY_CUSTOM_APIS },
  { key: "blacklist", aliases: ["blacklist"], kvKey: KV_KEY_BLACKLIST },
  { key: "filterRules", aliases: ["filterRules", "filter_rules"], kvKey: KV_KEY_FILTER_RULES },
  { key: "preferredDomains", aliases: ["preferredDomains", "preferred_domains"], kvKey: KV_KEY_PREFERRED_DOMAINS },
  { key: "settings", aliases: ["settings"], kvKey: KV_KEY_SETTINGS },
];

function normalizeBackupSection(section, value) {
  switch (section.key) {
    case "subs":
    case "apis":
      if (!isPlainObject(value)) return null;
      if (Object.keys(value).length > MAX_CONFIG_ENTRIES) return null;
      return { data: normalizeKvData(value, section.sourceType) };
    case "customApis":
      if (!isPlainObject(value)) return null;
      if (Object.keys(value).length > MAX_CONFIG_ENTRIES) return null;
      return { data: normalizeCustomApiData(value) };
    case "blacklist":
      if (!Array.isArray(value)) return null;
      return { data: normalizeBlacklist(value) };
    case "filterRules":
      if (!Array.isArray(value)) return null;
      return { data: normalizeFilterRules(value) };
    case "preferredDomains":
      if (!isPlainObject(value)) return null;
      if (Object.keys(value).length > MAX_CONFIG_ENTRIES) return null;
      return { data: normalizePreferredDomainBackup(value) };
    case "settings":
      if (!isPlainObject(value)) return null;
      return { data: normalizeSettings(value) };
    default:
      return null;
  }
}

async function collectBackupData(env) {
  const [subs, apis, customApis, blacklist, filterRules, preferredDomains, settings] = await Promise.all([
    env.KV.get(KV_KEY_SUBS, "json"),
    env.KV.get(KV_KEY_APIS, "json"),
    env.KV.get(KV_KEY_CUSTOM_APIS, "json"),
    env.KV.get(KV_KEY_BLACKLIST, "json"),
    env.KV.get(KV_KEY_FILTER_RULES, "json"),
    env.KV.get(KV_KEY_PREFERRED_DOMAINS, "json"),
    env.KV.get(KV_KEY_SETTINGS, "json"),
  ]);
  const raw = { subs, apis, customApis, blacklist, filterRules, preferredDomains, settings };
  const data = {};
  for (const section of BACKUP_SECTIONS) {
    const empty = section.key === "blacklist" || section.key === "filterRules" ? [] : {};
    const normalized = normalizeBackupSection(section, raw[section.key] ?? empty);
    data[section.key] = normalized ? normalized.data : empty;
  }
  return data;
}

function buildBackupPayload(data) {
  return {
    app: "sub-api-generator",
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}

async function handleBackup(env) {
  return pagesJsonResponse(buildBackupPayload(await collectBackupData(env)));
}

async function handleWebdavBackupUpload(env) {
  const config = normalizeWebdavConfig(await env.KV.get(KV_KEY_WEBDAV_BACKUP, "json"));
  if (!isWebdavConfigured(config)) return pagesTextResponse("请先配置并保存 WebDAV 地址", 400);
  const baseFilename = config.filename || DEFAULT_WEBDAV_FILENAME;
  const filename = timestampedBackupFilename(baseFilename);
  const content = JSON.stringify(buildBackupPayload(await collectBackupData(env)), null, 2);
  try {
    await webdavUpload(config, filename, content);
  } catch (error) {
    return pagesTextResponse(error.message || "备份上传到 WebDAV 失败", 502);
  }
  // 云端最多保留 10 份备份；清理失败不影响本次备份结果。
  let pruned = 0;
  try {
    pruned = (await webdavPruneBackups(config, baseFilename, [filename])).length;
  } catch { /* ignore prune failures */ }
  return pagesJsonResponse({ ok: true, filename, pruned });
}

async function handleWebdavBackupTest(request, env) {
  // 优先测试表单中未保存的配置（密码留空时沿用已保存的密码）；无表单则测试已保存配置。
  const raw = await request.json().catch(() => null);
  let config = normalizeWebdavConfig(await env.KV.get(KV_KEY_WEBDAV_BACKUP, "json"));
  if (isPlainObject(raw) && typeof raw.url === "string" && raw.url.trim()) {
    let form;
    try { form = validateWebdavConfigPayload(raw); } catch (error) { return pagesTextResponse(error.message, 400); }
    if (!form.password && form.url) form.password = config.password;
    config = form;
  }
  if (!isWebdavConfigured(config)) return pagesTextResponse("请先填写 WebDAV 地址", 400);
  return pagesJsonResponse(await webdavTestConnection(config));
}

async function handleWebdavBackupList(env) {
  const config = normalizeWebdavConfig(await env.KV.get(KV_KEY_WEBDAV_BACKUP, "json"));
  if (!isWebdavConfigured(config)) return pagesTextResponse("请先配置并保存 WebDAV 地址", 400);
  const baseFilename = config.filename || DEFAULT_WEBDAV_FILENAME;
  try {
    const entries = await webdavListBackupEntries(config, baseFilename);
    return pagesJsonResponse({
      ok: true,
      items: entries.map((entry) => ({ filename: entry.name, size: entry.size, lastModified: entry.lastModified })),
    });
  } catch (error) {
    return pagesTextResponse(error.message || "读取 WebDAV 备份列表失败", 502);
  }
}

async function handleWebdavBackupRestore(request, env) {
  const config = normalizeWebdavConfig(await env.KV.get(KV_KEY_WEBDAV_BACKUP, "json"));
  if (!isWebdavConfigured(config)) return pagesTextResponse("请先配置并保存 WebDAV 地址", 400);
  const baseFilename = config.filename || DEFAULT_WEBDAV_FILENAME;
  // 指定文件名时恢复该份备份；否则优先恢复最新一份（列表获取失败时回退到固定文件名，兼容旧备份）。
  let requested = null;
  try {
    const body = await request.json();
    if (typeof body?.filename === "string" && body.filename) requested = body.filename;
  } catch { /* 无请求体：恢复最新一份 */ }
  let filename;
  if (requested) {
    if (!isValidBackupFilename(baseFilename, requested)) return pagesTextResponse("备份文件名无效", 400);
    filename = requested;
  } else {
    filename = baseFilename;
    try {
      const backups = await webdavListBackups(config, baseFilename);
      if (backups.length) filename = sortBackupFilenames(backups)[0];
    } catch { /* ignore listing failures, fall back to base filename */ }
  }
  let text;
  try {
    text = await webdavDownload(config, filename);
  } catch (error) {
    return pagesTextResponse(error.message || "从 WebDAV 读取备份失败", 502);
  }
  let parsed;
  try { parsed = JSON.parse(text); } catch { return pagesTextResponse("WebDAV 上的备份文件不是有效的 JSON", 400); }
  if (!isPlainObject(parsed) || !isPlainObject(parsed.data)) return pagesTextResponse("备份文件格式无效", 400);
  try {
    const restored = await applyRestoreSections(env, parsed.data);
    return pagesJsonResponse({ ok: true, restored, filename });
  } catch (error) {
    return pagesTextResponse(error.message, 400);
  }
}

async function handleWebdavBackupDownload(request, env) {
  const config = normalizeWebdavConfig(await env.KV.get(KV_KEY_WEBDAV_BACKUP, "json"));
  if (!isWebdavConfigured(config)) return pagesTextResponse("请先配置并保存 WebDAV 地址", 400);
  const baseFilename = config.filename || DEFAULT_WEBDAV_FILENAME;
  let filename = null;
  try {
    const body = await request.json();
    if (typeof body?.filename === "string") filename = body.filename;
  } catch { return pagesTextResponse("请求 JSON 无效", 400); }
  if (!filename) return pagesTextResponse("备份文件名无效", 400);
  if (!isValidBackupFilename(baseFilename, filename)) return pagesTextResponse("备份文件名无效", 400);
  let text;
  try {
    text = await webdavDownload(config, filename);
  } catch (error) {
    return pagesTextResponse(error.message || "从 WebDAV 读取备份失败", 502);
  }
  return new Response(text, {
    headers: pagesSecurityHeaders({
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    }),
  });
}

async function applyRestoreSections(env, data) {
  if (!isPlainObject(data)) throw new Error("备份文件格式无效");
  const restored = {};
  const writes = [];
  for (const section of BACKUP_SECTIONS) {
    const value = section.aliases
      .map((alias) => data[alias])
      .find((aliasValue) => aliasValue !== undefined);
    if (value === undefined) continue;
    const normalized = normalizeBackupSection(section, value);
    if (!normalized) throw new Error(`备份文件格式无效: ${section.key}`);
    writes.push(env.KV.put(section.kvKey, JSON.stringify(normalized.data)));
    restored[section.key] = section.key === "settings" ? true : Array.isArray(normalized.data) ? normalized.data.length : Object.keys(normalized.data).length;
  }
  if (!writes.length) throw new Error("备份文件中没有任何可恢复的配置");

  // 恢复后旧的源状态缓存不再可信，直接清空。
  writes.push(env.KV.put(KV_KEY_SOURCE_STATUS, JSON.stringify({})));
  await Promise.all(writes);
  subscriptions.clearAggregateCache();
  return restored;
}

async function handleRestore(request, env) {
  let body;
  try { body = await request.json(); } catch { return pagesTextResponse("请求 JSON 无效", 400); }
  if (!isPlainObject(body) || !isPlainObject(body.data)) return pagesTextResponse("备份文件格式无效", 400);
  try {
    const restored = await applyRestoreSections(env, body.data);
    return pagesJsonResponse({ ok: true, restored });
  } catch (error) {
    return pagesTextResponse(error.message, 400);
  }
}

async function handleGetWebdavBackupConfig(env) {
  const config = normalizeWebdavConfig(await env.KV.get(KV_KEY_WEBDAV_BACKUP, "json"));
  return pagesJsonResponse(publicWebdavConfig(config));
}

async function handlePostWebdavBackupConfig(request, env) {
  let body;
  try { body = await request.json(); } catch { return pagesTextResponse("请求 JSON 无效", 400); }
  let payload;
  try { payload = validateWebdavConfigPayload(body); } catch (error) { return pagesTextResponse(error.message, 400); }
  const existing = normalizeWebdavConfig(await env.KV.get(KV_KEY_WEBDAV_BACKUP, "json"));
  // 密码留空表示沿用已保存的密码，不回显也不要求重新输入。
  if (!payload.password && payload.url) payload.password = existing.password;
  await env.KV.put(KV_KEY_WEBDAV_BACKUP, JSON.stringify(payload));
  return pagesJsonResponse(publicWebdavConfig(payload));
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
        case "/api/preferred-domains/delete-batch":
          if (method === "POST") return await handleDeletePreferredDomainsBatch(request, env);
          return pagesMethodNotAllowed("POST");
        case "/api/preferred-domains/import":
          if (method === "POST") return await handleImportPreferredDomains(request, env);
          return pagesMethodNotAllowed("POST");
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
        case "/api/backup":
          if (method === "GET") return await handleBackup(env);
          return pagesMethodNotAllowed("GET");
        case "/api/backup/webdav":
          if (method === "GET") return await handleGetWebdavBackupConfig(env);
          if (method === "POST") return await handlePostWebdavBackupConfig(request, env);
          return pagesMethodNotAllowed("GET, POST");
        case "/api/backup/webdav/test":
          if (method === "POST") return await handleWebdavBackupTest(request, env);
          return pagesMethodNotAllowed("POST");
        case "/api/backup/webdav/list":
          if (method === "GET") return await handleWebdavBackupList(env);
          return pagesMethodNotAllowed("GET");
        case "/api/backup/webdav/upload":
          if (method === "POST") return await handleWebdavBackupUpload(env);
          return pagesMethodNotAllowed("POST");
        case "/api/backup/webdav/restore":
          if (method === "POST") return await handleWebdavBackupRestore(request, env);
          return pagesMethodNotAllowed("POST");
        case "/api/backup/webdav/download":
          if (method === "POST") return await handleWebdavBackupDownload(request, env);
          return pagesMethodNotAllowed("POST");
        case "/api/restore":
          if (method === "POST") return await handleRestore(request, env);
          return pagesMethodNotAllowed("POST");
        default:
          return pagesTextResponse("Not Found", 404);
      }
    } catch (error) {
      const status = error.message.startsWith("请求 JSON 无效") ? 400 : 500;
      return pagesTextResponse("Error: " + error.message, status);
    }
  },
};
