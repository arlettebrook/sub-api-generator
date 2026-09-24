export const KV_KEY_SUBS = "subs";
export const KV_KEY_APIS = "apis";
export const KV_KEY_CUSTOM_APIS = "custom_apis";
export const KV_KEY_BLACKLIST = "blacklist";
export const KV_KEY_FILTER_RULES = "filter_rules";
export const KV_KEY_SOURCE_STATUS = "source_status";
export const KV_KEY_PREFERRED_DOMAINS = "preferred_domains";
export const KV_KEY_PREFERRED_MANUAL = "preferred_manual";
export const KV_KEY_SETTINGS = "settings";
export const KV_KEY_WEBDAV_BACKUP = "webdav_backup";
export const MAX_CONFIG_ENTRIES = 200;
export const MAX_MANUAL_ENTRIES = 500;
export const MAX_MANUAL_LINE_LENGTH = 256;
export const MAX_CONFIG_KEY_LENGTH = 2048;
export const MAX_BLACKLIST_ENTRIES = 200;
export const MAX_BLACKLIST_WORD_LENGTH = 128;
export const MAX_FILTER_RULES = 200;
export const MAX_FILTER_RULE_LENGTH = 128;
export const MAX_API_SUFFIX_LENGTH = 128;
export const MAX_API_PREFIX_LENGTH = 128;
export const API_SUFFIX_STRATEGIES = new Set(["append", "replace", "skip"]);
export const SOURCE_MODE_ALL = "all";
export const SOURCE_MODE_SELECTED = "selected";

export const DEFAULT_BLACKLIST = [];
export const DEFAULT_FILTER_RULES = [];
export const DEFAULT_SETTINGS = {
  enabled: false,
  accessPath: "",
  redirectUrl: "/",
};

// 过滤原因的唯一元数据来源。后端记录 reason，管理端按同一份元数据
// 生成分类标题和原因标签，避免新增原因时前后端各漏改一处。
export const FILTER_REASON_META = Object.freeze({
  blacklist: Object.freeze({ category: "blacklist", categoryLabel: "黑名单", label: "黑名单命中", ruleLabel: "黑名单" }),
  remark: Object.freeze({ category: "remark", categoryLabel: "备注清理 · 节点仍保留", label: "备注规则命中", ruleLabel: "备注规则" }),
  duplicate: Object.freeze({ category: "duplicate", categoryLabel: "重复节点", label: "重复节点", ruleLabel: "" }),
  "cross-duplicate": Object.freeze({ category: "duplicate", categoryLabel: "重复节点", label: "与其他来源重复", ruleLabel: "" }),
  invalid: Object.freeze({ category: "invalid", categoryLabel: "格式无效", label: "格式无效", ruleLabel: "" }),
  filtered: Object.freeze({ category: "other", categoryLabel: "其他", label: "已过滤", ruleLabel: "" }),
});

export const FILTER_REASON_CATEGORIES = Object.freeze([
  Object.freeze({ key: "blacklist", label: "黑名单" }),
  Object.freeze({ key: "remark", label: "备注清理 · 节点仍保留" }),
  Object.freeze({ key: "duplicate", label: "重复节点" }),
  Object.freeze({ key: "invalid", label: "格式无效" }),
  Object.freeze({ key: "other", label: "其他" }),
]);

const API_PATH_REGEX = /^[A-Za-z0-9_-]{1,128}$/;
const RESERVED_API_PATHS = new Set(["admin", "api", "login", "logout"]);
const SETTINGS_PATH_REGEX = /^[A-Za-z0-9_-]{1,128}$/;

function validateApiText(value, maxLength, label) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error(`${label}必须是字符串`);
  if (/[\u0000-\u001F\u007F]/u.test(value)) throw new Error(`${label}不能包含换行或控制字符`);
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new Error(`${label}不能超过 ${maxLength} 个字符`);
  return normalized;
}

