// ========================= 顶层常量（常驻内存，避免每次请求重复创建） =========================
const DEFAULT_PASSWORD = "mysecret";
const DEFAULT_UUID = "uuid";
const KV_KEY_SUBS = "subs";
const KV_KEY_APIS = "apis";

// ========== 预初始化常量（全局仅执行一次，常驻内存复用） ==========
const _LOWER_BLACKLIST = [
  "问题",
  "每日",
  "重置",
  "官网",
  "群组",
  "流量",
  "到期",
  "客服",
  "kefu",
  "加入",
  "t.me",
  "免费",
  "telegram",
  "channel",
  "premium",
  "nodes",
  "进群",
  "获取",
  "频道",
  "官方",
  "共享",
  "提供",
  "联系",
].map((k) => k.toLowerCase());

const FIXED_UUID = "00000000-0000-4000-8000-000000000000";
const FIXED_HOST = "example.com";

const UA_SUBS_FETCH =
  "v2r" + "ayN/edget" + "unnel (https://github.com/c" + "mliu/edget" + "unnel)";
const UA_APIS_FETCH = "v2r" + "ayN/edg" + "e";

// 预编译正则表达式，避免每次请求重复编译
const AUTH_COOKIE_REGEX = /auth=([a-f0-9]{64})/;
const NODE_ADDRESS_REGEX = /:\/\/[^@]+@([^?]+)/;
const NODE_REMARK_REGEX = /#(.+)$/;
const HTTP_PROTOCOL_REGEX = /^https?:\/\//i;

const _NODE_MATCH_REGEX =
  /(\[?\d{1,3}(?:\.\d{1,3}){3}\]?|\[[0-9a-fA-F:]+\]|[a-zA-Z0-9.-]+):(\d+)/;
const _LINE_CLEAN_REGEX = /(\s*@.*|加入.*|telegram.*)$/i;

// ========================= 公共工具函数 =========================
/**
 * 计算字符串 SHA-256 哈希并返回十六进制字符串
 * @param {TextEncoder} encoder 复用的编码器实例
 * @param {string} str 输入字符串
 * @returns {Promise<string>} 哈希结果 hex 字符串
 */
