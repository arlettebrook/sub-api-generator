export const adminStyle = `
  /* ========== 主题变量定义 ========== */
  :root {
    color-scheme: light;
    --bg-primary: #e8eef7;
    --bg-gradient: linear-gradient(160deg, #f8fbff 0%, #eef3fb 52%, #e5edf7 100%);
    --bg-secondary: rgba(255, 255, 255, 0.96);
    --bg-tertiary: #f4f7fb;
    --surface-solid: #ffffff;
    --text-primary: #0f172a;
    --text-secondary: #334155;
    --text-tertiary: #64748b;
    --border-color: #cbd5e1;
    --border-hover: #94a3b8;
    --accent-primary: #6366f1;
    --accent-hover: #4f46e5;
    --accent-gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    --accent-light: rgba(99, 102, 241, 0.12);
    --accent-border: rgba(79, 70, 229, 0.45);
    --success: #10b981;
    --success-hover: #059669;
    --danger: #ef4444;
    --danger-hover: #dc2626;
    --danger-light: rgba(239, 68, 68, 0.08);
    --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
    --shadow-md: 0 4px 18px rgba(15, 23, 42, 0.09);
    --shadow-lg: 0 14px 36px rgba(15, 23, 42, 0.13);
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 18px;
    --transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease, transform 0.2s ease;
  }

  .dark {
    color-scheme: dark;
    --bg-primary: #0b0f17;
    --bg-gradient: linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #0c1222 100%);
    --bg-secondary: rgba(17, 24, 39, 0.6);
    --bg-tertiary: #1e293b;
    --surface-solid: #111827;
    --text-primary: #f1f5f9;
    --text-secondary: #cbd5e1;
    --text-tertiary: #64748b;
    --border-color: rgba(51, 65, 85, 0.6);
    --border-hover: #475569;
    --accent-primary: #818cf8;
    --accent-hover: #6366f1;
    --accent-gradient: linear-gradient(135deg, #818cf8 0%, #a78bfa 100%);
    --accent-light: rgba(129, 140, 248, 0.18);
    --accent-border: rgba(129, 140, 248, 0.62);
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
    transition: background 0.25s ease, color 0.25s ease;
    min-height: 100vh;
    font-synthesis: none;
    -webkit-font-smoothing: antialiased;
  }

  /* 顶部标题栏 */
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 22px;
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

  .admin-nav .nav-label { overflow: hidden; text-overflow: ellipsis; }
  .admin-nav a.active::after { content: ''; position: absolute; left: 18%; right: 18%; bottom: 3px; height: 2px; border-radius: 999px; background: var(--accent-primary); }
  .page-load-indicator { position: fixed; inset: 0 0 auto; height: 2px; z-index: 10001; pointer-events: none; opacity: 0; background: var(--accent-gradient); transform: scaleX(0); transform-origin: left; }
  .page-load-indicator.active { opacity: 1; animation: page-load-progress 0.8s ease-out forwards; }
  @keyframes page-load-progress { to { transform: scaleX(.82); } }
  .page-navigating .card { opacity: .82; transition: opacity .15s ease; }

  .scroll-top-button {
    position: fixed;
    right: max(24px, env(safe-area-inset-right, 0px));
    bottom: max(24px, env(safe-area-inset-bottom, 0px));
    z-index: 1000;
    width: 48px;
    height: 48px;
    padding: 0;
    border-radius: 50%;
    border: 1px solid var(--border-hover);
    background: var(--surface-solid);
    color: var(--text-secondary);
    box-shadow: 0 8px 20px rgba(15, 23, 42, .2), inset 0 1px 0 rgba(255, 255, 255, .08);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transform: translateY(10px);
    transition: opacity .2s ease, transform .2s ease, visibility 0s linear .2s, box-shadow .2s ease, color .2s ease, background .2s ease, border-color .2s ease;
  }

  .scroll-top-button:hover {
    border-color: var(--accent-primary);
    background: var(--accent-primary);
    color: #fff;
    transform: translateY(-3px) scale(1.04);
    box-shadow: 0 12px 26px var(--accent-light), 0 4px 12px rgba(15, 23, 42, .18);
  }

  .scroll-top-button:active {
    transform: translateY(-1px) scale(.94);
    box-shadow: 0 5px 14px rgba(15, 23, 42, .2);
  }

  .scroll-top-button:focus-visible {
    outline: 3px solid var(--accent-light);
    outline-offset: 4px;
  }

  .scroll-top-button::after {
    content: attr(aria-label);
    position: absolute;
    right: calc(100% + 10px);
    top: 50%;
    padding: 5px 8px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--surface-solid);
    color: var(--text-primary);
    box-shadow: var(--shadow-sm);
    font-size: 12px;
    font-weight: 500;
    line-height: 1.2;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transform: translateY(-50%) translateX(4px);
    transition: opacity .16s ease, transform .16s ease;
  }

  .scroll-top-button:hover::after,
  .scroll-top-button:focus-visible::after {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }

  .scroll-top-button.is-visible {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translateY(0);
    transition-delay: 0s;
  }

  .scroll-top-button span {
    position: relative;
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
    transform: translateY(-1px);
  }

  @media (prefers-reduced-motion: reduce) {
    .scroll-top-button {
      transition: none;
      transform: none;
    }
    .scroll-top-button:hover,
    .scroll-top-button:active {
      transform: none;
    }
    .scroll-top-button::after {
      transition: none;
    }
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

  .setting-copy h4 {
    margin: 0;
    font-size: 15px;
    line-height: 1.35;
    color: var(--text-primary);
  }

  .setting-copy p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.55;
  }

  .setting-copy code {
    padding: 1px 5px;
    border: 1px solid var(--border-color);
    border-radius: 5px;
    background: var(--bg-secondary);
    color: var(--accent-primary);
    font-size: 12px;
  }

  .theme-mode-options {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .theme-mode-options label {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 42px;
    padding: 0 12px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    background: var(--bg-secondary);
    color: var(--text-secondary);
    cursor: pointer;
  }

  .theme-mode-options label:has(input:checked) {
    border-color: var(--accent-border);
    background: var(--accent-light);
    color: var(--accent-primary);
  }

  .theme-mode-options input {
    width: 16px;
    height: 16px;
    accent-color: var(--accent-primary);
  }

  .setting-block {
    display: grid;
    gap: 14px;
    padding: 16px 18px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
  }

  .setting-block-heading {
    position: relative;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding-left: 12px;
  }

  .setting-block-heading::before {
    position: absolute;
    top: 2px;
    bottom: 14px;
    left: 0;
    width: 3px;
    border-radius: 999px;
    background: var(--accent-gradient);
    content: '';
  }

  .settings-edit-button {
    justify-self: start;
    min-height: 36px;
  }

  .settings-dialog {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    width: min(760px, calc(100vw - 32px));
    height: min(760px, calc(100vh - 40px));
    max-height: min(760px, calc(100vh - 40px));
    margin: auto;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--border-hover);
    border-radius: var(--radius-lg);
    background: var(--surface-solid);
    color: var(--text-primary);
    box-shadow: var(--shadow-lg);
  }

  .settings-dialog:not([open]) {
    display: none;
  }

  .settings-dialog::backdrop {
    background: rgba(2, 6, 23, .72);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  html.settings-editor-scroll-locked,
  body.settings-editor-scroll-locked {
    overflow: hidden;
    overscroll-behavior: none;
  }

  .settings-dialog-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 18px 20px;
    border-bottom: 1px solid var(--border-color);
  }

  .settings-dialog-head h3 {
    margin: 0 0 4px;
  }

  .settings-dialog-kicker {
    display: block;
    margin-bottom: 4px;
    color: var(--accent-primary);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .settings-dialog-head p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 12px;
  }

  .settings-dialog-body {
    min-height: 0;
    max-height: none;
    padding: 18px 20px 20px;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
  }

  .settings-editor-section {
    min-width: 0;
  }

  .settings-editor-section + .settings-editor-section,
  .settings-editor-section + .filter-preview,
  .filter-preview + .settings-editor-more,
  .settings-editor-more + .settings-dialog-footer {
    margin-top: 18px;
  }

  .settings-editor-section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
  }

  .settings-editor-section-head strong {
    color: var(--text-primary);
    font-size: 14px;
  }

  .settings-editor-section-head span {
    margin-left: 8px;
    color: var(--text-tertiary);
    font-size: 12px;
  }

  .settings-editor-add-section {
    padding-bottom: 18px;
    border-bottom: 1px solid var(--border-color);
  }

  .settings-dialog-footer {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(170px, auto);
    align-items: center;
    gap: 12px;
    margin: 0;
    padding: 14px 20px 16px;
    border-top: 1px solid var(--border-color);
    background: var(--surface-solid);
  }

  .settings-dialog-footer .save-status {
    min-width: 0;
    margin: 0;
  }

  .settings-dialog-footer .btn-primary {
    width: 100%;
    min-width: 0;
  }

  .settings-editor-add {
    padding: 12px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
  }

  .settings-editor-add input {
    min-height: 40px;
    background: var(--bg-secondary);
  }

  .settings-editor-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto auto;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    padding: 8px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
  }

  .settings-editor-list {
    min-height: 48px;
    overscroll-behavior: contain;
    touch-action: pan-y;
    align-content: start;
    padding: 4px 0;
  }

  .settings-editor-preview {
    margin-top: 14px;
  }

  .settings-editor-footer {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .settings-editor-footer .save-status {
    grid-column: auto;
    justify-self: start;
    margin-right: 0;
  }

  .settings-editor-footer .btn-primary {
    grid-column: auto;
    width: auto;
    min-width: 150px;
  }

  .settings-editor-more {
    margin-top: 10px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
    overflow: hidden;
  }

  .settings-editor-more > summary,
  .settings-editor-preview-details > summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    min-height: 38px;
    padding: 0 12px;
    color: var(--text-secondary);
    cursor: pointer;
    list-style: none;
    user-select: none;
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }

  .settings-editor-more > summary:focus-visible,
  .settings-editor-preview-details > summary:focus-visible {
    box-shadow: inset 0 0 0 2px var(--accent-primary);
  }

  .settings-editor-more > summary:hover,
  .settings-editor-preview-details > summary:hover {
    background: color-mix(in srgb, var(--accent-light) 55%, transparent);
    color: var(--text-primary);
  }

  .settings-editor-more > summary small {
    margin-left: auto;
    color: var(--text-tertiary);
    font-size: 11px;
    font-weight: 400;
  }

  .settings-editor-more > summary::-webkit-details-marker,
  .settings-editor-preview-details > summary::-webkit-details-marker {
    display: none;
  }

  .settings-editor-more > summary::after,
  .settings-editor-preview-details > summary::after {
    content: '⌄';
    color: var(--text-tertiary);
    transition: transform .18s ease;
  }

  .settings-editor-more[open] > summary,
  .settings-editor-preview-details[open] > summary {
    border-bottom: 1px solid var(--border-color);
  }

  .settings-editor-more[open] > summary::after,
  .settings-editor-preview-details[open] > summary::after {
    transform: rotate(180deg);
  }

  .settings-editor-more-actions {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
    padding: 10px 12px 12px;
  }

  .settings-editor-more-actions > button {
    min-width: 0;
    width: 100%;
    white-space: nowrap;
  }

  .settings-editor-preview {
    padding: 0;
    border: 0;
    background: transparent;
  }

  .settings-editor-preview-details {
    border: 1px dashed var(--border-hover);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
  }

  .settings-editor-preview-details > summary strong {
    color: var(--text-primary);
  }

  .settings-editor-preview-details > summary span {
    margin-left: auto;
    color: var(--text-tertiary);
    font-size: 12px;
  }

  .settings-editor-preview-body {
    display: grid;
    gap: 10px;
    padding: 12px;
  }

  .blacklist-add-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .blacklist-add-row input {
    flex: 1;
    min-width: 0;
  }

  .rule-list-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto auto;
    align-items: center;
    gap: 8px;
    position: static;
    z-index: auto;
    padding: 8px;
    margin: 12px 0 10px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
    box-shadow: none;
    backdrop-filter: none;
  }

  .selection-count {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 0 8px;
    border: 1px solid var(--border-color);
    border-radius: 999px;
    background: var(--bg-secondary);
    flex: 0 0 auto;
    color: var(--text-tertiary);
    font-size: 12px;
    white-space: nowrap;
    justify-self: end;
  }

  .rule-search {
    display: flex;
    align-items: center;
    min-width: 0;
    width: 100%;
    height: 36px;
    padding: 0 10px;
    gap: 6px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
    color: var(--text-tertiary);
    overflow: hidden;
  }

  .rule-search input {
    width: 100%;
    height: 34px;
    padding: 0;
    border: 0;
    outline: 0;
    background: transparent;
    box-shadow: none;
  }

  .rule-search input:focus {
    border-color: transparent;
    box-shadow: none;
    background: transparent;
  }

  .rule-search:focus-within {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 4px var(--accent-light);
  }

  .rule-list-toolbar > button {
    height: 34px;
    padding: 0 9px;
    font-size: 12px;
    white-space: nowrap;
    width: auto;
    min-width: 0;
  }

  .blacklist-row .rule-select {
    flex: 0 0 auto;
    width: 16px !important;
    height: 16px !important;
    padding: 0 !important;
    accent-color: var(--accent-primary);
  }

  .filter-rule-presets {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 10px;
    color: var(--text-tertiary);
    font-size: 12px;
  }

  .rule-preset {
    height: 28px;
    padding: 0 9px;
    border: 1px solid var(--border-color);
    border-radius: 999px;
    background: var(--bg-secondary);
    color: var(--text-secondary);
    font-size: 12px;
  }

  .rule-preset:hover,
  .rule-preset:focus-visible {
    border-color: var(--accent-border);
    background: var(--accent-light);
    color: var(--accent-primary);
    box-shadow: none;
    transform: none;
  }

  .filter-preview {
    display: grid;
    gap: 8px;
    padding: 12px;
    border: 1px dashed var(--border-hover);
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
  }

  .filter-preview-heading,
  .filter-preview-result {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 12px;
  }

  .filter-preview-heading strong {
    color: var(--text-primary);
    font-size: 13px;
  }

  .filter-preview-heading span,
  .filter-preview-result span {
    color: var(--text-tertiary);
    font-size: 12px;
  }

  .filter-preview input {
    width: 100%;
  }

  .filter-preview-result code {
    max-width: 100%;
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--success);
    font-size: 13px;
  }

  .blacklist-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .blacklist-list.is-large {
    align-content: start;
    padding: 4px 0;
  }

  .rule-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding-top: 4px;
    color: var(--text-tertiary);
    font-size: 12px;
  }

  .rule-pagination[hidden] {
    display: none;
  }

  .rule-pagination button {
    height: 32px;
    padding: 0 10px;
    font-size: 12px;
  }

  .rule-import-dialog {
    width: min(440px, calc(100vw - 32px));
  }

  .import-preview-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    margin: 12px 0 4px;
  }

  .import-preview-stats span {
    display: grid;
    gap: 2px;
    padding: 9px 6px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    background: var(--bg-tertiary);
    color: var(--text-tertiary);
    text-align: center;
    font-size: 11px;
  }

  .import-preview-stats strong {
    color: var(--text-primary);
    font-size: 16px;
  }

  .blacklist-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .blacklist-row input {
    flex: 1;
    min-width: 0;
    height: 36px;
  }

  .blacklist-row .del-btn {
    opacity: 1;
    pointer-events: auto;
    height: 32px;
    padding: 0 10px;
  }

  .blacklist-empty {
    padding: 18px 10px;
    border: 1px dashed var(--border-hover);
    border-radius: var(--radius-md);
    color: var(--text-tertiary);
    text-align: center;
    font-size: 13px;
  }

  .blacklist-empty[hidden] {
    display: none;
  }

  .blacklist-toolbar {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    align-items: stretch;
    gap: 10px;
    padding-top: 4px;
  }

  .blacklist-toolbar > button,
  .blacklist-toolbar > span {
    min-width: 0;
    width: 100%;
    white-space: nowrap;
  }

  .blacklist-toolbar .setting-tool-button { order: 1; }
  .blacklist-toolbar .save-status { order: 2; grid-column: span 2; }
  .blacklist-toolbar .setting-undo-button { order: 3; }
  .blacklist-toolbar .setting-reset-button { order: 4; }
  .blacklist-toolbar .setting-batch-delete { order: 5; grid-column: span 2; }
  .blacklist-toolbar .btn-primary { order: 6; grid-column: span 2; }

  .blacklist-toolbar .save-status { margin-right: 0; }

  .settings-dialog-footer.blacklist-toolbar {
    grid-template-columns: minmax(0, 1fr) minmax(170px, auto);
    align-items: center;
    gap: 12px;
    padding-top: 14px;
  }

  .settings-dialog-footer.blacklist-toolbar .save-status,
  .settings-dialog-footer.blacklist-toolbar .btn-primary {
    order: initial;
    grid-column: auto;
  }

  .setting-add-button {
    flex: 0 0 auto;
  }

  .btn-subtle {
    border-color: var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-tertiary);
  }

  .btn-subtle:hover,
  .btn-subtle:focus-visible {
    border-color: var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-secondary);
    box-shadow: none;
  }

  .setting-tool-button {
    height: 34px;
    padding: 0 10px;
    font-size: 13px;
    border-color: var(--border-color);
  }

  .blacklist-toolbar .btn-primary {
    min-width: 138px;
    font-weight: 600;
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

  .source-picker-head {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 24px;
    min-width: 0;
    flex-wrap: wrap;
  }

  .source-picker-head .source-count {
    color: var(--text-tertiary);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  .source-mode-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .source-mode-action {
    height: 30px;
    padding: 0 10px;
    border: 1px solid var(--border-color);
    border-radius: 7px;
    background: transparent;
    color: var(--text-secondary);
    font-size: 12px;
    white-space: nowrap;
  }

  .source-mode-action:hover,
  .source-mode-action.active {
    border-color: var(--accent-primary);
    background: var(--accent-light);
    color: var(--accent-primary);
    box-shadow: none;
    transform: none;
  }

  .source-actions {
    display: flex;
    gap: 4px;
    margin-left: auto;
    min-width: 0;
    flex-wrap: wrap;
  }

  .source-action {
    height: 28px;
    padding: 0 8px;
    border: 0;
    background: transparent;
    color: var(--accent-primary);
    font-size: 12px;
    white-space: nowrap;
  }

  .source-action:hover {
    transform: none;
    box-shadow: none;
    background: var(--accent-light);
    color: var(--accent-hover);
  }

  .source-search {
    width: 100%;
    min-width: 0;
    height: 34px;
    font-size: 13px;
  }

  .source-options {
    max-height: 180px;
    overflow: auto;
    padding: 2px;
  }

  .source-option {
    min-height: 30px;
    padding: 4px 6px;
    border-radius: 6px;
  }

  .source-option:hover {
    background: var(--bg-secondary);
  }

  .source-empty {
    width: 100%;
    padding: 10px 4px;
    color: var(--text-tertiary);
    font-size: 13px;
  }

  .source-load-status,
  .source-error-notice,
  .data-source-error {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    max-width: 100%;
    flex-wrap: wrap;
    padding: 10px 12px;
    border: 1px solid rgba(245, 158, 11, 0.35);
    border-radius: var(--radius-md);
    background: rgba(245, 158, 11, 0.08);
    color: #b45309;
    font-size: 13px;
  }

  .source-load-status[hidden],
  .source-error-notice[hidden] {
    display: none;
  }

  .source-load-status strong,
  .source-error-notice strong {
    color: #92400e;
    max-width: 100%;
  }

  .source-load-status ul,
  .source-error-notice ul {
    display: grid;
    gap: 2px;
    min-width: 0;
    margin: 0;
    padding-left: 18px;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .source-load-status button,
  .source-error-notice button {
    flex-shrink: 0;
    margin-left: auto;
    height: 30px;
    padding: 0 10px;
    color: #92400e;
    border-color: rgba(180, 83, 9, 0.35);
    background: transparent;
  }

  .data-source-error {
    justify-content: space-between;
    color: var(--danger);
    border-color: rgba(239, 68, 68, 0.28);
    background: var(--danger-light);
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .data-source-error button {
    height: 30px;
    padding: 0 12px;
  }

  .section-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
  }

  .section-heading h3 {
    margin-bottom: 3px;
  }

  .section-caption {
    color: var(--text-secondary);
    font-size: 13px;
  }

  .section-summary {
    flex-shrink: 0;
    padding: 5px 10px;
    border-radius: 999px;
    background: var(--accent-light);
    color: var(--accent-primary);
    font-size: 12px;
    font-weight: 600;
  }

  .section-heading-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
  }

  .custom-api-dialog {
    width: min(920px, calc(100vw - 32px));
    max-height: calc(100vh - 48px);
    margin: auto;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--border-hover);
    border-radius: var(--radius-lg);
    background: var(--surface-solid);
    color: var(--text-primary);
    box-shadow: var(--shadow-lg);
  }

  .custom-api-dialog[open] {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
  }

  .custom-api-dialog .custom-api-create {
    overscroll-behavior: contain;
  }

  .custom-api-dialog::backdrop {
    background: rgba(2, 6, 23, 0.72);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  .confirm-dialog {
    width: min(420px, calc(100vw - 32px));
    margin: auto;
    padding: 24px;
    border: 1px solid var(--border-hover);
    border-radius: var(--radius-lg);
    background: var(--surface-solid);
    color: var(--text-primary);
    box-shadow: var(--shadow-lg);
    text-align: center;
  }

  .confirm-dialog::backdrop {
    background: rgba(2, 6, 23, 0.66);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
  }

  .confirm-dialog-icon {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    margin: 0 auto 12px;
    border: 1px solid rgba(239, 68, 68, 0.42);
    border-radius: 50%;
    background: var(--danger-light);
    color: var(--danger);
    font-size: 24px;
    font-weight: 800;
  }

  .confirm-dialog h3 {
    justify-content: center;
    margin-bottom: 8px;
    font-size: 17px;
  }

  .confirm-dialog p {
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.6;
  }

  .confirm-dialog-actions {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-top: 20px;
  }

  .btn-danger {
    border-color: rgba(239, 68, 68, 0.55);
    background: var(--danger);
    color: #fff;
  }

  .btn-danger:hover {
    border-color: var(--danger-hover);
    background: var(--danger-hover);
    color: #fff;
    box-shadow: 0 6px 20px rgba(239, 68, 68, 0.2);
  }

  .custom-api-dialog-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 20px;
    border-bottom: 1px solid var(--border-color);
  }

  .custom-api-dialog-head h3 {
    margin: 0;
    text-align: left;
  }

  .dialog-close {
    width: 34px;
    height: 34px;
    flex: 0 0 34px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--text-secondary);
    font-size: 24px;
    line-height: 1;
  }

  .dialog-close:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    box-shadow: none;
    transform: none;
  }

  .custom-api-create {
    padding: 16px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
  }

  .custom-api-dialog .custom-api-create {
    overflow: auto;
    border: 0;
    border-radius: 0;
    background: transparent;
    min-width: 0;
  }

  .custom-api-dialog .form-field input {
    min-width: 0;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
    gap: 12px;
    min-width: 0;
  }

  .form-field {
    display: grid;
    align-content: start;
    align-self: start;
    gap: 6px;
    min-width: 0;
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 600;
  }

  .form-field input {
    width: 100%;
  }

  .form-field small {
    color: var(--text-tertiary);
    font-size: 11px;
    font-weight: 400;
  }

  .form-field small.input-hint.error {
    color: var(--danger);
  }

  .inline-error {
    display: block;
    margin-top: 2px;
    color: var(--danger);
    font-size: 11px;
    font-weight: 500;
    line-height: 1.4;
  }

  .inline-error[hidden] {
    display: none;
  }

  input.has-error,
  input[aria-invalid="true"] {
    border-color: var(--danger);
  }

  input.has-error:focus,
  input[aria-invalid="true"]:focus {
    box-shadow: 0 0 0 4px var(--danger-light);
  }

  .path-input {
    display: flex;
    align-items: center;
    height: 40px;
    min-width: 0;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
    overflow: hidden;
  }

  .path-input b {
    flex: 0 0 auto;
    padding-left: 13px;
    color: var(--text-tertiary);
    font-size: 16px;
    font-weight: 500;
  }

  .path-input input {
    flex: 1 1 auto;
    min-width: 0;
    height: 38px;
    border: 0;
    box-shadow: none;
    background: transparent;
  }

  .path-input:focus-within {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 4px var(--accent-light);
  }

  .create-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
    position: sticky;
    bottom: 0;
    z-index: 2;
    padding: 12px 0 max(4px, env(safe-area-inset-bottom, 0px));
    background: var(--surface-solid);
    border-top: 1px solid var(--border-color);
  }

  .custom-api-toolbar {
    justify-content: flex-end;
    margin-top: 16px;
    padding-bottom: 16px;
  }

  .save-status {
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    padding: 0 9px;
    border: 1px solid rgba(16, 185, 129, 0.2);
    border-radius: 999px;
    background: rgba(16, 185, 129, 0.08);
    margin-right: auto;
    color: var(--success);
    font-size: 13px;
    white-space: nowrap;
  }

  .save-status.dirty {
    border-color: var(--accent-border);
    background: var(--accent-light);
    color: var(--accent-primary);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .custom-api-row {
    align-items: center;
    padding: 16px;
    gap: 12px;
  }

  .custom-api-row:hover {
    border-color: var(--border-hover);
  }

  .custom-api-row-main {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(220px, 1.1fr);
    align-items: center;
    gap: 10px;
    width: 100%;
  }

  .custom-api-identity {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .custom-api-row-title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-primary);
    font-size: 14px;
  }

  .custom-api-row-path {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-tertiary);
    font-size: 12px;
  }

  .custom-api-source-summary {
    color: var(--text-tertiary);
    font-size: 11px;
  }

  .form-field.compact {
    min-width: 0;
  }

  .custom-api-url {
    align-self: center;
    min-width: 0;
    padding: 10px 12px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .custom-api-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .custom-api-switch {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 34px;
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    user-select: none;
  }

  .custom-api-switch input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  .custom-api-switch-track {
    position: relative;
    width: 42px;
    height: 24px;
    border: 1px solid var(--border-hover);
    border-radius: 999px;
    background: var(--bg-secondary);
    transition: var(--transition);
  }

  .custom-api-switch-track::after {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--text-tertiary);
    content: '';
    transition: var(--transition);
  }

  .custom-api-switch input:checked + .custom-api-switch-track {
    border-color: var(--success);
    background: rgba(16, 185, 129, 0.2);
  }

  .custom-api-switch input:checked + .custom-api-switch-track::after {
    left: 21px;
    background: var(--success);
  }

  .custom-api-switch input:focus-visible + .custom-api-switch-track {
    outline: 3px solid var(--accent-light);
    outline-offset: 2px;
  }

  .custom-api-switch-text {
    min-width: 24px;
  }

  .custom-api-row .custom-api-actions .custom-api-delete {
    opacity: 1;
    pointer-events: auto;
    flex: 0 0 auto;
    min-width: 76px;
    justify-content: center;
    border-color: rgba(239, 68, 68, .5);
    background: rgba(239, 68, 68, .06);
  }

  .custom-api-row .custom-api-actions .custom-api-delete:hover {
    background: var(--danger-light);
    border-color: var(--danger);
    color: var(--danger);
    transform: none;
    box-shadow: none;
  }

  .icon-action {
    height: 34px;
    padding: 0 10px;
    white-space: nowrap;
    font-size: 12px;
  }

  .custom-api-row .source-picker {
    flex: 1 1 100%;
    margin: 0;
  }

  .custom-api-edit-url {
    min-width: 0;
    margin-top: 12px;
    padding: 9px 12px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .custom-api-edit-dialog .source-picker {
    margin-top: 16px;
  }

  .custom-api-dialog .source-picker,
  .custom-api-dialog .source-search,
  .custom-api-dialog .form-field,
  .custom-api-dialog .form-field input {
    min-width: 0;
    max-width: 100%;
  }

  .row.custom-api-row .custom-api-delete,
  .row.custom-api-row .custom-api-delete:hover {
    opacity: 1;
    pointer-events: auto;
    border: 1px solid rgba(239, 68, 68, 0.55);
    background: var(--danger-light);
    color: var(--danger);
  }

  .row.custom-api-row .custom-api-delete:hover {
    border-color: var(--danger);
    background: rgba(239, 68, 68, 0.16);
    color: var(--danger-hover);
    transform: none;
    box-shadow: none;
  }

  .custom-api-empty {
    display: grid;
    gap: 4px;
    justify-items: center;
    padding: 32px 16px;
    border: 1px dashed var(--border-hover);
    border-radius: var(--radius-md);
    color: var(--text-tertiary);
    font-size: 13px;
  }

  .custom-api-empty strong {
    color: var(--text-secondary);
    font-size: 14px;
  }

  .source-picker-title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 600;
  }

  .source-options {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    align-items: start;
  }

  .source-group-title {
    flex: 0 0 100%;
    padding: 6px 4px 2px;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-tertiary);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .source-option {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    overflow: hidden;
    color: var(--text-primary);
    font-size: 13px;
  }

  .source-option span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .source-option-name {
    min-width: 0;
  }

  .source-action.active {
    border-radius: 6px;
    background: var(--accent-light);
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
    letter-spacing: 0;
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
    content: '◐';
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
    content: '🌙';
    left: calc(100% - 25px);
  }

  html[data-theme-mode="light"] .theme-switch::before {
    content: '☀️';
    left: calc(100% - 25px);
  }

  html[data-theme-mode="system"] .theme-switch::before {
    content: '◐';
    left: 3px;
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
    border-color: var(--accent-border);
    color: #ffffff;
  }

  .btn-primary:hover {
    color: #ffffff;
    box-shadow: 0 6px 20px var(--accent-light);
    filter: brightness(1.05);
  }

  /* 优选 API 行内编辑按钮：亮色主题聚焦时保持文字和填充可见。 */
  .custom-api-actions .icon-action.btn-primary,
  .custom-api-actions .icon-action.btn-primary:hover,
  .custom-api-actions .icon-action.btn-primary:focus,
  .custom-api-actions .icon-action.btn-primary:focus-visible {
    display: inline-flex;
    visibility: visible;
    opacity: 1;
    color: #ffffff;
    -webkit-text-fill-color: #ffffff;
    background: var(--accent-gradient);
    border-color: var(--accent-border);
    text-indent: 0;
  }

  .custom-api-actions .icon-action.btn-primary:focus-visible {
    outline: 3px solid var(--accent-light);
    outline-offset: 2px;
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

  /* 卡片容器 */
  .card {
    position: relative;
    background: var(--surface-solid);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 28px;
    margin-bottom: 24px;
    box-shadow: var(--shadow-md);
    transition: var(--transition);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  .card > h3 {
    position: relative;
    margin: -2px 0 22px;
    padding-bottom: 15px;
    border-bottom: 1px solid var(--border-color);
  }

  .card > h3::after {
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 42px;
    height: 2px;
    border-radius: 999px;
    background: var(--accent-gradient);
    content: '';
  }

  .management-panel {
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
  }

  .management-panel > summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 52px;
    padding: 0 16px;
    cursor: pointer;
    list-style: none;
    user-select: none;
  }

  .management-panel > summary::-webkit-details-marker {
    display: none;
  }

  .management-panel > summary::after {
    content: '⌄';
    color: var(--text-tertiary);
    font-size: 20px;
    transition: transform .18s ease;
  }

  .management-panel[open] > summary {
    border-bottom: 1px solid var(--border-color);
  }

  .management-panel[open] > summary::after {
    transform: rotate(180deg);
  }

  .management-panel > summary h3 {
    margin: 0;
    padding: 0;
    border: 0;
  }

  .management-panel > summary h3::after {
    display: none;
  }

  .management-panel-body {
    padding: 18px 16px 4px;
  }

  .card > .section-heading {
    margin: -2px 0 22px;
    padding-bottom: 15px;
    border-bottom: 1px solid var(--border-color);
  }

  .card > .section-heading h3 {
    margin-bottom: 0;
  }

  #subsList,
  #apisList,
  #customApisList {
    display: grid;
    gap: 8px;
  }

  #subsList .row,
  #apisList .row,
  #customApisList .row {
    margin-bottom: 0;
    border-color: var(--border-color);
    background: var(--bg-tertiary);
  }

  .source-check-button {
    white-space: nowrap;
  }

  .source-view-button {
    white-space: nowrap;
  }

  .source-download-button {
    white-space: nowrap;
  }

  .row .source-check-button,
  .row .source-view-button,
  .row .source-download-button {
    min-height: 34px;
    padding: 0 10px;
  }

  .preview-view-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0;
    margin-left: auto;
  }

  .preview-view-toggle .btn-subtle {
    min-height: 32px;
    padding: 0 10px;
    border-radius: 0;
  }

  .preview-view-toggle .btn-subtle:first-child {
    border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  }

  .preview-view-toggle .btn-subtle:last-child {
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    margin-left: -1px;
  }

  .preview-view-toggle .btn-subtle.active {
    border-color: var(--accent-primary);
    background: var(--accent-light);
    color: var(--accent-primary);
    font-weight: 600;
  }

  .preview-api-data {
    min-height: 180px;
    max-height: min(62vh, 680px);
    margin: 0;
    padding: 14px 16px;
    overflow: auto;
    /* 到达数据边界后允许滚轮自然传递给页面，避免鼠标停留在数据区时页面无法继续滚动。 */
    overscroll-behavior: auto;
    scrollbar-gutter: stable;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    font: 13px/1.65 'SF Mono', Monaco, 'Cascadia Code', monospace;
    white-space: pre;
    overflow-wrap: normal;
  }

  .preview-api-data-wrap {
    position: relative;
  }

  .preview-api-top-button {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 2;
    min-height: 34px;
    padding: 0 10px;
    border-color: var(--border-hover);
    background: var(--surface-solid);
    background: color-mix(in srgb, var(--surface-solid) 88%, transparent);
    color: var(--text-secondary);
    box-shadow: var(--shadow-sm);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transform: translate3d(0, -8px, 0) scale(.96);
    transform-origin: top right;
    transition: opacity .18s ease, transform .18s ease, visibility 0s linear .18s;
  }

  .preview-api-top-button.is-visible {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translate3d(0, 0, 0) scale(1);
    transition-delay: 0s;
  }

  @media (prefers-reduced-motion: reduce) {
    .preview-api-top-button {
      transition: none;
      transform: none;
    }
  }

  .preview-data-status {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 14px;
    margin: -4px 0 12px;
    color: var(--text-tertiary);
    font-size: 12px;
  }

  .preview-data-status span + span::before {
    content: '·';
    margin-right: 14px;
    color: var(--border-hover);
  }

  .source-raw-dialog {
    width: min(960px, calc(100vw - 32px));
    max-height: calc(100vh - 48px);
    margin: auto;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--border-hover);
    border-radius: var(--radius-lg);
    background: var(--surface-solid);
    color: var(--text-primary);
    box-shadow: var(--shadow-lg);
    overscroll-behavior: contain;
  }

  .source-raw-dialog::backdrop {
    background: rgba(2, 6, 23, 0.72);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  .source-raw-history-dialog {
    width: min(760px, calc(100vw - 32px));
  }

  .source-raw-dialog-subtitle {
    margin: 4px 0 0;
    color: var(--text-tertiary);
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .source-raw-body {
    display: grid;
    gap: 14px;
    max-height: calc(100vh - 132px);
    padding: 16px;
    overflow: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }

  html.source-raw-scroll-locked,
  body.source-raw-scroll-locked {
    overflow: hidden;
    overscroll-behavior: none;
  }

  .source-raw-summary {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
  }

  .source-raw-process {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    color: var(--text-tertiary);
    font-size: 11px;
  }

  .source-raw-cache-status {
    padding: 8px 10px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
    color: var(--text-tertiary);
    font-size: 11px;
  }

  .source-raw-cache-status.is-checking {
    border-color: color-mix(in srgb, var(--accent-primary) 45%, var(--border-color));
    color: var(--accent-primary);
  }

  .source-raw-cache-status.is-warning {
    border-color: color-mix(in srgb, var(--danger) 45%, var(--border-color));
    background: var(--danger-light);
    color: var(--danger);
  }

  .source-raw-history {
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
  }

  .source-raw-history summary {
    padding: 8px 10px;
    cursor: pointer;
    color: var(--text-secondary);
    font-size: 12px;
  }

  .source-raw-history-list {
    display: grid;
    gap: 6px;
    padding: 0 10px 10px;
  }

  .source-raw-history-item {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    color: var(--text-tertiary);
    font-size: 11px;
  }

  .source-raw-history-item span {
    text-align: right;
  }

  .source-raw-history-view {
    flex: 0 0 auto;
    min-height: 24px;
    padding: 0 7px;
    border: 1px solid var(--border-hover);
    border-radius: var(--radius-sm);
    background: var(--surface-solid);
    color: var(--accent-primary);
    font-size: 11px;
  }

  .source-raw-history-view:hover,
  .source-raw-history-view:focus-visible {
    border-color: var(--accent-primary);
    background: var(--accent-light);
  }

  #sourceRawHistoryDialogContent {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .source-raw-process span {
    padding: 5px 8px;
    border: 1px solid var(--border-color);
    border-radius: 999px;
    background: var(--bg-secondary);
  }

  .source-raw-process b {
    margin-right: 4px;
    color: var(--text-primary);
  }

  .source-raw-metric {
    display: grid;
    gap: 3px;
    min-width: 0;
    padding: 10px 12px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
  }

  .source-raw-metric strong {
    overflow: hidden;
    color: var(--text-primary);
    font-size: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .source-raw-metric span,
  .source-raw-result-count {
    color: var(--text-tertiary);
    font-size: 11px;
  }

  .source-raw-metric-success strong { color: var(--success); }
  .source-raw-metric-error strong,
  .source-raw-metric-network-error strong,
  .source-raw-metric-http-error strong,
  .source-raw-metric-timeout strong { color: var(--danger); }

  .source-raw-error {
    grid-column: 1 / -1;
    padding: 10px 12px;
    border: 1px solid rgba(239, 68, 68, 0.25);
    border-radius: var(--radius-md);
    background: var(--danger-light);
    color: var(--danger);
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .source-raw-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .source-raw-group-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .source-raw-group-controls select {
    min-width: 180px;
    height: 34px;
  }

  .source-raw-group-controls .source-raw-source-sort {
    min-width: 128px;
  }

  .source-raw-group-controls .btn-subtle {
    height: 34px;
    padding: 0 9px;
    font-size: 12px;
    border-color: var(--border-hover);
    background: var(--surface-solid);
    color: var(--text-secondary);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--border-hover) 22%, transparent);
  }

  .source-raw-group-controls .btn-subtle:hover,
  .source-raw-group-controls .btn-subtle:focus-visible {
    border-color: var(--accent-primary);
    background: var(--bg-secondary);
    color: var(--text-primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-primary) 22%, transparent);
  }

  .source-raw-tabs {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid var(--border-color);
  }

  .source-raw-tab {
    height: 34px;
    padding: 0 12px;
    border: 0;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    background: transparent;
    color: var(--text-tertiary);
    font-size: 12px;
  }

  .source-raw-tab.active {
    border-bottom-color: var(--accent-primary);
    color: var(--accent-primary);
    font-weight: 700;
  }

  .source-raw-tab:hover {
    background: var(--accent-light);
    box-shadow: none;
    transform: none;
  }

  .source-raw-search {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    height: 36px;
    padding: 0 10px;
    gap: 6px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
    color: var(--text-tertiary);
  }

  .source-raw-search input {
    width: 100%;
    height: 34px;
    padding: 0;
    border: 0;
    outline: 0;
    background: transparent;
    box-shadow: none;
  }

  .source-raw-search:focus-within {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 4px var(--accent-light);
  }

  .source-raw-section {
    display: grid;
    gap: 8px;
    min-width: 0;
  }

  .source-raw-section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .source-raw-section-heading h4 {
    margin: 0;
    font-size: 13px;
  }

  .source-raw-status {
    color: var(--text-tertiary);
    font-size: 12px;
  }

  .source-raw-code {
    min-height: 72px;
    max-height: 220px;
    margin: 0;
    padding: 12px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    font: 12px/1.65 'SF Mono', Monaco, 'Cascadia Code', monospace;
    white-space: pre-wrap;
    overflow: auto;
    overscroll-behavior: contain;
    overflow-wrap: anywhere;
  }

  .source-raw-content {
    min-height: 180px;
    max-height: min(52vh, 520px);
    overflow-y: auto;
    white-space: normal;
  }

  #sourceRawRawContent {
    white-space: normal;
  }

  .source-raw-node-line {
    display: grid;
    align-content: center;
    gap: 2px;
    min-height: 30px;
    padding: 6px 0;
    border-bottom: 1px solid color-mix(in srgb, var(--border-color) 60%, transparent);
    color: var(--text-secondary);
    white-space: pre;
    overflow: hidden;
    box-sizing: border-box;
  }

  .source-raw-source-group {
    margin-bottom: 14px;
    padding: 10px 12px 4px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--bg-tertiary) 78%, transparent);
  }

  .source-raw-source-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-width: 0;
    padding: 0;
    border: 0;
    background: transparent;
    gap: 10px;
    color: var(--text-primary);
    font-size: 13px;
    cursor: pointer;
    text-align: left;
    user-select: none;
  }

  .source-raw-source-heading-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 34px;
    min-width: 0;
  }

  .source-raw-source-heading-row .source-raw-source-heading {
    flex: 1 1 auto;
  }

  .source-raw-source-retry {
    flex: 0 0 auto;
    min-height: 28px;
    padding: 0 8px;
    border: 1px solid var(--danger);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--danger);
    font-size: 11px;
  }

  .source-raw-source-retry:hover {
    background: var(--danger-light);
    box-shadow: none;
    transform: none;
  }

  .source-raw-source-heading:hover {
    background: transparent;
    box-shadow: none;
    transform: none;
  }

  .source-raw-source-header {
    border-radius: var(--radius-sm);
    cursor: pointer;
  }

  .source-raw-source-header:hover {
    background: color-mix(in srgb, var(--accent-light) 55%, transparent);
  }

  .source-raw-source-heading::before {
    content: '▾';
    flex: 0 0 12px;
    color: var(--text-tertiary);
    font-size: 12px;
    text-align: center;
  }

  .source-raw-source-group.is-collapsed .source-raw-source-heading::before {
    content: '▸';
  }

  .source-raw-source-heading strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .source-raw-source-heading:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  .source-raw-source-heading span {
    flex: 0 0 auto;
    color: var(--text-tertiary);
    font-size: 11px;
  }

  .source-raw-source-detail {
    display: -webkit-box;
    min-width: 0;
    margin: 0;
    color: var(--text-tertiary);
    font-size: 11px;
    line-height: 1.45;
    overflow-wrap: anywhere;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .source-raw-source-detail-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin: 4px 0 2px 18px;
    min-width: 0;
  }

  .source-raw-source-copy {
    flex: 0 0 auto;
    min-height: 26px;
    padding: 0 7px;
    border: 0;
    background: transparent;
    color: var(--accent-primary);
    font-size: 11px;
  }

  .source-raw-source-copy:hover {
    background: var(--accent-light);
    box-shadow: none;
    transform: none;
  }

  .source-raw-source-stats {
    display: block;
    margin: 0 0 6px 18px;
    color: var(--text-tertiary);
    font-size: 11px;
  }

  .source-raw-source-error {
    flex: 1 1 auto;
    color: var(--danger);
    font-size: 11px;
    font-style: normal;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .source-raw-source-group.is-collapsed .source-raw-source-detail-row,
  .source-raw-source-group.is-collapsed .source-raw-source-stats {
    display: none;
  }

  .source-raw-source-group .source-raw-node-line:last-child {
    border-bottom: 0;
  }

  .source-raw-node-value,
  .source-raw-node-source {
    overflow-wrap: anywhere;
    white-space: normal;
  }

  .source-raw-node-source {
    color: var(--text-tertiary);
    font-size: 11px;
    line-height: 1.2;
  }

  .source-raw-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding-top: 2px;
  }

  .source-raw-result-count {
    margin-right: auto;
  }

  .source-raw-auto-refresh {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: var(--text-tertiary);
    font-size: 11px;
    white-space: nowrap;
  }

  .source-raw-auto-refresh input {
    width: 15px;
    height: 15px;
  }

  .source-raw-auto-refresh select {
    width: auto;
    height: 30px;
    padding: 0 6px;
    font-size: 11px;
  }

  #subsList .row:nth-child(even),
  #apisList .row:nth-child(even),
  #customApisList .row:nth-child(even) {
    background: var(--bg-secondary);
  }

  .setting-block {
    background: var(--bg-tertiary);
    box-shadow: var(--shadow-sm);
  }

  .setting-block-heading {
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color);
  }

  .card:hover {
    border-color: var(--border-hover);
    box-shadow: var(--shadow-lg);
    transform: none;
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

  input:not([type="checkbox"]):not([type="radio"]):focus-visible,
  select:focus-visible,
  textarea:focus-visible {
    outline: none;
  }

  /* 路径输入框由外层容器统一绘制焦点状态，避免出现双重边框和阴影。 */
  .path-input input:focus {
    border-color: transparent;
    box-shadow: none;
    background: transparent;
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
  .row .host-input { min-width: 180px; text-overflow: ellipsis; }
  .copy-source-button { flex: 0 0 auto; width: 30px; height: 30px; padding: 0; color: var(--text-secondary); }

  .row input:hover {
    border-color: var(--border-color);
    background: var(--bg-tertiary);
  }

  .row input:focus {
    border-color: var(--accent-primary);
    background: var(--bg-secondary);
  }

  .source-health {
    display: grid;
    gap: 1px;
    align-items: center;
    min-height: 28px;
    max-width: min(100%, 280px);
    padding: 0 9px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    font-size: 11px;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: normal;
    line-height: 1.25;
  }
  .source-health strong { font-size: 11px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; }
  .source-health small { color: var(--text-tertiary); font-size: 10px; overflow: hidden; text-overflow: ellipsis; }
  .source-health-error-detail { color: var(--danger) !important; max-width: 320px; }

  .source-health-success {
    border-color: rgba(16, 185, 129, 0.35);
    color: var(--success);
  }

  .source-health-checking {
    border-color: rgba(99, 102, 241, 0.35);
    color: var(--accent-primary);
  }

  .source-health-filtered,
  .source-health-empty {
    border-color: rgba(245, 158, 11, 0.35);
    color: #d97706;
  }

  .dark .source-health-filtered,
  .dark .source-health-empty {
    color: #fbbf24;
  }

  .source-health-timeout,
  .source-health-http-error,
  .source-health-network-error,
  .source-health-error {
    max-width: min(100%, 360px);
    border-color: rgba(239, 68, 68, 0.35);
    color: var(--danger);
  }

  .source-status-summary {
    display: grid;
    gap: 12px;
    margin: -4px 0 18px;
    padding: 14px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
  }

  .source-status-panel {
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
  }

  .source-status-panel > summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 70px;
    padding: 16px 20px;
    cursor: pointer;
    list-style: none;
    user-select: none;
  }

  .source-status-panel > summary::-webkit-details-marker {
    display: none;
  }

  .source-status-panel > summary::after {
    content: '⌄';
    color: var(--text-tertiary);
    font-size: 20px;
    transition: transform .18s ease;
  }

  .source-status-panel[open] > summary {
    border-bottom: 1px solid var(--border-color);
  }

  .source-status-panel[open] > summary::after {
    transform: rotate(180deg);
  }

  .source-status-panel h3 {
    margin: 0 0 4px;
  }

  .source-status-panel .section-caption {
    margin: 0;
  }

  .source-status-panel-body {
    padding: 16px 20px 20px;
  }

  .source-status-actions {
    justify-content: flex-end;
    margin-bottom: 14px;
  }

  .source-status-summary-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .source-status-summary-head strong {
    color: var(--text-primary);
    font-size: 14px;
  }

  .source-status-summary-head span {
    color: var(--text-tertiary);
    font-size: 11px;
  }

  .source-status-metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  .source-status-metric {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
    padding: 9px 10px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    background: var(--bg-secondary);
  }

  .source-status-metric b {
    font-size: 18px;
    line-height: 1;
  }

  .source-status-metric span {
    color: var(--text-secondary);
    font-size: 11px;
    white-space: nowrap;
  }

  .source-status-metric-success b { color: var(--success); }
  .source-status-metric-filtered b,
  .source-status-metric-empty b { color: #d97706; }
  .source-status-metric-timeout b,
  .source-status-metric-http-error b,
  .source-status-metric-network-error b,
  .source-status-metric-error b { color: var(--danger); }
  .source-status-metric-checking b { color: var(--accent-primary); }

  .source-status-issues {
    display: grid;
    gap: 6px;
  }

  .source-status-issue {
    display: grid;
    grid-template-columns: minmax(150px, 0.8fr) minmax(0, 1.6fr) auto;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-left: 3px solid #d97706;
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    background: var(--bg-secondary);
  }

  .source-status-issue-timeout,
  .source-status-issue-http-error,
  .source-status-issue-network-error,
  .source-status-issue-error { border-left-color: var(--danger); }

  .source-status-issue-identity {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .source-status-issue-identity strong,
  .source-status-issue-detail {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .source-status-issue-identity strong {
    color: var(--text-primary);
    font-size: 12px;
  }

  .source-status-issue-identity small,
  .source-status-issue > small {
    color: var(--text-tertiary);
    font-size: 10px;
  }

  .source-status-issue-detail {
    color: var(--text-secondary);
    font-size: 12px;
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
    opacity: .62;
    pointer-events: auto;
  }

  .row:hover .del-btn {
    opacity: 1;
    pointer-events: auto;
  }

  .batch-delete { color: var(--danger); border-color: rgba(239, 68, 68, .28); }

  .row .del-btn:hover {
    background: var(--danger-light);
    border-color: var(--danger);
    color: var(--danger);
    transform: none;
    box-shadow: none;
  }

  .row .source-delete-button {
    min-height: 34px;
    padding: 0 10px;
    border-color: rgba(239, 68, 68, .5);
    background: rgba(239, 68, 68, .06);
    opacity: 1;
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

  .add-field {
    display: grid;
    flex: 1 1 200px;
    gap: 4px;
    min-width: 0;
    max-width: 220px;
  }

  .add-field-wide {
    flex-basis: 300px;
    max-width: 320px;
  }

  .add-field input {
    width: 100%;
    min-width: 0;
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

  /* 统一列表操作区层级 */
  .add-row {
    margin: -2px 0 18px;
    padding: 12px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
  }

  .toolbar {
    margin: -2px 0 18px;
    padding: 10px 12px 12px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
  }

  .nodes-filters {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) minmax(140px, 0.35fr) minmax(150px, 0.4fr) auto;
    gap: 10px;
    align-items: end;
    margin: -4px 0 18px;
    padding: 12px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
  }

  .nodes-filters-panel {
    margin: -4px 0 18px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
  }

  .nodes-filters-panel > summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 42px;
    padding: 0 14px;
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    list-style: none;
    user-select: none;
  }

  .nodes-filters-panel > summary::-webkit-details-marker {
    display: none;
  }

  .nodes-filters-panel > summary::after {
    content: '⌄';
    color: var(--text-tertiary);
    font-size: 16px;
    transition: transform .18s ease;
  }

  .nodes-filters-panel[open] > summary {
    border-bottom: 1px solid var(--border-color);
  }

  .nodes-filters-panel[open] > summary::after {
    transform: rotate(180deg);
  }

  .nodes-filters-panel > .nodes-filters {
    margin: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
  }

  .nodes-search {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 12px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
    color: var(--text-tertiary);
  }

  .nodes-search:focus-within {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 4px var(--accent-light);
  }

  .nodes-search input {
    width: 100%;
    height: 38px;
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
  }

  .nodes-search input:focus {
    box-shadow: none;
  }

  .nodes-filter-field {
    display: grid;
    gap: 5px;
    color: var(--text-tertiary);
    font-size: 12px;
    font-weight: 600;
  }

  .nodes-filter-field select {
    width: 100%;
    min-width: 0;
  }

  .nodes-filter-reset {
    height: 40px;
    white-space: nowrap;
  }

  .nodes-filter-reset:disabled {
    opacity: 0.45;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
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
    pointer-events: auto;
  }

  .toast-retry {
    height: 28px;
    padding: 0 9px;
    border-color: currentColor;
    background: transparent;
    color: inherit;
    font-size: 12px;
  }

  .toast-retry:hover {
    border-color: currentColor;
    background: rgba(127, 127, 127, 0.12);
    color: inherit;
    box-shadow: none;
    transform: none;
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

  .toast.warning {
    border-color: rgba(245, 158, 11, 0.35);
    background: rgba(245, 158, 11, 0.1);
    color: #b45309;
  }

  .toast.info {
    border-color: rgba(59, 130, 246, 0.3);
    background: rgba(59, 130, 246, 0.08);
    color: #2563eb;
  }

  .dark .toast.warning { color: #fbbf24; }
  .dark .toast.info { color: #93c5fd; }

  /* ========== 优选节点展示样式 ========== */
  .nodes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
    contain: layout paint;
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
    contain: layout paint;
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
  .node-tag.region-NO { background: rgba(30, 64, 175, 0.15); color: #1e40af; }
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

  .nodes-empty { display: grid; gap: 8px; justify-items: center; }
  .nodes-empty strong { color: var(--text-primary); font-size: 15px; }
  .nodes-empty span { color: var(--text-secondary); font-size: 13px; }
  .nodes-empty button { margin-top: 4px; }
  .nodes-empty-link { text-decoration: none; }

  .node-meta { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .node-copy { height: 28px; padding: 0 8px; font-size: 11px; opacity: 0; }
  .node-item:hover .node-copy, .node-item:focus-within .node-copy { opacity: 1; }
  .node-item:focus-within { border-color: var(--accent-primary); box-shadow: 0 0 0 3px var(--accent-light); }

  .list-search { flex: 1 1 220px; min-width: 160px; }
  .list-sort { min-width: 140px; }
  .batch-button { height: 34px; padding: 0 10px; font-size: 12px; }
  .source-select { flex: 0 0 auto !important; min-width: 16px !important; width: 16px; height: 16px; }

  :focus-visible { outline: 3px solid var(--accent-primary); outline-offset: 2px; }

  .nodes-skeleton {
    display: grid;
    gap: 12px;
    min-height: 130px;
  }

  .node-skeleton-item,
  .list-skeleton-row {
    position: relative;
    overflow: hidden;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
  }

  .node-skeleton-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 72px;
    padding: 14px 16px;
  }

  .node-skeleton-item span,
  .node-skeleton-item i,
  .list-skeleton-row span,
  .list-skeleton-row i {
    display: block;
    height: 12px;
    border-radius: 999px;
    background: var(--border-color);
  }

  .node-skeleton-item span { width: 56%; }
  .node-skeleton-item i { width: 22%; }

  .list-skeleton {
    display: grid;
    gap: 8px;
  }

  .list-skeleton-row {
    display: grid;
    grid-template-columns: minmax(120px, 0.8fr) minmax(180px, 1.4fr) 90px;
    align-items: center;
    gap: 12px;
    min-height: 58px;
    padding: 12px 14px;
  }

  .list-skeleton-row span:first-child { width: 72%; }
  .list-skeleton-row span:nth-child(2) { width: 88%; }
  .list-skeleton-row i { width: 70px; }

  .source-picker-skeleton {
    display: grid;
    gap: 8px;
    padding: 14px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
  }

  .source-picker-skeleton span {
    display: block;
    height: 28px;
    border-radius: var(--radius-sm);
    background: var(--border-color);
  }

  .node-skeleton-item::after,
  .list-skeleton-row::after,
  .source-picker-skeleton span::after {
    position: absolute;
    inset: 0;
    background: linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.48) 45%, transparent 70%);
    content: '';
    pointer-events: none;
    transform: translateX(-100%);
    animation: skeleton-shimmer 1.35s ease-in-out infinite;
  }

  .source-picker-skeleton span { position: relative; overflow: hidden; }

  @keyframes skeleton-shimmer {
    to { transform: translateX(100%); }
  }

  .retry-loading {
    padding: 8px 10px;
  }

  @media (prefers-reduced-motion: reduce) {
    .node-skeleton-item::after,
    .list-skeleton-row::after,
    .source-picker-skeleton span::after {
      animation: none;
    }
  }

  .nodes-error {
    color: var(--danger);
    cursor: pointer;
  }

  .nodes-error button {
    margin-top: 12px;
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
      margin: 8px auto;
      padding: 0 8px calc(84px + env(safe-area-inset-bottom, 0px));
      background-attachment: scroll;
    }
    .card,
    .admin-nav,
    button,
    input,
    select,
    .toast {
      -webkit-backdrop-filter: none;
      backdrop-filter: none;
    }
    .card,
    .node-item,
    .admin-nav a,
    button,
    input,
    select {
      transition: none;
    }
    .card:hover,
    .node-item:hover,
    .admin-nav a:hover,
    button:hover {
      transform: none;
      box-shadow: none;
    }
    .nodes-grid,
    .node-item {
      contain: layout;
    }
    .page-header {
      align-items: center;
      margin-bottom: 10px;
      gap: 8px;
    }
    .card {
      padding: 14px;
      margin-bottom: 12px;
      border-radius: 14px;
    }
    h2 {
      max-width: 190px;
      font-size: 20px;
      line-height: 1.2;
      overflow-wrap: anywhere;
    }
    h3 {
      margin-bottom: 12px;
      font-size: 16px;
      gap: 7px;
    }
    .add-row input,
    .add-row button {
      flex: 1 1 100%;
    }
    .add-field { max-width: none; width: 100%; flex-basis: 100%; }
    .list-search, .list-sort, .batch-button { width: 100%; }
    .node-copy { opacity: 1; }
    .form-grid {
      grid-template-columns: 1fr;
    }
    .custom-api-create {
      padding: 12px;
    }
    .custom-api-section-heading {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 10px;
    }
    .custom-api-section-heading > div:first-child,
    .custom-api-section-heading h3 {
      min-width: 0;
    }
    .custom-api-section-heading h3 {
      margin: 0;
      white-space: nowrap;
    }
    .custom-api-section-heading .section-heading-actions {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: center;
      width: 100%;
      gap: 8px;
    }
    .custom-api-section-heading .section-summary {
      justify-self: start;
    }
    .custom-api-section-heading #openCustomApiDialogButton {
      grid-column: 1 / -1;
      width: 100%;
    }
    .custom-api-dialog {
      width: calc(100vw - 16px);
      max-height: calc(100dvh - 16px);
      border-radius: var(--radius-md);
      align-self: end;
      margin: 0 auto;
      transform: translateY(0);
    }
    .custom-api-dialog-head {
      padding: 14px 16px;
    }
    .custom-api-dialog .custom-api-create {
      padding: 14px;
    }
    .custom-api-dialog .create-actions {
      margin: 14px -14px -14px;
      padding: 12px 14px max(10px, env(safe-area-inset-bottom, 0px));
    }
    .custom-api-dialog .create-actions button {
      flex: 1;
      min-height: 42px;
    }
    .confirm-dialog {
      width: calc(100vw - 24px);
      max-height: calc(100dvh - 24px);
      padding: 20px 16px max(20px, env(safe-area-inset-bottom, 0px));
    }
    .source-raw-dialog {
      width: calc(100vw - 16px);
      max-height: calc(100dvh - 16px);
      border-radius: var(--radius-md);
      align-self: end;
    }
    .source-raw-body {
      max-height: calc(100dvh - 94px);
      padding: 14px;
    }
    .source-raw-summary {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .source-raw-history-item {
      align-items: flex-start;
      flex-direction: column;
    }
    .source-raw-history-item span {
      text-align: left;
    }
    .source-raw-toolbar {
      align-items: stretch;
      flex-direction: column;
    }
    .source-raw-group-controls {
      align-items: stretch;
      flex-wrap: wrap;
    }
    .source-raw-group-controls .source-raw-source-filter {
      flex: 1 1 100%;
      width: 100%;
    }
    .source-raw-group-controls .source-raw-source-sort {
      flex: 1 1 100%;
      width: 100%;
    }
    .source-raw-group-controls button {
      flex: 1 1 calc(50% - 4px);
      min-height: 40px;
    }
    .source-raw-tabs {
      width: 100%;
    }
    .source-raw-tab {
      flex: 1;
    }
    .source-raw-toolbar button {
      min-height: 40px;
    }
    .source-raw-content {
      padding: 8px;
    }
    .source-raw-source-group {
      margin-bottom: 8px;
      padding: 9px 10px 4px;
    }
    .source-raw-source-heading {
      display: grid;
      grid-template-columns: 12px minmax(0, 1fr) auto;
      column-gap: 6px;
      row-gap: 3px;
    }
    .source-raw-source-heading::before {
      grid-column: 1;
      grid-row: 1;
    }
    .source-raw-source-heading strong {
      grid-column: 2;
      grid-row: 1;
    }
    .source-raw-source-heading span {
      grid-column: 3;
      grid-row: 1;
    }
    .source-raw-source-error {
      grid-column: 2 / 4;
      grid-row: 2;
    }
    .source-raw-source-detail-row {
      margin-left: 18px;
    }
    .source-raw-source-copy {
      min-width: 68px;
      min-height: 32px;
    }
    .source-raw-source-stats {
      margin-left: 18px;
    }
    .source-raw-actions {
      flex-wrap: wrap;
    }
    .source-raw-result-count,
    .source-raw-auto-refresh {
      flex: 1 1 100%;
      margin-right: 0;
    }
    .source-raw-auto-refresh {
      justify-content: flex-start;
    }
    .source-raw-actions button {
      flex: 1;
      min-height: 42px;
    }
    .source-picker-head {
      flex-wrap: wrap;
    }
    .source-picker-head .source-actions {
      width: 100%;
      justify-content: flex-end;
      margin-left: 0;
    }
    .custom-api-toolbar {
      margin-top: 12px;
    }
    .custom-api-row-main {
      grid-template-columns: 1fr;
    }
    .custom-api-actions {
      width: 100%;
      flex-wrap: wrap;
    }
    .custom-api-actions button {
      flex: 1;
    }
    .custom-api-row .custom-api-actions .custom-api-delete {
      flex: 0 1 auto;
      min-width: 64px;
      min-height: 34px;
      padding: 0 10px;
    }
    .custom-api-actions .custom-api-switch {
      order: -1;
      width: 100%;
      justify-content: flex-start;
      padding-bottom: 2px;
    }
    .custom-api-row .del-btn {
      opacity: 1;
      pointer-events: auto;
    }
    .header-right {
      width: auto;
      margin-left: auto;
      gap: 6px;
    }
    .theme-switch {
      width: 46px;
      height: 26px;
    }
    .scroll-top-button {
      right: max(16px, env(safe-area-inset-right, 0px));
      bottom: calc(76px + env(safe-area-inset-bottom, 0px));
      width: 46px;
      height: 46px;
    }
    .scroll-top-button:hover,
    .scroll-top-button:active {
      transform: translateY(0);
    }
    .scroll-top-button::after {
      display: none;
    }
    .theme-switch::before {
      width: 19px;
      height: 19px;
      font-size: 10px;
    }
    .dark .theme-switch::before {
      left: calc(100% - 22px);
    }
    .btn-logout {
      height: 36px;
      padding: 0 10px;
      font-size: 12px;
    }
    .btn-logout span {
      font-size: 13px;
    }
    body > .admin-nav {
      position: fixed !important;
      top: auto !important;
      right: 8px;
      bottom: calc(8px + env(safe-area-inset-bottom, 0px)) !important;
      left: 8px;
      width: auto;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      align-items: center;
      gap: 2px;
      overflow: hidden;
      margin: 0;
      padding: 4px;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
      box-shadow: 0 10px 30px rgba(2, 6, 23, 0.28);
      isolation: isolate;
      touch-action: manipulation;
    }
    .admin-nav::-webkit-scrollbar { display: none; }
    .admin-nav a {
      width: 100%;
      min-width: 0;
      min-height: 44px;
      flex-direction: column;
      gap: 3px;
      padding: 5px 3px 6px;
      text-align: center;
      font-size: 11px;
    }
    .nav-icon {
      font-size: 15px;
    }
    .admin-nav a.active::after { left: 30%; right: 30%; bottom: 2px; }
    .setting-row {
      align-items: flex-start;
      flex-direction: column;
      gap: 12px;
    }
    .setting-block {
      padding: 12px;
    }
    .management-panel > summary {
      min-height: 46px;
      padding: 0 12px;
    }
    .management-panel-body {
      padding: 12px 12px 2px;
    }
    .settings-edit-button {
      width: 100%;
    }
    .settings-dialog {
      width: min(calc(100vw - 16px), 560px);
      height: calc(100dvh - 16px);
      max-height: calc(100dvh - 16px);
      border-radius: 14px;
    }
    .settings-dialog-head {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 40px;
      align-items: start;
      gap: 10px;
      padding: 14px 14px 12px;
    }
    .settings-dialog-head h3 {
      font-size: 18px;
      line-height: 1.25;
    }
    .settings-dialog-head p {
      max-width: 34ch;
      line-height: 1.45;
    }
    .settings-dialog-head .dialog-close {
      width: 40px;
      height: 40px;
      margin: -4px -4px 0 0;
    }
    .settings-dialog-body {
      min-height: 0;
      max-height: none;
      padding: 14px 12px calc(16px + env(safe-area-inset-bottom, 0px));
    }
    .settings-dialog-footer,
    .settings-dialog-footer.blacklist-toolbar {
      grid-template-columns: 1fr;
      gap: 8px;
      padding: 10px 12px calc(12px + env(safe-area-inset-bottom, 0px));
    }
    .settings-dialog-footer .save-status {
      min-height: 32px;
      justify-content: center;
      text-align: center;
    }
    .settings-editor-section-head {
      align-items: flex-start;
      flex-direction: column;
      gap: 2px;
    }
    .settings-editor-section-head span {
      display: block;
      margin: 0;
      line-height: 1.4;
    }
    .settings-editor-add-section {
      padding-bottom: 14px;
    }
    .settings-editor-add {
      padding: 10px;
    }
    .settings-editor-list {
      max-height: none;
      overflow: visible;
    }
    .settings-editor-footer {
      grid-template-columns: minmax(0, 1fr) minmax(120px, auto);
    }
    .settings-editor-footer .btn-primary {
      min-width: 0;
      width: 100%;
    }
    .settings-editor-more-actions {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
      padding: 8px;
    }
    .settings-editor-more-actions > button {
      min-height: 40px;
      padding: 0 6px;
      font-size: 12px;
    }
    .settings-editor-more-actions .setting-batch-delete {
      grid-column: 1 / -1;
    }
    .settings-editor-more > summary small {
      max-width: 46%;
      overflow: hidden;
      text-align: right;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .settings-editor-preview-details > summary span {
      font-size: 11px;
    }
    .setting-block-heading {
      gap: 8px;
    }
    .theme-mode-options {
      grid-template-columns: 1fr;
    }
    .rule-list-toolbar {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      align-items: center;
      gap: 6px;
      margin-top: 10px;
    }
    .rule-search {
      grid-column: 1 / -1;
      min-width: 0;
    }
    .rule-list-toolbar > button {
      width: 100%;
      min-width: 0;
    }
    .selection-count {
      grid-column: 1 / -1;
      justify-self: start;
      width: auto;
      min-width: 0;
    }
    .filter-preview-heading,
    .filter-preview-result {
      align-items: flex-start;
      flex-direction: column;
      gap: 4px;
    }
    .filter-preview-result code {
      max-width: 100%;
    }
    .blacklist-add-row {
      align-items: stretch;
      flex-direction: column;
      gap: 8px;
    }
    .blacklist-add-row input {
      width: 100%;
      min-height: 44px;
      border-color: var(--border-hover);
      background: var(--bg-secondary);
      font-size: 16px;
    }
    .blacklist-add-row .setting-add-button {
      min-height: 44px;
      border-color: var(--border-hover);
      background: var(--surface-solid);
      color: var(--text-primary);
    }
    .blacklist-add-row button,
    .blacklist-toolbar button {
      width: 100%;
      min-height: 40px;
      border-color: var(--border-hover);
    }
    .blacklist-list {
      grid-template-columns: 1fr;
    }
    .blacklist-row {
      display: grid;
      grid-template-columns: 20px minmax(0, 1fr) auto;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
    }
    .blacklist-row .rule-select {
      justify-self: center;
    }
    .blacklist-row input:not(.rule-select) {
      min-width: 0;
      min-height: 40px;
      height: 40px;
      font-size: 15px;
    }
    .blacklist-row .del-btn {
      min-width: 58px;
      min-height: 40px;
      padding: 0 8px;
      font-size: 12px;
    }
    .blacklist-list.is-large {
      max-height: none;
      overflow: visible;
    }
    .rule-pagination {
      padding-bottom: 2px;
    }
    .import-preview-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .blacklist-toolbar {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: stretch;
      gap: 8px;
    }
    .blacklist-toolbar > button,
    .blacklist-toolbar > span {
      min-width: 0;
      width: 100%;
      min-height: 40px;
      padding: 0 8px;
      font-size: 12px;
      white-space: nowrap;
    }
    .blacklist-toolbar .save-status {
      grid-column: 1 / -1;
      margin-right: 0;
      min-height: 28px;
    }
    .blacklist-toolbar .btn-primary {
      grid-column: 1 / -1;
    }
    .blacklist-toolbar .setting-batch-delete {
      grid-column: 1 / -1;
    }
    .settings-editor-footer.blacklist-toolbar .btn-primary {
      grid-column: auto;
    }
    .settings-editor-footer.blacklist-toolbar .setting-batch-delete {
      grid-column: auto;
    }
    .page-intro {
      margin: 0 0 10px;
      font-size: 12px;
      line-height: 1.4;
    }
    .toolbar {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
      margin-bottom: 12px;
      padding-bottom: 10px;
    }
    .preview-view-toggle {
      grid-column: 1 / -1;
      width: 100%;
      margin-left: 0;
    }
    .preview-view-toggle .btn-subtle {
      flex: 1;
    }
    .nodes-filters {
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 0;
      padding: 10px;
    }
    .nodes-filters-panel {
      margin-top: -4px;
    }
    .nodes-filters-panel > summary {
      min-height: 40px;
      padding: 0 12px;
    }
    .nodes-search {
      grid-column: 1 / -1;
    }
    .nodes-filter-reset {
      width: 100%;
    }
    .toolbar > select {
      grid-column: 1 / -1;
      width: 100%;
      min-width: 0;
      height: 36px;
    }
    .toolbar > button {
      width: 100%;
      min-width: 0;
      height: 36px;
      padding: 0 8px;
      font-size: 12px;
    }
    .toolbar > .nodes-count {
      grid-column: 1 / -1;
      width: auto;
      margin: 0;
      text-align: right;
      font-size: 12px;
    }
    .preview-data-status {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 8px;
      margin-top: -6px;
      line-height: 1.4;
    }
    .preview-data-status span + span::before { display: none; }
    .preview-data-status span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .preview-api-data { max-height: 58vh; padding: 14px 12px; font-size: 12px; overflow-x: auto; }
    .preview-api-top-button { top: 8px; right: 8px; min-height: 32px; font-size: 12px; }
    .nodes-grid {
      gap: 6px;
    }
    .nodes-skeleton {
      gap: 6px;
    }
    .node-skeleton-item {
      min-height: 56px;
      padding: 9px 10px;
    }
    .list-skeleton-row {
      grid-template-columns: minmax(90px, 0.8fr) minmax(0, 1.4fr) 50px;
      min-height: 52px;
      gap: 8px;
      padding: 10px;
    }
    .node-item {
      min-width: 0;
      min-height: 56px;
      padding: 9px 10px;
      gap: 6px;
      border-radius: 10px;
    }
    .node-host {
      min-width: 0;
      font-size: 12px;
      line-height: 1.35;
    }
    .node-tag {
      max-width: 58px;
      padding: 3px 7px;
      font-size: 10px;
    }
    .nodes-empty,
    .nodes-loading,
    .nodes-error {
      padding: 24px 10px;
      font-size: 13px;
    }
    .pagination {
      gap: 4px;
      margin-top: 12px;
      row-gap: 6px;
    }
    .pagination button {
      min-width: 32px;
      height: 32px;
      padding: 0 8px;
      font-size: 12px;
    }
    .pagination .page-info {
      margin: 0 4px;
      font-size: 12px;
    }
    .pagination .jump-box {
      margin-top: 2px;
    }
    .section-heading {
      align-items: flex-start;
    }
    .section-summary {
      white-space: nowrap;
    }
    .row .del-btn {
      opacity: 1;
      pointer-events: auto;
    }
    #subsList .row .source-health,
    #apisList .row .source-health {
      flex: 1 1 100%;
      width: 100%;
      max-width: none;
      order: 3;
    }
    #subsList .row .source-check-button,
    #subsList .row .source-view-button,
    #subsList .row .source-download-button,
    #subsList .row .del-btn,
    #apisList .row .source-check-button,
    #apisList .row .source-view-button,
    #apisList .row .source-download-button,
    #apisList .row .del-btn {
      order: 4;
      flex: 0 1 auto;
      min-height: 34px;
      padding: 0 10px;
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
    .source-load-status,
    .source-error-notice,
    .data-source-error {
      align-items: flex-start;
      flex-direction: column;
    }
    .source-load-status ul,
    .source-error-notice ul {
      width: 100%;
    }
    .source-load-status button,
    .source-error-notice button,
    .data-source-error button {
      margin-left: 0;
    }
    .source-status-metrics {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .source-status-panel > summary {
      min-height: 58px;
      padding: 12px 14px;
    }
    .source-status-panel-body {
      padding: 12px 14px 14px;
    }
    .source-status-actions {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
    }
    .source-status-actions > * {
      width: 100%;
    }
    .source-status-issue {
      grid-template-columns: 1fr;
      gap: 3px;
    }
  }

  @media screen and (min-width: 769px) and (max-width: 900px), screen and (min-device-width: 769px) and (max-device-width: 900px) {
    .custom-api-dialog .form-grid {
      grid-template-columns: 1fr;
    }
  }

  @media screen and (min-width: 380px) and (max-width: 768px), screen and (min-device-width: 380px) and (max-device-width: 768px) {
    .nodes-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media screen and (max-width: 379px), screen and (max-device-width: 379px) {
    .section-heading {
      gap: 8px;
    }
    .section-summary {
      padding-inline: 7px;
      font-size: 11px;
    }
  }
`;