export function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function normalizeKvData(data, sourceType) {
  if (!isPlainObject(data)) return {};

  const normalized = {};
  for (const [key, value] of Object.entries(data)) {
    const normalizedKey = sourceType ? normalizeSourceKey(sourceType, key) : key;
    if (!normalizedKey) continue;
    if (typeof value === "boolean") {
      normalized[normalizedKey] = { remark: "" };
    } else if (isPlainObject(value)) {
      const normalizedEntry = {
        remark: typeof value.remark === "string" ? value.remark : "",
      };
      if (typeof value.enabled === "boolean") normalizedEntry.enabled = value.enabled;
      if (sourceType === "domains") {
        if (isPlainObject(value.records)) {
          normalizedEntry.records = Object.fromEntries(["A", "AAAA", "CNAME"].map((type) => [
            type,
            Array.isArray(value.records[type]) ? value.records[type].filter((item) => typeof item === "string" && item.trim()).slice(0, 100) : [],
          ]));
        }
        if (isPlainObject(value.errors)) normalizedEntry.errors = Object.fromEntries(Object.entries(value.errors).filter(([type, message]) => ["A", "AAAA", "CNAME"].includes(type) && typeof message === "string").map(([type, message]) => [type, message.slice(0, 300)]));
        if (isPlainObject(value.dnsErrorCodes)) normalizedEntry.dnsErrorCodes = Object.fromEntries(Object.entries(value.dnsErrorCodes).filter(([type, code]) => ["A", "AAAA", "CNAME"].includes(type) && typeof code === "string").map(([type, code]) => [type, code.slice(0, 80)]));
        if (isPlainObject(value.dnsProviders)) normalizedEntry.dnsProviders = Object.fromEntries(Object.entries(value.dnsProviders).filter(([type, provider]) => ["A", "AAAA", "CNAME"].includes(type) && typeof provider === "string").map(([type, provider]) => [type, provider.slice(0, 40)]));
        if (Number.isFinite(Number(value.checkedAt)) && Number(value.checkedAt) > 0) normalizedEntry.checkedAt = Number(value.checkedAt);
        if (Number.isFinite(Number(value.durationMs)) && Number(value.durationMs) >= 0) normalizedEntry.durationMs = Number(value.durationMs);
      }
      normalized[normalizedKey] = normalizedEntry;
    }
  }
  return normalized;
}

export function normalizeSourceKey(type, key) {
  const value = String(key || "").trim();
  if (type === "subs") {
    return value.replace(/^https?:\/\//i, "").replace(/\/+$/, "").toLowerCase();
  }
  if (type === "apis") {
    const match = value.match(/^(https?):\/\/([^/]+)(.*)$/i);
    if (match) return `${match[1].toLowerCase()}://${match[2].toLowerCase()}${match[3]}`;
  }
  if (type === "domains") return value.replace(/\.+$/, "").toLowerCase();
  return value;
}

export function normalizeBlacklist(data) {
  if (data === null || data === undefined) return [...DEFAULT_BLACKLIST];
  if (!Array.isArray(data)) return [...DEFAULT_BLACKLIST];

  const normalized = [];
  const seen = new Set();
  for (const value of data) {
    if (typeof value !== "string") continue;
    const word = value.trim().slice(0, MAX_BLACKLIST_WORD_LENGTH);
    const key = word.toLowerCase();
    if (!word || seen.has(key)) continue;
    seen.add(key);
    normalized.push(word);
    if (normalized.length >= MAX_BLACKLIST_ENTRIES) break;
  }
  return normalized;
}

export function normalizeFilterRules(data) {
  if (data === null || data === undefined) return [...DEFAULT_FILTER_RULES];
  if (!Array.isArray(data)) return [...DEFAULT_FILTER_RULES];
  const normalized = [];
  const seen = new Set();
  for (const value of data) {
    if (typeof value !== "string") continue;
    const rule = value.trim().slice(0, MAX_FILTER_RULE_LENGTH);
    const key = rule.toLowerCase();
    if (!rule || seen.has(key)) continue;
    seen.add(key);
    normalized.push(rule);
    if (normalized.length >= MAX_FILTER_RULES) break;
  }
  return normalized;
}

export function validateFilterRulesPayload(body) {
  if (!Array.isArray(body)) throw new Error("过滤规则必须是字符串数组");
  if (body.length > MAX_FILTER_RULES) {
    throw new Error(`过滤规则不能超过 ${MAX_FILTER_RULES} 个`);
  }
  for (const value of body) {
    if (typeof value !== "string" || !value.trim()) {
      throw new Error("过滤规则必须是非空字符串");
    }
    if (value.trim().length > MAX_FILTER_RULE_LENGTH) {
      throw new Error(`过滤规则不能超过 ${MAX_FILTER_RULE_LENGTH} 个字符`);
    }
  }
  return normalizeFilterRules(body);
}

export function validateBlacklistPayload(body) {
  if (!Array.isArray(body)) throw new Error("黑名单必须是字符串数组");
  if (body.length > MAX_BLACKLIST_ENTRIES) {
    throw new Error(`黑名单条目不能超过 ${MAX_BLACKLIST_ENTRIES} 个`);
  }
  for (const value of body) {
    if (typeof value !== "string" || !value.trim()) {
      throw new Error("黑名单条目必须是非空字符串");
    }
    if (value.trim().length > MAX_BLACKLIST_WORD_LENGTH) {
      throw new Error(`黑名单条目不能超过 ${MAX_BLACKLIST_WORD_LENGTH} 个字符`);
    }
  }
  return normalizeBlacklist(body);
}

function normalizeSettingsPath(value) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error("管理入口路径必须是字符串");
  const path = value.trim().replace(/^\/+|\/+$/g, "");
  if (!path) return "";
  if (!SETTINGS_PATH_REGEX.test(path) || RESERVED_API_PATHS.has(path.toLowerCase())) {
    throw new Error("管理入口路径无效");
  }
  return path;
}

