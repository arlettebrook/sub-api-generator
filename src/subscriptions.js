import { isPlainObject, KV_KEY_APIS, KV_KEY_SUBS, normalizeKvData } from "./config.js";
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
const LOWER_BLACKLIST = [
  "问题", "每日", "重置", "官网", "群组", "流量", "到期", "客服", "kefu", "加入",
  "t.me", "免费", "telegram", "channel", "premium", "nodes", "进群", "获取", "频道",
  "官方", "共享", "提供", "联系", "tg", "云",
].map((value) => value.toLowerCase());

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
    const remark = decodeURIComponent(remarkMatch[1])
      .split(" ")[0]
      .split("【")[0]
      .split("|")[0]
      .trim();
    result += `#${remark}`;
  }
  return result;
}

async function fetchPreferredSubs(host) {
  const baseHost = HTTP_PROTOCOL_REGEX.test(host) ? host : `https://${host}`;
  const response = await fetchWithTimeout(`${baseHost}/sub?host=${FIXED_HOST}&uuid=${FIXED_UUID}`, {
    headers: { "User-Agent": UA_SUBS_FETCH },
  });
  if (!response.ok) return [];

  const rawContent = atob(await response.text());
  return rawContent
    .split(/\r?\n/)
    .map((line) => parsePreferredIpLine(line))
    .filter(Boolean);
}

async function fetchApiSubs(apiUrl) {
  const response = await fetchWithTimeout(apiUrl, {
    headers: { "User-Agent": UA_APIS_FETCH },
  });
  if (!response.ok) return [];
  return (await response.text()).split(/\r?\n/).filter((line) => line.trim() !== "");
}

function filterPreferredIps(lines) {
  const result = [];
  for (const value of lines) {
    if (!value) continue;
    const line = value.trim();
    const match = NODE_MATCH_REGEX.exec(line);
    if (!match) continue;
    const node = match[0];
    const hashIndex = line.indexOf("#");
    const remark = hashIndex > -1 ? line.slice(hashIndex + 1) : "";
    const full = remark ? `${node}#${remark}` : node;
    const lower = full.toLowerCase();
    if (LOWER_BLACKLIST.some((word) => lower.includes(word))) continue;
    result.push(full.replace(LINE_CLEAN_REGEX, "").trim());
  }
  return [...new Set(result)];
}

function enabledEntries(config) {
  if (!isPlainObject(config)) return [];
  return Object.entries(config).filter(([, entry]) => {
    return typeof entry === "object" && entry !== null && "enabled" in entry
      ? entry.enabled === true
      : entry === true;
  });
}

export async function handleRoot(env, sourceSelection) {
  try {
    const [subsConfig, apisConfig] = await Promise.all([
      env.KV.get(KV_KEY_SUBS, "json"),
      env.KV.get(KV_KEY_APIS, "json"),
    ]);
    if (!isPlainObject(subsConfig)) {
      return textResponse("KV 未配置 subs", 500, { "cache-control": "no-store" });
    }

    const selected = Array.isArray(sourceSelection) ? sourceSelection : null;
    const selectedEntries = (config, type) => enabledEntries(config).filter(([key]) => {
      return selected === null || selected.some((source) => source?.type === type && source.key === key);
    });
    const [subsResults, apiResults] = await Promise.all([
      Promise.allSettled(selectedEntries(subsConfig, "subs").map(([host]) => fetchPreferredSubs(host))),
      Promise.allSettled(selectedEntries(apisConfig, "apis").map(([apiUrl]) => fetchApiSubs(apiUrl))),
    ]);

    const preferred = [];
    for (const result of subsResults) {
      if (result.status === "fulfilled") preferred.push(...result.value);
    }
    const extra = [];
    for (const result of apiResults) {
      if (result.status === "fulfilled") extra.push(...result.value);
    }

    const filtered = filterPreferredIps(preferred);
    const output = filtered.join("\n") + (extra.length ? `\n${extra.join("\n")}` : "");
    return new Response(output, {
      headers: withSecurityHeaders({
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      }),
    });
  } catch (error) {
    return textResponse("！！！！！优选订阅生成器异常：" + error.message, 500, {
      "cache-control": "no-store",
    });
  }
}

export { fetchWithTimeout, filterPreferredIps, normalizeKvData };
