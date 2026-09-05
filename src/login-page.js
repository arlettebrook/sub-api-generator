export async function loginPage(message = "") {
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
      <a href="https://arlettebrook.github.io" target="_blank" rel="noopener noreferrer">Arlettebrook</a></div>
  </div>
</body>
</html>`;
  }

  return globalThis._baseLoginHTML.replace(
    "<!--MSG_PLACEHOLDER-->",
    message ? `<div class="msg">${message}</div>` : "",
  );
}

// =========================
// ADMIN 前端页面（新增备注输入框）
// =========================

