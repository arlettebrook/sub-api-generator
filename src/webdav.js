import { isPlainObject } from "./config.js";

export const DEFAULT_WEBDAV_FILENAME = "sub-api-backup.json";
export const MAX_WEBDAV_URL_LENGTH = 2048;
export const MAX_WEBDAV_USERNAME_LENGTH = 200;
export const MAX_WEBDAV_PASSWORD_LENGTH = 200;
export const MAX_WEBDAV_BACKUPS = 10;

const WEBDAV_FILENAME_REGEX = /^[A-Za-z0-9._-]{1,128}$/;

export const EMPTY_WEBDAV_CONFIG = {
  url: "",
  username: "",
  password: "",
  filename: DEFAULT_WEBDAV_FILENAME,
};

function normalizeWebdavUrl(value) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error("WebDAV 地址必须是字符串");
  const url = value.trim();
  if (!url) return "";
  if (url.length > MAX_WEBDAV_URL_LENGTH || /[\u0000-\u001F\u007F]/u.test(url)) {
    throw new Error("WebDAV 地址无效");
  }
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error("WebDAV 地址无效"); }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("WebDAV 地址无效");
  if (parsed.username || parsed.password) throw new Error("请不要在地址中携带账号密码，请填写到对应输入框");
  return parsed.toString();
}

function normalizeWebdavFilename(value) {
  if (value === undefined || value === null || value === "") return DEFAULT_WEBDAV_FILENAME;
  if (typeof value !== "string") throw new Error("备份文件名必须是字符串");
  const filename = value.trim();
  if (!WEBDAV_FILENAME_REGEX.test(filename) || !filename.toLowerCase().endsWith(".json")) {
    throw new Error("备份文件名无效，仅支持字母、数字、点、短横线和下划线，且必须以 .json 结尾");
  }
  return filename;
}

function normalizeWebdavCredential(value, maxLength, label) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error(`${label}必须是字符串`);
  const text = value.trim();
  if (text.length > maxLength) throw new Error(`${label}不能超过 ${maxLength} 个字符`);
  if (/[\u0000-\u001F\u007F]/u.test(text)) throw new Error(`${label}不能包含控制字符`);
  return text;
}

// password 为空字符串时表示"沿用已保存的密码"，由调用方处理。
export function validateWebdavConfigPayload(body) {
  if (!isPlainObject(body)) throw new Error("WebDAV 配置必须是 JSON 对象");
  return {
    url: normalizeWebdavUrl(body.url),
    username: normalizeWebdavCredential(body.username, MAX_WEBDAV_USERNAME_LENGTH, "用户名"),
    password: normalizeWebdavCredential(body.password, MAX_WEBDAV_PASSWORD_LENGTH, "密码"),
    filename: normalizeWebdavFilename(body.filename),
  };
}

export function normalizeWebdavConfig(data) {
  if (!isPlainObject(data)) return { ...EMPTY_WEBDAV_CONFIG };
  try {
    return validateWebdavConfigPayload(data);
  } catch {
    return { ...EMPTY_WEBDAV_CONFIG };
  }
}

export function publicWebdavConfig(config) {
  return {
    url: config.url,
    username: config.username,
    filename: config.filename,
    passwordSet: Boolean(config.password),
  };
}

export function isWebdavConfigured(config) {
  return Boolean(config.url);
}

function webdavAuthHeader(config) {
  if (!config.username && !config.password) return null;
  const raw = `${config.username}:${config.password}`;
  const encoded = typeof btoa === "function"
    ? btoa(String.fromCharCode(...new TextEncoder().encode(raw)))
    : Buffer.from(raw, "utf8").toString("base64");
  return `Basic ${encoded}`;
}

function webdavFileUrl(config, filename) {
  const base = new URL(config.url);
  base.pathname = `${base.pathname.replace(/\/+$/, "")}/${filename}`;
  return base.toString();
}

// WebDAV 服务器通常不会自动创建多级目录，上传前逐级 MKCOL，已存在（405）等情况忽略。
async function ensureWebdavCollection(config, targetUrl) {
  const url = new URL(targetUrl);
  const authHeader = webdavAuthHeader(config);
  const headers = authHeader ? { Authorization: authHeader } : {};
  const segments = url.pathname.split("/").filter(Boolean);
  segments.pop();
  const root = `${url.protocol}//${url.host}`;
  let prefix = "";
  for (const segment of segments) {
    prefix += `/${segment}`;
    try {
      await fetch(root + prefix + "/", { method: "MKCOL", headers });
    } catch {
      // 目录探测失败不阻断上传，最终以 PUT 结果为准。
    }
  }
}

export async function webdavUpload(config, filename, content) {
  const targetUrl = webdavFileUrl(config, filename);
  const authHeader = webdavAuthHeader(config);
  const doPut = () => fetch(targetUrl, {
    method: "PUT",
    headers: {
      ...(authHeader ? { Authorization: authHeader } : {}),
      "content-type": "application/json; charset=utf-8",
    },
    body: content,
  });
  let response = await doPut();
  if (response.status === 404 || response.status === 409) {
    await ensureWebdavCollection(config, targetUrl);
    response = await doPut();
  }
  if (!response.ok) {
    throw new Error(`备份上传到 WebDAV 失败（HTTP ${response.status}），请检查地址和账号密码`);
  }
  return targetUrl;
}

