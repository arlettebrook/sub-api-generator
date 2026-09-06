export const adminStyle = `
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

  .setting-block {
    display: grid;
    gap: 14px;
    padding: 16px 18px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
  }

  .setting-block-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
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

  .blacklist-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
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
    display: flex;
    align-items: center;
    gap: 10px;
    padding-top: 4px;
  }

  .blacklist-toolbar .save-status {
    margin-right: auto;
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
    background: var(--bg-secondary);
    color: var(--text-primary);
    box-shadow: var(--shadow-lg);
  }

  .custom-api-dialog[open] {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
  }

  .custom-api-dialog::backdrop {
    background: rgba(2, 6, 23, 0.72);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
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
  }

  .custom-api-dialog .form-field input {
    min-width: 0;
  }

  .form-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(180px, 0.8fr);
    gap: 12px;
  }

  .form-field {
    display: grid;
    gap: 6px;
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

  .path-input {
    display: flex;
    align-items: center;
    height: 40px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
    overflow: hidden;
  }

  .path-input b {
    padding-left: 13px;
    color: var(--text-tertiary);
    font-size: 16px;
    font-weight: 500;
  }

  .path-input input {
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
  }

  .custom-api-toolbar {
    justify-content: flex-end;
    margin-top: 16px;
    padding-bottom: 16px;
  }

  .save-status {
    margin-right: auto;
    color: var(--success);
    font-size: 13px;
  }

  .save-status.dirty {
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

  .custom-api-actions .del-btn {
    opacity: 1;
    pointer-events: auto;
  }

  .custom-api-delete {
    border-color: rgba(239, 68, 68, 0.3);
    color: var(--danger);
    background: var(--danger-light);
  }

  .custom-api-delete:hover {
    border-color: var(--danger);
    color: var(--danger-hover);
    background: rgba(239, 68, 68, 0.16);
    box-shadow: none;
    transform: none;
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

  .row input:hover {
    border-color: var(--border-color);
    background: var(--bg-tertiary);
  }

  .row input:focus {
    border-color: var(--accent-primary);
    background: var(--bg-secondary);
  }

  .source-health {
    display: inline-flex;
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
    white-space: nowrap;
  }

  .source-health-success {
    border-color: rgba(16, 185, 129, 0.35);
    color: var(--success);
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

  .source-health-error {
    max-width: min(100%, 360px);
    border-color: rgba(239, 68, 68, 0.35);
    color: var(--danger);
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
    }
    .custom-api-dialog-head {
      padding: 14px 16px;
    }
    .custom-api-dialog .custom-api-create {
      padding: 14px;
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
    .setting-row {
      align-items: flex-start;
      flex-direction: column;
      gap: 12px;
    }
    .setting-block {
      padding: 12px;
    }
    .setting-block-heading {
      gap: 8px;
    }
    .blacklist-add-row {
      align-items: stretch;
      flex-direction: column;
    }
    .blacklist-add-row button,
    .blacklist-toolbar button {
      width: 100%;
    }
    .blacklist-list {
      grid-template-columns: 1fr;
    }
    .blacklist-toolbar {
      align-items: stretch;
      flex-direction: column;
    }
    .blacklist-toolbar .save-status {
      margin-right: 0;
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
    .nodes-grid {
      gap: 6px;
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