function normalizeRedirectUrl(value) {
  if (value === undefined || value === null || value === "") return DEFAULT_SETTINGS.redirectUrl;
  if (typeof value !== "string") throw new Error("跳转地址必须是字符串");
  const redirectUrl = value.trim();
  if (!redirectUrl || redirectUrl.length > 2048 || /[\u0000-\u001F\u007F]/u.test(redirectUrl)) {
    throw new Error("跳转地址无效");
  }
  if (redirectUrl.startsWith("/")) {
    if (redirectUrl.startsWith("//")) throw new Error("跳转地址无效");
    return redirectUrl;
  }
  let parsed;
  try { parsed = new URL(redirectUrl); } catch { throw new Error("跳转地址无效"); }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("跳转地址无效");
  return parsed.toString();
}

export function normalizeSettings(data) {
  if (!isPlainObject(data)) return { ...DEFAULT_SETTINGS };
  const source = isPlainObject(data.camouflage) ? data.camouflage : data;
  try {
    return {
      enabled: source.enabled === true,
      accessPath: normalizeSettingsPath(source.accessPath),
      redirectUrl: normalizeRedirectUrl(source.redirectUrl),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function validateSettingsPayload(body) {
  if (!isPlainObject(body)) throw new Error("设置必须是 JSON 对象");
  const source = isPlainObject(body.camouflage) ? body.camouflage : body;
  return {
    enabled: source.enabled === true,
    accessPath: normalizeSettingsPath(source.accessPath),
    redirectUrl: normalizeRedirectUrl(source.redirectUrl),
  };
}

export function getRuntimeConfig(env) {
  const password = typeof env.PASSWORD === "string" ? env.PASSWORD : "";

  if (!env.KV || typeof env.KV.get !== "function" || typeof env.KV.put !== "function") {
    return { error: "KV 绑定未配置，请在 Pages 项目中绑定名为 KV 的 Namespace" };
  }
  if (!password) {
    return { error: "PASSWORD Secret 未配置" };
  }

  return { password };
}

export function validateConfigPayload(body, sourceType) {
  if (!isPlainObject(body)) {
    throw new Error("配置必须是 JSON 对象");
  }

  const entries = Object.entries(body);
  if (entries.length > MAX_CONFIG_ENTRIES) {
    throw new Error(`配置条目不能超过 ${MAX_CONFIG_ENTRIES} 个`);
  }

  const normalized = {};
  for (const [key, value] of entries) {
    const normalizedKey = sourceType ? normalizeSourceKey(sourceType, key) : key;
    if (!normalizedKey || normalizedKey.length > MAX_CONFIG_KEY_LENGTH) {
      throw new Error("配置键为空或过长");
    }
    if (normalized[normalizedKey]) {
      throw new Error(`配置键重复: ${key}`);
    }
    if (typeof value === "boolean") {
      normalized[normalizedKey] = { remark: "" };
      continue;
    }
    if (!isPlainObject(value)) {
      throw new Error(`配置项无效: ${key}`);
    }
    normalized[normalizedKey] = {
      remark: typeof value.remark === "string" ? value.remark.slice(0, 200) : "",
      // 订阅源/优选域名的启用状态需要随配置保存，不能在保存时被剥离。
      ...(typeof value.enabled === "boolean" ? { enabled: value.enabled } : {}),
    };
  }
  return normalized;
}

export function validateApiPathPayload(body) {
  if (!isPlainObject(body)) throw new Error("配置必须是 JSON 对象");
  const entries = Object.entries(body);
  if (entries.length > MAX_CONFIG_ENTRIES) {
    throw new Error(`配置条目不能超过 ${MAX_CONFIG_ENTRIES} 个`);
  }
  const normalized = {};
  for (const [rawPath, rawValue] of entries) {
    const path = rawPath.trim().replace(/^\/+/, "");
    if (!API_PATH_REGEX.test(path) || RESERVED_API_PATHS.has(path.toLowerCase())) {
      throw new Error(`API 访问路径无效: ${rawPath}`);
    }
    if (normalized[path]) {
      throw new Error(`API 访问路径重复: ${path}`);
    }
    const value = typeof rawValue === "boolean" ? { enabled: rawValue, remark: "" } : rawValue;
    if (!isPlainObject(value)) throw new Error(`配置项无效: ${rawPath}`);
    const sourceMode = value.sourceMode === undefined
      ? (Array.isArray(value.sources) && value.sources.length ? SOURCE_MODE_SELECTED : SOURCE_MODE_ALL)
      : value.sourceMode === "all-enabled" ? SOURCE_MODE_ALL : value.sourceMode;
    if (![SOURCE_MODE_ALL, SOURCE_MODE_SELECTED].includes(sourceMode)) {
      throw new Error(`数据源模式无效: ${rawPath}`);
    }
    const sources = Array.isArray(value.sources) ? value.sources : [];
    const normalizedSources = [];
    for (const source of sources) {
      if (!isPlainObject(source) || !["subs", "apis", "domains", "manual"].includes(source.type) || typeof source.key !== "string") {
        throw new Error(`数据源配置无效: ${rawPath}`);
      }
      const key = normalizeSourceKey(source.type, source.key);
      if (!key || key.length > MAX_CONFIG_KEY_LENGTH) throw new Error(`数据源配置无效: ${rawPath}`);
      if (!normalizedSources.some((item) => item.type === source.type && item.key === key)) {
        normalizedSources.push({ type: source.type, key });
      }
    }
    const prefix = validateApiText(value.prefix, MAX_API_PREFIX_LENGTH, "输出前缀");
    const suffix = validateApiText(value.suffix, MAX_API_SUFFIX_LENGTH, "输出后缀");
    const suffixStrategy = value.suffixStrategy === undefined ? "skip" : value.suffixStrategy;
    if (typeof suffixStrategy !== "string" || !API_SUFFIX_STRATEGIES.has(suffixStrategy)) {
      throw new Error(`后缀追加策略无效: ${rawPath}`);
    }
    normalized[path] = {
      enabled: value.enabled === true,
      remark: typeof value.remark === "string" ? value.remark.slice(0, 200) : "",
      ...(prefix ? { prefix } : {}),
      ...(suffix ? { suffix } : {}),
      ...(suffixStrategy !== "skip" ? { suffixStrategy } : {}),
      sourceMode,
      sources: sourceMode === SOURCE_MODE_SELECTED ? normalizedSources : [],
    };
  }
  return normalized;
}

export function normalizeCustomApiData(data) {
  if (!isPlainObject(data)) return {};
  const normalized = {};
  for (const [path, value] of Object.entries(data)) {
    if (typeof value === "boolean") {
      normalized[path] = { enabled: value, remark: "", sourceMode: SOURCE_MODE_ALL, sources: [] };
    } else if (isPlainObject(value)) {
      const sourceMode = value.sourceMode === SOURCE_MODE_SELECTED
        ? SOURCE_MODE_SELECTED
        : SOURCE_MODE_ALL;
      const prefix = typeof value.prefix === "string" ? value.prefix.replace(/[\u0000-\u001F\u007F]/gu, "").trim().slice(0, MAX_API_PREFIX_LENGTH) : "";
      const suffix = typeof value.suffix === "string" ? value.suffix.replace(/[\u0000-\u001F\u007F]/gu, "").trim().slice(0, MAX_API_SUFFIX_LENGTH) : "";
      const suffixStrategy = API_SUFFIX_STRATEGIES.has(value.suffixStrategy) ? value.suffixStrategy : "skip";
      normalized[path] = {
        enabled: value.enabled === true,
        remark: typeof value.remark === "string" ? value.remark : "",
        ...(prefix ? { prefix } : {}),
        ...(suffix ? { suffix } : {}),
        ...(suffixStrategy !== "skip" ? { suffixStrategy } : {}),
        sourceMode,
        sources: sourceMode === SOURCE_MODE_SELECTED && Array.isArray(value.sources)
          ? value.sources.filter((source) => isPlainObject(source) && ["subs", "apis", "domains", "manual"].includes(source.type) && typeof source.key === "string")
              .map((source) => ({ type: source.type, key: source.type === "manual" ? "manual" : normalizeSourceKey(source.type, source.key) }))
          : [],
      };
    }
  }
  return normalized;
}

export function isAllowedApiPath(path) {
  return API_PATH_REGEX.test(path) && !RESERVED_API_PATHS.has(path.toLowerCase());
}

export async function readJsonObject(request, sourceType) {
  try {
    return validateConfigPayload(await request.json(), sourceType);
  } catch (error) {
    throw new Error(`请求 JSON 无效: ${error.message}`);
  }
}