export async function webdavDownload(config, filename) {
  const authHeader = webdavAuthHeader(config);
  const response = await fetch(webdavFileUrl(config, filename), {
    method: "GET",
    headers: authHeader ? { Authorization: authHeader } : {},
    cache: "no-store",
  });
  if (response.status === 404) throw new Error("WebDAV 上没有找到备份文件");
  if (!response.ok) {
    throw new Error(`从 WebDAV 读取备份失败（HTTP ${response.status}），请检查地址和账号密码`);
  }
  return response.text();
}

// 备份文件名统一使用北京时间（UTC+8）时间戳，例如 sub-api-backup_20260913_123045.json。
export function beijingBackupToken(date = new Date()) {
  const stamp = new Date(date.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 19).replace(/[-:T]/g, "");
  return `${stamp.slice(0, 8)}_${stamp.slice(8)}`;
}

export function timestampedBackupFilename(baseFilename, date = new Date()) {
  return `${baseFilename.replace(/\.json$/i, "")}_${beijingBackupToken(date)}.json`;
}

function backupFilenamePattern(baseFilename) {
  const stem = baseFilename.replace(/\.json$/i, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${stem}(?:_(\\d{8}_\\d{6}))?\\.json$`, "i");
}

export function isValidBackupFilename(baseFilename, filename) {
  return typeof filename === "string" && backupFilenamePattern(baseFilename).test(filename);
}

// 按时间戳倒序（最新在前）；不带时间戳的旧文件视为最旧。
export function sortBackupFilenames(filenames) {
  const token = (filename) => filename.match(/_(\d{8}_\d{6})\.json$/i)?.[1] || "";
  return [...filenames].sort((left, right) => token(right).localeCompare(token(left)));
}

async function webdavDelete(config, filename) {
  const authHeader = webdavAuthHeader(config);
  const response = await fetch(webdavFileUrl(config, filename), {
    method: "DELETE",
    headers: authHeader ? { Authorization: authHeader } : {},
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`删除旧备份失败（HTTP ${response.status}）`);
  }
}

export async function webdavListBackupEntries(config, baseFilename) {
  const authHeader = webdavAuthHeader(config);
  const collectionUrl = config.url.replace(/\/+$/, "") + "/";
  const response = await fetch(collectionUrl, {
    method: "PROPFIND",
    headers: {
      ...(authHeader ? { Authorization: authHeader } : {}),
      Depth: "1",
    },
  });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`读取 WebDAV 备份列表失败（HTTP ${response.status}）`);
  const xml = await response.text();
  const pattern = backupFilenamePattern(baseFilename);
  const entries = [];
  const tagText = (block, tag) => block.match(new RegExp(`<(?:[A-Za-z][\\w.-]*:)?${tag}\\b[^>]*>([^<]*)<`, "i"))?.[1]?.trim();
  const blockRegex = /<(?:[A-Za-z][\w.-]*:)?response\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z][\w.-]*:)?response>/gi;
  const blocks = xml.match(blockRegex) || [xml];
  for (const block of blocks) {
    const hrefMatch = block.match(/<(?:[A-Za-z][\w.-]*:)?href\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z][\w.-]*:)?href>/i);
    if (!hrefMatch) continue;
    const href = hrefMatch[1].trim();
    const name = decodeURIComponent(href.split("/").filter(Boolean).pop() || "");
    if (!pattern.test(name)) continue;
    const lastModifiedRaw = tagText(block, "getlastmodified");
    const parsedLastModified = lastModifiedRaw ? Date.parse(lastModifiedRaw) : NaN;
    entries.push({
      name,
      size: Number(tagText(block, "getcontentlength")) || null,
      lastModified: Number.isFinite(parsedLastModified) ? parsedLastModified : null,
    });
  }
  return sortBackupEntries(entries);
}

// 按时间戳倒序（最新在前）；不带时间戳的旧文件视为最旧。
export function sortBackupEntries(entries) {
  const token = (name) => name.match(/_(\d{8}_\d{6})\.json$/i)?.[1] || "";
  return [...entries].sort((left, right) => token(right.name).localeCompare(token(left.name)));
}

export async function webdavListBackups(config, baseFilename) {
  return (await webdavListBackupEntries(config, baseFilename)).map((entry) => entry.name);
}

// 上传成功后裁剪历史备份：连同刚上传的这份在内最多保留 limit 份，超出的最旧备份逐个删除。
export async function webdavPruneBackups(config, baseFilename, keepFilenames = [], limit = MAX_WEBDAV_BACKUPS) {
  const backups = await webdavListBackups(config, baseFilename);
  const keep = new Set(keepFilenames);
  const deleteCount = Math.max(0, backups.length - limit);
  const ordered = sortBackupFilenames(backups).filter((filename) => !keep.has(filename));
  // 按新到旧排序后，删除列表末尾（最旧）的 deleteCount 份。
  const stale = deleteCount > 0 ? ordered.slice(-deleteCount) : [];
  const deleted = [];
  for (const filename of stale) {
    try {
      await webdavDelete(config, filename);
      deleted.push(filename);
    } catch {
      break;
    }
  }
  return deleted;
}
