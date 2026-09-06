import {
  KV_KEY_CUSTOM_APIS,
  KV_KEY_APIS,
  KV_KEY_BLACKLIST,
  KV_KEY_FILTER_RULES,
  KV_KEY_SUBS,
  getRuntimeConfig as getPagesRuntimeConfig,
  isAllowedApiPath,
  normalizeCustomApiData,
  normalizeBlacklist,
  normalizeFilterRules,
  normalizeKvData,
  readJsonObject as readPagesJsonObject,
  SOURCE_MODE_SELECTED,
  validateApiPathPayload,
  validateBlacklistPayload,
  validateFilterRulesPayload,
} from "./config.js";
import {
  jsonResponse as pagesJsonResponse,
  methodNotAllowed as pagesMethodNotAllowed,
  textResponse as pagesTextResponse,
  withSecurityHeaders as pagesSecurityHeaders,
} from "./http.js";
import * as auth from "./auth.js";
import * as subscriptions from "./subscriptions.js";
import { adminHTML } from "./admin-page.js";
import { adminClientScript } from "./admin-client.js";
import { adminStyle } from "./admin-style.js";
import { loginPage } from "./login-page.js";

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

async function handleGetSourceStatuses(env) {
  const [subs, apis] = await Promise.all([
    env.KV.get(KV_KEY_SUBS, "json"),
    env.KV.get(KV_KEY_APIS, "json"),
  ]);
  return pagesJsonResponse(subscriptions.getSourceStatuses(subs, apis));
}

async function handlePostApis(request, env) {
  const body = await readPagesJsonObject(request, "apis");
  await env.KV.put(KV_KEY_APIS, JSON.stringify(body));
  subscriptions.clearAggregateCache();
  return pagesJsonResponse({ ok: true });
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
  return subscriptions.handleRoot(env, sourceSelection);
}

async function handleGetUuid(env) {
  return pagesJsonResponse({ uuid: env.UUID.trim() });
}

function handleAdmin(page = "overview") {
  const html = adminHTML.replace('data-page="__PAGE__"', `data-page="${page}"`);
  return new Response(html, {
    headers: pagesSecurityHeaders({
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    }),
  });
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
      return assetResponse(adminStyle, "text/css; charset=utf-8", "no-store");
    }
    if (path === "/admin-client.js") {
      if (method !== "GET") return pagesMethodNotAllowed("GET");
      return assetResponse(adminClientScript, "application/javascript; charset=utf-8", "no-store");
    }
    const config = getPagesRuntimeConfig(env);

    if (config.error) {
      return pagesTextResponse(config.error, 503, { "cache-control": "no-store" });
    }

    const validPwdHash = await auth.sha256Hex(config.password);

    // ========== 免认证接口 ==========
    if (path === "/login" && method === "POST") {
      return await auth.handleLogin(request, validPwdHash, loginPage);
    }
    if (path === "/logout" && method === "POST") {
      return auth.handleLogout(request);
    }
    if (path === "/login" || path === "/logout") {
      return pagesMethodNotAllowed("POST");
    }
    // UUID 订阅路径（公开访问，无需认证）
    const uuidPath = `/${config.uuid}`;
    if (path === uuidPath) {
      if (method !== "GET") return pagesMethodNotAllowed("GET");
      return await subscriptions.handleRoot(env);
    }
    if (method === "GET") {
      const customApiResponse = await handleCustomApiPath(path, env);
      if (customApiResponse) return customApiResponse;
    }

    // ========== 未认证统一返回登录页 ==========
    if (!auth.isAuthenticated(request, validPwdHash)) {
      return new Response(await loginPage(), {
        headers: pagesSecurityHeaders({
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        }),
      });
    }

    // ========== 已认证路由分发 ==========
    try {
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
        case "/api/blacklist":
          if (method === "GET") return await handleGetBlacklist(env);
          if (method === "POST") return await handlePostBlacklist(request, env);
          return pagesMethodNotAllowed("GET, POST");
        case "/api/filter-rules":
          if (method === "GET") return await handleGetFilterRules(env);
          if (method === "POST") return await handlePostFilterRules(request, env);
          return pagesMethodNotAllowed("GET, POST");
        case "/api/custom-apis":
          if (method === "GET") return await handleGetCustomApis(env);
          if (method === "POST") return await handlePostCustomApis(request, env);
          return pagesMethodNotAllowed("GET, POST");
        case "/api/uuid":
          if (method === "GET") return await handleGetUuid(env);
          return pagesMethodNotAllowed("GET");
        case "/":
        case "/admin":
          if (method !== "GET") return pagesMethodNotAllowed("GET");
          return handleAdmin("overview");
        case "/admin/subs":
          if (method !== "GET") return pagesMethodNotAllowed("GET");
          return handleAdmin("subs");
        case "/admin/apis":
          if (method !== "GET") return pagesMethodNotAllowed("GET");
          return handleAdmin("apis");
        case "/admin/manage":
          if (method !== "GET") return pagesMethodNotAllowed("GET");
          return handleAdmin("manage");
        case "/admin/custom-apis":
          if (method !== "GET") return pagesMethodNotAllowed("GET");
          return handleAdmin("customApis");
        case "/admin/settings":
          if (method !== "GET") return pagesMethodNotAllowed("GET");
          return handleAdmin("settings");
        default:
          return pagesTextResponse("Not Found", 404);
      }
    } catch (error) {
      const status = error.message.startsWith("请求 JSON 无效") ? 400 : 500;
      return pagesTextResponse("Error: " + error.message, status);
    }
  },
};
