export const KV_KEY_SUBS = "subs";
export const KV_KEY_APIS = "apis";
export const MAX_CONFIG_ENTRIES = 200;
export const MAX_CONFIG_KEY_LENGTH = 2048;

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

export async function readJsonObject(request) {
  try {
    return validateConfigPayload(await request.json());
  } catch (error) {
    throw new Error(`请求 JSON 无效: ${error.message}`);
  }
}

