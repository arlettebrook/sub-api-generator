export const adminHTML = `
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

  .admin-nav {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    align-items: center;
    gap: 4px;
    width: 100%;
    position: sticky;
    top: 12px;
    z-index: 1000;
    padding: 5px;
    margin-top: -20px;
    margin-bottom: 28px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .admin-nav a {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: 0;
    min-height: 42px;
    padding: 9px 14px;
    border-radius: 9px;
    color: var(--text-secondary);
    text-align: center;
    text-decoration: none;
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    transition: var(--transition);
  }

  .admin-nav a:hover {
    color: var(--text-primary);
    background: var(--bg-tertiary);
    transform: translateY(-1px);
  }

  .admin-nav a.active {
    color: var(--text-primary);
    background: var(--accent-light);
    box-shadow: inset 0 0 0 1px rgba(99, 102, 241, 0.16), 0 3px 10px rgba(99, 102, 241, 0.08);
  }

  .admin-nav a.active:hover {
    background: var(--accent-light);
  }

  .admin-nav a:focus-visible {
    outline: 3px solid var(--accent-light);
    outline-offset: 1px;
  }

  .nav-icon {
    font-size: 16px;
    line-height: 1;
  }

  .nav-label {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  body[data-page="overview"] #subsSection,
  body[data-page="overview"] #apisSection,
  body[data-page="overview"] #customApiSection,
  body[data-page="overview"] #settingsSection,
  body[data-page="subs"] #previewSection,
  body[data-page="subs"] #apisSection,
  body[data-page="subs"] #customApiSection,
  body[data-page="subs"] #settingsSection,
  body[data-page="apis"] #previewSection,
  body[data-page="apis"] #subsSection,
  body[data-page="apis"] #customApiSection,
  body[data-page="apis"] #settingsSection,
  body[data-page="manage"] #previewSection,
  body[data-page="manage"] #customApiSection,
  body[data-page="manage"] #settingsSection,
  body[data-page="customApis"] #previewSection,
  body[data-page="customApis"] #subsSection,
  body[data-page="customApis"] #apisSection,
  body[data-page="customApis"] #settingsSection,
  body[data-page="settings"] #previewSection,
  body[data-page="settings"] #subsSection,
  body[data-page="settings"] #apisSection,
  body[data-page="settings"] #customApiSection {
    display: none;
  }

  .settings-list {
    display: grid;
    gap: 10px;
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 16px 18px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
  }

  .setting-copy {
    display: grid;
    gap: 3px;
  }

  .setting-copy strong {
    font-size: 14px;
    color: var(--text-primary);
  }

  .setting-copy small {
    color: var(--text-secondary);
    font-size: 13px;
  }

  .source-picker {
    display: grid;
    gap: 8px;
    margin: 4px 0 12px;
    padding: 12px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
  }

  .source-picker-title {
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 600;
  }

  .source-options {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
  }

  .source-option {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--text-primary);
    font-size: 13px;
  }

  .source-option input {
    width: 16px;
    height: 16px;
    accent-color: var(--accent-primary);
  }

  .row .source-picker {
    flex: 1 1 100%;
    margin: 2px 0 0;
  }

  .page-intro {
    margin: -12px 0 24px;
    color: var(--text-secondary);
    font-size: 14px;
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
    padding: 0;
    font: inherit;
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

  select {
    height: 40px;
    min-width: 180px;
    padding: 0 34px 0 12px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
    color: var(--text-primary);
    font: inherit;
    cursor: pointer;
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
  @media screen and (max-width: 768px), screen and (max-device-width: 768px) {
    body {
      margin: 12px auto;
      padding: 0 12px calc(102px + env(safe-area-inset-bottom, 0px));
    }
    .page-header {
      margin-bottom: 18px;
      gap: 10px;
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
    body > .admin-nav {
      position: fixed !important;
      top: auto !important;
      right: 12px;
      bottom: max(12px, env(safe-area-inset-bottom, 0px)) !important;
      left: 12px;
      width: auto;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 4px;
      overflow-x: auto;
      margin: 0;
      padding: 4px;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
      box-shadow: 0 10px 30px rgba(2, 6, 23, 0.28);
      isolation: isolate;
    }
    .admin-nav::-webkit-scrollbar { display: none; }
    .admin-nav a {
      flex: 0 0 auto;
      min-height: 48px;
      min-width: 96px;
      flex-direction: column;
      gap: 3px;
      padding: 7px 11px 8px;
      text-align: center;
      font-size: 12px;
    }
    .nav-icon {
      font-size: 17px;
    }
    .setting-row {
      align-items: flex-start;
      flex-direction: column;
      gap: 12px;
    }
    .page-intro {
      margin: -4px 0 16px;
      font-size: 13px;
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
<body class="dark" data-page="__PAGE__">

<!-- Toast 提示容器 -->
<div id="toast" class="toast"></div>

<div class="page-header">
  <div class="header-left">
    <h2>优选API•生成器•管理面板</h2>
  </div>
  <div class="header-right">
    <button id="themeSwitch" class="theme-switch" type="button" title="切换主题" aria-label="切换主题" aria-pressed="true"></button>
    <button id="logoutButton" class="btn-outline btn-logout" type="button" title="退出登录">
      <span>🚪</span> 退出登录
    </button>
  </div>
</div>

<nav class="admin-nav" aria-label="管理导航">
  <a href="/admin" data-nav-page="overview"><span class="nav-icon" aria-hidden="true">🌐</span><span class="nav-label">数据预览</span></a>
  <a href="/admin/manage" data-nav-page="manage"><span class="nav-icon" aria-hidden="true">🧩</span><span class="nav-label">优选管理</span></a>
  <a href="/admin/custom-apis" data-nav-page="customApis"><span class="nav-icon" aria-hidden="true">🚀</span><span class="nav-label">优选API</span></a>
  <a href="/admin/settings" data-nav-page="settings"><span class="nav-icon" aria-hidden="true">⚙️</span><span class="nav-label">设置</span></a>
</nav>

<p class="page-intro" id="pageIntro">集中查看订阅聚合结果和节点状态。</p>

<!-- ==================== 优选节点预览 ==================== -->
<div class="card" id="previewSection">
  <h3>🌐 优选API数据预览</h3>
  <div class="toolbar">
    <select id="previewApiSelect" onchange="fetchNodes()" aria-label="选择优选API"></select>
    <button class="btn-primary" onclick="fetchNodes()">🔄 刷新数据</button>
    <button class="btn-outline" onclick="copySubUrl(event)" title="复制优选API">
      <span>📋</span> 复制优选API
    </button>
    <button class="btn-outline" onclick="copyNodeData(event)" title="复制全部优选API数据">
      <span>📝</span> 复制优选API数据
    </button>
    <span class="nodes-count" id="nodesCount">共 0 个节点</span>
  </div>
  <div id="nodesContainer">
    <div class="nodes-loading">加载中...</div>
  </div>
  <div id="pagination" class="pagination"></div>
</div>

<!-- ==================== 优选 API ==================== -->
<div class="card" id="customApiSection">
  <h3>🚀 优选API</h3>
  <div class="add-row">
    <input id="newCustomApiPath" placeholder="访问路径，例如 my-api" style="max-width: 260px;" />
    <input id="newCustomApiRemark" placeholder="备注（可选）" style="max-width: 200px;" />
    <button class="btn-primary" onclick="addCustomApi()">➕ 新建 API</button>
  </div>
  <div class="source-picker">
    <div class="source-picker-title">选择此 API 使用的数据源</div>
    <div class="source-options" id="newCustomApiSources"><span class="nodes-loading">正在加载数据源...</span></div>
  </div>
  <div class="toolbar">
    <button class="btn-primary" onclick="saveCustomApis()">💾 保存配置</button>
  </div>
  <div id="customApisList"></div>
</div>

<!-- ==================== 订阅源管理 ==================== -->
<div class="card" id="subsSection">
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
<div class="card" id="apisSection">
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

<!-- ==================== 设置 ==================== -->
<div class="card" id="settingsSection">
  <h3>⚙️ 界面设置</h3>
  <div class="settings-list">
    <div class="setting-row">
      <div class="setting-copy">
        <strong>主题模式</strong>
        <small>在深色和浅色界面之间切换。</small>
      </div>
      <button class="btn-outline" type="button" onclick="toggleTheme()">切换主题</button>
    </div>
  </div>
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
  const button = document.querySelector('.btn-logout');
  if (button) button.disabled = true;
  try {
    const response = await fetch('/logout', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'follow',
    });
    if (!response.ok) throw new Error('退出登录请求失败');
  } catch (error) {
    if (button) button.disabled = false;
    showToast(error.message, 'error');
    return;
  }
  window.location.replace('/');
}

// ======================== 复制订阅地址功能 ========================
async function copySubUrl(event) {
    const btn = event?.currentTarget;
  const originalText = btn.innerHTML;
  
  try {
    const fullSubUrl = await getPreviewApiUrl();
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
async function copyNodeData(event) {
    const btn = event?.currentTarget;
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
  const switcher = document.querySelector('.theme-switch');
  if (switcher) switcher.setAttribute('aria-pressed', String(isDark));
  try {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  } catch {
    // Theme switching should still work when storage is unavailable.
  }
}

function initTheme() {
  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem('theme');
  } catch {
    // Fall back to the default dark theme when storage is unavailable.
  }
  if (savedTheme === 'light') {
    document.body.classList.remove('dark');
  } else if (savedTheme === 'dark') {
    document.body.classList.add('dark');
  }
  const switcher = document.querySelector('.theme-switch');
  if (switcher) switcher.setAttribute('aria-pressed', String(document.body.classList.contains('dark')));
}

// ======================== 优选节点展示与增强分页 ========================
let currentNodes = [];
let currentPage = 1;
const pageSize = 12; // 每页显示12个节点

async function getPreviewApiUrl() {
  const selectedPath = $('previewApiSelect')?.value || '';
  if (selectedPath) return window.location.origin + '/' + selectedPath;
  const res = await fetch('/api/uuid');
  const data = await res.json();
  return window.location.origin + '/' + data.uuid;
}

async function fetchNodes() {
  nodesContainer.innerHTML = '<div class="nodes-loading">正在获取节点数据...</div>';
  paginationEl.innerHTML = '';
  
  try {
    const apiUrl = await getPreviewApiUrl();
    
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

// ======================== 优选 API 管理 ========================
let customApis = {};

async function loadCustomApis() {
  const [customRes, subsRes, apisRes] = await Promise.all([
    fetch('/api/custom-apis'),
    fetch('/api/subs'),
    fetch('/api/apis'),
  ]);
  customApis = await customRes.json();
  subs = await subsRes.json();
  apis = await apisRes.json();
  if ($('customApisList')) renderCustomApis();
  renderCustomApiSelect();
  renderNewCustomApiSources();
}

function sourceEntries() {
  return [
    ...Object.entries(subs).map(([key, value]) => ({ type: 'subs', key, label: '订阅源 · ' + (value.remark || key) })),
    ...Object.entries(apis).map(([key, value]) => ({ type: 'apis', key, label: 'API 源 · ' + (value.remark || key) })),
  ];
}

function sourcePicker(selectedSources = [], title = '选择数据源') {
  const selected = new Set(selectedSources.map((source) => source.type + ':' + source.key));
  const picker = document.createElement('div');
  picker.className = 'source-picker';
  const titleEl = document.createElement('div');
  titleEl.className = 'source-picker-title';
  titleEl.textContent = title;
  picker.appendChild(titleEl);
  const options = document.createElement('div');
  options.className = 'source-options';
  const entries = sourceEntries();
  if (!entries.length) {
    options.textContent = '暂无可用数据源，请先在优选管理中添加。';
  }
  entries.forEach((source) => {
    const label = document.createElement('label');
    label.className = 'source-option';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.sourceType = source.type;
    checkbox.dataset.sourceKey = source.key;
    checkbox.checked = selected.has(source.type + ':' + source.key);
    label.append(checkbox, document.createTextNode(source.label));
    options.appendChild(label);
  });
  picker.appendChild(options);
  return picker;
}

function readSourcePicker(picker) {
  return [...picker.querySelectorAll('input[type="checkbox"]:checked')].map((checkbox) => ({
    type: checkbox.dataset.sourceType,
    key: checkbox.dataset.sourceKey,
  }));
}

function renderNewCustomApiSources() {
  const container = $('newCustomApiSources');
  if (!container) return;
  const picker = sourcePicker([], '选择此 API 使用的数据源');
  container.innerHTML = '';
  container.append(...picker.querySelector('.source-options').childNodes);
}

function getNewCustomApiSources() {
  return [...document.querySelectorAll('#newCustomApiSources input[type="checkbox"]:checked')].map((checkbox) => ({
    type: checkbox.dataset.sourceType,
    key: checkbox.dataset.sourceKey,
  }));
}

function renderCustomApiSelect() {
  const select = $('previewApiSelect');
  if (!select) return;
  const current = select.value;
  select.innerHTML = '<option value="">默认优选API</option>';
  Object.entries(customApis).forEach(([path, entry]) => {
    if (!entry.enabled) return;
    const option = document.createElement('option');
    option.value = path;
    option.textContent = entry.remark ? entry.remark + ' (' + path + ')' : '/' + path;
    select.appendChild(option);
  });
  if ([...select.options].some((option) => option.value === current)) select.value = current;
}

function renderCustomApis() {
  const el = $('customApisList');
  el.innerHTML = '';
  Object.entries(customApis).forEach(([path, entry]) => {
    const row = document.createElement('div');
    row.className = 'row';

    const pathInput = document.createElement('input');
    pathInput.className = 'host-input';
    pathInput.value = path;
    pathInput.placeholder = '访问路径';

    const remarkInput = document.createElement('input');
    remarkInput.className = 'remark-input';
    remarkInput.value = entry.remark || '';
    remarkInput.placeholder = '备注（可选）';
    remarkInput.style.maxWidth = '200px';

    const statusBtn = document.createElement('button');
    statusBtn.className = 'tag ' + (entry.enabled ? 'enabled' : 'disabled');
    statusBtn.textContent = entry.enabled ? '已启用' : '已禁用';
    statusBtn.onclick = () => {
      customApis[path].enabled = !customApis[path].enabled;
      renderCustomApis();
    };

    const delBtn = document.createElement('button');
    delBtn.className = 'del-btn';
    delBtn.textContent = '删除';
    delBtn.onclick = () => {
      delete customApis[path];
      renderCustomApis();
      showToast('已删除优选 API', 'success');
    };

    pathInput.onchange = () => {
      const newPath = pathInput.value.trim().replace(/^\\/+/, '');
      if (!newPath || newPath === path) return;
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(newPath) || ['admin', 'api', 'login', 'logout'].includes(newPath.toLowerCase())) {
        showToast('访问路径格式无效', 'error');
        pathInput.value = path;
        return;
      }
      if (customApis[newPath]) {
        showToast('访问路径已存在', 'error');
        pathInput.value = path;
        return;
      }
      customApis[newPath] = customApis[path];
      delete customApis[path];
      renderCustomApis();
    };

    remarkInput.onchange = () => {
      customApis[path].remark = remarkInput.value;
    };

    const picker = sourcePicker(entry.sources || []);
    picker.addEventListener('change', () => {
      customApis[path].sources = readSourcePicker(picker);
    });

    row.appendChild(pathInput);
    row.appendChild(remarkInput);
    row.appendChild(statusBtn);
    row.appendChild(delBtn);
    row.appendChild(picker);
    el.appendChild(row);
  });
}

function addCustomApi() {
  const pathInput = $('newCustomApiPath');
  const remarkInput = $('newCustomApiRemark');
  const path = pathInput.value.trim().replace(/^\\/+/, '');
  const remark = remarkInput.value.trim();
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(path) || ['admin', 'api', 'login', 'logout'].includes(path.toLowerCase())) {
    showToast('请输入有效的访问路径', 'error');
    return;
  }
  if (customApis[path]) {
    showToast('访问路径已存在', 'error');
    return;
  }
  customApis[path] = { enabled: true, remark, sources: getNewCustomApiSources() };
  pathInput.value = '';
  remarkInput.value = '';
  renderCustomApis();
  showToast('优选 API 创建成功', 'success');
}

async function saveCustomApis() {
  const response = await fetch('/api/custom-apis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customApis)
  });
  if (!response.ok) {
    showToast('优选 API 配置保存失败', 'error');
    return;
  }
  showToast('优选 API 配置已保存', 'success');
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
  const page = document.body.dataset.page || 'overview';
  const intro = $('pageIntro');
  const intros = {
    overview: '集中查看订阅聚合结果和节点状态。',
    subs: '管理优选订阅源，控制启用状态并维护备注。',
    apis: '管理额外 API 源，控制启用状态并维护备注。',
    manage: '统一管理优选订阅源和 API 源。',
    customApis: '创建并管理优选 API 的访问路径。',
    settings: '调整管理面板的界面显示设置。'
  };
  if (intro) intro.textContent = intros[page] || intros.overview;
  document.querySelectorAll('[data-nav-page]').forEach((link) => {
    const isActive = link.dataset.navPage === page;
    link.classList.toggle('active', isActive);
    if (isActive) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  // 缓存核心DOM元素
  nodesContainer = $('nodesContainer');
  paginationEl = $('pagination');
  nodesCountEl = $('nodesCount');

  $('themeSwitch')?.addEventListener('click', toggleTheme);
  $('logoutButton')?.addEventListener('click', logout);
  
  initTheme();
  if (page === 'subs') loadSubs();
  else if (page === 'apis') loadApis();
  else if (page === 'manage') {
    loadSubs();
    loadApis();
  }
  else if (page === 'customApis') loadCustomApis();
  else if (page === 'overview') loadCustomApis().then(() => fetchNodes());
});
</script>
</body>
</html>
`;