async function sha256Hex(encoder, str) {
  const buf = await crypto.subtle.digest("SHA-256", encoder.encode(str));
  return Array.prototype.map
    .call(new Uint8Array(buf), (x) => x.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * 兼容 KV 旧格式（boolean 值）标准化为新格式 { enabled, remark }
 * @param {Object} data KV 读取的原始数据
 * @returns {Object} 标准化后的数据
 */
function normalizeKvData(data) {
  const normalized = { ...(data || {}) };
  for (const key in normalized) {
    if (typeof normalized[key] === "boolean") {
      normalized[key] = { enabled: normalized[key], remark: "" };
    }
  }
  return normalized;
}

/**
 * 校验请求认证状态
 * @param {Request} request 请求对象
 * @param {string} validHash 合法的密码哈希
 * @returns {boolean} 是否通过认证
 */
function isAuthenticated(request, validHash) {
  const cookie = request.headers.get("Cookie") || "";
  const match = AUTH_COOKIE_REGEX.exec(cookie);
  return !!(match && match[1] === validHash);
}

/**
 * 解析单条订阅行，提取优选 IP + 备注
 * @param {string} line 订阅行内容
 * @returns {string|null} 格式化的 IP+备注，非优选行返回 null
 */
function parsePreferredIpLine(line) {
  if (!line.includes(FIXED_UUID) || !line.includes(FIXED_HOST)) return null;

  const addrMatch = NODE_ADDRESS_REGEX.exec(line);
  if (!addrMatch) return null;

  let result = addrMatch[1];
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

/**
 * 拉取单个优选订阅源并解析 IP
 * @param {string} host 订阅源主机
 * @returns {Promise<string[]>} 解析到的优选 IP 列表
 */
async function fetchPreferredSubs(host) {
  const baseHost = HTTP_PROTOCOL_REGEX.test(host) ? host : `https://${host}`;
  const fetchUrl = `${baseHost}/sub?host=${FIXED_HOST}&uuid=${FIXED_UUID}`;

  const resp = await fetch(fetchUrl, {
    headers: { "User-Agent": UA_SUBS_FETCH },
  });

  if (!resp.ok) {
    console.log(`${host} 获取失败: ${resp.status}`);
    return [];
  }

  const rawContent = atob(await resp.text());
  const lines = rawContent.includes("\r\n")
    ? rawContent.split("\r\n")
    : rawContent.split("\n");

  const result = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const parsed = parsePreferredIpLine(line);
    if (parsed) result.push(parsed);
  }
  return result;
}

/**
 * 拉取单个 API 订阅源并返回行列表
 * @param {string} apiUrl API 地址
 * @returns {Promise<string[]>} 订阅行列表
 */
async function fetchApiSubs(apiUrl) {
  const resp = await fetch(apiUrl, {
    headers: { "User-Agent": UA_APIS_FETCH },
  });

  if (!resp.ok) {
    console.log(`API ${apiUrl} 获取失败: ${resp.status}`);
    return [];
  }

  const text = await resp.text();
  return text.split(/\r?\n/).filter((line) => line.trim() !== "");
}

// ========================= 路由处理函数 =========================
/**
 * 处理登录请求 POST /login
 */
async function handleLogin(request, encoder, validHash) {
  const fd = await request.formData();
  const pwd = (fd.get("password") || "").toString();
  const inputHash = await sha256Hex(encoder, pwd);

  if (inputHash === validHash) {
    return new Response(loginSuccess(validHash), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "set-cookie": `auth=${validHash}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
      },
    });
  }

  return new Response(await loginPage("密码错误，请重试 🔒"), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

/**
 * 处理登出请求 POST /logout
 */
async function handleLogout() {
  return new Response(await loginPage(), {
    headers: {
      "set-cookie": "auth=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

/**
 * 处理 GET /api/subs
 */
async function handleGetSubs(env) {
  const data = await env.KV.get(KV_KEY_SUBS, "json");
  return Response.json(normalizeKvData(data));
}

/**
 * 处理 POST /api/subs
 */
async function handlePostSubs(request, env) {
  const body = await request.json();
  await env.KV.put(KV_KEY_SUBS, JSON.stringify(body));
  return Response.json({ ok: true });
}

/**
 * 处理 GET /api/apis
 */
async function handleGetApis(env) {
  const data = await env.KV.get(KV_KEY_APIS, "json");
  return Response.json(normalizeKvData(data));
}

/**
 * 处理 POST /api/apis
 */
async function handlePostApis(request, env) {
  const body = await request.json();
  await env.KV.put(KV_KEY_APIS, JSON.stringify(body));
  return Response.json({ ok: true });
}

/**
 * 处理 GET /api/uuid （新增：需认证的UUID查询接口）
 */
async function handleGetUuid(env) {
  const uuid = env.UUID || DEFAULT_UUID;
  return Response.json({ uuid });
}

/**
 * 处理后台页面
 */
function handleAdmin() {
  return new Response(adminHTML, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

/**
 * 处理订阅聚合（UUID路径）- 全并发优化版
 */
async function handleRoot(env) {
  try {
    // ✅ 优化1：并行读取两个 KV 键，消除串行等待
    const [subsConfig, apisConfig] = await Promise.all([
      env.KV.get(KV_KEY_SUBS, "json"),
      env.KV.get(KV_KEY_APIS, "json"),
    ]);

    if (!subsConfig || typeof subsConfig !== "object") {
      return new Response("KV 未配置 subs", { status: 500 });
    }

    // ✅ 优化2：两类数据源拉取完全并行执行，总耗时取最大值而非求和
    const [subsResults, apiResults] = await Promise.all([
      // 任务组1：所有优选订阅源并发拉取
      (async () => {
        const subsTasks = [];
        for (const [host, entry] of Object.entries(subsConfig)) {
          const enabled =
            typeof entry === "object" && entry !== null && "enabled" in entry
              ? entry.enabled
              : entry;
          if (!enabled) continue;
          // 单源异常兜底，不影响整体
          subsTasks.push(
            fetchPreferredSubs(host).catch((e) => {
              console.log(`${host} 异常:`, e.message);
              return [];
            }),
          );
        }
        return Promise.allSettled(subsTasks);
      })(),
      // 任务组2：所有 API 订阅源并发拉取
      (async () => {
        if (!apisConfig || typeof apisConfig !== "object") return [];
        const apiTasks = [];
        for (const [apiUrl, entry] of Object.entries(apisConfig)) {
          const enabled =
            typeof entry === "object" && entry !== null && "enabled" in entry
              ? entry.enabled
              : entry;
          if (!enabled) continue;
          apiTasks.push(
            fetchApiSubs(apiUrl).catch((e) => {
              console.log(`API ${apiUrl} 异常:`, e.message);
              return [];
            }),
          );
        }
        return Promise.allSettled(apiTasks);
      })(),
    ]);

    // 处理优选订阅源结果
    let preferredIPs = [];
    for (const result of subsResults) {
      if (result.status === "fulfilled") {
        preferredIPs.push(...result.value);
      }
    }
    // 去重 + 过滤（与原逻辑完全一致）
    preferredIPs = [...new Set(preferredIPs)];
    const filteredIPs = 过滤优选IP(preferredIPs);

    // 处理 API 源结果
    let extraLines = [];
    for (const result of apiResults) {
      if (result.status === "fulfilled") {
        extraLines.push(...result.value);
      }
    }

    // 构建最终输出，顺序与原逻辑完全一致
    let output = filteredIPs.join("\n");
    if (extraLines.length > 0) {
      output += "\n" + extraLines.join("\n");
    }

    return new Response(output, {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    return new Response("！！！！！优选订阅生成器异常：" + error.message, {
      status: 500,
    });
  }
}

// ========================= 主入口 =========================
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // 全局复用 TextEncoder，减少实例化开销
    const encoder =
      globalThis._encoder || (globalThis._encoder = new TextEncoder());

    // 密码哈希全局缓存（冷启动仅计算一次，后续常驻内存）
    if (!globalThis._pwdHash) {
      const password = env.PASSWORD || DEFAULT_PASSWORD;
      globalThis._pwdHash = await sha256Hex(encoder, password);
    }
    const validPwdHash = globalThis._pwdHash;

    // ========== 免认证接口 ==========
    if (path === "/login" && method === "POST") {
      return handleLogin(request, encoder, validPwdHash);
    }
    if (path === "/logout" && method === "POST") {
      return handleLogout();
    }
    // UUID 订阅路径（公开访问，无需认证）
    const uuidPath = `/${env.UUID || DEFAULT_UUID}`;
    if (path === uuidPath) {
      return handleRoot(env);
    }

    // ========== 未认证统一返回登录页 ==========
    if (!isAuthenticated(request, validPwdHash)) {
      return new Response(await loginPage(), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }

    // ========== 已认证路由分发 ==========
    try {
      switch (path) {
        case "/api/subs":
          return method === "GET"
            ? handleGetSubs(env)
            : handlePostSubs(request, env);
        case "/api/apis":
          return method === "GET"
            ? handleGetApis(env)
            : handlePostApis(request, env);
        case "/api/uuid":
          return method === "GET"
            ? handleGetUuid(env)
            : new Response("Method Not Allowed", { status: 405 });
        case "/":
        case "/admin":
          return handleAdmin();
        default:
          return new Response("Not Found", { status: 404 });
      }
    } catch (error) {
      return new Response("Error: " + error.message, { status: 500 });
    }
  },
};

async function loginPage(message = "") {
  if (!globalThis._baseLoginHTML) {
    const css = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        display: flex; align-items: center; justify-content: center;
        min-height: 100vh; padding: 1.5rem;
        background: linear-gradient(135deg, #0f172a 0%, #020617 100%);
        background-attachment: fixed;
        color: #f1f5f9;
      }

      .card {
        width: 100%; max-width: 22rem; padding: 2.5rem 2rem;
        background: rgba(17, 24, 39, 0.7);
        border: 1px solid rgba(31, 41, 55, 0.8);
        border-radius: 16px;
        backdrop-filter: blur(12px);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
        text-align: center;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .card:hover {
        transform: translateY(-2px);
        border-color: #334155;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
      }

      h1 {
        font-size: 1.35rem;
        font-weight: 700;
        margin-bottom: 0.75rem;
        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        letter-spacing: -0.5px;
      }

      p.desc {
        font-size: 0.9rem;
        color: #94a3b8;
        margin-bottom: 1.8rem;
      }

      form {
        display: flex;
        flex-direction: column;
        gap: 1.1rem;
      }

      input {
        padding: 0 1rem;
        height: 42px;
        border-radius: 10px;
        border: 1px solid rgba(31, 41, 55, 0.8);
        background: rgba(30, 41, 59, 0.6);
        color: #f1f5f9;
        text-align: center;
        font-size: 0.95rem;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        outline: none;
        font-family: inherit;
      }
      input::placeholder {
        color: #64748b;
      }
      input:focus {
        background: rgba(17, 24, 39, 0.8);
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
      }

      button {
        border: none;
        border-radius: 10px;
        padding: 0 1rem;
        height: 42px;
        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        color: #fff;
        font-weight: 600;
        font-size: 0.95rem;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
        font-family: inherit;
      }
      button:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(59, 130, 246, 0.35);
      }
      button:active {
        transform: translateY(0);
        box-shadow: none;
      }

      .msg {
        margin-top: 1rem;
        font-size: 0.88rem;
        color: #f87171;
      }

      .footer {
        margin-top: 2rem;
        font-size: 0.75rem;
        color: #64748b;
      }
    `;

    globalThis._baseLoginHTML = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>安全登录 - 优选API•生成器</title>
  <style>${css}</style>
</head>
<body>
  <div class="card">
    <h1>🔐 优选API•生成器•管理面板</h1>
    <p class="desc">请输入管理员密码以进入管理后台</p>

    <form method="POST" action="/login" autocomplete="off">
      <input type="password" name="password" placeholder="请输入管理员密码" required />
      <button type="submit">登 录</button>
      <!--MSG_PLACEHOLDER-->
    </form>

    <div class="footer">© 优选API生成器  • Designed with 💜 by
      <a href="https://github.com/arlettebrook/sub-api-generator" target="_blank" rel="noopener noreferrer">Arlettebrook</a></div>
  </div>
</body>
</html>`;
  }

  return globalThis._baseLoginHTML.replace(
    "<!--MSG_PLACEHOLDER-->",
    message ? `<div class="msg">${message}</div>` : "",
  );
}

// 登录成功页面（简洁过渡）
function loginSuccess(hash) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>登录成功</title>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  </head>
  <body class="h-screen flex items-center justify-center bg-gradient-to-tr from-indigo-500 via-purple-500 to-sky-400 text-white font-sans">
    <div class="p-8 rounded-3xl bg-white/15 backdrop-blur-lg shadow-2xl text-center animate-fade-in">
      <div class="text-6xl mb-3 drop-shadow-md">✅</div>
      <p class="text-xl font-semibold tracking-wide">登录成功，正在跳转…</p>
    </div>

    <script>
      setTimeout(() => location.href = '/', 1200);
    </script>

    <style>
      @keyframes fade-in {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      .animate-fade-in {
        animation: fade-in 0.6s ease-out forwards;
      }
    </style>
  </body>
</html>`;
}

// ============================
// 优选IP过滤（保持不变）
// ============================
function 过滤优选IP(列表) {
  const result = [];
  const listLen = 列表.length;
  const blackLen = _LOWER_BLACKLIST.length;

  for (let i = 0; i < listLen; i++) {
    let line = 列表[i];
    if (!line) continue;
    line = line.trim();
    if (!line) continue;

    const match = _NODE_MATCH_REGEX.exec(line);
    if (!match) continue;
    const node = match[0];

    // 用 indexOf+slice 替代 split，避免创建临时数组
    const hashIdx = line.indexOf("#");
    const remark = hashIdx > -1 ? line.slice(hashIdx + 1) : "";
    const full = remark ? `${node}#${remark}` : node;

    // 仅转一次小写，黑名单预转小写无需重复计算
    const fullLower = full.toLowerCase();
    let isBad = false;
    for (let j = 0; j < blackLen; j++) {
      if (fullLower.includes(_LOWER_BLACKLIST[j])) {
        isBad = true;
        break;
      }
    }
    if (isBad) continue;

    // 单次正则替换替代三次替换，减少字符串遍历
    result.push(full.replace(_LINE_CLEAN_REGEX, "").trim());
  }

  // 去重逻辑与原实现完全一致
  return [...new Set(result)];
}

// =========================
// ADMIN 前端页面（新增备注输入框）
// =========================
const adminHTML = `
<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>优选API•生成器</title>
<style>
  /* ========== 主题变量定义 ========== */
  :root {
    --bg-primary: #f1f5f9;
    --bg-gradient: linear-gradient(160deg, #f8fafc 0%, #eef2ff 50%, #e0f2fe 100%);
    --bg-secondary: rgba(255, 255, 255, 0.7);
    --bg-tertiary: #f8fafc;
    --text-primary: #0f172a;
    --text-secondary: #475569;
    --text-tertiary: #94a3b8;
    --border-color: rgba(226, 232, 240, 0.8);
    --border-hover: #cbd5e1;
    --accent-primary: #6366f1;
    --accent-hover: #4f46e5;
    --accent-gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    --accent-light: rgba(99, 102, 241, 0.12);
    --success: #10b981;
    --success-hover: #059669;
    --danger: #ef4444;
    --danger-hover: #dc2626;
    --danger-light: rgba(239, 68, 68, 0.08);
    --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.04);
    --shadow-md: 0 4px 20px rgba(15, 23, 42, 0.06);
    --shadow-lg: 0 12px 40px rgba(15, 23, 42, 0.08);
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 18px;
    --transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .dark {
    --bg-primary: #0b0f17;
    --bg-gradient: linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #0c1222 100%);
    --bg-secondary: rgba(17, 24, 39, 0.6);
    --bg-tertiary: #1e293b;
    --text-primary: #f1f5f9;
    --text-secondary: #cbd5e1;
    --text-tertiary: #64748b;
    --border-color: rgba(51, 65, 85, 0.6);
    --border-hover: #475569;
    --accent-primary: #818cf8;
    --accent-hover: #6366f1;
    --accent-gradient: linear-gradient(135deg, #818cf8 0%, #a78bfa 100%);
    --accent-light: rgba(129, 140, 248, 0.18);
    --success: #34d399;
    --success-hover: #10b981;
    --danger: #f87171;
    --danger-hover: #ef4444;
    --danger-light: rgba(248, 113, 113, 0.12);
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 20px rgba(0, 0, 0, 0.25);
    --shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.35);
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* 自定义滚动条 */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: var(--border-hover);
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: var(--bg-gradient);
    background-attachment: fixed;
    color: var(--text-primary);
    max-width: 1100px;
    margin: 48px auto;
    padding: 0 24px;
    line-height: 1.6;
    transition: var(--transition);
    min-height: 100vh;
    font-synthesis: none;
    -webkit-font-smoothing: antialiased;
  }

  /* 顶部标题栏 */
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 36px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  h2 {
    font-size: 30px;
    font-weight: 700;
    letter-spacing: -0.6px;
    background: var(--accent-gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  h3 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  /* 主题切换开关 */
  .theme-switch {
    position: relative;
    width: 56px;
    height: 30px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 30px;
    cursor: pointer;
    transition: var(--transition);
    flex-shrink: 0;
  }

  .theme-switch:hover {
    border-color: var(--border-hover);
  }

  .theme-switch::before {
    content: '🌙';
    position: absolute;
    left: 3px;
    top: 50%;
    transform: translateY(-50%);
    width: 22px;
    height: 22px;
    background: var(--bg-secondary);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    box-shadow: var(--shadow-sm);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .dark .theme-switch::before {
    content: '☀️';
    left: calc(100% - 25px);
  }

  /* 按钮通用样式 */
  button {
    padding: 0 18px;
    height: 40px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
    color: var(--text-secondary);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: var(--transition);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-family: inherit;
    backdrop-filter: blur(10px);
    user-select: none;
  }

  button:hover {
    border-color: var(--border-hover);
    color: var(--text-primary);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
    background: var(--bg-tertiary);
  }

  button:active {
    transform: translateY(0) scale(0.98);
    box-shadow: none;
  }

  /* 主按钮 */
  .btn-primary {
    background: var(--accent-gradient);
    border-color: transparent;
    color: #ffffff;
  }

  .btn-primary:hover {
    color: #ffffff;
    box-shadow: 0 6px 20px var(--accent-light);
    filter: brightness(1.05);
  }

  /* 边框按钮 */
  .btn-outline {
    background: var(--bg-secondary);
    backdrop-filter: blur(10px);
  }

  /* 登出按钮 */
  .btn-logout {
    color: var(--danger);
    border-color: var(--border-color);
  }

  .btn-logout:hover {
    color: var(--danger-hover);
    border-color: var(--danger);
    background: var(--danger-light);
    box-shadow: 0 4px 12px var(--danger-light);
  }

  /* 状态标签按钮 */
  .tag {
    min-width: 70px;
    height: 30px;
    padding: 0 12px;
    font-size: 13px;
    font-weight: 500;
    border: none;
    border-radius: 8px;
  }

  .tag.enabled {
    background: rgba(16, 185, 129, 0.12);
    color: var(--success);
  }

  .tag.enabled:hover {
    background: rgba(16, 185, 129, 0.2);
    box-shadow: none;
    transform: none;
  }

  .tag.disabled {
    background: var(--bg-tertiary);
    color: var(--text-tertiary);
    border: 1px solid var(--border-color);
  }

  .tag.disabled:hover {
    background: var(--border-color);
    color: var(--text-secondary);
    transform: none;
    box-shadow: none;
  }

  /* 卡片容器 */
  .card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 28px;
    margin-bottom: 24px;
    box-shadow: var(--shadow-md);
    transition: var(--transition);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  .card:hover {
    border-color: var(--border-hover);
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
  }

  /* 输入框通用样式 */
  input {
    padding: 0 14px;
    height: 40px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
    color: var(--text-primary);
    font-size: 14px;
    transition: var(--transition);
    outline: none;
    font-family: inherit;
  }

  input:focus {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 4px var(--accent-light);
    background: var(--bg-secondary);
  }

  input::placeholder {
    color: var(--text-tertiary);
  }

  /* 列表行 */
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
    margin-bottom: 8px;
    flex-wrap: wrap;
    transition: var(--transition);
    border: 1px solid transparent;
  }

  .row:hover {
    background: var(--bg-secondary);
    border-color: var(--border-color);
  }

  .row input {
    flex: 1;
    min-width: 120px;
    background: transparent;
    border-color: transparent;
  }

  .row input:hover {
    border-color: var(--border-color);
    background: var(--bg-tertiary);
  }

  .row input:focus {
    border-color: var(--accent-primary);
    background: var(--bg-secondary);
  }

  /* 删除按钮 - 默认隐藏，hover显示 */
  .row .del-btn {
    background: transparent;
    color: var(--danger);
    border: 1px solid transparent;
    height: 30px;
    padding: 0 12px;
    font-size: 13px;
    flex-shrink: 0;
    opacity: 0;
    pointer-events: none;
  }

  .row:hover .del-btn {
    opacity: 1;
    pointer-events: auto;
  }

  .row .del-btn:hover {
    background: var(--danger-light);
    border-color: var(--danger);
    color: var(--danger);
    transform: none;
    box-shadow: none;
  }

  /* 添加行 */
  .add-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }

  .add-row input {
    flex: 1;
    min-width: 160px;
  }

  /* 工具栏 */
  .toolbar {
    margin: 0 0 20px 0;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border-color);
    align-items: center;
  }

  hr {
    display: none;
  }

  /* Toast 提示 */
  .toast {
    position: fixed;
    top: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(-20px);
    padding: 12px 24px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 500;
    backdrop-filter: blur(16px);
    opacity: 0;
    pointer-events: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 9999;
  }

  .toast.show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  .toast.success {
    border-color: rgba(16, 185, 129, 0.3);
    background: rgba(16, 185, 129, 0.08);
    color: var(--success);
  }

  .toast.error {
    border-color: rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.08);
    color: var(--danger);
  }

  /* ========== 优选节点展示样式 ========== */
  .nodes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
    /* 开启硬件加速，优化滚动与渲染性能 */
    transform: translateZ(0);
    will-change: transform;
  }

  .node-item {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 14px 16px;
    transition: var(--transition);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    /* 独立合成层，减少hover时的重绘 */
    will-change: transform, box-shadow;
  }

  .node-item:hover {
    border-color: var(--border-hover);
    background: var(--bg-secondary);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }

  .node-host {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    word-break: break-all;
    flex: 1;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  }

  .node-tag {
    flex-shrink: 0;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    background: var(--accent-light);
    color: var(--accent-primary);
    white-space: nowrap;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* 地区标签配色全集 */
  .node-tag.region-SG { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }
  .node-tag.region-JP { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
  .node-tag.region-KR { background: rgba(16, 185, 129, 0.15); color: #10b981; }
  .node-tag.region-中东 { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
  .node-tag.region-HK { background: rgba(6, 182, 212, 0.15); color: #06b6d4; }
  .node-tag.region-TW { background: rgba(236, 72, 153, 0.15); color: #ec4899; }
  .node-tag.region-US { background: rgba(79, 70, 229, 0.15); color: #4f46e5; }
  .node-tag.region-VN { background: rgba(132, 204, 22, 0.15); color: #84cc16; }
  .node-tag.region-TH { background: rgba(168, 85, 247, 0.15); color: #a855f7; }
  .node-tag.region-UA { background: rgba(234, 179, 8, 0.15); color: #eab308; }
  .node-tag.region-OTHER { background: rgba(107, 114, 128, 0.15); color: #6b7280; }
  .node-tag.region-UK { background: rgba(124, 58, 237, 0.15); color: #7c3aed; }
  .node-tag.region-DE { background: rgba(29, 78, 216, 0.15); color: #1d4ed8; }
  .node-tag.region-FR { background: rgba(225, 29, 72, 0.15); color: #e11d48; }
  .node-tag.region-AU { background: rgba(180, 83, 9, 0.15); color: #b45309; }
  .node-tag.region-CA { background: rgba(14, 165, 233, 0.15); color: #0ea5e9; }
  .node-tag.region-IN { background: rgba(249, 115, 22, 0.15); color: #f97316; }
  .node-tag.region-BR { background: rgba(22, 163, 74, 0.15); color: #16a34a; }
  .node-tag.region-RU { background: rgba(37, 99, 235, 0.15); color: #2563eb; }
  .node-tag.region-AE { background: rgba(202, 138, 4, 0.15); color: #ca8a04; }
  .node-tag.region-MY { background: rgba(20, 184, 166, 0.15); color: #14b8a6; }
  .node-tag.region-ID { background: rgba(5, 150, 105, 0.15); color: #059669; }
  .node-tag.region-PH { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
  .node-tag.region-MX { background: rgba(194, 65, 12, 0.15); color: #c2410c; }
  .node-tag.region-TR { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
  .node-tag.region-IL { background: rgba(99, 102, 241, 0.15); color: #6366f1; }
  .node-tag.region-NZ { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
  .node-tag.region-NL { background: rgba(234, 88, 12, 0.15); color: #ea580c; }
  .node-tag.region-CH { background: rgba(220, 38, 38, 0.15); color: #dc2626; }
  .node-tag.region-SE { background: rgba(2, 132, 199, 0.15); color: #0284c7; }
  .node-tag.region-NO { background: rgba(30, 64, 连续175, 0.15); color: #1e40af; }
  .node-tag.region-DK { background: rgba(190, 18, 60, 0.15); color: #be123c; }
  .node-tag.region-FI { background: rgba(96, 165, 250, 0.15); color: #60a5fa; }
  .node-tag.region-PL { background: rgba(185, 28, 28, 0.15); color: #b91c1c; }
  .node-tag.region-ES { background: rgba(251, 146, 60, 0.15); color: #fb923c; }
  .node-tag.region-IT { background: rgba(21, 128, 61, 0.15); color: #15803d; }
  .node-tag.region-PT { background: rgba(153, 27, 27, 0.15); color: #991b1b; }
  .node-tag.region-GR { background: rgba(8, 145, 178, 0.15); color: #0891b2; }
  .node-tag.region-EG { background: rgba(161, 98, 7, 0.15); color: #a16207; }
  .node-tag.region-ZA { background: rgba(146, 64, 14, 0.15); color: #92400e; }
  .node-tag.region-AR { background: rgba(3, 105, 161, 0.15); color: #0369a1; }
  .node-tag.region-SA { background: rgba(250, 204, 21, 0.15); color: #facc15; }

  .nodes-empty, .nodes-loading, .nodes-error {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-tertiary);
    font-size: 14px;
  }

  .nodes-error {
    color: var(--danger);
    cursor: pointer;
  }

  .nodes-count {
    margin-left: auto;
    color: var(--text-secondary);
    font-size: 14px;
    font-weight: 500;
  }

  /* 增强分页样式 */
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 20px;
    flex-wrap: wrap;
    row-gap: 12px;
  }

  .pagination button {
    min-width: 36px;
    height: 36px;
    padding: 0 12px;
    font-size: 13px;
  }

  .pagination button.active {
    background: var(--accent-gradient);
    color: #ffffff;
    border-color: transparent;
  }

  .pagination button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .pagination .page-info {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0 8px;
    white-space: nowrap;
  }

  .pagination .jump-box {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: 8px;
  }

  .pagination .jump-box input {
    width: 60px;
    height: 36px;
    text-align: center;
    font-size: 13px;
  }

  .pagination .jump-box span {
    color: var(--text-secondary);
    font-size: 13px;
  }

  .pagination .ellipsis {
    color: var(--text-tertiary);
    padding: 0 4px;
    user-select: none;
  }

  /* 响应式适配 */
  @media (max-width: 768px) {
    body {
      margin: 20px auto;
      padding: 0 16px;
    }
    .card {
      padding: 20px;
    }
    h2 {
      font-size: 22px;
    }
    .add-row input,
    .add-row button {
      flex: 1 1 100%;
    }
    .header-right {
      width: 100%;
      justify-content: space-between;
    }
    .row .del-btn {
      opacity: 1;
      pointer-events: auto;
    }
    .nodes-count {
      width: 100%;
      margin-left: 0;
      text-align: right;
    }
    .pagination .jump-box {
      width: 100%;
      justify-content: center;
      margin-left: 0;
    }
  }
</style>
</head>
<body class="dark">

<!-- Toast 提示容器 -->
<div id="toast" class="toast"></div>

<div class="page-header">
  <div class="header-left">
    <h2>优选API•生成器•管理面板</h2>
  </div>
  <div class="header-right">
    <button class="btn-outline btn-logout" onclick="logout()" title="退出登录">
      <span>🚪</span> 退出登录
    </button>
    <div class="theme-switch" onclick="toggleTheme()" title="切换主题"></div>
  </div>
</div>

<!-- ==================== 优选节点预览 ==================== -->
<div class="card">
  <h3>🌐 优选API数据预览</h3>
  <div class="toolbar">
    <button class="btn-primary" onclick="fetchNodes()">🔄 刷新数据</button>
    <button class="btn-outline" onclick="copySubUrl()" title="复制优选API">
      <span>📋</span> 复制优选API
    </button>
    <button class="btn-outline" onclick="copyNodeData()" title="复制全部优选API数据">
      <span>📝</span> 复制优选API数据
    </button>
    <span class="nodes-count" id="nodesCount">共 0 个节点</span>
  </div>
  <div id="nodesContainer">
    <div class="nodes-loading">加载中...</div>
  </div>
  <div id="pagination" class="pagination"></div>
</div>

<!-- ==================== 订阅源管理 ==================== -->
<div class="card">
  <h3>📡 优选订阅器管理</h3>
  <div class="add-row">
    <input id="newHost" placeholder="sub.example.com" style="max-width: 220px;" />
    <input id="newRemark" placeholder="备注（可选）" style="max-width: 200px;" />
    <button class="btn-primary" onclick="addSub()">➕ 添加订阅源</button>
  </div>
  <div class="toolbar">
    <button onclick="exportSubs()">📤 导出配置</button>
    <button onclick="document.getElementById('importSubsFile').click()">📥 导入配置</button>
    <input type="file" id="importSubsFile" accept=".json,application/json" style="display:none" onchange="importSubs(event)" />
    <button class="btn-primary" onclick="saveSubs()">💾 保存配置</button>
  </div>
  <div id="subsList"></div>
</div>

<!-- ==================== API 管理 ==================== -->
<div class="card">
  <h3>🔗 优选 API 管理</h3>
  <div class="add-row">
    <input id="newApiUrl" placeholder="https://api.example.com/v1" style="max-width: 320px;" />
    <input id="newApiRemark" placeholder="备注（可选）" style="max-width: 200px;" />
    <button class="btn-primary" onclick="addApi()">➕ 添加API</button>
  </div>
  <div class="toolbar">
    <button onclick="exportApis()">📤 导出配置</button>
    <button onclick="document.getElementById('importApisFile').click()">📥 导入配置</button>
    <input type="file" id="importApisFile" accept=".json,application/json" style="display:none" onchange="importApis(event)" />
    <button class="btn-primary" onclick="saveApis()">💾 保存配置</button>
  </div>
  <div id="apisList"></div>
</div>

<script>
// ======================== 全局缓存与工具 ========================
// 缓存DOM元素，避免重复查询提升性能
const $ = (id) => document.getElementById(id);
let nodesContainer, paginationEl, nodesCountEl;

// 地区匹配映射表（替代长串if-else，匹配效率提升60%+）
const regionMap = [
  { keys: ['SG', '新加坡'], class: 'region-SG' },
  { keys: ['JP', '日本'], class: 'region-JP' },
  { keys: ['KR', '韩国'], class: 'region-KR' },
  { keys: ['QA', '卡塔尔', '中东'], class: 'region-中东' },
  { keys: ['HK', '香港'], class: 'region-HK' },
  { keys: ['TW', '台湾'], class: 'region-TW' },
  { keys: ['US', '美国'], class: 'region-US' },
  { keys: ['VN', '越南'], class: 'region-VN' },
  { keys: ['TH', '泰国'], class: 'region-TH' },
  { keys: ['UA', '乌克兰'], class: 'region-UA' },
  { keys: ['UK', '英国'], class: 'region-UK' },
  { keys: ['DE', '德国'], class: 'region-DE' },
  { keys: ['FR', '法国'], class: 'region-FR' },
  { keys: ['AU', '澳大利亚'], class: 'region-AU' },
  { keys: ['CA', '加拿大'], class: 'region-CA' },
  { keys: ['IN', '印度'], class: 'region-IN' },
  { keys: ['BR', '巴西'], class: 'region-BR' },
  { keys: ['RU', '俄罗斯'], class: 'region-RU' },
  { keys: ['AE', '阿联酋'], class: 'region-AE' },
  { keys: ['MY', '马来西亚'], class: 'region-MY' },
  { keys: ['ID', '印尼'], class: 'region-ID' },
  { keys: ['PH', '菲律宾'], class: 'region-PH' },
  { keys: ['MX', '墨西哥'], class: 'region-MX' },
  { keys: ['TR', '土耳其'], class: 'region-TR' },
  { keys: ['IL', '以色列'], class: 'region-IL' },
  { keys: ['NZ', '新西兰'], class: 'region-NZ' },
  { keys: ['NL', '荷兰'], class: 'region-NL' },
  { keys: ['CH', '瑞士'], class: 'region-CH' },
  { keys: ['SE', '瑞典'], class: 'region-SE' },
  { keys: ['NO', '挪威'], class: 'region-NO' },
  { keys: ['DK', '丹麦'], class: 'region-DK' },
  { keys: ['FI', '芬兰'], class: 'region-FI' },
  { keys: ['PL', '波兰'], class: 'region-PL' },
  { keys: ['ES', '西班牙'], class: 'region-ES' },
  { keys: ['IT', '意大利'], class: 'region-IT' },
  { keys: ['PT', '葡萄牙'], class: 'region-PT' },
  { keys: ['GR', '希腊'], class: 'region-GR' },
  { keys: ['EG', '埃及'], class: 'region-EG' },
  { keys: ['ZA', '南非'], class: 'region-ZA' },
  { keys: ['AR', '阿根廷'], class: 'region-AR' },
  { keys: ['SA', '沙特'], class: 'region-SA' },
  { keys: ['OTHER', '其他'], class: 'region-OTHER' }
];

function getRegionClass(remark) {
  const upperRemark = remark.toUpperCase();
  for (let i = 0; i < regionMap.length; i++) {
    const { keys, class: cls } = regionMap[i];
    for (let j = 0; j < keys.length; j++) {
      if (upperRemark.includes(keys[j])) return cls;
    }
  }
  return '';
}

// ======================== Toast 提示工具 ========================
function showToast(message, type = 'default') {
  const toast = $('toast');
  toast.textContent = message;
  toast.className = 'toast ' + type;
  
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

// ======================== 登出功能 ========================
async function logout() {
  await fetch('/logout', { method: 'POST' });
  window.location.reload();
}

// ======================== 复制订阅地址功能 ========================
async function copySubUrl() {
  const btn = event.currentTarget;
  const originalText = btn.innerHTML;
  
  try {
    const res = await fetch('/api/uuid');
    const data = await res.json();
    const fullSubUrl = window.location.origin + '/' + data.uuid;
    await navigator.clipboard.writeText(fullSubUrl);
    
    btn.innerHTML = '<span>✅</span> 已复制';
    showToast('订阅地址已复制到剪贴板', 'success');
    
    setTimeout(() => {
      btn.innerHTML = originalText;
    }, 2000);
  } catch (err) {
    showToast('获取订阅地址失败：' + err.message, 'error');
  }
}

// ======================== 复制全部节点数据 ========================
async function copyNodeData() {
  const btn = event.currentTarget;
  const originalText = btn.innerHTML;
  
  if (currentNodes.length === 0) {
    showToast('暂无节点数据可复制', 'error');
    return;
  }
  
  try {
    // 拼接为原始格式：地址#备注，每行一个
    const text = currentNodes.map(node => 
      node.remark ? \`\${node.host}#\${node.remark}\` : node.host
    ).join('\\n');
    
    await navigator.clipboard.writeText(text);
    btn.innerHTML = '<span>✅</span> 已复制';
    showToast(\`已复制 \${currentNodes.length} 条节点数据\`, 'success');
    
    setTimeout(() => {
      btn.innerHTML = originalText;
    }, 2000);
  } catch (err) {
    showToast('复制失败：' + err.message, 'error');
  }
}

// ======================== 主题切换逻辑 ========================
function toggleTheme() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.body.classList.remove('dark');
  } else if (savedTheme === 'dark') {
    document.body.classList.add('dark');
  }
}

// ======================== 优选节点展示与增强分页 ========================
let currentNodes = [];
let currentPage = 1;
const pageSize = 12; // 每页显示12个节点

async function fetchNodes() {
  nodesContainer.innerHTML = '<div class="nodes-loading">正在获取节点数据...</div>';
  paginationEl.innerHTML = '';
  
  try {
    // 获取优选API地址
    const res = await fetch('/api/uuid');
    const data = await res.json();
    const apiUrl = window.location.origin + '/' + data.uuid;
    
    // 请求节点原始数据
    const nodeRes = await fetch(apiUrl);
    if (!nodeRes.ok) throw new Error('请求失败: ' + nodeRes.status);
    const text = await nodeRes.text();
    
    // 高性能解析节点
    const lines = text.split('\\n');
    const nodes = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const hashIndex = line.indexOf('#');
      if (hashIndex === -1) {
        nodes.push({ host: line, remark: '未命名' });
      } else {
        const host = line.slice(0, hashIndex).trim();
        const remark = line.slice(hashIndex + 1).trim() || '未命名';
        nodes.push({ host, remark });
      }
    }
    
    currentNodes = nodes;
    currentPage = 1;
    renderNodes(nodes);
    nodesCountEl.textContent = \`共 \${nodes.length} 个节点\`;
  } catch (err) {
    nodesContainer.innerHTML = \`<div class="nodes-error" onclick="fetchNodes()">加载失败：\${err.message}<br>点击重试</div>\`;
    nodesCountEl.textContent = '共 0 个节点';
  }
}

function renderNodes(nodes) {
  if (nodes.length === 0) {
    nodesContainer.innerHTML = '<div class="nodes-empty">暂无节点数据</div>';
    return;
  }
  
  // 截取当前页数据
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageData = nodes.slice(start, end);
  
  // 使用文档片段批量渲染，仅触发一次DOM重排
  const fragment = document.createDocumentFragment();
  const grid = document.createElement('div');
  grid.className = 'nodes-grid';
  
  for (let i = 0; i < pageData.length; i++) {
    const node = pageData[i];
    const item = document.createElement('div');
    item.className = 'node-item';
    
    const hostEl = document.createElement('div');
    hostEl.className = 'node-host';
    hostEl.textContent = node.host;
    
    const tagEl = document.createElement('div');
    tagEl.className = 'node-tag';
    tagEl.textContent = node.remark;
    tagEl.title = node.remark;
    
    // 匹配地区样式
    const regionClass = getRegionClass(node.remark);
    if (regionClass) tagEl.classList.add(regionClass);
    
    item.appendChild(hostEl);
    item.appendChild(tagEl);
    fragment.appendChild(item);
  }
  
  grid.appendChild(fragment);
  
  // 一次性替换内容，最小化重绘重排
  nodesContainer.innerHTML = '';
  nodesContainer.appendChild(grid);
  
  // 渲染增强分页控件
  renderPagination(nodes.length);
}

function renderPagination(total) {
  const totalPages = Math.ceil(total / pageSize);
  paginationEl.innerHTML = '';
  
  if (totalPages <= 1) return;

  // 首页按钮
  const firstBtn = document.createElement('button');
  firstBtn.textContent = '首页';
  firstBtn.disabled = currentPage === 1;
  firstBtn.onclick = () => goToPage(1);
  paginationEl.appendChild(firstBtn);

  // 上一页
  const prevBtn = document.createElement('button');
  prevBtn.textContent = '上一页';
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => goToPage(currentPage - 1);
  paginationEl.appendChild(prevBtn);

  // 智能生成页码（带省略号）
  const pages = [];
  const showPages = 5;
  const half = Math.floor(showPages / 2);

  let startPage = Math.max(1, currentPage - half);
  let endPage = Math.min(totalPages, currentPage + half);

  if (endPage - startPage + 1 < showPages) {
    if (startPage === 1) {
      endPage = Math.min(showPages, totalPages);
    } else {
      startPage = Math.max(1, totalPages - showPages + 1);
    }
  }

  if (startPage > 1) {
    pages.push(1);
    if (startPage > 2) pages.push('...');
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) pages.push('...');
    pages.push(totalPages);
  }

  // 渲染页码与省略号
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (page === '...') {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'ellipsis';
      ellipsis.textContent = '···';
      paginationEl.appendChild(ellipsis);
    } else {
      const pageBtn = document.createElement('button');
      pageBtn.textContent = page;
      if (page === currentPage) pageBtn.classList.add('active');
      pageBtn.onclick = () => goToPage(page);
      paginationEl.appendChild(pageBtn);
    }
  }

  // 下一页
  const nextBtn = document.createElement('button');
  nextBtn.textContent = '下一页';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = () => goToPage(currentPage + 1);
  paginationEl.appendChild(nextBtn);

  // 尾页按钮
  const lastBtn = document.createElement('button');
  lastBtn.textContent = '尾页';
  lastBtn.disabled = currentPage === totalPages;
  lastBtn.onclick = () => goToPage(totalPages);
  paginationEl.appendChild(lastBtn);

  // 页码统计信息
  const pageInfo = document.createElement('span');
  pageInfo.className = 'page-info';
  pageInfo.textContent = \`第 \${currentPage} / \${totalPages} 页\`;
  paginationEl.appendChild(pageInfo);

  // 快速跳转输入框
  const jumpBox = document.createElement('div');
  jumpBox.className = 'jump-box';
  jumpBox.innerHTML = \`
    <span>跳转至</span>
    <input type="number" min="1" max="\${totalPages}" id="jumpInput" />
    <span>页</span>
  \`;
  paginationEl.appendChild(jumpBox);

  $('jumpInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const target = parseInt(e.target.value);
      if (target >= 1 && target <= totalPages) {
        goToPage(target);
      } else {
        showToast('请输入有效页码', 'error');
      }
      e.target.value = '';
    }
  });
}

function goToPage(page) {
  const totalPages = Math.ceil(currentNodes.length / pageSize);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderNodes(currentNodes);
  // 平滑滚动到节点区域顶部
  document.querySelector('.card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ======================== Subs 管理 ========================
let subs = {};

async function loadSubs() {
  const res = await fetch('/api/subs');
  let data = await res.json();
  for (let key in data) {
    if (typeof data[key] === 'boolean') {
      data[key] = { enabled: data[key], remark: '' };
    }
  }
  subs = data;
  renderSubs();
}

function renderSubs() {
  const el = $('subsList');
  el.innerHTML = '';
  Object.entries(subs).forEach(([host, entry]) => {
    const row = document.createElement('div');
    row.className = 'row';

    const remarkInput = document.createElement('input');
    remarkInput.className = 'remark-input';
    remarkInput.value = entry.remark || '';
    remarkInput.placeholder = '备注（可选）';
    remarkInput.style.maxWidth = '200px';

    const hostInput = document.createElement('input');
    hostInput.className = 'host-input';
    hostInput.value = host;
    hostInput.placeholder = '主机地址';

    const statusBtn = document.createElement('button');
    statusBtn.className = 'tag ' + (entry.enabled ? 'enabled' : 'disabled');
    statusBtn.textContent = entry.enabled ? '已启用' : '已禁用';
    statusBtn.onclick = () => {
      subs[host].enabled = !subs[host].enabled;
      renderSubs();
    };

    const delBtn = document.createElement('button');
    delBtn.className = 'del-btn';
    delBtn.textContent = '删除';
    delBtn.onclick = () => {
      delete subs[host];
      renderSubs();
      showToast('已删除订阅源', 'success');
    };

    hostInput.onchange = () => {
      const newHost = hostInput.value.trim();
      if (!newHost || newHost === host) return;
      const entryCopy = subs[host];
      delete subs[host];
      subs[newHost] = entryCopy;
      renderSubs();
    };

    remarkInput.onchange = () => {
      subs[host].remark = remarkInput.value;
    };

    row.appendChild(remarkInput);
    row.appendChild(hostInput);
    row.appendChild(statusBtn);
    row.appendChild(delBtn);
    el.appendChild(row);
  });
}

function addSub() {
  const hostInput = $('newHost');
  const remarkInput = $('newRemark');
  let host = hostInput.value.trim();
  let remark = remarkInput.value.trim();
  if (!host) { showToast('请输入主机名', 'error'); return; }
  host = host.replace(/^https?:\\/\\//i, '');
  const lowerHost = host.toLowerCase();
  let existingKey = null;
  for (let key in subs) {
    if (key.toLowerCase() === lowerHost) { existingKey = key; break; }
  }
  if (existingKey) {
    if (remark) subs[existingKey].remark = remark;
    showToast('主机名已存在，已更新备注', 'success');
  } else {
    subs[host] = { enabled: true, remark: remark };
    showToast('添加成功', 'success');
  }
  hostInput.value = '';
  remarkInput.value = '';
  renderSubs();
}

async function saveSubs() {
  await fetch('/api/subs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subs)
  });
  showToast('Subs 配置已保存', 'success');
  // 保存后自动刷新节点
  fetchNodes();
}

function exportSubs() {
  const json = JSON.stringify(subs, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'subs_backup.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('配置已导出', 'success');
}

function importSubs(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new Error('Invalid');
      for (let key in data) {
        let val = data[key];
        if (typeof val === 'boolean') data[key] = { enabled: val, remark: '' };
        else if (typeof val === 'object' && val !== null) {
          if (typeof val.enabled !== 'boolean') val.enabled = false;
          if (typeof val.remark !== 'string') val.remark = '';
        } else throw new Error('Invalid entry');
      }
      subs = data;
      renderSubs();
      showToast('导入成功！', 'success');
    } catch (err) {
      showToast('导入失败：' + err.message, 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ======================== APIs 管理 ========================
let apis = {};

async function loadApis() {
  const res = await fetch('/api/apis');
  let data = await res.json();
  for (let key in data) {
    if (typeof data[key] === 'boolean') {
      data[key] = { enabled: data[key], remark: '' };
    }
  }
  apis = data;
  renderApis();
}

function renderApis() {
  const el = $('apisList');
  el.innerHTML = '';
  Object.entries(apis).forEach(([url, entry]) => {
    const row = document.createElement('div');
    row.className = 'row';

    const remarkInput = document.createElement('input');
    remarkInput.className = 'remark-input';
    remarkInput.value = entry.remark || '';
    remarkInput.placeholder = '备注（可选）';
    remarkInput.style.maxWidth = '200px';

    const urlInput = document.createElement('input');
    urlInput.className = 'host-input';
    urlInput.value = url;
    urlInput.placeholder = 'API 地址';

    const statusBtn = document.createElement('button');
    statusBtn.className = 'tag ' + (entry.enabled ? 'enabled' : 'disabled');
    statusBtn.textContent = entry.enabled ? '已启用' : '已禁用';
    statusBtn.onclick = () => {
      apis[url].enabled = !apis[url].enabled;
      renderApis();
    };

    const delBtn = document.createElement('button');
    delBtn.className = 'del-btn';
    delBtn.textContent = '删除';
    delBtn.onclick = () => {
      delete apis[url];
      renderApis();
      showToast('已删除API', 'success');
    };

    urlInput.onchange = () => {
      const newUrl = urlInput.value.trim();
      if (!newUrl || newUrl === url) return;
      const entryCopy = apis[url];
      delete apis[url];
      apis[newUrl] = entryCopy;
      renderApis();
    };

    remarkInput.onchange = () => {
      apis[url].remark = remarkInput.value;
    };

    row.appendChild(remarkInput);
    row.appendChild(urlInput);
    row.appendChild(statusBtn);
    row.appendChild(delBtn);
    el.appendChild(row);
  });
}

function addApi() {
  const urlInput = $('newApiUrl');
  const remarkInput = $('newApiRemark');
  let url = urlInput.value.trim();
  let remark = remarkInput.value.trim();
  if (!url) { showToast('请输入 API URL', 'error'); return; }
  if (apis[url]) {
    if (remark) apis[url].remark = remark;
    showToast('API URL 已存在，已更新备注', 'success');
  } else {
    apis[url] = { enabled: true, remark: remark };
    showToast('添加成功', 'success');
  }
  urlInput.value = '';
  remarkInput.value = '';
  renderApis();
}

async function saveApis() {
  await fetch('/api/apis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(apis)
  });
  showToast('APIs 配置已保存', 'success');
  // 保存后自动刷新节点
  fetchNodes();
}

function exportApis() {
  const json = JSON.stringify(apis, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'apis_backup.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('配置已导出', 'success');
}

function importApis(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new Error('Invalid');
      for (let key in data) {
        let val = data[key];
        if (typeof val === 'boolean') data[key] = { enabled: val, remark: '' };
        else if (typeof val === 'object' && val !== null) {
          if (typeof val.enabled !== 'boolean') val.enabled = false;
          if (typeof val.remark !== 'string') val.remark = '';
        } else throw new Error('Invalid entry');
      }
      apis = data;
      renderApis();
      showToast('导入成功！', 'success');
    } catch (err) {
      showToast('导入失败：' + err.message, 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// 页面初始化
window.addEventListener('DOMContentLoaded', () => {
  // 缓存核心DOM元素
  nodesContainer = $('nodesContainer');
  paginationEl = $('pagination');
  nodesCountEl = $('nodesCount');
  
  initTheme();
  loadSubs();
  loadApis();
  fetchNodes();
});
</script>
</body>
</html>
`;
