export const KV_KEY_SUBS = "subs";
export const KV_KEY_APIS = "apis";
export const KV_KEY_CUSTOM_APIS = "custom_apis";
export const KV_KEY_BLACKLIST = "blacklist";
export const MAX_CONFIG_ENTRIES = 200;
export const MAX_CONFIG_KEY_LENGTH = 2048;
export const MAX_BLACKLIST_ENTRIES = 200;
export const MAX_BLACKLIST_WORD_LENGTH = 128;

export const DEFAULT_BLACKLIST = [
  "问题", "每日", "重置", "官网", "群组", "流量", "到期", "客服", "kefu", "加入",
  "t.me", "免费", "telegram", "channel", "premium", "nodes", "进群", "获取", "频道",
  "官方", "共享", "提供", "联系", "tg", "云",
];

const API_PATH_REGEX = /^[A-Za-z0-9_-]{1,128}$/;
const RESERVED_API_PATHS = new Set(["admin", "api", "login", "logout"]);

export function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function normalizeKvData(data) {
  if (!isPlainObject(data)) return {};

  const normalized = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "boolean") {
      normalized[key] = { enabled: value, remark: "" };
    } else if (isPlainObject(value)) {
      normalized[key] = {
        enabled: value.enabled === true,
        remark: typeof value.remark === "string" ? value.remark : "",
      };
    }
  }
  return normalized;
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

export function getRuntimeConfig(env) {
  const uuid = typeof env.UUID === "string" ? env.UUID.trim() : "";
  const password = typeof env.PASSWORD === "string" ? env.PASSWORD : "";

  if (!env.KV || typeof env.KV.get !== "function" || typeof env.KV.put !== "function") {
    return { error: "KV 绑定未配置，请在 Pages 项目中绑定名为 KV 的 Namespace" };
  }
  if (!uuid || !/^[A-Za-z0-9_-]{1,128}$/.test(uuid)) {
    return { error: "UUID 环境变量未配置或格式无效" };
  }
  if (!password) {
    return { error: "PASSWORD Secret 未配置" };
  }

  return { uuid, password };
}

export function validateConfigPayload(body) {
  if (!isPlainObject(body)) {
    throw new Error("配置必须是 JSON 对象");
  }

  const entries = Object.entries(body);
  if (entries.length > MAX_CONFIG_ENTRIES) {
    throw new Error(`配置条目不能超过 ${MAX_CONFIG_ENTRIES} 个`);
  }

  const normalized = {};
  for (const [key, value] of entries) {
    if (!key.trim() || key.length > MAX_CONFIG_KEY_LENGTH) {
      throw new Error("配置键为空或过长");
    }
    if (typeof value === "boolean") {
      normalized[key] = { enabled: value, remark: "" };
      continue;
    }
    if (!isPlainObject(value)) {
      throw new Error(`配置项无效: ${key}`);
    }
    normalized[key] = {
      enabled: value.enabled === true,
      remark: typeof value.remark === "string" ? value.remark.slice(0, 200) : "",
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
    const hasSources = Array.isArray(value.sources);
    const sources = hasSources ? value.sources : [];
    const normalizedSources = [];
    for (const source of sources) {
      if (!isPlainObject(source) || !["subs", "apis"].includes(source.type) || typeof source.key !== "string") {
        throw new Error(`数据源配置无效: ${rawPath}`);
      }
      const key = source.key.trim();
      if (!key || key.length > MAX_CONFIG_KEY_LENGTH) throw new Error(`数据源配置无效: ${rawPath}`);
      if (!normalizedSources.some((item) => item.type === source.type && item.key === key)) {
        normalizedSources.push({ type: source.type, key });
      }
    }
    normalized[path] = {
      enabled: value.enabled === true,
      remark: typeof value.remark === "string" ? value.remark.slice(0, 200) : "",
      sources: hasSources ? normalizedSources : null,
    };
  }
  return normalized;
}

export function normalizeCustomApiData(data) {
  if (!isPlainObject(data)) return {};
  const normalized = {};
  for (const [path, value] of Object.entries(data)) {
    if (typeof value === "boolean") {
      normalized[path] = { enabled: value, remark: "", sources: null };
    } else if (isPlainObject(value)) {
      normalized[path] = {
        enabled: value.enabled === true,
        remark: typeof value.remark === "string" ? value.remark : "",
        sources: Array.isArray(value.sources)
          ? value.sources.filter((source) => isPlainObject(source) && ["subs", "apis"].includes(source.type) && typeof source.key === "string")
              .map((source) => ({ type: source.type, key: source.key }))
          : null,
      };
    }
  }
  return normalized;
}

export function isAllowedApiPath(path) {
  return API_PATH_REGEX.test(path) && !RESERVED_API_PATHS.has(path.toLowerCase());
}

export async function readJsonObject(request) {
  try {
    return validateConfigPayload(await request.json());
  } catch (error) {
    throw new Error(`请求 JSON 无效: ${error.message}`);
  }
}
