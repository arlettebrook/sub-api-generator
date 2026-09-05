import {
  KV_KEY_APIS,
  KV_KEY_SUBS,
  getRuntimeConfig as getPagesRuntimeConfig,
  normalizeKvData,
  readJsonObject as readPagesJsonObject,
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
import { loginPage } from "./login-page.js";

async function handleGetSubs(env) {
  const data = await env.KV.get(KV_KEY_SUBS, "json");
  return pagesJsonResponse(normalizeKvData(data));
}

async function handlePostSubs(request, env) {
  const body = await readPagesJsonObject(request);
  await env.KV.put(KV_KEY_SUBS, JSON.stringify(body));
  return pagesJsonResponse({ ok: true });
}

async function handleGetApis(env) {
  const data = await env.KV.get(KV_KEY_APIS, "json");
  return pagesJsonResponse(normalizeKvData(data));
}

async function handlePostApis(request, env) {
  const body = await readPagesJsonObject(request);
  await env.KV.put(KV_KEY_APIS, JSON.stringify(body));
  return pagesJsonResponse({ ok: true });
}

async function handleGetUuid(env) {
  return pagesJsonResponse({ uuid: env.UUID.trim() });
}

function handleAdmin() {
  return new Response(adminHTML, {
    headers: pagesSecurityHeaders({
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    }),
  });
}

// ========================= 主入口 =========================
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
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
        case "/api/uuid":
          if (method === "GET") return await handleGetUuid(env);
          return pagesMethodNotAllowed("GET");
        case "/":
        case "/admin":
          if (method !== "GET") return pagesMethodNotAllowed("GET");
          return handleAdmin();
        default:
          return pagesTextResponse("Not Found", 404);
      }
    } catch (error) {
      const status = error.message.startsWith("请求 JSON 无效") ? 400 : 500;
      return pagesTextResponse("Error: " + error.message, status);
    }
  },
};
