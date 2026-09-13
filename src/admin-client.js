export const adminClientScript = `
// ======================== 全局缓存与工具 ========================
// 缓存DOM元素，避免重复查询提升性能
const $ = (id) => document.getElementById(id);
function debounce(callback, delay = 180) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
}
let nodesContainer, paginationEl, nodesCountEl, previewModeButtons;
let previewDataStatusEl, previewDataModeHintEl, previewDataStatsEl, previewDataCacheEl, previewDataUpdatedEl;
let previewDataMeta = { filterStats: null, cache: '', generatedAt: '' };
let nodesSearchEl, nodesRegionFilterEl, nodesSortEl, nodesFilterResetEl, nodesSourceFilterEl, nodesStatusFilterEl;
let scrollTopButtonElement = null;
let scrollTopButtonFrame = 0;

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
function showToast(message, type = 'default', retry) {
  const toast = $('toast');
  toast.innerHTML = '';
  const messageEl = document.createElement('span');
  messageEl.textContent = message;
  toast.appendChild(messageEl);
  if (typeof retry === 'function') {
    const retryButton = document.createElement('button');
    retryButton.type = 'button';
    retryButton.className = 'toast-retry';
    retryButton.textContent = '重试';
    retryButton.onclick = () => { toast.classList.remove('show'); retry(); };
    toast.appendChild(retryButton);
  }
  toast.className = 'toast ' + type;
  toast.setAttribute('aria-label', message);
  
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, typeof retry === 'function' ? 6000 : 2000);
}

function setButtonBusy(button, busy, busyText = '保存中…') {
  if (!button) return;
  if (busy) {
    if (!button.dataset.idleText) button.dataset.idleText = button.textContent;
    button.disabled = true;
    button.textContent = busyText;
    button.setAttribute('aria-busy', 'true');
  } else {
    button.disabled = false;
    if (button.dataset.idleText) button.textContent = button.dataset.idleText;
    button.removeAttribute('aria-busy');
  }
}

// 数据源/优选 API 通用的启用开关：滑动开关 + 状态文字，样式见 admin-style 的 .source-switch。
function createSourceSwitch({ checked, title, ariaLabel, onChange }) {
  const label = document.createElement('label');
  label.className = 'source-switch';
  label.title = title || (checked ? '已启用，点击禁用' : '已禁用，点击启用');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('role', 'switch');
  input.checked = checked === true;
  input.setAttribute('aria-label', ariaLabel || label.title);
  const track = document.createElement('span');
  track.className = 'source-switch-track';
  const text = document.createElement('span');
  text.className = 'source-switch-text';
  text.textContent = input.checked ? '已启用' : '已禁用';
  label.append(input, track, text);
  if (typeof onChange === 'function') {
    input.onchange = () => onChange(input, text);
  }
  return { label, input, text };
}

function setInputError(input, message) {
  if (!input) return;  const field = input.closest('.form-field') || input.parentElement;
  let hint = field?.querySelector('.inline-error');
  if (!hint) {
    hint = document.createElement('small');
    hint.className = 'inline-error';
    field?.appendChild(hint);
  }
  hint.textContent = message || '';
  hint.hidden = !message;
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  input.classList.toggle('has-error', Boolean(message));
}

function clearInputError(input) { setInputError(input, ''); }

function createCopyButton(value, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'icon-action copy-source-button';
  button.textContent = '⧉';
  button.title = '复制' + label;
  button.setAttribute('aria-label', '复制' + label);
  button.onclick = async () => {
    try {
      await navigator.clipboard.writeText(value);
      button.textContent = '✓';
      showToast(label + '已复制', 'success');
      window.setTimeout(() => { button.textContent = '⧉'; }, 1200);
    } catch (error) {
      showToast('复制失败：' + error.message, 'error');
    }
  };
  return button;
}

let subsSavePending = 0;
let apisSavePending = 0;
let subsDirty = false;
let apisDirty = false;
let camouflageSettings = { enabled: false, accessPath: '', redirectUrl: '' };
let savedCamouflageSettings = { ...camouflageSettings };
let camouflageDirty = false;

function getAdminBasePath() {
  const value = document.body?.dataset.adminBasePath || '/admin';
  return value.replace(/\\/+$/, '') || '/admin';
}

function adminUrl(suffix = '') {
  const normalized = String(suffix || '');
  return getAdminBasePath() + (normalized ? (normalized.startsWith('/') ? normalized : '/' + normalized) : '');
}

function hasUnsavedChanges() {
  return customApisDirty || blacklistDirty || filterRulesDirty || camouflageDirty || subsDirty || apisDirty || subsSavePending > 0 || apisSavePending > 0;
}

function responseError(label, response) {
  return new Error(label + '失败（HTTP ' + response.status + '）');
}

async function readJsonResponse(url, label, options = {}) {
  let response;
  try {
    response = await fetch(url, { cache: 'no-store', ...options });
  } catch (error) {
    throw new Error(label + '连接失败：' + (error.message || '网络异常'));
  }
  if (!response.ok) throw responseError(label, response);
  try {
    return await response.json();
  } catch {
    throw new Error(label + '返回的数据格式无效');
  }
}

function noticeIconMarkup(kind = 'warning') {
  const path = kind === 'danger'
    ? '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
    : '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>';
  const icon = document.createElement('span');
  icon.className = 'notice-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  return icon;
}

function noticeBodyMarkup() {
  const body = document.createElement('div');
  body.className = 'notice-body';
  return body;
}

function renderLoadError(containerId, message, retry) {
  const container = $(containerId);
  if (!container) return;
  container.innerHTML = '';
  const notice = document.createElement('div');
  notice.className = 'data-source-error';
  const body = noticeBodyMarkup();
  const text = document.createElement('span');
  text.textContent = message;
  body.appendChild(text);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn-outline';
  button.textContent = '重试';
  button.onclick = retry;
  notice.append(noticeIconMarkup('danger'), body, button);
  container.appendChild(notice);
}

function nodeSkeletonMarkup(count = 6) {
  let items = '';
  for (let i = 0; i < count; i++) items += '<div class="node-skeleton-item"><span></span><i></i></div>';
  return '<div class="nodes-grid nodes-skeleton" aria-label="正在加载节点">' + items + '</div>';
}

function listSkeletonMarkup(count = 3) {
  let rows = '';
  for (let i = 0; i < count; i++) rows += '<div class="list-skeleton-row"><span></span><span></span><i></i></div>';
  return '<div class="list-skeleton" aria-label="正在加载列表">' + rows + '</div>';
}

function sourcePickerSkeletonMarkup() {
  return '<div class="source-picker-skeleton" aria-label="正在加载数据源"><span></span><span></span><span></span><span></span></div>';
}

function renderSourceLoadStatus(errors = []) {
  const notice = $('customApiSourceStatus');
  if (!notice) return;
  notice.innerHTML = '';
  notice.hidden = errors.length === 0;
  if (!errors.length) return;
  const body = noticeBodyMarkup();
  const title = document.createElement('strong');
  title.textContent = '部分数据源配置加载失败';
  body.appendChild(title);
  const list = document.createElement('ul');
  errors.forEach((error) => {
    const item = document.createElement('li');
    const sourceName = error.type === 'apis' ? 'API 源' : error.type === 'domains' ? '优选域名' : error.type === 'config' ? '配置' : '订阅源';
    item.textContent = sourceName + '：' + error.message;
    list.appendChild(item);
  });
  body.appendChild(list);
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'btn-outline';
  retry.textContent = '重新加载数据源';
  retry.onclick = () => loadCustomApis(true).catch((error) => showToast(error.message, 'error'));
  notice.append(noticeIconMarkup(), body, retry);
}

function parseSourceErrors(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function renderPreviewSourceErrors(errors = []) {
  const notice = $('sourceErrorNotice');
  if (!notice) return;
  notice.innerHTML = '';
  notice.hidden = errors.length === 0;
  if (!errors.length) return;
  const body = noticeBodyMarkup();
  const title = document.createElement('strong');
  title.textContent = '部分数据源暂时不可用，已展示其他来源的数据';
  body.appendChild(title);
  const list = document.createElement('ul');
  errors.forEach((error) => {
    const item = document.createElement('li');
    const sourceName = error.key || (error.type === 'apis' ? 'API 源' : error.type === 'domains' ? '优选域名' : error.type === 'config' ? '配置' : '订阅源');
    item.textContent = sourceName + '：' + error.message;
    list.appendChild(item);
  });
  body.appendChild(list);
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'btn-outline';
  retry.textContent = '重试';
  retry.onclick = fetchNodes;
  notice.append(noticeIconMarkup(), body, retry);
}

function formatSourceTime(value) {
  if (!value) return '尚未检测';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function sourceStatusLabel(state) {
  return {
    success: '正常',
    filtered: '已过滤',
    empty: '空数据',
    timeout: '请求超时',
    'http-error': 'HTTP 错误',
    'network-error': '网络错误',
    error: '失败',
    checking: '检测中',
    idle: '未检测',
  }[state] || '未检测';
}

function dnsErrorCodeLabel(code) {
  return {
    DNS_TIMEOUT: '超时',
    DNS_HTTP_ERROR: 'HTTP 错误',
    DNS_NETWORK_ERROR: '网络错误',
    DNS_INVALID_RESPONSE: '响应无效',
    DNS_NXDOMAIN: '域名不存在',
    DNS_SERVFAIL: '服务失败',
    DNS_REFUSED: '请求被拒绝',
    DNS_FORMAT_ERROR: '请求格式错误',
    DNS_ALL_PROVIDERS_FAILED: '所有服务商失败',
  }[code] || code || 'DNS 错误';
}

function renderSourceStatusSummary() {
  const summary = $('sourceStatusSummary');
  if (!summary) return;
  const entries = Object.entries(sourceStatuses || {}).flatMap(([type, values]) => Object.entries(values || {}).map(([key, status]) => ({ type, key, status })));
  summary.innerHTML = '';
  summary.hidden = entries.length === 0;
  if (!entries.length) return;
  const counts = { success: 0, filtered: 0, empty: 0, timeout: 0, 'http-error': 0, 'network-error': 0, error: 0, checking: 0, idle: 0 };
  entries.forEach(({ status }) => { counts[status.state] = (counts[status.state] || 0) + 1; });
  const heading = document.createElement('div');
  heading.className = 'source-status-summary-head';
  const title = document.createElement('strong');
  title.textContent = '数据源状态';
  const checked = document.createElement('span');
  const latest = entries.map(({ status }) => status.lastAttemptAt).filter(Boolean).sort().pop();
  checked.textContent = latest ? '最近检测：' + formatSourceTime(latest) : '等待首次检测';
  heading.append(title, checked);
  summary.appendChild(heading);

  const metrics = document.createElement('div');
  metrics.className = 'source-status-metrics';
  [['success', '正常'], ['filtered', '节点被过滤'], ['empty', '返回空数据'], ['timeout', '请求超时'], ['http-error', 'HTTP 错误'], ['network-error', '网络错误'], ['checking', '检测中']].forEach(([state, label]) => {
    const metric = document.createElement('div');
    metric.className = 'source-status-metric source-status-metric-' + state;
    metric.innerHTML = '<b>' + (counts[state] || 0) + '</b><span>' + label + '</span>';
    metrics.appendChild(metric);
  });
  summary.appendChild(metrics);

  const issues = entries.filter(({ status }) => ['filtered', 'empty', 'timeout', 'http-error', 'network-error', 'error', 'checking'].includes(status.state));
  if (!issues.length) return;
  const list = document.createElement('div');
  list.className = 'source-status-issues';
  issues.forEach(({ type, key, status }) => {
    const item = document.createElement('div');
    item.className = 'source-status-issue source-status-issue-' + status.state;
    const identity = document.createElement('div');
    identity.className = 'source-status-issue-identity';
    const name = document.createElement('strong');
    name.textContent = status.remark || key;
    const kind = document.createElement('small');
    kind.textContent = (type === 'apis' ? 'API 源 · ' : type === 'domains' ? '优选域名 · ' : '订阅源 · ') + key;
    identity.append(name, kind);
    const detail = document.createElement('span');
    detail.className = 'source-status-issue-detail';
    if (status.state === 'checking') detail.textContent = '正在检测…';
    else if (['timeout', 'http-error', 'network-error', 'error'].includes(status.state)) detail.textContent = status.error || sourceStatusLabel(status.state);
    else if (status.state === 'filtered') detail.textContent = '原始 ' + status.rawNodeCount + ' 个，过滤后无可用节点';
    else detail.textContent = '返回 0 个节点';
    const meta = document.createElement('small');
    const latestSuccess = status.lastSuccessAt
      ? '最近成功：' + formatSourceTime(status.lastSuccessAt) + ' · ' + (status.lastSuccessNodeCount || 0) + ' 个节点'
      : '尚无成功记录';
    meta.textContent = (status.durationMs === null || status.durationMs === undefined ? '' : status.durationMs + ' ms · ') + formatSourceTime(status.lastAttemptAt) + ' · ' + latestSuccess;
    item.append(identity, detail, meta);
    list.appendChild(item);
  });
  summary.appendChild(list);
}

// ======================== 登出功能 ========================
async function logout() {
  const button = document.querySelector('.btn-logout');
  if (button) button.disabled = true;
  try {
    // 服务端会将 /logout 重定向到登录页（伪装模式下为 accessPath，否则为 /），同为同源页面，可安全跟随
    const response = await fetch('/logout', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('退出登录请求失败');
    window.location.replace(response.url || '/');
  } catch (error) {
    if (button) button.disabled = false;
    showToast(error.message, 'error');
    return;
  }
}

// ======================== 复制订阅地址功能 ========================
async function copySubUrl(event) {
    const btn = event?.currentTarget;
  const originalText = btn.innerHTML;
  
  try {
    const fullSubUrl = getPreviewApiUrl();
    if (!fullSubUrl) throw new Error('暂无可用优选 API，请先创建并启用一个优选 API');
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
  
  const nodes = getVisibleNodes();
  if (nodes.length === 0) {
    showToast('暂无节点数据可复制', 'error');
    return;
  }
  
  try {
    // 拼接为原始格式：地址#备注，每行一个
    const text = nodes.map(formatPreviewNodeLine).join('\\n');
    
    await navigator.clipboard.writeText(text);
    btn.innerHTML = '<span>✅</span> 已复制';
    showToast(\`已复制 \${nodes.length} 条节点数据\`, 'success');
    
    setTimeout(() => {
      btn.innerHTML = originalText;
    }, 2000);
  } catch (err) {
    showToast('复制失败：' + err.message, 'error');
  }
}

// 导出文件名统一使用北京时间（UTC+8）后缀，格式如 2026-09-13-14-30-25，与服务端 WebDAV 备份保持一致。
function beijingStamp() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 19).replace('T', '-').replace(/:/g, '-');
}

function sanitizeDownloadName(value, fallback = 'api-data') {
  const safeName = String(value || '')
    .replace(/[<>:"\\/|?*\u0000-\u001F]/g, '-')
    .replace(/[. ]+$/g, '')
    .trim()
    .slice(0, 80) || fallback;
  const base = safeName.toLowerCase().endsWith('.txt') ? safeName.slice(0, -4) : safeName;
  return base + '-' + beijingStamp() + '.txt';
}

function saveTextDownload(text, filename, successMessage) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = sanitizeDownloadName(filename);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  if (successMessage) showToast(successMessage, 'success');
}

function getCustomApiDownloadName(path, entry) {
  const remarkName = String(entry?.remark || '').trim();
  return (remarkName && remarkName !== '未命名') ? remarkName : (String(path || '').split('/').filter(Boolean).pop() || 'api-data');
}

async function downloadCustomApiData(path, entry, button) {
  const idleText = button?.textContent || '下载';
  if (button) { button.disabled = true; button.textContent = '下载中…'; }
  try {
    const response = await fetch('/' + encodeURIComponent(String(path || '')).replace(/%2F/g, '/'), { cache: 'no-store', credentials: 'same-origin' });
    if (!response.ok) throw new Error('请求失败：' + response.status);
    const text = await response.text();
    const lines = text.split(/\\r?\\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) throw new Error('暂无可下载节点');
    saveTextDownload(lines.join('\\n') + '\\n', getCustomApiDownloadName(path, entry), '已下载 ' + lines.length + ' 条 API 数据');
  } catch (error) {
    showToast('下载失败：' + (error.message || error), 'error');
  } finally {
    if (button) { button.disabled = false; button.textContent = idleText; }
  }
}

async function downloadSourceData(type, key, entry, button) {
  const idleText = button?.textContent || '下载';
  if (button) { button.disabled = true; button.textContent = '下载中…'; }
  try {
    const response = await fetch('/api/source-raw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
      body: JSON.stringify({ type, key }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || '请求失败：' + response.status);
    const lines = Array.isArray(payload.nodes) ? payload.nodes.filter(Boolean) : [];
    if (!lines.length) throw new Error('暂无可下载节点');
    const fallback = type === 'apis'
      ? String(key).split('/').filter(Boolean).pop()
      : String(key).replace(/^https?:\\/\\//i, '').replace(/[^a-zA-Z0-9._-]+/g, '-') || 'subscription';
    const name = String(entry?.remark || '').trim() || fallback;
    saveTextDownload(lines.join('\\n') + '\\n', name, '已下载 ' + lines.length + ' 条节点数据');
  } catch (error) {
    showToast('下载失败：' + (error.message || error), 'error');
  } finally {
    if (button) { button.disabled = false; button.textContent = idleText; }
  }
}

function downloadNodeData(event) {
  const nodes = getVisibleNodes();
  if (!nodes.length) { showToast('暂无节点数据可下载', 'error'); return; }
  const text = nodes.map(formatPreviewNodeLine).join('\\n') + '\\n';
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const selectedPath = $('previewApiSelect')?.value || '';
  const selectedApi = selectedPath && customApis?.[selectedPath];
  anchor.download = sanitizeDownloadName(getCustomApiDownloadName(selectedPath, selectedApi));
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  showToast(\`已下载 \${nodes.length} 条 API 数据\`, 'success');
}

// ======================== 主题切换逻辑 ========================
let themeMode = 'system';
let viewTransitionSeq = 0;

function applyTheme(mode) {
  const root = document.documentElement;
  themeMode = ['light', 'dark', 'system'].includes(mode) ? mode : 'system';
  const isDark = themeMode === 'dark' || (window.matchMedia?.('(prefers-color-scheme: dark)').matches && themeMode === 'system');
  const alreadyApplied = root.dataset.themeMode === themeMode && root.classList.contains('dark') === isDark;
  const mutate = () => {
    root.dataset.themeMode = themeMode;
    root.classList.toggle('dark', isDark);
    document.body.classList.toggle('dark', isDark);
  };
  // 渐变背景等属性无法通过 CSS transition 平滑过渡，用视图过渡做整体交叉淡入。
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if (!alreadyApplied && typeof document.startViewTransition === 'function' && !reduceMotion) {
    const seq = ++viewTransitionSeq;
    const transition = document.startViewTransition(mutate);
    root.classList.add('view-transitioning');
    transition.finished.finally(() => {
      if (seq === viewTransitionSeq) root.classList.remove('view-transitioning');
    });
  } else {
    mutate();
  }
  const switcher = document.querySelector('.theme-switch');
  if (switcher) {
    const labels = { light: '亮色', dark: '暗色', system: '跟随系统' };
    switcher.setAttribute('aria-label', '主题：' + labels[themeMode] + '，点击切换');
    switcher.title = '主题：' + labels[themeMode] + '（点击切换）';
    switcher.setAttribute('aria-pressed', String(isDark));
  }
  syncThemeSettings();
  return isDark;
}

function syncThemeSettings() {
  const labels = { light: '亮色', dark: '暗色', system: '跟随系统' };
  document.querySelectorAll('input[name="themeModeSetting"]').forEach((input) => {
    input.checked = input.value === themeMode;
  });
  const summary = $('themeModeSummary');
  if (summary) summary.textContent = labels[themeMode] || labels.system;
}

function toggleTheme() {
  const isCurrentlyDark = document.documentElement.classList.contains('dark');
  const next = themeMode === 'dark' ? 'light' : themeMode === 'light' ? 'dark' : (isCurrentlyDark ? 'light' : 'dark');
  applyTheme(next);
  try {
    localStorage.setItem('theme', themeMode);
  } catch {
    // Theme switching should still work when storage is unavailable.
  }
}

function initTheme() {
  let savedTheme = 'system';
  try {
    savedTheme = localStorage.getItem('theme') || 'system';
  } catch {
    // Fall back to following the system preference when storage is unavailable.
  }
  applyTheme(savedTheme);
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  media?.addEventListener?.('change', () => { if (themeMode === 'system') applyTheme('system'); });
}

// ======================== 优选节点展示与增强分页 ========================
let currentNodes = [];
let previewDataMode = 'nodes';
let currentPage = 1;
const pageSize = 12; // 每页显示12个节点
let activeNodeRequest = null;
let nodeLoadSequence = 0;
const emptyNodeRetryDelays = [500, 1200];
const PREVIEW_MODE_STORAGE_KEY = 'preview-data-mode';
const PREVIEW_API_STORAGE_KEY = 'preview-api-path';

function loadPreviewApiPath() {
  try { return localStorage.getItem(PREVIEW_API_STORAGE_KEY) || ''; }
  catch { return ''; }
}

function savePreviewApiPath(path) {
  try {
    if (path) localStorage.setItem(PREVIEW_API_STORAGE_KEY, path);
    else localStorage.removeItem(PREVIEW_API_STORAGE_KEY);
  } catch { /* ignore unavailable storage */ }
}

function getPreviewDataNodes() {
  return currentNodes;
}

function loadPreviewDataMode() {
  try {
    const value = localStorage.getItem(PREVIEW_MODE_STORAGE_KEY);
    return value === 'api' || value === 'raw' ? 'api' : 'nodes';
  } catch { return 'nodes'; }
}

function savePreviewDataMode() {
  try { localStorage.setItem(PREVIEW_MODE_STORAGE_KEY, previewDataMode); } catch { /* ignore unavailable storage */ }
}

function applyPreviewDataMode() {
  previewModeButtons?.forEach((button) => {
    const active = button.dataset.previewMode === previewDataMode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  if (previewDataModeHintEl) previewDataModeHintEl.textContent = previewDataMode === 'api' ? 'API 数据：过滤后的纯文本' : '节点结果：卡片展示';
}

function parsePreviewJsonHeader(value) {
  if (!value) return null;
  try { return JSON.parse(decodeURIComponent(value)); } catch { return null; }
}

function renderPreviewDataStatus() {
  if (!previewDataStatusEl) return;
  const stats = previewDataMeta.filterStats;
  if (stats && Number.isFinite(Number(stats.inputCount))) {
    const input = Number(stats.inputCount) || 0;
    const output = Number(stats.outputCount) || 0;
    const filtered = Math.max(0, input - output);
    previewDataStatsEl.textContent = \`原始 \${input} · 过滤 \${filtered} · 保留 \${output}\`;
  } else {
    previewDataStatsEl.textContent = '';
  }
  const cache = previewDataMeta.cache === 'hit' ? '缓存命中' : previewDataMeta.cache === 'miss' ? '刚刚检测' : '';
  previewDataCacheEl.textContent = cache;
  previewDataUpdatedEl.textContent = previewDataMeta.generatedAt ? '更新时间：' + formatSourceTime(previewDataMeta.generatedAt) : '';
  previewDataStatusEl.hidden = !(previewDataStatsEl.textContent || cache || previewDataUpdatedEl.textContent);
}

function setPreviewDataMode(mode) {
  const nextMode = mode === 'api' ? 'api' : 'nodes';
  if (nextMode === previewDataMode) return;
  previewDataMode = nextMode;
  savePreviewDataMode();
  applyPreviewDataMode();
  updateRegionOptions();
  updateNodeFilterOptions();
  renderNodeView();
}

function getNodeRegion(node) {
  const remark = String(node?.remark || '');
  const regionClass = getRegionClass(remark);
  const match = regionMap.find((item) => item.class === regionClass);
  return match ? match.keys[match.keys.length - 1] : '其他';
}

function getVisibleNodes() {
  const query = (nodesSearchEl?.value || '').trim().toLowerCase();
  const region = nodesRegionFilterEl?.value || '';
  const sort = nodesSortEl?.value || 'default';
  const source = nodesSourceFilterEl?.value || '';
  const status = nodesStatusFilterEl?.value || '';
  const visible = getPreviewDataNodes().filter((node) => {
    const text = (String(node.host || '') + ' ' + String(node.remark || '')).toLowerCase();
    const availability = getNodeAvailability(node);
    return (!query || text.includes(query)) && (!region || getNodeRegion(node) === region)
      && (!source || (node.sourceType + ':' + node.sourceKey) === source)
      && (!status || availability === status);
  });
  if (sort !== 'default') {
    const [field, direction] = sort.split('-');
    visible.sort((a, b) => {
      if (field === 'duration' || field === 'availability') {
        const left = field === 'duration' ? getNodeDuration(a) : getAvailabilityRank(getNodeAvailability(a));
        const right = field === 'duration' ? getNodeDuration(b) : getAvailabilityRank(getNodeAvailability(b));
        return (left - right) * (direction === 'desc' ? -1 : 1);
      }
      const left = String(field === 'host' ? a.host : field === 'remark' ? a.remark || '' : field === 'region' ? getNodeRegion(a) : getNodeSourceLabel(a)).toLocaleLowerCase();
      const right = String(field === 'host' ? b.host : field === 'remark' ? b.remark || '' : field === 'region' ? getNodeRegion(b) : getNodeSourceLabel(b)).toLocaleLowerCase();
      return left.localeCompare(right, 'zh-CN') * (direction === 'desc' ? -1 : 1);
    });
  }
  return visible;
}

function getNodeSourceStatus(node) {
  return node?.sourceType && node?.sourceKey ? getSourceStatus(node.sourceType, node.sourceKey) : null;
}
function getNodeAvailability(node) {
  const status = getNodeSourceStatus(node);
  if (!status || !status.state || status.state === 'idle') return 'unknown';
  return status.state === 'success' ? 'available' : 'unavailable';
}
function getAvailabilityRank(value) { return value === 'available' ? 0 : value === 'unavailable' ? 1 : 2; }
function getNodeDuration(node) { const value = Number(getNodeSourceStatus(node)?.durationMs); return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER; }
function getNodeSourceLabel(node) { return node?.sourceKey ? (node.sourceType === 'apis' ? 'API 源 · ' : '订阅源 · ') + node.sourceKey : '来源未知'; }

function updateRegionOptions() {
  if (!nodesRegionFilterEl) return;
  const selected = nodesRegionFilterEl.value || routeStateValue('region');
  const regions = [...new Set(getPreviewDataNodes().map(getNodeRegion))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  nodesRegionFilterEl.innerHTML = '<option value="">全部地区</option>' + regions.map((region) => \`<option value="\${region.replace(/"/g, '&quot;')}">\${region}</option>\`).join('');
  if (regions.includes(selected)) nodesRegionFilterEl.value = selected;
}

function updateNodeFilterOptions() {
  if (!nodesSourceFilterEl) return;
  const selected = nodesSourceFilterEl.value || routeStateValue('source');
  const sources = [...new Map(getPreviewDataNodes().filter((node) => node.sourceKey).map((node) => [node.sourceType + ':' + node.sourceKey, node])).values()];
  nodesSourceFilterEl.innerHTML = '<option value="">全部来源</option>' + sources.map((node) => {
    const value = node.sourceType + ':' + node.sourceKey;
    const label = (node.sourceType === 'apis' ? 'API 源 · ' : '订阅源 · ') + node.sourceKey;
    return '<option value="' + value.replace(/"/g, '&quot;') + '">' + label.replace(/</g, '&lt;') + '</option>';
  }).join('');
  if (sources.some((node) => node.sourceType + ':' + node.sourceKey === selected)) nodesSourceFilterEl.value = selected;
}

function renderNodeView() {
  currentPage = 1;
  const visible = getVisibleNodes();
  renderNodes(visible);
  if (nodesCountEl) {
    const total = getPreviewDataNodes().length;
    nodesCountEl.textContent = visible.length === total
      ? \`共 \${total} 个节点\`
      : \`显示 \${visible.length} / 共 \${total} 个节点\`;
  }
  if (nodesFilterResetEl) nodesFilterResetEl.disabled = !((nodesSearchEl?.value || '').trim() || nodesRegionFilterEl?.value || nodesSourceFilterEl?.value || nodesStatusFilterEl?.value || nodesSortEl?.value !== 'default');
}

function formatPreviewNodeLine(node) {
  return node?.outputValue || (node?.remark && node.remark !== '未命名' ? node.host + '#' + node.remark : node?.host || '');
}

function previewOutputValue(value = '8.209.253.101:34237#JP') {
  const prefix = $('editCustomApiPrefix')?.value || '';
  const separator = '';
  const suffix = $('editCustomApiSuffix')?.value || '';
  const strategy = $('editCustomApiSuffixStrategy')?.value || 'skip';
  const hashIndex = value.indexOf('#');
  const base = hashIndex >= 0 ? value.slice(0, hashIndex) : value;
  const remark = hashIndex >= 0 ? value.slice(hashIndex + 1) : '';
  const suffixPart = suffix ? separator + suffix : '';
  let outputRemark = remark;
  if (strategy === 'replace') outputRemark = prefix + suffixPart;
  else {
    if (prefix && !outputRemark.startsWith(prefix)) outputRemark = prefix + outputRemark;
    if (suffixPart && !(strategy === 'skip' && outputRemark.endsWith(suffixPart))) outputRemark += suffixPart;
  }
  return outputRemark ? base + '#' + outputRemark : base;
}

function updateCustomApiOutputPreview() {
  const output = $('editCustomApiOutputPreview');
  if (output) output.textContent = previewOutputValue();
}

function bindCustomApiOutputPreview() {
  ['editCustomApiPrefix', 'editCustomApiSuffix', 'editCustomApiSuffixStrategy'].forEach((id) => {
    const input = $(id);
    if (!input || input.dataset.previewBound === 'true') return;
    input.dataset.previewBound = 'true';
    input.addEventListener('input', updateCustomApiOutputPreview);
    input.addEventListener('change', updateCustomApiOutputPreview);
  });
}

function readCustomApiOutputSetting(id, maxLength, label) {
  const input = $(id);
  const value = input?.value || '';
  if (/[\u0000-\u001F\u007F]/u.test(value)) throw new Error(label + '不能包含换行或控制字符');
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new Error(label + '不能超过 ' + maxLength + ' 个字符');
  return normalized;
}

function getPreviewApiUrl() {
  const selectedPath = $('previewApiSelect')?.value || '';
  if (selectedPath) return window.location.origin + '/' + selectedPath;
  return null;
}

async function fetchNodes(emptyRetry = 0) {
  const sequence = ++nodeLoadSequence;
  if (activeNodeRequest) activeNodeRequest.abort();
  const controller = new AbortController();
  activeNodeRequest = controller;
  nodesContainer.innerHTML = nodeSkeletonMarkup();
  paginationEl.innerHTML = '';
  previewDataMeta = { filterStats: null, cache: '', generatedAt: '' };
  if (previewDataStatsEl) previewDataStatsEl.textContent = '正在检测…';
  if (previewDataCacheEl) previewDataCacheEl.textContent = '';
  if (previewDataUpdatedEl) previewDataUpdatedEl.textContent = '';
  if (previewDataStatusEl) previewDataStatusEl.hidden = false;
  renderPreviewSourceErrors();
  const apiUrl = getPreviewApiUrl();
  if (!apiUrl) {
    currentNodes = [];
    previewDataMeta = { filterStats: null, cache: '', generatedAt: '' };
    renderPreviewDataStatus();
    updateRegionOptions();
    updateNodeFilterOptions();
    renderNodeView();
    if (activeNodeRequest === controller) activeNodeRequest = null;
    return;
  }
  
  try {
    // 请求节点原始数据
    const nodeRes = await fetch(apiUrl, { signal: controller.signal, cache: 'no-store' });
    if (!nodeRes.ok) throw new Error('请求失败: ' + nodeRes.status);
    const sourceErrors = parseSourceErrors(nodeRes.headers.get('x-source-errors'));
    const nodeSources = parseSourceErrors(nodeRes.headers.get('x-node-sources'));
    previewDataMeta = {
      filterStats: parsePreviewJsonHeader(nodeRes.headers.get('x-filter-stats')),
      cache: nodeRes.headers.get('x-preview-cache') || '',
      generatedAt: nodeRes.headers.get('x-preview-generated-at') || '',
    };
    renderPreviewDataStatus();
    renderPreviewSourceErrors(sourceErrors);
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
    
    const sourceMap = new Map(nodeSources.map((item) => [item.value, item]));
    nodes.forEach((node) => {
      const outputValue = node.host + (node.remark !== '未命名' ? '#' + node.remark : '');
      const source = sourceMap.get(outputValue);
      const originalValue = source?.originalValue || outputValue;
      const originalHashIndex = originalValue.indexOf('#');
      if (originalHashIndex >= 0) {
        node.host = originalValue.slice(0, originalHashIndex).trim();
        node.remark = originalValue.slice(originalHashIndex + 1).trim() || '未命名';
      } else {
        node.host = originalValue;
        node.remark = '未命名';
      }
      node.outputValue = outputValue;
      if (source) { node.sourceType = source.type; node.sourceKey = source.key; }
    });
    currentNodes = nodes;
    updateRegionOptions();
    updateNodeFilterOptions();
    currentPage = 1;
    if (nodes.length === 0 && sourceErrors.length === 0 && emptyRetry < emptyNodeRetryDelays.length) {
      nodesContainer.innerHTML = nodeSkeletonMarkup(4) + '<div class="nodes-loading retry-loading">暂未获取到节点，正在重试...</div>';
      nodesCountEl.textContent = '正在获取节点';
      window.setTimeout(() => {
        if (sequence === nodeLoadSequence) fetchNodes(emptyRetry + 1);
      }, emptyNodeRetryDelays[emptyRetry]);
      return;
    }
    renderNodeView();
  } catch (err) {
    if (err.name === 'AbortError') return;
    nodesContainer.innerHTML = '';
    const error = document.createElement('div');
    error.className = 'nodes-error';
    error.textContent = '加载失败：' + err.message;
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'btn-outline';
    retry.textContent = '重试';
    retry.onclick = fetchNodes;
    error.appendChild(retry);
    nodesContainer.appendChild(error);
    nodesCountEl.textContent = '共 0 个节点';
    previewDataMeta = { filterStats: null, cache: '', generatedAt: '' };
    renderPreviewDataStatus();
  } finally {
    if (activeNodeRequest === controller) activeNodeRequest = null;
  }
}

function renderNodes(nodes) {
  if (nodes.length === 0) {
    const filtered = getPreviewDataNodes().length > 0;
    nodesContainer.innerHTML = '<div class="nodes-empty"><strong>' + (filtered ? '暂无匹配节点' : '暂无节点数据') + '</strong><span>' + (filtered ? '可以清除筛选后查看全部节点。' : '请先添加数据源，然后重新加载。') + '</span>' + (filtered ? '<button type="button" class="btn-outline" onclick="nodesFilterResetEl?.click()">清除筛选</button>' : '<a class="btn-outline nodes-empty-link" href="' + adminUrl('/manage') + '">管理数据源</a>') + '<button type="button" class="btn-outline" onclick="fetchNodes()">重新加载</button></div>';
    return;
  }

  if (previewDataMode === 'api') {
    const raw = document.createElement('pre');
    raw.className = 'preview-api-data';
    raw.setAttribute('aria-label', 'API 数据');
    raw.textContent = nodes.map(formatPreviewNodeLine).join('\\n');
    const wrapper = document.createElement('div');
    wrapper.className = 'preview-api-data-wrap';
    const topButton = document.createElement('button');
    topButton.type = 'button';
    topButton.className = 'btn-subtle preview-api-top-button';
    topButton.textContent = '返回数据顶部';
    topButton.setAttribute('aria-label', '返回 API 数据顶部');
    topButton.setAttribute('aria-hidden', 'true');
    topButton.tabIndex = -1;
    const updateTopButton = () => {
      const visible = raw.scrollTop > 160;
      topButton.classList.toggle('is-visible', visible);
      topButton.setAttribute('aria-hidden', String(!visible));
      topButton.tabIndex = visible ? 0 : -1;
    };
    topButton.onclick = () => {
      if (typeof raw.scrollTo === 'function') raw.scrollTo({ top: 0, behavior: 'smooth' });
      else raw.scrollTop = 0;
      updateTopButton();
    };
    raw.addEventListener('scroll', updateTopButton, { passive: true });
    requestAnimationFrame(updateTopButton);
    wrapper.append(raw, topButton);
    nodesContainer.replaceChildren(wrapper);
    paginationEl.innerHTML = '';
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
    item.tabIndex = 0;
    item.setAttribute('role', 'article');
    
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

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button'; copyBtn.className = 'node-copy'; copyBtn.textContent = '复制';
    copyBtn.title = '复制此节点';
    copyBtn.setAttribute('aria-label', '复制节点 ' + node.host);
    copyBtn.onclick = async () => {
      try { await navigator.clipboard.writeText(formatPreviewNodeLine(node)); copyBtn.textContent = '已复制'; setTimeout(() => { copyBtn.textContent = '复制'; }, 1200); }
      catch (error) { showToast('复制失败：' + error.message, 'error'); }
    };
    const meta = document.createElement('div'); meta.className = 'node-meta'; meta.append(tagEl, copyBtn);
    
    item.appendChild(hostEl);
    item.appendChild(meta);
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
  const totalPages = Math.ceil(getVisibleNodes().length / pageSize);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderNodes(getVisibleNodes());
  // 平滑滚动到节点区域顶部
  document.querySelector('.card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ======================== 优选 API 管理 ========================
let customApis = {};
let customApisDirty = false;
let blacklistDirty = false;
let filterRulesDirty = false;
let pendingCustomApiDelete = null;
let pendingSourceDeleteAction = null;
let sourceRawRequest = null;
let sourceRawSelection = null;
let sourceRawNodes = [];
let sourceRawRawContent = '';
let sourceRawRecords = {};
let sourceRawUnfilteredNodes = [];
let sourceRawUnfilteredSourceNodes = new Map();
const sourceRawCache = new Map();
let sourceRawRefreshTimer = null;
let sourceRawLastVisible = [];
let sourceRawLastRawVisible = [];
let sourceRawNodeSources = new Map();
let sourceRawSourceMeta = new Map();
let sourceRawSourceErrors = new Map();
let sourceRawSourceStats = new Map();
let sourceRawCollapsedGroups = new Set();
let sourceRawSourceFilter = 'all';
let sourceRawRetryingGroup = '';
let sourceRawSourceSort = 'config';
let sourceRawPageScrollY = 0;
let sourceRawPageScrollLocked = false;

function lockSourceRawPageScroll() {
  if (sourceRawPageScrollLocked) return;
  sourceRawPageScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  sourceRawPageScrollLocked = true;
  document.documentElement.classList.add('source-raw-scroll-locked');
  document.body.classList.add('source-raw-scroll-locked');
}

function unlockSourceRawPageScroll() {
  if (!sourceRawPageScrollLocked) return;
  sourceRawPageScrollLocked = false;
  document.documentElement.classList.remove('source-raw-scroll-locked');
  document.body.classList.remove('source-raw-scroll-locked');
  window.scrollTo(0, sourceRawPageScrollY);
}

function sourceRawCacheKey(type, key) { return 'source-preview:' + type + ':' + key; }
function sourceRawViewStateKey(type, key) { return 'source-preview-view:' + type + ':' + key; }
function sourceRawHistoryKey(type, key) { return 'source-preview-history:' + type + ':' + key; }
function loadSourceRawHistory(type, key) {
  try {
    const value = JSON.parse(localStorage.getItem(sourceRawHistoryKey(type, key)) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}
function saveSourceRawHistory(type, key, item) {
  const history = [item, ...loadSourceRawHistory(type, key)].slice(0, 10);
  try { localStorage.setItem(sourceRawHistoryKey(type, key), JSON.stringify(history)); } catch { /* ignore unavailable storage */ }
  renderSourceRawHistory(history);
}
function renderSourceRawHistory(history = []) {
  const list = $('sourceRawHistoryList');
  if (!list) return;
  list.replaceChildren();
  if (!history.length) { list.textContent = '暂无检测记录'; return; }
  history.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'source-raw-history-item';
    const time = document.createElement('time');
    time.textContent = formatSourceRawTime(item.at);
    const summary = document.createElement('span');
    summary.textContent = '原始 ' + (item.raw ?? 0) + ' · 保留 ' + (item.kept ?? 0) + ' · 过滤 ' + (item.filtered ?? 0) + (item.errors ? ' · 异常 ' + item.errors : '');
    row.append(time, summary);
    if (Array.isArray(item.nodes)) {
      const view = document.createElement('button');
      view.type = 'button';
      view.className = 'source-raw-history-view';
      view.textContent = '查看节点';
      view.onclick = () => showSourceRawHistoryItem(item);
      row.appendChild(view);
    }
    list.appendChild(row);
  });
}

let sourceRawHistoryDialogItem = null;
let sourceRawHistoryDialogTab = 'nodes';
let sourceRawHistoryDialogVisible = [];

function renderSourceRawHistoryDialog() {
  const item = sourceRawHistoryDialogItem;
  const content = $('sourceRawHistoryDialogContent');
  const search = ($('sourceRawHistoryDialogSearch')?.value || '').trim().toLowerCase();
  if (!item || !content) return;
  const all = sourceRawHistoryDialogTab === 'raw'
    ? (Array.isArray(item.unfilteredNodes) ? item.unfilteredNodes : [])
    : (Array.isArray(item.nodes) ? item.nodes : []);
  sourceRawHistoryDialogVisible = all.filter((node) => !search || String(node).toLowerCase().includes(search));
  content.textContent = sourceRawHistoryDialogVisible.length ? sourceRawHistoryDialogVisible.join('\\n') : '没有匹配的数据。';
}

function renderSourceRawHistoryDialogSummary(item) {
  const summary = $('sourceRawHistoryDialogSummary');
  if (!summary) return;
  summary.replaceChildren();
  [['状态', '历史记录'], ['可用节点', item.kept ?? item.nodes?.length ?? 0], ['原始节点', item.raw ?? item.unfilteredNodes?.length ?? 0], ['过滤节点', item.filtered ?? 0], ['异常来源', item.errors ?? 0]].forEach(([label, value]) => {
    const metric = document.createElement('div');
    metric.className = 'source-raw-metric';
    const number = document.createElement('strong');
    number.textContent = String(value);
    const caption = document.createElement('span');
    caption.textContent = label;
    metric.append(number, caption);
    summary.appendChild(metric);
  });
}

function closeSourceRawHistoryDialog() {
  const dialog = $('sourceRawHistoryDialog');
  if (dialog?.open) dialog.close();
  sourceRawHistoryDialogItem = null;
  sourceRawHistoryDialogVisible = [];
  document.body.classList.remove('source-raw-history-dialog-open');
}

function showSourceRawHistoryItem(item) {
  if (!item) return;
  const dialog = $('sourceRawHistoryDialog');
  if (!dialog) return;
  sourceRawHistoryDialogItem = item;
  sourceRawHistoryDialogTab = 'nodes';
  const meta = $('sourceRawHistoryDialogMeta');
  const search = $('sourceRawHistoryDialogSearch');
  if (meta) meta.textContent = '检测时间：' + formatSourceRawTime(item.at);
  if (search) search.value = '';
  renderSourceRawHistoryDialogSummary(item);
  document.querySelectorAll('[data-source-history-tab]').forEach((button) => {
    button.onclick = () => {
      sourceRawHistoryDialogTab = button.dataset.sourceHistoryTab === 'raw' ? 'raw' : 'nodes';
      document.querySelectorAll('[data-source-history-tab]').forEach((tab) => {
        const active = tab.dataset.sourceHistoryTab === sourceRawHistoryDialogTab;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      renderSourceRawHistoryDialog();
    };
  });
  if (search) search.oninput = renderSourceRawHistoryDialog;
  const copy = $('copySourceRawHistoryDialogButton');
  if (copy) copy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(sourceRawHistoryDialogVisible.join('\\n'));
      showToast('历史筛选结果已复制', 'success');
    } catch (error) {
      showToast('复制失败：' + error.message, 'error');
    }
  };
  dialog.onclose = () => {
    sourceRawHistoryDialogItem = null;
    document.body.classList.remove('source-raw-history-dialog-open');
  };
  if (!dialog.open) dialog.showModal();
  document.body.classList.add('source-raw-history-dialog-open');
  const body = dialog.querySelector('.source-raw-body');
  if (body) body.scrollTop = 0;
  renderSourceRawHistoryDialog();
}

async function loadSourceRawHistoryFromDb(type, key, signal) {
  if (type !== 'customApis') return;
  try {
    const response = await fetch('/api/detection-history?path=' + encodeURIComponent(key) + '&limit=10', { credentials: 'same-origin', cache: 'no-store', signal });
    const result = await response.json();
    if (!response.ok || !result.available || !Array.isArray(result.items) || sourceRawSelection?.type !== type || sourceRawSelection?.key !== key) return;
    renderSourceRawHistory(result.items);
  } catch (error) {
    if (error?.name !== 'AbortError') return;
  }
}
function loadSourceRawViewState(type, key) {
  try {
    const value = JSON.parse(localStorage.getItem(sourceRawViewStateKey(type, key)) || 'null');
    return value && typeof value === 'object' ? value : null;
  } catch { return null; }
}
function saveSourceRawViewState() {
  if (sourceRawSelection?.type !== 'customApis') return;
  const state = {
    query: $('sourceRawSearch')?.value || '',
    filter: sourceRawSourceFilter,
    sort: sourceRawSourceSort,
  };
  try { localStorage.setItem(sourceRawViewStateKey(sourceRawSelection.type, sourceRawSelection.key), JSON.stringify(state)); } catch { /* ignore unavailable storage */ }
}
function loadSourceRawCache(type, key) {
  const cacheKey = sourceRawCacheKey(type, key);
  if (sourceRawCache.has(cacheKey)) return sourceRawCache.get(cacheKey);
  try {
    const saved = JSON.parse(localStorage.getItem(cacheKey) || 'null');
    if (saved && Array.isArray(saved.nodes) && Date.now() - Number(saved.savedAt || 0) < 24 * 60 * 60 * 1000) {
      const normalized = normalizeSourceRawCache(saved);
      sourceRawCache.set(cacheKey, normalized);
      return normalized;
    }
  } catch { /* ignore unavailable or malformed browser storage */ }
  return null;
}

function parseLegacySourceGroupLabel(label) {
  if (!label || label === '未识别来源') return null;
  const parts = String(label).split(' · ');
  const typeLabel = parts.shift() || '';
  const type = typeLabel === 'API 源' ? 'apis' : typeLabel === '订阅源' ? 'subs' : '';
  const key = parts.shift() || '';
  return type && key ? { type, key, remark: parts.join(' · ').replace(/^备注：/, '').trim() } : null;
}

function normalizeSourceRawCache(saved) {
  const sourceMeta = new Map();
  const sourceIds = new Map();
  (Array.isArray(saved.sourceMeta) ? saved.sourceMeta : []).forEach(([legacyId, value]) => {
    const meta = value && typeof value === 'object' ? value : parseLegacySourceGroupLabel(legacyId);
    if (!meta?.type || !meta.key) return;
    const id = sourceGroupId(meta.type, meta.key);
    sourceMeta.set(id, { type: meta.type, key: meta.key, remark: meta.remark || '' });
    sourceIds.set(legacyId, id);
  });
  const normalizeId = (value) => {
    if (sourceIds.has(value)) return sourceIds.get(value);
    if (sourceMeta.has(value)) return value;
    const legacy = parseLegacySourceGroupLabel(value);
    if (!legacy) return value;
    const id = sourceGroupId(legacy.type, legacy.key);
    if (!sourceMeta.has(id)) sourceMeta.set(id, legacy);
    return id;
  };
  const normalizeNodeSources = (entries) => (Array.isArray(entries) ? entries : []).map(([node, ids]) => [node, Array.isArray(ids) ? ids.map(normalizeId) : ids]);
  const normalizeSourceNodes = (entries) => (Array.isArray(entries) ? entries : []).map(([id, nodes]) => [normalizeId(id), nodes]);
  return {
    ...saved,
    records: saved.records && typeof saved.records === 'object' ? saved.records : {},
    sourceMeta: [...sourceMeta],
    sourceStats: normalizeSourceNodes(saved.sourceStats),
    sourceErrors: (Array.isArray(saved.sourceErrors) ? saved.sourceErrors : []).map(([id, error]) => [normalizeId(id), error]),
    nodeSources: normalizeNodeSources(saved.nodeSources),
    unfilteredSourceNodes: normalizeSourceNodes(saved.unfilteredSourceNodes),
  };
}
function saveSourceRawCache(type, key, value) {
  const cacheKey = sourceRawCacheKey(type, key);
  sourceRawCache.set(cacheKey, value);
  try { localStorage.setItem(cacheKey, JSON.stringify(value)); } catch { /* memory cache remains available */ }
}

function sourceGroupId(type, key) {
  return String(type || '') + ':' + String(key || '');
}

function sourceGroupTypeLabel(type) {
  return type === 'apis' ? 'API 源' : type === 'domains' ? '优选域名' : type === 'subs' ? '订阅源' : '来源';
}

function sourceGroupShortName(key) {
  let shortName = String(key || '').split('/').pop() || String(key || '');
  return shortName.split('?')[0].replace(/\.(txt|json|csv)$/i, '');
}

function sourceGroupLabelFromMeta(meta, keepType = false) {
  if (!meta) return '未识别来源';
  const type = sourceGroupTypeLabel(meta.type);
  const remark = String(meta.remark || '').trim();
  if (remark) return keepType ? type + ' · ' + remark : remark;
  const name = sourceGroupShortName(meta.key);
  return keepType ? type + ' · ' + name : name;
}

function sourceGroupDetailFromMeta(meta) {
  if (!meta) return '';
  return sourceGroupTypeLabel(meta.type) + ' · ' + meta.key;
}

function sourceGroupKeptCount(id) {
  let count = 0;
  sourceRawNodeSources.forEach((ids) => {
    if (Array.isArray(ids) && ids.includes(id)) count += 1;
  });
  return count;
}

function sourceGroupStats(id, groupNodes) {
  const stored = sourceRawSourceStats.get(id) || {};
  const raw = Number(stored.raw ?? sourceRawUnfilteredSourceNodes.get(id)?.length ?? groupNodes.length) || 0;
  const kept = Number(stored.kept ?? sourceGroupKeptCount(id)) || 0;
  return { raw, kept, filtered: Math.max(0, raw - kept) };
}

function sourceGroupStatsText(stats) {
  return '原始 ' + stats.raw + ' · 保留 ' + stats.kept + ' · 过滤 ' + stats.filtered;
}

let sourceRawTab = 'nodes';

function setCustomApisDirty(dirty = true) {
  customApisDirty = dirty;
  const status = $('customApiSaveStatus');
  const button = $('saveCustomApisButton');
  if (status) {
    status.textContent = dirty ? '有未保存的修改' : '配置已保存';
    status.className = 'save-status' + (dirty ? ' dirty' : '');
  }
  if (button) button.disabled = !dirty;
}

async function persistCustomApis(message = '') {
  const saved = await saveCustomApis(false);
  if (saved && message) showToast(message, 'success');
  return saved;
}

function normalizeCustomApiPath(value) {
  return String(value || '').trim().replace(/^\\/+/, '');
}

function validateCustomApiPath(path, currentPath = '') {
  if (!path) return '请输入访问路径';
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(path)) return '仅支持字母、数字、短横线和下划线，最长 128 个字符';
  if (['admin', 'api', 'login', 'logout'].includes(path.toLowerCase())) return '该路径为系统保留路径';
  if (path !== currentPath && customApis[path]) return '访问路径已存在';
  return '';
}

async function loadCustomApis(loadSources = false) {
  if ($('customApisList')) $('customApisList').innerHTML = listSkeletonMarkup();
  if (loadSources) {
    $('newCustomApiSources') && ($('newCustomApiSources').innerHTML = sourcePickerSkeletonMarkup());
    $('editCustomApiSources') && ($('editCustomApiSources').innerHTML = sourcePickerSkeletonMarkup());
  }
  const requests = [readJsonResponse('/api/custom-apis', '优选 API 配置')];
  if (loadSources) {
    requests.push(readJsonResponse('/api/subs', '订阅源配置'), readJsonResponse('/api/apis', 'API 源配置'), readJsonResponse('/api/preferred-domains', '优选域名配置'));
  }
  const results = await Promise.allSettled(requests);
  if (results[0].status === 'rejected') {
    renderLoadError('customApisList', results[0].reason.message, () => loadCustomApis(loadSources));
    showToast(results[0].reason.message, 'error');
    return;
  }
  customApis = results[0].value;
  const sourceErrors = [];
  if (loadSources) {
    if (results[1].status === 'fulfilled') subs = results[1].value;
    else {
      subs = {};
      sourceErrors.push({ type: 'subs', message: results[1].reason.message });
    }
    if (results[2].status === 'fulfilled') apis = results[2].value;
    else {
      apis = {};
      sourceErrors.push({ type: 'apis', message: results[2].reason.message });
    }
    if (results[3].status === 'fulfilled') preferredDomains = results[3].value;
    else {
      preferredDomains = {};
      sourceErrors.push({ type: 'domains', message: results[3].reason.message });
    }
    renderSourceLoadStatus(sourceErrors);
  }
  setCustomApisDirty(false);
  if ($('customApisList')) renderCustomApis();
  renderCustomApiSelect();
  renderNewCustomApiSources();
}

function exportCustomApis() {
  const blob = new Blob([JSON.stringify(customApis, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'custom-apis-backup-' + beijingStamp() + '.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast('配置已导出', 'success');
}

function importCustomApis(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('配置格式无效');
      const response = await fetch('/api/custom-apis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('请求失败：' + response.status);
      await loadCustomApis();
      showToast('导入成功，共 ' + Object.keys(customApis).length + ' 个优选 API', 'success');
    } catch (error) { showToast('导入失败：' + error.message, 'error'); }
    event.target.value = '';
  };
  reader.readAsText(file);
}

function sourceEntries() {
  return [
    // 已禁用的订阅源/API 源/优选域名不作为可选数据源展示，也不参与输出。
    ...Object.entries(subs).filter(([, value]) => value?.enabled !== false).map(([key, value]) => ({ type: 'subs', key, label: value.remark || key })),
    ...Object.entries(apis).filter(([, value]) => value?.enabled !== false).map(([key, value]) => ({ type: 'apis', key, label: value.remark || key })),
    ...Object.entries(preferredDomains).filter(([, value]) => value?.enabled !== false).map(([key, value]) => ({ type: 'domains', key, label: value.remark || key })),
  ];
}

let sourceStatuses = { subs: {}, apis: {}, domains: {} };
let sourceStatusRequestVersion = 0;
let preferredDomains = {};
let preferredDomainStatuses = {};

function formatPreferredDomainTime(value) {
  if (!value) return '尚未解析';
  try { return new Date(value).toLocaleString('zh-CN', { hour12: false }); } catch { return '尚未解析'; }
}

function preferredDomainStatusCategory(status) {
  const state = status?.state;
  if (state === 'checking') return 'checking';
  if (state === 'success') return Object.keys(status?.dnsErrors || {}).length > 0 ? 'partial' : 'success';
  if (['empty', 'error', 'timeout', 'http-error', 'network-error'].includes(state)) return 'failed';
  return 'idle';
}

function renderPreferredDomains() {
  const container = $('preferredDomainsList');
  if (!container) return;
  container.innerHTML = '';
  const query = ($('preferredDomainsSearch')?.value || '').trim().toLowerCase();
  const sort = $('preferredDomainsSort')?.value || 'default';
  const statusFilter = $('preferredDomainsStatusFilter')?.value || 'all';
  let entries = Object.entries(preferredDomains || {}).filter(([domain, entry]) => !query || (domain + ' ' + (entry.remark || '')).toLowerCase().includes(query));
  if (statusFilter !== 'all') {
    entries = entries.filter(([domain, entry]) => preferredDomainStatusCategory(getPreferredDomainStatus(domain, entry)) === statusFilter);
  }
  if (sort === 'name-asc' || sort === 'name-desc') entries.sort((a, b) => a[0].localeCompare(b[0], 'zh-CN') * (sort === 'name-desc' ? -1 : 1));
  if (sort === 'checked-desc') {
    entries.sort((a, b) => (Date.parse(getPreferredDomainStatus(b[0], b[1]).lastAttemptAt) || 0) - (Date.parse(getPreferredDomainStatus(a[0], a[1]).lastAttemptAt) || 0) || a[0].localeCompare(b[0], 'zh-CN'));
  }
  if (sort === 'abnormal') {
    const rank = { failed: 0, partial: 1, checking: 2, idle: 3, success: 4 };
    entries.sort((a, b) => rank[preferredDomainStatusCategory(getPreferredDomainStatus(a[0], a[1]))] - rank[preferredDomainStatusCategory(getPreferredDomainStatus(b[0], b[1]))] || a[0].localeCompare(b[0], 'zh-CN'));
  }
  if (!entries.length) {
    const empty = document.createElement('div');
    empty.className = 'data-empty preferred-domain-empty';
    empty.textContent = '暂无优选域名，请先添加一个域名。';
    container.appendChild(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  entries.forEach(([domain, entry]) => {
    const disabled = entry?.enabled === false;
    const row = document.createElement('div');
    row.className = 'row preferred-domain-row' + (disabled ? ' source-disabled-row' : '');
    row.dataset.sourceKey = domain;
    const select = document.createElement('input');
    select.type = 'checkbox';
    select.className = 'source-select';
    select.dataset.key = domain;
    select.setAttribute('aria-label', '选择优选域名 ' + domain);
    // 启用开关紧跟复选框：禁用的域名不参与优选 API 输出，也不出现在数据源选择列表。
    const enabledSwitch = createSourceSwitch({
      checked: !disabled,
      ariaLabel: '启用优选域名 ' + domain,
      onChange: (input, text) => setPreferredDomainEnabled(domain, input.checked, { input, text }),
    });
    const remarkInput = document.createElement('input');
    remarkInput.className = 'remark-input';
    remarkInput.value = entry?.remark || '';
    remarkInput.placeholder = '备注（可选）';
    remarkInput.style.maxWidth = '180px';
    remarkInput.onchange = async () => {
      await savePreferredDomain(domain, remarkInput.value);
    };
    const identity = document.createElement('div');
    identity.className = 'preferred-domain-identity';
    const domainInput = document.createElement('input');
    domainInput.className = 'host-input';
    domainInput.value = domain;
    domainInput.title = domain;
    domainInput.setAttribute('aria-label', '域名 ' + domain);
    domainInput.onchange = async () => {
      const nextDomain = domainInput.value.trim();
      if (!nextDomain || nextDomain.toLowerCase() === domain) { domainInput.value = domain; return; }
      if (!window.confirm('确定将域名 "' + domain + '" 改为 "' + nextDomain + '" 吗？\\n新域名将重新解析 DNS 记录，旧域名的解析结果会被删除，此操作不可撤销。')) {
        domainInput.value = domain;
        return;
      }
      await savePreferredDomain(nextDomain, entry?.remark || '', domain);
    };
    const checked = document.createElement('small');
    const domainStatus = getPreferredDomainStatus(domain, entry);
    checked.textContent = (disabled ? '已禁用 · ' : '') + '最后解析：' + formatPreferredDomainTime(domainStatus.lastAttemptAt || entry?.checkedAt);
    identity.append(domainInput, checked);

    const viewBtn = document.createElement('button');
    viewBtn.type = 'button';
    viewBtn.className = 'btn-outline icon-action source-view-button';
    viewBtn.textContent = '👁 查看';
    viewBtn.setAttribute('aria-label', '查看优选域名原始数据 ' + domain);
    viewBtn.onclick = async () => {
      viewBtn.disabled = true;
      viewBtn.textContent = '⏳ 检测中…';
      try { await openSourceRawDialog('domains', domain); }
      finally { viewBtn.disabled = false; viewBtn.textContent = '👁 查看'; }
    };
    const downloadBtn = document.createElement('button');
    downloadBtn.type = 'button';
    downloadBtn.className = 'btn-outline icon-action source-download-button';
    downloadBtn.textContent = '⬇ 下载';
    downloadBtn.setAttribute('aria-label', '下载优选域名节点数据 ' + domain);
    downloadBtn.onclick = () => downloadSourceData('domains', domain, entry, downloadBtn);
    const delBtn = document.createElement('button');
    delBtn.className = 'del-btn source-delete-button';
    delBtn.textContent = '🗑 删除';
    delBtn.setAttribute('aria-label', '删除优选域名 ' + domain);
    delBtn.onclick = () => confirmSourceDelete({
      title: '删除优选域名？',
      message: '确定删除“' + domain + '”吗？其解析结果也会一并移除，此操作不可撤销。',
      onConfirm: async () => {
        delBtn.disabled = true;
        delBtn.textContent = '⏳ 删除中…';
        try {
          await readJsonResponse('/api/preferred-domains?domain=' + encodeURIComponent(domain), '域名删除', { method: 'DELETE' });
          delete preferredDomains[domain];
          delete preferredDomainStatuses[normalizeSourceKeyClient('domains', domain)];
          renderPreferredDomains();
          showToast('已删除优选域名', 'success');
        } catch (error) { showToast(error.message, 'error'); delBtn.disabled = false; delBtn.textContent = '🗑 删除'; }
      }
    });
    row.append(select, enabledSwitch.label, remarkInput, identity, createCopyButton(domain, '域名'), createSourceHealth('domains', domain, domainStatus), createSourceCheckButton('domains', domain), viewBtn, downloadBtn, delBtn);
    fragment.appendChild(row);
  });
  container.appendChild(fragment);
}

async function savePreferredDomain(domain, remark = '', previousDomain = '') {
  try {
    // 仅改备注/同域名保存时跳过 DNS 解析；改域名为新域名时才需要重新解析。
    const resolve = Boolean(previousDomain && previousDomain !== domain);
    const current = preferredDomains[domain] || preferredDomains[previousDomain] || {};
    const entry = await readJsonResponse('/api/preferred-domains', '优选域名保存', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain, remark, resolve, enabled: current.enabled !== false }) });
    if (previousDomain && previousDomain !== entry.domain) {
      await readJsonResponse('/api/preferred-domains?domain=' + encodeURIComponent(previousDomain), '旧域名删除', { method: 'DELETE' });
      delete preferredDomains[previousDomain];
      delete preferredDomainStatuses[normalizeSourceKeyClient('domains', previousDomain)];
    }
    preferredDomains[entry.domain] = entry;
    setPreferredDomainStatus(entry.domain, preferredDomainEntryStatus(entry));
    renderPreferredDomains();
    refreshRenderedSourceStatuses([{ type: 'domains', key: entry.domain }]);
    showToast(resolve ? '优选域名已保存并重新解析' : '备注已保存', 'success');
    return true;
  } catch (error) {
    showToast(error.message, 'error');
    renderPreferredDomains();
    return false;
  }
}

async function setPreferredDomainEnabled(domain, enabled, switchUI = null) {
  const entry = preferredDomains[domain] || {};
  if (switchUI) {
    switchUI.input.disabled = true;
    switchUI.text.textContent = '处理中…';
  }
  try {
    // 禁用/启用只改状态：resolve=false 保留已有解析结果。
    const updated = await readJsonResponse('/api/preferred-domains', '优选域名状态更新', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain, remark: entry.remark || '', resolve: false, enabled }) });
    preferredDomains[updated.domain] = updated;
    renderPreferredDomains();
    showToast(enabled ? '优选域名已启用' : '优选域名已禁用，将不再参与优选 API 输出', 'success');
  } catch (error) {
    showToast(error.message, 'error');
    renderPreferredDomains();
  } finally {
    if (switchUI) {
      switchUI.input.disabled = false;
    }
  }
}

async function deletePreferredDomains(keys, trigger = null) {
  if (!keys.length) { showToast('请先选择优选域名', 'warning'); return; }
  const summary = keys.length <= 5 ? keys.join('、') : keys.slice(0, 5).join('、') + ' 等 ' + keys.length + ' 个域名';
  if (!window.confirm('确定删除选中的 ' + keys.length + ' 个优选域名吗？\\n' + summary + '\\n此操作不可撤销。')) return;
  if (trigger) setButtonBusy(trigger, true, '删除中…');
  try {
    await readJsonResponse('/api/preferred-domains/delete-batch', '域名批量删除', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domains: keys }) });
    keys.forEach((domain) => {
      delete preferredDomains[domain];
      delete preferredDomainStatuses[normalizeSourceKeyClient('domains', domain)];
    });
    renderPreferredDomains();
    showToast('已删除 ' + keys.length + ' 个优选域名', 'success');
  } catch (error) { showToast(error.message, 'error'); }
  finally { if (trigger) setButtonBusy(trigger, false); }
}

function exportPreferredDomains() {
  const blob = new Blob([JSON.stringify(preferredDomains, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'preferred-domains-backup-' + beijingStamp() + '.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast('配置已导出', 'success');
}

function importPreferredDomains(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('配置格式无效');
      const result = await readJsonResponse('/api/preferred-domains/import', '优选域名导入', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      await loadPreferredDomains();
      showToast('导入成功，共 ' + (result.count || 0) + ' 个域名（已保留配置中的解析结果，未重新解析）', 'success');
    } catch (error) { showToast('导入失败：' + error.message, 'error'); }
    event.target.value = '';
  };
  reader.readAsText(file);
}

async function loadPreferredDomains() {
  const container = $('preferredDomainsList');
  if (container) container.innerHTML = listSkeletonMarkup(2);
  try {
    const data = await readJsonResponse('/api/preferred-domains', '优选域名配置');
    preferredDomains = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    const configuredStatuses = {};
    Object.entries(preferredDomains).forEach(([domain, entry]) => {
      const normalizedDomain = normalizeSourceKeyClient('domains', domain);
      const currentStatus = preferredDomainStatuses[normalizedDomain];
      configuredStatuses[normalizedDomain] = currentStatus && currentStatus.state !== 'idle'
        ? currentStatus
        : preferredDomainEntryStatus(entry);
    });
    preferredDomainStatuses = configuredStatuses;
    renderPreferredDomains();
  } catch (error) {
    renderLoadError('preferredDomainsList', error.message, loadPreferredDomains);
    showToast(error.message, 'error');
  }
}

async function addPreferredDomain() {
  const input = $('newPreferredDomain');
  const remarkInput = $('newPreferredDomainRemark');
  const domain = input?.value.trim() || '';
  if (!domain) { setInputError(input, '请输入域名'); input?.focus(); return; }
  clearInputError(input);
  const button = $('addPreferredDomainButton');
  setButtonBusy(button, true, '解析中…');
  try {
    const entry = await readJsonResponse('/api/preferred-domains', '域名解析', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain, remark: remarkInput?.value.trim() || '' }) });
    preferredDomains[entry.domain] = entry;
    setPreferredDomainStatus(entry.domain, preferredDomainEntryStatus(entry));
    input.value = '';
    if (remarkInput) remarkInput.value = '';
    renderPreferredDomains();
    refreshRenderedSourceStatuses([{ type: 'domains', key: entry.domain }]);
    showToast('域名添加成功，解析结果已保存', 'success');
  } catch (error) {
    setInputError(input, error.message);
    showToast(error.message, 'error');
  } finally { setButtonBusy(button, false); }
}

function getSourceStatus(type, key) {
  const normalizedKey = normalizeSourceKeyClient(type, key);
  return sourceStatuses[type]?.[normalizedKey] || { state: 'idle', nodeCount: 0, rawNodeCount: 0 };
}

function getPreferredDomainStatus(domain, entry = preferredDomains[normalizeSourceKeyClient('domains', domain)]) {
  const normalizedDomain = normalizeSourceKeyClient('domains', domain);
  return preferredDomainStatuses[normalizedDomain] || preferredDomainEntryStatus(entry);
}

function preferredDomainEntryStatus(entry) {
  const records = entry?.records && typeof entry.records === 'object' ? entry.records : {};
  const dnsRecords = Object.fromEntries(['A', 'AAAA', 'CNAME'].map((type) => [type, Array.isArray(records[type]) ? records[type] : []]));
  const dnsErrors = entry?.errors && typeof entry.errors === 'object' ? entry.errors : {};
  const dnsErrorCodes = entry?.dnsErrorCodes && typeof entry.dnsErrorCodes === 'object' ? entry.dnsErrorCodes : {};
  const dnsProviders = entry?.dnsProviders && typeof entry.dnsProviders === 'object' ? entry.dnsProviders : {};
  const dnsRecordCounts = Object.fromEntries(Object.entries(dnsRecords).map(([type, values]) => [type, values.length]));
  const nodeCount = Object.values(dnsRecordCounts).reduce((total, count) => total + count, 0);
  const checkedAt = Number(entry?.checkedAt);
  const timestamp = Number.isFinite(checkedAt) && checkedAt > 0 ? new Date(checkedAt).toISOString() : null;
  return {
    state: nodeCount > 0 ? 'success' : (Object.keys(dnsErrors).length ? 'error' : (timestamp ? 'empty' : 'idle')),
    nodeCount,
    rawNodeCount: nodeCount,
    durationMs: null,
    error: Object.keys(dnsErrors).length ? Object.entries(dnsErrors).map(([type, message]) => type + ': ' + message).join('；') : '',
    errorType: Object.keys(dnsErrors).length ? 'DNS_PARTIAL_FAILURE' : '',
    lastAttemptAt: timestamp,
    lastSuccessAt: nodeCount > 0 ? timestamp : null,
    lastSuccessNodeCount: nodeCount,
    lastSuccessRawNodeCount: nodeCount,
    dnsRecords,
    dnsErrors,
    dnsErrorCodes,
    dnsProviders,
    dnsRecordCounts,
  };
}

function setPreferredDomainStatus(domain, status) {
  const normalizedDomain = normalizeSourceKeyClient('domains', domain);
  if (!normalizedDomain) return;
  const nextStatus = { ...status };
  preferredDomainStatuses[normalizedDomain] = nextStatus;
  sourceStatuses.domains ||= {};
  sourceStatuses.domains[normalizedDomain] = { ...nextStatus };
}

function createSourceHealth(type, key, statusOverride = null) {
  const status = statusOverride || getSourceStatus(type, key);
  const state = ['success', 'filtered', 'empty', 'timeout', 'http-error', 'network-error', 'error', 'checking'].includes(status.state) ? status.state : 'idle';
  const isDomain = type === 'domains';
  // 域名的多记录错误串可能很长，行内只显示第一段，完整内容放悬浮提示。
  const fullError = status.error || '';
  const shortError = isDomain ? (fullError.split('；')[0] || fullError).slice(0, 80) : fullError;
  const health = document.createElement('div');
  health.className = 'source-health source-health-' + state;
  let text = '未检测';
  if (isDomain && state === 'success') {
    const counts = status.dnsRecordCounts || {};
    const hasDnsErrors = Object.keys(status.dnsErrors || {}).length > 0;
    text = (hasDnsErrors ? '部分成功' : 'DNS 正常') + ' · A ' + (counts.A || 0) + ' · AAAA ' + (counts.AAAA || 0) + ' · CNAME ' + (counts.CNAME || 0);
  } else if (state === 'success') text = '正常 · ' + status.nodeCount + ' 个节点';
  if (state === 'filtered') text = '已过滤 · 原始 ' + status.rawNodeCount + ' 个';
  if (state === 'empty') text = '返回空数据';
  if (state === 'timeout' || state === 'http-error' || state === 'network-error' || state === 'error') text = sourceStatusLabel(state) + ' · ' + (shortError || '请求失败');
  if (state === 'checking') text = isDomain ? 'DNS 查询中…' : '检测中…';
  if (status.durationMs !== null && state !== 'idle') text += ' · ' + status.durationMs + ' ms';
  const primary = document.createElement('strong');
  primary.textContent = text;
  const checked = document.createElement('small');
  checked.textContent = status.lastAttemptAt ? '最后检测：' + formatSourceTime(status.lastAttemptAt) : '尚未检测';
  if (status.lastSuccessAt) checked.textContent += ' · 最近成功 ' + (status.lastSuccessNodeCount || 0) + ' 个节点';
  const diagnostics = document.createElement('small');
  diagnostics.textContent = isDomain
    ? '解析节点 ' + (status.nodeCount || 0) + ' · ' + (status.durationMs === null || status.durationMs === undefined ? '--' : status.durationMs + ' ms')
    : 'HTTP ' + (status.statusCode || '--')
      + ' · ' + (status.durationMs === null || status.durationMs === undefined ? '--' : status.durationMs + ' ms')
      + ' · 原始 ' + (status.rawNodeCount || 0) + ' · 过滤后 ' + (status.nodeCount || 0);
  health.append(primary, checked, diagnostics);
  if (status.error) {
    const error = document.createElement('small');
    error.className = 'source-health-error-detail';
    error.textContent = '最近错误：' + (status.errorType && isDomain ? '[' + dnsErrorCodeLabel(status.errorType) + '] ' : '') + shortError + (shortError.length < fullError.length ? '…' : '');
    error.title = fullError;
    health.appendChild(error);
  }
  health.title = (status.lastAttemptAt ? '最后检测：' + formatSourceTime(status.lastAttemptAt) : '尚未检测此数据源') + (status.error ? '；最近错误：' + status.error : '');
  health.setAttribute('aria-label', health.title);
  return health;
}

function refreshSourceHealthRows(type, sourceKeys = null) {
  const list = $(type === 'subs' ? 'subsList' : type === 'apis' ? 'apisList' : 'preferredDomainsList');
  if (!list) return;
  const normalizedKeys = sourceKeys ? new Set(sourceKeys.map((key) => normalizeSourceKeyClient(type, key))) : null;
  list.querySelectorAll('.row[data-source-key]').forEach((row) => {
    if (normalizedKeys && !normalizedKeys.has(normalizeSourceKeyClient(type, row.dataset.sourceKey || ''))) return;
    const health = row.querySelector('.source-health');
    if (health) {
      const key = row.dataset.sourceKey || '';
      const status = type === 'domains' ? getPreferredDomainStatus(key) : null;
      health.replaceWith(createSourceHealth(type, key, status));
    }
  });
}

function refreshRenderedSourceStatuses(sources = null) {
  renderSourceStatusSummary();
  if (sources?.length) {
    const grouped = { subs: [], apis: [], domains: [] };
    sources.forEach(({ type, key }) => {
      if (grouped[type]) grouped[type].push(key);
    });
    refreshSourceHealthRows('subs', grouped.subs);
    refreshSourceHealthRows('apis', grouped.apis);
    refreshSourceHealthRows('domains', grouped.domains);
    return;
  }
  refreshSourceHealthRows('subs');
  refreshSourceHealthRows('apis');
  refreshSourceHealthRows('domains');
}

async function loadSourceStatuses(mode = 'read', sources = []) {
  const requestVersion = ++sourceStatusRequestVersion;
  const manual = mode !== 'read';
  const refreshButton = $('sourceStatusRefreshButton');
  const idleText = refreshButton?.textContent;
  const previousStatuses = {
    subs: { ...(sourceStatuses.subs || {}) },
    apis: { ...(sourceStatuses.apis || {}) },
    domains: { ...(sourceStatuses.domains || {}) },
  };
  if (manual && refreshButton) {
    refreshButton.disabled = true;
    refreshButton.textContent = '检测中…';
    sourceStatuses = {
      subs: { ...previousStatuses.subs },
      apis: { ...previousStatuses.apis },
      domains: { ...previousStatuses.domains },
    };
    const targets = mode === 'selected'
      ? sources
      : Object.entries(sourceStatuses || {}).flatMap(([type, values]) => Object.keys(values || {}).map((key) => ({ type, key })));
    targets.forEach(({ type, key }) => {
      const normalizedKey = normalizeSourceKeyClient(type, key);
      if (sourceStatuses[type]?.[normalizedKey]) sourceStatuses[type][normalizedKey] = { ...sourceStatuses[type][normalizedKey], state: 'checking', error: '' };
    });
    refreshRenderedSourceStatuses(mode === 'selected' ? sources : null);
  }
  try {
    const requestOptions = mode === 'read' ? {} : {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mode === 'selected' ? { scope: 'selected', sources } : { scope: mode }),
    };
    const nextStatuses = await readJsonResponse(
      manual ? '/api/source-status/check' : '/api/source-status',
      '数据源状态',
      requestOptions,
    );
    // 页面初始化等旧请求可能晚于手动检测返回，不能覆盖较新的状态。
    if (requestVersion !== sourceStatusRequestVersion) return { ok: true, stale: true };
    const mergedStatuses = {
      subs: { ...(nextStatuses?.subs || {}) },
      apis: { ...(nextStatuses?.apis || {}) },
      domains: { ...(nextStatuses?.domains || {}) },
    };
    for (const [domain, entry] of Object.entries(preferredDomains || {})) {
      const normalizedDomain = normalizeSourceKeyClient('domains', domain);
      const configuredStatus = preferredDomainEntryStatus(entry);
      if (!mergedStatuses.domains[normalizedDomain] || mergedStatuses.domains[normalizedDomain].state === 'idle') {
        mergedStatuses.domains[normalizedDomain] = { ...configuredStatus, remark: entry?.remark || '' };
      }
      const status = mergedStatuses.domains[normalizedDomain];
      if (status && status.state !== 'idle') setPreferredDomainStatus(normalizedDomain, status);
    }
    sourceStatuses = mergedStatuses;
    refreshRenderedSourceStatuses();
    if (nodesContainer && currentNodes.length) renderNodeView();
  } catch (error) {
    if (requestVersion !== sourceStatusRequestVersion) return { ok: true, stale: true };
    sourceStatuses = previousStatuses;
    refreshRenderedSourceStatuses();
    // 状态接口不可用时保留配置页面，不阻断管理操作。
    return { ok: false, error };
  } finally {
    if (manual && refreshButton && requestVersion === sourceStatusRequestVersion) {
      refreshButton.disabled = false;
      refreshButton.textContent = idleText || '检测数据源';
    }
  }
  return { ok: true };
}

async function checkPreferredDomain(domain) {
  const entry = preferredDomains[domain] || {};
  const updated = await readJsonResponse('/api/preferred-domains', 'DNS 检测', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, remark: typeof entry.remark === 'string' ? entry.remark : '' }),
  });
  preferredDomains[updated.domain] = updated;
  setPreferredDomainStatus(updated.domain, preferredDomainEntryStatus(updated));
  renderPreferredDomains();
  refreshRenderedSourceStatuses([{ type: 'domains', key: updated.domain }]);
}

function createSourceCheckButton(type, key) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn-outline icon-action source-check-button';
  button.textContent = '🔍 检测';
  button.setAttribute('aria-label', '检测数据源 ' + key);
  button.onclick = async () => {
    button.disabled = true;
    const idleText = button.textContent;
    button.textContent = '⏳ 检测中…';
    const result = type === 'domains'
      ? await checkPreferredDomain(key).then(() => ({ ok: true })).catch((error) => ({ ok: false, error }))
      : await loadSourceStatuses('selected', [{ type, key }]);
    if (result?.ok) showToast(type === 'domains' ? 'DNS 记录检测完成' : '数据源检测完成', 'success');
    else showToast(result?.error?.message || '检测失败，请稍后重试', 'error');
    button.disabled = false;
    button.textContent = idleText;
  };
  return button;
}

function detectProblemSources() {
  const sources = Object.entries(sourceStatuses || {}).flatMap(([type, values]) => Object.entries(values || {})
    .filter(([, status]) => ['filtered', 'empty', 'timeout', 'http-error', 'network-error', 'error'].includes(status.state)
      || (type === 'domains' && Object.keys(status.dnsErrors || {}).length > 0))
    .map(([key]) => ({ type, key })));
  if (!sources.length) {
    showToast('当前没有已知异常数据源', 'info');
    return;
  }
  void loadSourceStatuses('selected', sources);
}

function normalizeSourceKeyClient(type, key) {
  const value = String(key || '').trim();
  if (type === 'subs') return value.replace(/^https?:\\\/\\\//i, '').replace(/\\\/+$/, '').toLowerCase();
  if (type === 'apis') {
    const match = value.match(/^(https?):\\\/\\\/([^/]+)(.*)$/i);
    if (match) return match[1].toLowerCase() + '://' + match[2].toLowerCase() + match[3];
  }
  if (type === 'domains') return value.replace(/\\.+$/, '').toLowerCase();
  return value;
}

function sourcePicker(selectedSources = [], title = '选择数据源', sourceMode = 'selected') {
  const selected = new Set(selectedSources.map((source) => source.type + ':' + normalizeSourceKeyClient(source.type, source.key)));
  const picker = document.createElement('div');
  picker.className = 'source-picker';
  picker.dataset.sourceMode = sourceMode;
  const head = document.createElement('div');
  head.className = 'source-picker-head';
  const titleEl = document.createElement('div');
  titleEl.className = 'source-picker-title';
  titleEl.textContent = title;
  const count = document.createElement('span');
  count.className = 'source-count';
  const actions = document.createElement('div');
  actions.className = 'source-actions';
  [['all', '全选'], ['clear', '清空'], ['selected', '仅显示已选']].forEach(([action, text]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'source-action';
    button.dataset.sourceAction = action;
    button.textContent = text;
    actions.appendChild(button);
  });
  head.append(titleEl, count, actions);
  picker.appendChild(head);
  const modeActions = document.createElement('div');
  modeActions.className = 'source-mode-actions';
  [['all', '全部数据源'], ['selected', '手动选择']].forEach(([mode, text]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'source-mode-action';
    button.dataset.sourceMode = mode;
    button.textContent = text;
    modeActions.appendChild(button);
  });
  picker.appendChild(modeActions);
  const search = document.createElement('input');
  search.type = 'search';
  search.className = 'source-search';
  search.placeholder = '搜索数据源';
  search.setAttribute('aria-label', '搜索数据源');
  picker.appendChild(search);
  const options = document.createElement('div');
  options.className = 'source-options';
  const entries = sourceEntries();
  picker.appendChild(options);
  picker.dataset.onlySelected = 'false';
  const updateCount = () => {
    const checked = picker.querySelectorAll('input[type="checkbox"]:checked').length;
    const total = picker.querySelectorAll('input[type="checkbox"]').length;
    count.textContent = picker.dataset.sourceMode === 'all'
      ? '动态跟随全部数据源'
      : (total ? checked + '/' + total : '0 个');
    modeActions.querySelectorAll('[data-source-mode]').forEach((button) => {
      button.classList.toggle('active', button.dataset.sourceMode === picker.dataset.sourceMode);
    });
    const selectedButton = actions.querySelector('[data-source-action="selected"]');
    if (selectedButton) selectedButton.classList.toggle('active', picker.dataset.onlySelected === 'true');
  };
  const renderOptions = () => {
    const query = search.value.trim().toLowerCase();
    const visible = entries.filter((source) => {
      const sourceId = source.type + ':' + normalizeSourceKeyClient(source.type, source.key);
      const searchText = (source.label + ' ' + source.key).toLowerCase();
      return (!query || searchText.includes(query))
        && (picker.dataset.onlySelected !== 'true' || selected.has(sourceId));
    });
    options.innerHTML = '';
    if (!visible.length) {
      const empty = document.createElement('div');
      empty.className = 'source-empty';
      empty.textContent = entries.length ? '没有匹配的数据源。' : '暂无可用数据源，请先在优选管理中添加。';
      options.appendChild(empty);
      updateCount();
      return;
    }
    for (const [type, title] of [['subs', '订阅源'], ['apis', 'API 源'], ['domains', '优选域名']]) {
      const group = visible.filter((source) => source.type === type);
      if (!group.length) continue;
      const heading = document.createElement('div');
      heading.className = 'source-group-title';
      heading.textContent = title + ' · ' + group.length;
      options.appendChild(heading);
      for (const source of group) {
        const label = document.createElement('label');
        label.className = 'source-option';
        label.title = source.label === source.key ? source.label : source.label + ' · ' + source.key;
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.sourceType = source.type;
        checkbox.dataset.sourceKey = source.key;
        checkbox.checked = selected.has(source.type + ':' + normalizeSourceKeyClient(source.type, source.key));
        const text = document.createElement('span');
        text.className = 'source-option-name';
        text.textContent = source.label;
        label.append(checkbox, text);
        options.appendChild(label);
      }
    }
    updateCount();
  };
  options.addEventListener('change', () => {
    picker.dataset.sourceMode = 'selected';
    options.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      const sourceId = checkbox.dataset.sourceType + ':' + normalizeSourceKeyClient(checkbox.dataset.sourceType, checkbox.dataset.sourceKey);
      if (checkbox.checked) selected.add(sourceId);
      else selected.delete(sourceId);
    });
    updateCount();
    if (picker.dataset.onlySelected === 'true') renderOptions();
  });
  modeActions.addEventListener('click', (event) => {
    const mode = event.target.dataset.sourceMode;
    if (!mode) return;
    picker.dataset.sourceMode = mode;
    if (mode === 'all') {
      options.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        checkbox.checked = false;
      });
    }
    updateCount();
    picker.dispatchEvent(new CustomEvent('source-mode-change'));
  });
  actions.addEventListener('click', (event) => {
    const action = event.target.dataset.sourceAction;
    if (!action) return;
    if (action === 'selected') {
      picker.dataset.onlySelected = picker.dataset.onlySelected !== 'true' ? 'true' : 'false';
      renderOptions();
      return;
    }
    entries.forEach((source) => {
      const sourceId = source.type + ':' + normalizeSourceKeyClient(source.type, source.key);
      if (action === 'all') selected.add(sourceId);
      else selected.delete(sourceId);
    });
    picker.dataset.sourceMode = 'selected';
    renderOptions();
    picker.dispatchEvent(new CustomEvent('source-mode-change'));
  });
  let searchTimer = null;
  search.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(renderOptions, 120);
  });
  renderOptions();
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
  const picker = sourcePicker([], '选择此 API 使用的数据源', 'all');
  container.innerHTML = '';
  container.appendChild(picker);
}

function readSourcePickerSelection(picker) {
  return {
    sourceMode: picker.dataset.sourceMode === 'selected' ? 'selected' : 'all',
    sources: readSourcePicker(picker),
  };
}

function getNewCustomApiSourceSelection() {
  const picker = $('newCustomApiSources')?.querySelector('.source-picker');
  return picker ? readSourcePickerSelection(picker) : { sourceMode: 'all', sources: [] };
}

function renderCustomApiSelect() {
  const select = $('previewApiSelect');
  if (!select) return;
  const current = select.value;
  const saved = loadPreviewApiPath();
  select.innerHTML = '';
  Object.entries(customApis).forEach(([path, entry]) => {
    if (!entry.enabled) return;
    const option = document.createElement('option');
    option.value = path;
    option.textContent = entry.remark ? entry.remark + ' (/' + path + ')' : '/' + path;
    select.appendChild(option);
  });
  select.hidden = select.options.length === 0;
  const validValues = new Set([...select.options].map((option) => option.value));
  const preferred = [current, saved].find((value) => value && validValues.has(value));
  if (preferred) {
    select.value = preferred;
    savePreviewApiPath(preferred);
  } else if (saved) {
    // Keep an unavailable saved choice out of the visible selection without replacing it.
    select.selectedIndex = -1;
  } else if (select.options.length) {
    select.selectedIndex = 0;
  }
}

let editingCustomApiPath = '';
let editingCustomApiPicker = null;

function renderCustomApis() {
  const el = $('customApisList');
  const summary = $('customApiSummary');
  const query = ($('customApiSearch')?.value || '').trim().toLowerCase();
  const allEntries = Object.entries(customApis);
  const entries = allEntries.filter(([path, entry]) => !query || ('/' + path + ' ' + (entry.remark || '') + ' ' + window.location.origin + '/' + path).toLowerCase().includes(query));
  if (summary) {
    const count = allEntries.length;
    const enabled = Object.values(customApis).filter((entry) => entry.enabled).length;
    summary.textContent = query
      ? entries.length + ' / ' + count + ' 个 API · ' + enabled + ' 个启用'
      : count + ' 个 API · ' + enabled + ' 个启用';
  }
  el.innerHTML = '';
  if (!entries.length) {
    const empty = document.createElement('div');
    empty.className = 'custom-api-empty';
    empty.innerHTML = query
      ? '<strong>没有匹配的优选 API</strong><span>请尝试其他访问路径或备注。</span>'
      : '<strong>还没有优选 API</strong>';
    el.appendChild(empty);
    return;
  }
  entries.forEach(([path, entry]) => {
    const row = document.createElement('div');
    row.className = 'row custom-api-row' + (entry.enabled === true ? '' : ' source-disabled-row');
    row.dataset.path = path;

    // 行结构对齐优选管理数据源行：开关 | 标识（备注 + 元信息）| 访问地址 | 复制 | 操作按钮。
    const main = document.createElement('div');
    main.className = 'custom-api-row-main custom-api-row-summary';
    const identity = document.createElement('div');
    identity.className = 'custom-api-identity';
    const title = document.createElement('strong');
    title.className = 'custom-api-row-title';
    title.textContent = entry.remark || '/' + path;
    const metaParts = ['/' + path, entry.sourceMode === 'selected'
      ? '已选择 ' + (Array.isArray(entry.sources) ? entry.sources.length : 0) + ' 个数据源'
      : '跟随全部数据源'];
    if (entry.prefix || entry.suffix) {
      metaParts.push('输出：' + (entry.prefix ? '前缀「' + entry.prefix + '」' : '') + (entry.suffix ? (entry.prefix ? ' · ' : '') + '后缀「' + entry.suffix + '」' : ''));
    }
    const meta = document.createElement('small');
    meta.className = 'custom-api-row-meta';
    meta.textContent = metaParts.join(' · ');
    identity.append(title, meta);
    const url = document.createElement('code');
    url.className = 'custom-api-url';
    url.textContent = window.location.origin + '/' + path;
    const copyBtn = createCopyButton(window.location.origin + '/' + path, '地址');
    // 复制按钮放进 main：宽屏经 display:contents 仍排在新网格的地址列之后，窄屏与地址同行。
    main.append(identity, url, copyBtn);

    const actions = document.createElement('div');
    actions.className = 'custom-api-actions';

    const enabledSwitch = createSourceSwitch({
      checked: entry.enabled === true,
      ariaLabel: '启用优选 API /' + path,
      onChange: async (statusSwitch, switchText) => {
        const previous = !statusSwitch.checked;
        statusSwitch.disabled = true;
        switchText.textContent = '处理中…';
        customApis[path].enabled = statusSwitch.checked;
        setCustomApisDirty();
        renderCustomApiSelect();
        const saved = await persistCustomApis(statusSwitch.checked ? '优选 API 已启用' : '优选 API 已禁用');
        if (!saved && customApis[path]) customApis[path].enabled = previous;
        renderCustomApis();
        renderCustomApiSelect();
      },
    });

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn-primary icon-action';
    editBtn.textContent = '✎ 编辑';
    editBtn.onclick = () => openCustomApiEditDialog(path);

    const viewBtn = document.createElement('button');
    viewBtn.type = 'button';
    viewBtn.className = 'btn-outline icon-action';
    viewBtn.textContent = '👁 查看';
    viewBtn.setAttribute('aria-label', '查看优选 API 数据 ' + (entry.remark || '/' + path));
    viewBtn.onclick = async () => {
      viewBtn.disabled = true;
      viewBtn.textContent = '检测中…';
      try { await openSourceRawDialog('customApis', path); }
      finally { viewBtn.disabled = false; viewBtn.textContent = '👁 查看'; }
    };

    const downloadBtn = document.createElement('button');
    downloadBtn.type = 'button';
    downloadBtn.className = 'btn-outline icon-action';
    downloadBtn.textContent = '⬇ 下载';
    downloadBtn.setAttribute('aria-label', '下载优选 API 数据 ' + (entry.remark || '/' + path));
    downloadBtn.onclick = () => downloadCustomApiData(path, entry, downloadBtn);

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'btn-outline icon-action';
    openBtn.textContent = '↗ 打开';
    openBtn.onclick = () => window.open(window.location.origin + '/' + path, '_blank', 'noopener');

    const delBtn = document.createElement('button');
    delBtn.className = 'del-btn custom-api-delete';
    delBtn.textContent = '🗑 删除';
    delBtn.type = 'button';
    delBtn.setAttribute('aria-label', '🗑 删除');
    delBtn.onclick = () => confirmCustomApiDelete(path);
    actions.append(editBtn, viewBtn, downloadBtn, openBtn, delBtn);

    // 行首启用开关，其后依次为标识、地址、复制按钮和操作按钮，与优选管理行一致。
    row.append(enabledSwitch.label, main, actions);
    el.appendChild(row);
  });
}

function confirmCustomApiDelete(path) {
  if (!customApis[path]) return;
  const dialog = $('customApiDeleteDialog');
  const message = $('customApiDeleteMessage');
  if (!dialog || dialog.open) return;
  if (message) message.textContent = '确定删除“' + (customApis[path].remark || '/' + path) + '”吗？此操作会移除其数据源配置。';
  pendingCustomApiDelete = path;
  dialog.showModal();
}

async function executeCustomApiDelete() {
  const path = pendingCustomApiDelete;
  const dialog = $('customApiDeleteDialog');
  if (!path || !customApis[path]) {
    if (dialog?.open) dialog.close();
    pendingCustomApiDelete = null;
    return;
  }
  const removed = customApis[path];
  const confirmButton = $('confirmCustomApiDeleteButton');
  setButtonBusy(confirmButton, true, '删除中…');
  delete customApis[path];
  setCustomApisDirty();
  renderCustomApis();
  renderCustomApiSelect();
  if (dialog?.open) dialog.close();
  pendingCustomApiDelete = null;
  const saved = await persistCustomApis();
  setButtonBusy(confirmButton, false);
  if (saved) showToast('已删除优选 API', 'success');
  else {
    customApis[path] = removed;
    setCustomApisDirty();
    renderCustomApis();
    renderCustomApiSelect();
  }
}

function confirmSourceDelete({ title, message, onConfirm }) {
  const dialog = $('sourceDeleteDialog');
  if (!dialog || dialog.open || typeof onConfirm !== 'function') return;
  const titleEl = $('sourceDeleteTitle');
  const messageEl = $('sourceDeleteMessage');
  if (titleEl) titleEl.textContent = title || '确认删除？';
  if (messageEl) messageEl.textContent = message || '此操作不可撤销。';
  pendingSourceDeleteAction = onConfirm;
  dialog.showModal();
}

function initSourceDeleteDialog() {
  const dialog = $('sourceDeleteDialog');
  if (!dialog || dialog.dataset.initSourceDelete === 'true') return;
  dialog.dataset.initSourceDelete = 'true';
  $('cancelSourceDeleteButton')?.addEventListener('click', () => {
    pendingSourceDeleteAction = null;
    dialog.close();
  });
  $('confirmSourceDeleteButton')?.addEventListener('click', async () => {
    const action = pendingSourceDeleteAction;
    pendingSourceDeleteAction = null;
    if (dialog.open) dialog.close();
    if (action) await action();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      pendingSourceDeleteAction = null;
      dialog.close();
    }
  });
  dialog.addEventListener('close', () => {
    pendingSourceDeleteAction = null;
  });
}

function openCustomApiEditDialog(path) {
  const entry = customApis[path];
  const dialog = $('customApiEditDialog');
  if (!entry || !dialog) return;
  editingCustomApiPath = path;
  const pathInput = $('editCustomApiPath');
  const remarkInput = $('editCustomApiRemark');
  const suffixInput = $('editCustomApiSuffix');
  const prefixInput = $('editCustomApiPrefix');
  const suffixStrategyInput = $('editCustomApiSuffixStrategy');
  const hint = $('editCustomApiPathHint');
  if (pathInput) pathInput.value = path;
  if (remarkInput) remarkInput.value = entry.remark || '';
  if (suffixInput) suffixInput.value = entry.suffix || '';
  if (prefixInput) prefixInput.value = entry.prefix || '';
  if (suffixStrategyInput) suffixStrategyInput.value = entry.suffixStrategy || 'skip';
  if (hint) {
    hint.textContent = '仅支持字母、数字、短横线和下划线。';
    hint.className = '';
  }
  const url = $('editCustomApiUrl');
  if (url) url.textContent = window.location.origin + '/' + path;
  const sourceMode = entry.sourceMode === 'selected' ? 'selected' : 'all';
  const selectedSources = sourceMode === 'selected' && Array.isArray(entry.sources) ? entry.sources : [];
  editingCustomApiPicker = sourcePicker(selectedSources, '选择此 API 使用的数据源', sourceMode);
  const container = $('editCustomApiSources');
  if (container) {
    container.innerHTML = '';
    container.appendChild(editingCustomApiPicker);
  }
  bindCustomApiOutputPreview();
  updateCustomApiOutputPreview();
  dialog.showModal();
  pathInput?.focus();
}

function closeCustomApiEditDialog() {
  const dialog = $('customApiEditDialog');
  if (dialog?.open) dialog.close();
  editingCustomApiPath = '';
  editingCustomApiPicker = null;
}

async function saveCustomApiEdit() {
  if (!editingCustomApiPath || !customApis[editingCustomApiPath]) return;
  const pathInput = $('editCustomApiPath');
  const remarkInput = $('editCustomApiRemark');
  const suffixInput = $('editCustomApiSuffix');
  const prefixInput = $('editCustomApiPrefix');
  const suffixStrategyInput = $('editCustomApiSuffixStrategy');
  const newPath = normalizeCustomApiPath(pathInput?.value);
  const error = validateCustomApiPath(newPath, editingCustomApiPath);
  if (error) {
    setInputError(pathInput, error);
    showToast(error, 'error');
    pathInput?.focus();
    return;
  }
  setInputError(pathInput, '');
  const entry = customApis[editingCustomApiPath];
  const selection = editingCustomApiPicker ? readSourcePickerSelection(editingCustomApiPicker) : {
    sourceMode: entry.sourceMode === 'selected' ? 'selected' : 'all',
    sources: Array.isArray(entry.sources) ? entry.sources : [],
  };
  let outputSettings;
  try {
    outputSettings = {
      prefix: readCustomApiOutputSetting('editCustomApiPrefix', 128, '输出前缀'),
      suffix: readCustomApiOutputSetting('editCustomApiSuffix', 128, '输出后缀'),
    };
  } catch (error) {
    showToast(error.message, 'error');
    return;
  }
  entry.remark = remarkInput?.value.trim() || '';
  entry.prefix = outputSettings.prefix;
  entry.suffix = outputSettings.suffix;
  entry.suffixStrategy = ['append', 'replace', 'skip'].includes(suffixStrategyInput?.value) ? suffixStrategyInput.value : 'skip';
  entry.sourceMode = selection.sourceMode;
  entry.sources = selection.sources;
  if (newPath !== editingCustomApiPath) {
    customApis[newPath] = entry;
    delete customApis[editingCustomApiPath];
    editingCustomApiPath = newPath;
  }
  setCustomApisDirty(true);
  renderCustomApis();
  renderCustomApiSelect();
  const saveButton = $('saveCustomApiEditButton');
  setButtonBusy(saveButton, true, '保存中…');
  const saved = await saveCustomApis(false);
  setButtonBusy(saveButton, false);
  if (saved) {
    closeCustomApiEditDialog();
    showToast('优选 API 配置已保存', 'success');
  }
}

function addCustomApi() {
  const pathInput = $('newCustomApiPath');
  const remarkInput = $('newCustomApiRemark');
  const path = normalizeCustomApiPath(pathInput.value);
  const remark = remarkInput.value.trim();
  const error = validateCustomApiPath(path);
  if (error) {
    setInputError(pathInput, error);
    showToast(error, 'error');
    pathInput.focus();
    return;
  }
  setInputError(pathInput, '');
  const selection = getNewCustomApiSourceSelection();
  customApis[path] = { enabled: true, remark, ...selection };
  pathInput.value = '';
  remarkInput.value = '';
  renderNewCustomApiSources();
  setCustomApisDirty();
  renderCustomApis();
  renderCustomApiSelect();
  closeCustomApiDialog(false);
  persistCustomApis('优选 API 创建并保存成功');
}

async function saveCustomApis(notify = true) {
  const button = $('saveCustomApisButton');
  setButtonBusy(button, true);
  try {
    const response = await fetch('/api/custom-apis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customApis)
    });
    if (!response.ok) throw new Error('请求失败');
    setCustomApisDirty(false);
    if (notify) showToast('优选 API 配置已保存', 'success');
    return true;
  } catch (error) {
    setCustomApisDirty(true);
    showToast('优选 API 配置保存失败', 'error', () => saveCustomApis(notify));
    return false;
  } finally {
    if (button) {
      setButtonBusy(button, false);
      button.disabled = !customApisDirty;
    }
  }
}

function initCustomApiForm() {
  const pathInput = $('newCustomApiPath');
  const hint = $('newCustomApiPathHint');
  if (!pathInput || !hint) return;
  const updateHint = () => {
    const path = normalizeCustomApiPath(pathInput.value);
    const error = path ? validateCustomApiPath(path) : '';
    pathInput.setAttribute('aria-invalid', error ? 'true' : 'false');
    hint.textContent = error || '仅支持字母、数字、短横线和下划线。';
    hint.className = error ? 'input-hint error' : '';
  };
  pathInput.addEventListener('input', updateHint);
  pathInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addCustomApi();
    }
  });
  const dialog = $('customApiDialog');
  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) closeCustomApiDialog();
  });
  dialog?.addEventListener('close', () => resetCustomApiForm());
  const editDialog = $('customApiEditDialog');
  const editPathInput = $('editCustomApiPath');
  const editHint = $('editCustomApiPathHint');
  const updateEditHint = () => {
    if (!editPathInput || !editHint) return;
    const path = normalizeCustomApiPath(editPathInput.value);
    const error = path ? validateCustomApiPath(path, editingCustomApiPath) : '';
    editPathInput.setAttribute('aria-invalid', error ? 'true' : 'false');
    editHint.textContent = error || '仅支持字母、数字、短横线和下划线。';
    editHint.className = error ? 'input-hint error' : '';
    const url = $('editCustomApiUrl');
    if (url && path) url.textContent = window.location.origin + '/' + path;
  };
  editPathInput?.addEventListener('input', updateEditHint);
  editPathInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveCustomApiEdit();
    }
  });
  editDialog?.addEventListener('click', (event) => {
    if (event.target === editDialog) closeCustomApiEditDialog();
  });
  editDialog?.addEventListener('close', () => {
    editingCustomApiPath = '';
    editingCustomApiPicker = null;
  });
  const deleteDialog = $('customApiDeleteDialog');
  $('cancelCustomApiDeleteButton')?.addEventListener('click', () => {
    pendingCustomApiDelete = null;
    deleteDialog?.close();
  });
  $('confirmCustomApiDeleteButton')?.addEventListener('click', executeCustomApiDelete);
  deleteDialog?.addEventListener('click', (event) => {
    if (event.target === deleteDialog) {
      pendingCustomApiDelete = null;
      deleteDialog.close();
    }
  });
  deleteDialog?.addEventListener('close', () => {
    pendingCustomApiDelete = null;
  });
}

function resetCustomApiForm() {
  const pathInput = $('newCustomApiPath');
  const remarkInput = $('newCustomApiRemark');
  const hint = $('newCustomApiPathHint');
  if (pathInput) {
    pathInput.value = '';
    pathInput.setAttribute('aria-invalid', 'false');
  }
  if (remarkInput) remarkInput.value = '';
  if (hint) {
    hint.textContent = '仅支持字母、数字、短横线和下划线。';
    hint.className = '';
  }
  renderNewCustomApiSources();
}

function openCustomApiDialog() {
  const dialog = $('customApiDialog');
  if (!dialog || dialog.open) return;
  dialog.showModal();
  $('newCustomApiPath')?.focus();
}

function closeCustomApiDialog(reset = true) {
  const dialog = $('customApiDialog');
  if (!dialog) return;
  if (dialog.open) dialog.close();
  if (reset) resetCustomApiForm();
}

// ======================== Subs 管理 ========================
let subs = {};
let subsSaveQueue = Promise.resolve();

function queueSubsSave() {
  subsDirty = true;
  subsSavePending += 1;
  subsSaveQueue = subsSaveQueue.then(() => saveSubs(false)).finally(() => { subsSavePending = Math.max(0, subsSavePending - 1); });
  return subsSaveQueue;
}

async function loadSubs() {
  if ($('subsList')) $('subsList').innerHTML = listSkeletonMarkup();
  try {
    let data = await readJsonResponse('/api/subs', '订阅源配置');
    for (let key in data) {
      if (typeof data[key] === 'boolean') {
        data[key] = { remark: '' };
      } else if (data[key] && typeof data[key] === 'object') {
        data[key] = { remark: typeof data[key].remark === 'string' ? data[key].remark : '' };
      }
    }
    subs = data;
    subsDirty = false;
    renderSubs();
  } catch (error) {
    renderLoadError('subsList', error.message, loadSubs);
    showToast(error.message, 'error');
  }
}

function renderSubs() {
  const el = $('subsList');
  el.innerHTML = '';
  const query = ($('subsSearch')?.value || '').trim().toLowerCase();
  const sort = $('subsSort')?.value || 'default';
  let entries = Object.entries(subs).filter(([host, entry]) => !query || (host + ' ' + (entry.remark || '')).toLowerCase().includes(query));
  if (sort === 'name-asc' || sort === 'name-desc') entries.sort((a, b) => a[0].localeCompare(b[0], 'zh-CN') * (sort === 'name-desc' ? -1 : 1));
  const fragment = document.createDocumentFragment();
  entries.forEach(([host, entry]) => {
    const disabled = entry?.enabled === false;
    const row = document.createElement('div');
    row.className = 'row' + (disabled ? ' source-disabled-row' : '');
    row.dataset.sourceKey = host;
    const select = document.createElement('input'); select.type = 'checkbox'; select.className = 'source-select'; select.checked = false; select.dataset.key = host; select.setAttribute('aria-label', '选择订阅源 ' + host);

    // 启用开关紧跟复选框：禁用的订阅源不参与优选 API 输出，也不出现在数据源选择列表。
    const enabledSwitch = createSourceSwitch({
      checked: !disabled,
      ariaLabel: '启用订阅源 ' + host,
      onChange: async (input, text) => {
        const previous = !input.checked;
        input.disabled = true;
        text.textContent = '处理中…';
        subs[host].enabled = input.checked;
        const saved = await queueSubsSave();
        if (!saved) subs[host].enabled = previous;
        renderSubs();
        if (saved) showToast(input.checked ? '订阅源已启用' : '订阅源已禁用，将不再参与优选 API 输出', 'success');
      },
    });

    const remarkInput = document.createElement('input');
    remarkInput.className = 'remark-input';
    remarkInput.value = entry.remark || '';
    remarkInput.placeholder = '备注（可选）';
    remarkInput.style.maxWidth = '200px';

    const hostInput = document.createElement('input');
    hostInput.className = 'host-input';
    hostInput.value = host;
    hostInput.placeholder = '主机地址';
    hostInput.title = host;

    const health = createSourceHealth('subs', host);

    const delBtn = document.createElement('button');
    delBtn.className = 'del-btn source-delete-button';
    delBtn.textContent = '🗑 删除';
    delBtn.setAttribute('aria-label', '删除订阅源 ' + host);
    delBtn.onclick = () => confirmSourceDelete({
      title: '删除订阅源？',
      message: '确定删除订阅源“' + host + '”吗？此操作不可撤销。',
      onConfirm: async () => {
        delBtn.disabled = true;
        delBtn.textContent = '⏳ 删除中…';
        const removed = subs[host];
        delete subs[host];
        const saved = await queueSubsSave();
        if (!saved) subs[host] = removed;
        renderSubs();
        if (saved) showToast('已删除订阅源', 'success');
        else { delBtn.disabled = false; delBtn.textContent = '🗑 删除'; }
      }
    });

    hostInput.onchange = () => {
      const newHost = hostInput.value.trim();
      if (!newHost || newHost === host) return;
      const entryCopy = subs[host];
      delete subs[host];
      subs[newHost] = entryCopy;
      renderSubs();
      void queueSubsSave();
    };

    remarkInput.onchange = () => {
      subs[host].remark = remarkInput.value;
      void queueSubsSave();
    };

    row.appendChild(select); row.appendChild(enabledSwitch.label); row.appendChild(remarkInput);
    row.appendChild(hostInput);
    row.appendChild(createCopyButton(host, '订阅源地址'));
    row.appendChild(health);
    row.appendChild(createSourceCheckButton('subs', host));
    const viewBtn = document.createElement('button');
    viewBtn.type = 'button';
    viewBtn.className = 'btn-outline icon-action source-view-button';
    viewBtn.textContent = '👁 查看';
    viewBtn.setAttribute('aria-label', '查看订阅源原始数据 ' + host);
    viewBtn.onclick = async () => {
      viewBtn.disabled = true;
      viewBtn.textContent = '⏳ 检测中…';
      try { await openSourceRawDialog('subs', host); }
      finally { viewBtn.disabled = false; viewBtn.textContent = '👁 查看'; }
    };
    row.appendChild(viewBtn);
    const downloadBtn = document.createElement('button');
    downloadBtn.type = 'button';
    downloadBtn.className = 'btn-outline icon-action source-download-button';
    downloadBtn.textContent = '⬇ 下载';
    downloadBtn.setAttribute('aria-label', '下载订阅源节点数据 ' + host);
    downloadBtn.onclick = () => downloadSourceData('subs', host, entry, downloadBtn);
    row.appendChild(downloadBtn);
    row.appendChild(delBtn);
    fragment.appendChild(row);
  });
  el.appendChild(fragment);
}

async function applySourceBatch(type, action, trigger) {
  const data = type === 'subs' ? subs : type === 'apis' ? apis : preferredDomains;
  const list = $(type === 'subs' ? 'subsList' : type === 'apis' ? 'apisList' : 'preferredDomainsList');
  const selected = [...list.querySelectorAll('.source-select:checked')].map((input) => input.dataset.key);
  if (action === 'select') { list.querySelectorAll('.source-select').forEach((input) => { input.checked = true; }); return; }
  if (!selected.length) { showToast('请先选择数据源', 'warning'); return; }
  if (action === 'delete' && !window.confirm('确定删除选中的 ' + selected.length + ' 个数据源吗？此操作不可撤销。')) return;
  const previous = Object.fromEntries(selected.filter((key) => data[key]).map((key) => [key, { ...data[key] }]));
  const buttons = [...document.querySelectorAll('[data-batch^="' + type + '-"]')];
  buttons.forEach((button) => { button.disabled = true; });
  if (trigger) { trigger.dataset.idleText ||= trigger.textContent; trigger.textContent = '删除中…'; }
  try {
    selected.forEach((key) => {
      delete data[key];
    });
    const saved = type === 'subs' ? await queueSubsSave() : type === 'apis' ? await queueApisSave() : (await Promise.all(selected.map((key) => readJsonResponse('/api/preferred-domains?domain=' + encodeURIComponent(key), '域名删除', { method: 'DELETE' })))).length === selected.length;
    if (!saved) throw new Error('保存失败');
    type === 'subs' ? renderSubs() : type === 'apis' ? renderApis() : renderPreferredDomains();
    showToast('已删除 ' + selected.length + ' 个数据源', 'success');
  } catch (error) {
    selected.forEach((key) => { if (previous[key]) data[key] = previous[key]; });
    type === 'subs' ? renderSubs() : type === 'apis' ? renderApis() : renderPreferredDomains();
    showToast('批量删除失败：' + error.message, 'error', () => applySourceBatch(type, action));
  } finally {
    buttons.forEach((button) => { button.disabled = false; if (button.dataset.idleText) button.textContent = button.dataset.idleText; });
  }
}

function addSub() {
  const hostInput = $('newHost');
  const remarkInput = $('newRemark');
  let host = hostInput.value.trim();
  let remark = remarkInput.value.trim();
  if (!host) { setInputError(hostInput, '请输入主机名'); showToast('请修正表单中的错误', 'error'); hostInput.focus(); return; }
  clearInputError(hostInput);
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
    subs[host] = { remark: remark };
    showToast('添加成功', 'success');
  }
  hostInput.value = '';
  remarkInput.value = '';
  renderSubs();
  void queueSubsSave();
}

async function saveSubs(notify = true) {
  try {
    const response = await fetch('/api/subs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subs)
    });
    if (!response.ok) throw responseError('订阅源配置保存', response);
    subsDirty = false;
    if (notify) showToast('订阅源配置已保存', 'success');
    if (nodesContainer && typeof fetchNodes === 'function') fetchNodes();
    return true;
  } catch (error) {
    showToast(error.message || '订阅源配置保存失败', 'error', () => saveSubs(notify));
    return false;
  }
}

function exportSubs() {
  const json = JSON.stringify(subs, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'subs-backup-' + beijingStamp() + '.json';
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
        if (typeof val === 'boolean') data[key] = { remark: '' };
        else if (typeof val === 'object' && val !== null) {
          data[key] = { remark: typeof val.remark === 'string' ? val.remark : '' };
        } else throw new Error('Invalid entry');
      }
      subs = data;
      renderSubs();
      showToast('导入成功！', 'success');
      void queueSubsSave();
    } catch (err) {
      showToast('导入失败：' + err.message, 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ======================== APIs 管理 ========================
let apis = {};
let apisSaveQueue = Promise.resolve();

function queueApisSave() {
  apisDirty = true;
  apisSavePending += 1;
  apisSaveQueue = apisSaveQueue.then(() => saveApis(false)).finally(() => { apisSavePending = Math.max(0, apisSavePending - 1); });
  return apisSaveQueue;
}

async function loadApis() {
  if ($('apisList')) $('apisList').innerHTML = listSkeletonMarkup();
  try {
    let data = await readJsonResponse('/api/apis', 'API 源配置');
    for (let key in data) {
      if (typeof data[key] === 'boolean') {
        data[key] = { remark: '' };
      } else if (data[key] && typeof data[key] === 'object') {
        data[key] = { remark: typeof data[key].remark === 'string' ? data[key].remark : '' };
      }
    }
    apis = data;
    apisDirty = false;
    renderApis();
  } catch (error) {
    renderLoadError('apisList', error.message, loadApis);
    showToast(error.message, 'error');
  }
}

function renderApis() {
  const el = $('apisList');
  el.innerHTML = '';
  const query = ($('apisSearch')?.value || '').trim().toLowerCase();
  const sort = $('apisSort')?.value || 'default';
  let entries = Object.entries(apis).filter(([url, entry]) => !query || (url + ' ' + (entry.remark || '')).toLowerCase().includes(query));
  if (sort === 'name-asc' || sort === 'name-desc') entries.sort((a, b) => a[0].localeCompare(b[0], 'zh-CN') * (sort === 'name-desc' ? -1 : 1));
  const fragment = document.createDocumentFragment();
  entries.forEach(([url, entry]) => {
    const disabled = entry?.enabled === false;
    const row = document.createElement('div');
    row.className = 'row' + (disabled ? ' source-disabled-row' : '');
    row.dataset.sourceKey = url;
    const select = document.createElement('input'); select.type = 'checkbox'; select.className = 'source-select'; select.dataset.key = url; select.setAttribute('aria-label', '选择 API 源 ' + url);

    // 启用开关紧跟复选框：禁用的 API 源不参与优选 API 输出，也不出现在数据源选择列表。
    const enabledSwitch = createSourceSwitch({
      checked: !disabled,
      ariaLabel: '启用 API 源 ' + url,
      onChange: async (input, text) => {
        const previous = !input.checked;
        input.disabled = true;
        text.textContent = '处理中…';
        apis[url].enabled = input.checked;
        const saved = await queueApisSave();
        if (!saved) apis[url].enabled = previous;
        renderApis();
        if (saved) showToast(input.checked ? 'API 源已启用' : 'API 源已禁用，将不再参与优选 API 输出', 'success');
      },
    });

    const remarkInput = document.createElement('input');
    remarkInput.className = 'remark-input';
    remarkInput.value = entry.remark || '';
    remarkInput.placeholder = '备注（可选）';
    remarkInput.style.maxWidth = '200px';

    const urlInput = document.createElement('input');
    urlInput.className = 'host-input';
    urlInput.value = url;
    urlInput.placeholder = 'API 地址';
    urlInput.title = url;

    const health = createSourceHealth('apis', url);

    const delBtn = document.createElement('button');
    delBtn.className = 'del-btn source-delete-button';
    delBtn.textContent = '🗑 删除';
    delBtn.setAttribute('aria-label', '删除 API 源 ' + url);
    delBtn.onclick = () => confirmSourceDelete({
      title: '删除 API 源？',
      message: '确定删除 API 源“' + url + '”吗？此操作不可撤销。',
      onConfirm: async () => {
        delBtn.disabled = true;
        delBtn.textContent = '⏳ 删除中…';
        const removed = apis[url];
        delete apis[url];
        const saved = await queueApisSave();
        if (!saved) apis[url] = removed;
        renderApis();
        if (saved) showToast('已删除 API 源', 'success');
        else { delBtn.disabled = false; delBtn.textContent = '🗑 删除'; }
      }
    });

    urlInput.onchange = () => {
      const newUrl = urlInput.value.trim();
      if (!newUrl || newUrl === url) return;
      const entryCopy = apis[url];
      delete apis[url];
      apis[newUrl] = entryCopy;
      renderApis();
      void queueApisSave();
    };

    remarkInput.onchange = () => {
      apis[url].remark = remarkInput.value;
      void queueApisSave();
    };

    row.appendChild(select); row.appendChild(enabledSwitch.label); row.appendChild(remarkInput);
    row.appendChild(urlInput);
    row.appendChild(createCopyButton(url, 'API 地址'));
    row.appendChild(health);
    row.appendChild(createSourceCheckButton('apis', url));
    const viewBtn = document.createElement('button');
    viewBtn.type = 'button';
    viewBtn.className = 'btn-outline icon-action source-view-button';
    viewBtn.textContent = '👁 查看';
    viewBtn.setAttribute('aria-label', '查看 API 源原始数据 ' + url);
    viewBtn.onclick = async () => {
      viewBtn.disabled = true;
      viewBtn.textContent = '⏳ 检测中…';
      try { await openSourceRawDialog('apis', url); }
      finally { viewBtn.disabled = false; viewBtn.textContent = '👁 查看'; }
    };
    row.appendChild(viewBtn);
    const downloadBtn = document.createElement('button');
    downloadBtn.type = 'button';
    downloadBtn.className = 'btn-outline icon-action source-download-button';
    downloadBtn.textContent = '⬇ 下载';
    downloadBtn.setAttribute('aria-label', '下载 API 源节点数据 ' + url);
    downloadBtn.onclick = () => downloadSourceData('apis', url, entry, downloadBtn);
    row.appendChild(downloadBtn);
    row.appendChild(delBtn);
    fragment.appendChild(row);
  });
  el.appendChild(fragment);
}

function sourceRawEntry(type, key) {
  const data = type === 'subs' ? subs : type === 'apis' ? apis : type === 'domains' ? preferredDomains : customApis;
  return data && Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
}

function closeSourceRawDialog() {
  if (sourceRawRequest) sourceRawRequest.abort();
  saveSourceRawViewState();
  sourceRawRequest = null;
  sourceRawSelection = null;
  sourceRawNodes = [];
  sourceRawRawContent = '';
  sourceRawRecords = {};
  sourceRawUnfilteredNodes = [];
  sourceRawUnfilteredSourceNodes = new Map();
  sourceRawNodeSources = new Map();
  sourceRawSourceMeta = new Map();
  sourceRawSourceErrors = new Map();
  sourceRawSourceStats = new Map();
  sourceRawCollapsedGroups = new Set();
  sourceRawSourceFilter = 'all';
  sourceRawRetryingGroup = '';
  sourceRawSourceSort = 'config';
  sourceRawLastRawVisible = [];
  if (sourceRawRefreshTimer) clearInterval(sourceRawRefreshTimer);
  sourceRawRefreshTimer = null;
  const dialog = $('sourceRawDialog');
  if (dialog?.open) dialog.close();
  // Clear the reused dialog's scroll state as it closes as an extra safeguard
  // before the next source is opened.
  resetSourceRawScroll();
  unlockSourceRawPageScroll();
}

function resetSourceRawScroll() {
  const dialog = $('sourceRawDialog');
  const body = dialog?.querySelector('.source-raw-body');
  const regions = [dialog, body, $('sourceRawContent'), $('sourceRawRawContent')].filter(Boolean);
  regions.forEach((region) => {
    region.scrollTop = 0;
    region.scrollLeft = 0;
  });
}

function renderSourceRawSummary(status) {
  const summary = $('sourceRawSummary');
  if (!summary) return;
  const current = status || { state: 'checking', nodeCount: 0, rawNodeCount: 0 };
  summary.innerHTML = '';
  const metrics = [
    ['状态', sourceStatusLabel(current.state)],
    ['可用节点', String(current.nodeCount || 0)],
    ['原始节点', String(current.rawNodeCount || 0)],
    ['请求耗时', current.durationMs === null || current.durationMs === undefined ? '--' : current.durationMs + ' ms'],
    ['HTTP', current.statusCode || '--'],
  ];
  metrics.forEach(([label, value]) => {
    const item = document.createElement('div');
    item.className = 'source-raw-metric source-raw-metric-' + (current.state || 'idle');
    const number = document.createElement('strong');
    number.textContent = value;
    const caption = document.createElement('span');
    caption.textContent = label;
    item.append(number, caption);
    summary.appendChild(item);
  });
  if (current.error && sourceRawSelection?.type !== 'customApis') {
    const error = document.createElement('div');
    error.className = 'source-raw-error';
    error.textContent = current.error;
    summary.appendChild(error);
  }
}

function formatSourceRawTime(value) {
  const timestamp = Number(value || 0);
  if (!timestamp) return '未知时间';
  return new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
}

function renderSourceRawCacheStatus(text, state = '') {
  const el = $('sourceRawCacheStatus');
  if (!el) return;
  el.textContent = text || '';
  el.className = 'source-raw-cache-status' + (state ? ' is-' + state : '');
  el.hidden = !text;
}

function renderSourceRawProcess(stats = {}) {
  const el = $('sourceRawProcess');
  if (!el) return;
  const items = [['上游返回', stats.inputCount || 0], ['格式无效', stats.invalidCount || 0], ['黑名单过滤', stats.blacklistedCount || 0], ['重复节点', stats.duplicateCount || 0], ['最终保留', stats.outputCount || 0]];
  el.innerHTML = items.map(([label, value]) => '<span><b>' + value + '</b>' + label + '</span>').join('');
}

function renderPreferredDomainRecords(records = {}) {
  const content = $('sourceRawRawContent');
  const count = $('sourceRawResultCount');
  if (!content) return;
  content.replaceChildren();
  const fragment = document.createDocumentFragment();
  let total = 0;
  ['A', 'AAAA', 'CNAME'].forEach((type) => {
    const section = document.createElement('section');
    section.className = 'source-raw-dns-record-group';
    const heading = document.createElement('h4');
    heading.textContent = type;
    section.appendChild(heading);
    const values = Array.isArray(records?.[type]) ? records[type].filter((value) => typeof value === 'string' && value.trim()) : [];
    total += values.length;
    if (!values.length) {
      const empty = document.createElement('div');
      empty.className = 'source-raw-dns-record-empty';
      empty.textContent = '无记录';
      section.appendChild(empty);
    } else {
      values.forEach((value) => {
        const line = document.createElement('div');
        line.className = 'source-raw-node-line';
        const text = document.createElement('span');
        text.className = 'source-raw-node-value';
        text.textContent = value;
        text.title = value;
        line.appendChild(text);
        section.appendChild(line);
      });
    }
    fragment.appendChild(section);
  });
  content.appendChild(fragment);
  if (count) count.textContent = total + ' 条 DNS 记录';
  sourceRawLastRawVisible = ['A', 'AAAA', 'CNAME'].flatMap((type) => Array.isArray(records?.[type]) ? records[type] : []);
}

function renderSourceRawResults(rawMode = false) {
  if (rawMode && sourceRawSelection?.type === 'domains') {
    renderPreferredDomainRecords(sourceRawRecords);
    return;
  }
  const content = $(rawMode ? 'sourceRawRawContent' : 'sourceRawContent');
  const count = $('sourceRawResultCount');
  if (!content) return;
  const query = ($('sourceRawSearch')?.value || '').trim().toLowerCase();
  const showSources = sourceRawSelection?.type === 'customApis';
  const allNodes = rawMode ? sourceRawUnfilteredNodes : sourceRawNodes;
  const nodeSources = rawMode ? sourceRawUnfilteredSourceNodes : sourceRawNodeSources;
  let visible = query ? allNodes.filter((node) => node.toLowerCase().includes(query)) : allNodes;
  if (showSources && rawMode && sourceRawSourceFilter !== 'all') {
    const sourceNodes = sourceRawUnfilteredSourceNodes.get(sourceRawSourceFilter) || [];
    visible = sourceNodes.filter((node) => !query || node.toLowerCase().includes(query));
  } else if (showSources && sourceRawSourceFilter !== 'all') {
    visible = visible.filter((node) => (nodeSources.get(node) || []).includes(sourceRawSourceFilter));
  }
  if (rawMode) sourceRawLastRawVisible = visible;
  else sourceRawLastVisible = visible;
  content.innerHTML = '';
  if (!visible.length && !showSources) {
    content.textContent = allNodes.length ? '没有匹配的数据。' : '没有提取到可用节点。';
  } else {
    const fragment = document.createDocumentFragment();
    const renderNode = (node) => {
      const line = document.createElement('div');
      line.className = 'source-raw-node-line';
      const value = document.createElement('span');
      value.className = 'source-raw-node-value';
      value.textContent = node;
      value.title = node;
      line.appendChild(value);
      return line;
    };
    if (showSources) {
      const groups = new Map();
      sourceRawSourceMeta.forEach((_, id) => {
        if (sourceRawSourceFilter === 'all' || sourceRawSourceFilter === id) groups.set(id, []);
      });
      if (rawMode && !sourceRawUnfilteredSourceNodes.size && allNodes.length && sourceRawSourceFilter === 'all') {
        groups.set('未识别来源', allNodes.slice());
      }
      if (rawMode) {
        sourceRawUnfilteredSourceNodes.forEach((nodes, id) => {
          if (sourceRawSourceFilter !== 'all' && id !== sourceRawSourceFilter) return;
          groups.set(id, nodes.filter((node) => !query || node.toLowerCase().includes(query)));
        });
      } else {
        visible.forEach((node) => {
          const sources = nodeSources.get(node);
          const ids = Array.isArray(sources) && sources.length ? sources : ['未识别来源'];
          ids.forEach((id) => {
            if (sourceRawSourceFilter !== 'all' && id !== sourceRawSourceFilter) return;
            if (!groups.has(id)) groups.set(id, []);
            groups.get(id).push(node);
          });
        });
      }
      const sortedGroups = [...groups.entries()].sort(([leftId, leftNodes], [rightId, rightNodes]) => {
        const leftStats = sourceGroupStats(leftId, leftNodes);
        const rightStats = sourceGroupStats(rightId, rightNodes);
        if (sourceRawSourceSort === 'count') return (rightStats[rawMode ? 'raw' : 'kept'] || 0) - (leftStats[rawMode ? 'raw' : 'kept'] || 0);
        if (sourceRawSourceSort === 'error') {
          const errorDiff = Number(sourceRawSourceErrors.has(rightId)) - Number(sourceRawSourceErrors.has(leftId));
          return errorDiff || ((rightStats[rawMode ? 'raw' : 'kept'] || 0) - (leftStats[rawMode ? 'raw' : 'kept'] || 0));
        }
        if (sourceRawSourceSort === 'name') {
          return sourceGroupLabelFromMeta(sourceRawSourceMeta.get(leftId)).localeCompare(sourceGroupLabelFromMeta(sourceRawSourceMeta.get(rightId)), 'zh-CN');
        }
        return 0;
      });
      sortedGroups.forEach(([id, groupNodes]) => {
        if (!groupNodes.length && !sourceRawSourceErrors.has(id)) return;
        const meta = sourceRawSourceMeta.get(id);
        const group = document.createElement('section');
        group.className = 'source-raw-source-group';
        const collapsed = sourceRawCollapsedGroups.has(id);
        group.classList.toggle('is-collapsed', collapsed);
        const headingRow = document.createElement('div');
        headingRow.className = 'source-raw-source-heading-row';
        const heading = document.createElement('button');
        heading.type = 'button';
        heading.className = 'source-raw-source-heading';
        heading.tabIndex = 0;
        heading.setAttribute('role', 'button');
        heading.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        const title = document.createElement('strong');
        title.textContent = sourceGroupLabelFromMeta(meta);
        title.title = title.textContent;
        const total = document.createElement('span');
        total.textContent = groupNodes.length + ' 个节点';
        const error = sourceRawSourceErrors.get(id);
        if (error) {
          const status = document.createElement('em');
          status.className = 'source-raw-source-error';
          status.textContent = '异常：' + error;
          status.title = error;
          heading.append(title, status, total);
        } else heading.append(title, total);
        headingRow.appendChild(heading);
        if (error && id !== '未识别来源') {
          const retry = document.createElement('button');
          retry.type = 'button';
          retry.className = 'source-raw-source-retry';
          retry.textContent = sourceRawRetryingGroup === id ? '重试中…' : '重试';
          retry.disabled = sourceRawRetryingGroup === id;
          retry.title = '重新检测当前优选 API 的来源';
          retry.onclick = (event) => {
            event.stopPropagation();
            retrySourceRawGroup(id);
          };
          headingRow.appendChild(retry);
        }
        const detailRow = document.createElement('div');
        detailRow.className = 'source-raw-source-detail-row';
        const detail = document.createElement('small');
        detail.className = 'source-raw-source-detail';
        detail.textContent = sourceGroupDetailFromMeta(meta);
        detail.title = detail.textContent;
        detailRow.appendChild(detail);
        if (meta) {
          const copyAddress = document.createElement('button');
          copyAddress.type = 'button';
          copyAddress.className = 'source-raw-source-copy';
          copyAddress.textContent = '复制地址';
          copyAddress.title = '复制完整来源地址';
          copyAddress.onclick = async (event) => {
            event.stopPropagation();
            try {
              await navigator.clipboard.writeText(meta.key);
              showToast('来源地址已复制', 'success');
            } catch (error) {
              showToast('复制失败：' + error.message, 'error');
            }
          };
          detailRow.appendChild(copyAddress);
        }
        const stats = document.createElement('small');
        stats.className = 'source-raw-source-stats';
        stats.textContent = sourceGroupStatsText(sourceGroupStats(id, groupNodes));
        const toggle = () => {
          if (sourceRawCollapsedGroups.has(id)) sourceRawCollapsedGroups.delete(id);
          else sourceRawCollapsedGroups.add(id);
          renderSourceRawResults(rawMode);
          saveSourceRawViewState();
        };
        const sourceHeader = document.createElement('div');
        sourceHeader.className = 'source-raw-source-header';
        sourceHeader.append(headingRow, detailRow, stats);
        sourceHeader.onclick = (event) => {
          if (event.target.closest('button')) return;
          toggle();
        };
        heading.onclick = toggle;
        heading.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); } };
        group.appendChild(sourceHeader);
        if (!collapsed) groupNodes.forEach((node) => group.appendChild(renderNode(node)));
        fragment.appendChild(group);
      });
    } else {
      visible.forEach((node) => fragment.appendChild(renderNode(node)));
    }
    if (fragment.childNodes.length) content.appendChild(fragment);
    else content.textContent = allNodes.length ? '没有匹配的数据。' : '没有提取到可用节点。';
  }
  if (count) count.textContent = (query || (showSources && sourceRawSourceFilter !== 'all')) ? '显示 ' + visible.length + ' / ' + allNodes.length + ' 条' : allNodes.length + ' 条节点';
}

function updateSourceRawGroupControls() {
  const controls = $('sourceRawGroupControls');
  const filter = $('sourceRawSourceFilter');
  const sort = $('sourceRawSourceSort');
  const show = sourceRawSelection?.type === 'customApis';
  if (controls) controls.hidden = !show;
  if (!filter || !show) return;
  const ids = [...sourceRawSourceMeta.keys()];
  filter.replaceChildren();
  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = '全部来源';
  filter.appendChild(allOption);
  ids.forEach((id) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = sourceGroupLabelFromMeta(sourceRawSourceMeta.get(id), true);
    filter.appendChild(option);
  });
  if (ids.length) sourceRawSourceFilter = ids.includes(sourceRawSourceFilter) ? sourceRawSourceFilter : 'all';
  filter.value = ids.includes(sourceRawSourceFilter) ? sourceRawSourceFilter : 'all';
  if (sort) sort.value = ['config', 'count', 'error', 'name'].includes(sourceRawSourceSort) ? sourceRawSourceSort : 'config';
}

async function retrySourceRawGroup(id) {
  if (!sourceRawSelection || sourceRawSelection.type !== 'customApis' || sourceRawRetryingGroup) return;
  sourceRawRetryingGroup = id;
  renderSourceRawResults(sourceRawTab === 'raw');
  renderSourceRawCacheStatus('正在重新检测来源…', 'checking');
  try {
    await openSourceRawDialog('customApis', sourceRawSelection.key, true);
  } finally {
    sourceRawRetryingGroup = '';
    renderSourceRawResults(sourceRawTab === 'raw');
  }
}

function setSourceRawTab(tab) {
  sourceRawTab = tab === 'raw' ? 'raw' : 'nodes';
  document.querySelectorAll('[data-source-raw-tab]').forEach((button) => {
    const active = button.dataset.sourceRawTab === sourceRawTab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
    if (button.dataset.sourceRawTab === 'raw') {
      button.textContent = sourceRawSelection?.type === 'domains' ? 'DNS 记录' : '未过滤节点';
    }
  });
  const nodes = $('sourceRawContent');
  const raw = $('sourceRawRawContent');
  const toolbar = document.querySelector('.source-raw-toolbar');
  const isDomain = sourceRawSelection?.type === 'domains';
  if (nodes) nodes.hidden = sourceRawTab !== 'nodes';
  if (raw) raw.hidden = sourceRawTab !== 'raw';
  if (raw) raw.setAttribute('aria-label', isDomain ? 'DNS 记录' : '未过滤节点');
  if (toolbar) toolbar.hidden = isDomain;
  const process = $('sourceRawProcess');
  if (process) process.hidden = isDomain;
  renderSourceRawResults(sourceRawTab === 'raw');
  saveSourceRawViewState();
}

async function openSourceRawDialog(type, key, preserveState = false) {
  const entry = sourceRawEntry(type, key);
  const dialog = $('sourceRawDialog');
  if (!entry || !dialog) return;
  dialog.onclose = () => {
    resetSourceRawScroll();
    unlockSourceRawPageScroll();
  };
  if (sourceRawRequest) sourceRawRequest.abort();
  const controller = new AbortController();
  sourceRawRequest = controller;
  sourceRawSelection = { type, key };
  sourceRawNodes = [];
  sourceRawRawContent = '';
  sourceRawRecords = {};
  const title = $('sourceRawDialogSource');
  const content = $('sourceRawContent');
  const rawContent = $('sourceRawRawContent');
  const summary = $('sourceRawSummary');
  const reload = $('reloadSourceRawButton');
  const copy = $('copySourceRawButton');
  const search = $('sourceRawSearch');
  const autoRefresh = $('sourceRawAutoRefresh');
  const refreshInterval = $('sourceRawRefreshInterval');
  const historyPanel = $('sourceRawHistoryPanel');
  if (historyPanel) historyPanel.hidden = type === 'domains';
  if (!preserveState) {
    const viewState = type === 'customApis' ? loadSourceRawViewState(type, key) : null;
    // 折叠状态只作用于当前查看会话；重新打开时始终展开来源分组。
    sourceRawCollapsedGroups = new Set();
    sourceRawSourceFilter = typeof viewState?.filter === 'string' ? viewState.filter : 'all';
    sourceRawSourceSort = ['config', 'count', 'error', 'name'].includes(viewState?.sort) ? viewState.sort : 'config';
    if (search) search.value = typeof viewState?.query === 'string' ? viewState.query : '';
    // 每次重新打开原始数据弹窗都从“节点结果”开始；自动刷新会通过 preserveState 保留当前标签。
    setSourceRawTab('nodes');
    renderSourceRawCacheStatus('正在检测数据…', 'checking');
  }
  renderSourceRawHistory(type === 'customApis' ? loadSourceRawHistory(type, key) : []);
  const sourceLabel = type === 'subs' ? '订阅源 · ' : type === 'apis' ? 'API 源 · ' : type === 'domains' ? '优选域名 · ' : '优选 API · /';
  if (title) title.textContent = sourceLabel + key;
  if (!preserveState) {
    resetSourceRawScroll();
  }
  if (content) content.textContent = '正在检测数据源…';
  if (rawContent) rawContent.textContent = '正在检测数据源…';
  const cachedResult = loadSourceRawCache(type, key);
  if (cachedResult) {
    sourceRawNodes = cachedResult.nodes.slice();
    sourceRawRawContent = cachedResult.rawContent;
    sourceRawRecords = cachedResult.records && typeof cachedResult.records === 'object' ? cachedResult.records : {};
    sourceRawUnfilteredNodes = Array.isArray(cachedResult.unfilteredNodes) ? cachedResult.unfilteredNodes.slice() : [];
    sourceRawUnfilteredSourceNodes = new Map(Array.isArray(cachedResult.unfilteredSourceNodes) ? cachedResult.unfilteredSourceNodes : []);
    sourceRawNodeSources = new Map(Array.isArray(cachedResult.nodeSources) ? cachedResult.nodeSources : []);
    sourceRawSourceMeta = new Map(Array.isArray(cachedResult.sourceMeta) ? cachedResult.sourceMeta : []);
    sourceRawSourceErrors = new Map(Array.isArray(cachedResult.sourceErrors) ? cachedResult.sourceErrors : []);
    sourceRawSourceStats = new Map(Array.isArray(cachedResult.sourceStats) ? cachedResult.sourceStats : []);
    renderSourceRawSummary(cachedResult.status);
    renderSourceRawProcess(cachedResult.status?.filterStats || {});
    renderSourceRawCacheStatus('上次检测：' + formatSourceRawTime(cachedResult.savedAt) + '，正在重新检测…', 'checking');
    renderSourceRawResults();
    renderSourceRawResults(true);
  }
  updateSourceRawGroupControls();
  if (summary) renderSourceRawSummary({ state: 'checking', nodeCount: 0, rawNodeCount: 0 });
  renderSourceRawProcess({});
  if ($('sourceRawResultCount')) $('sourceRawResultCount').textContent = '';
  if (reload) reload.disabled = true;
  if (copy) copy.disabled = true;
  if (copy) {
    copy.onclick = async () => {
      try {
        const values = sourceRawTab === 'raw' ? sourceRawLastRawVisible : sourceRawLastVisible;
        await navigator.clipboard.writeText(values.join('\\n'));
        showToast('筛选结果已复制', 'success');
      } catch (error) {
        showToast('复制失败：' + error.message, 'error');
      }
    };
  }
  if (search) search.oninput = () => {
    if (content) content.scrollTop = 0;
    renderSourceRawResults(sourceRawTab === 'raw');
    saveSourceRawViewState();
  };
  if (autoRefresh && !preserveState) {
    autoRefresh.checked = false;
    autoRefresh.onchange = () => {
      if (sourceRawRefreshTimer) clearInterval(sourceRawRefreshTimer);
      sourceRawRefreshTimer = autoRefresh.checked
        ? setInterval(() => openSourceRawDialog(type, key, true), Number(refreshInterval?.value || 30) * 1000)
        : null;
    };
  }
  if (refreshInterval) refreshInterval.onchange = () => {
    if (!autoRefresh?.checked) return;
    if (sourceRawRefreshTimer) clearInterval(sourceRawRefreshTimer);
    sourceRawRefreshTimer = setInterval(() => openSourceRawDialog(type, key, true), Number(refreshInterval.value || 30) * 1000);
  };
  const sourceFilter = $('sourceRawSourceFilter');
  if (sourceFilter) sourceFilter.onchange = () => {
    sourceRawSourceFilter = sourceFilter.value || 'all';
    renderSourceRawResults();
    renderSourceRawResults(true);
    saveSourceRawViewState();
  };
  const sourceSort = $('sourceRawSourceSort');
  if (sourceSort) sourceSort.onchange = () => {
    sourceRawSourceSort = sourceSort.value || 'config';
    renderSourceRawResults();
    renderSourceRawResults(true);
    saveSourceRawViewState();
  };
  const expandGroups = $('expandSourceRawGroupsButton');
  if (expandGroups) expandGroups.onclick = () => {
    sourceRawCollapsedGroups = new Set();
    renderSourceRawResults();
    renderSourceRawResults(true);
    saveSourceRawViewState();
  };
  const collapseGroups = $('collapseSourceRawGroupsButton');
  if (collapseGroups) collapseGroups.onclick = () => {
    sourceRawCollapsedGroups = new Set(sourceRawSourceMeta.keys());
    renderSourceRawResults();
    renderSourceRawResults(true);
    saveSourceRawViewState();
  };
  document.querySelectorAll('[data-source-raw-tab]').forEach((button) => {
    button.onclick = () => setSourceRawTab(button.dataset.sourceRawTab);
  });
  if (content) content.onscroll = null;
  if (!dialog.open) dialog.showModal();
  lockSourceRawPageScroll();
  void loadSourceRawHistoryFromDb(type, key, controller.signal);
  if (!preserveState) {
    // Reset again after opening and layout so a reused dialog cannot restore its previous scroll offset.
    resetSourceRawScroll();
    requestAnimationFrame(resetSourceRawScroll);
  }
  const isManagedSource = type === 'subs' || type === 'apis' || type === 'domains';
  const normalizedKey = isManagedSource ? normalizeSourceKeyClient(type, key) : key;
  const previousStatus = isManagedSource ? getSourceStatus(type, key) : { state: 'idle', nodeCount: 0, rawNodeCount: 0 };
  if (isManagedSource) {
    sourceStatuses[type] ||= {};
    sourceStatuses[type][normalizedKey] = { ...previousStatus, state: 'checking', error: '' };
    refreshRenderedSourceStatuses([{ type, key }]);
  }
  try {
    const response = await fetch(type === 'customApis' ? '/api/custom-api-preview' : '/api/source-raw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(type === 'customApis' ? { path: key } : { type, key }),
      signal: controller.signal,
      cache: 'no-store',
    });
    let result = null;
    try { result = await response.json(); } catch { /* handled below */ }
    if (!response.ok) throw new Error(result?.error || '请求失败（HTTP ' + response.status + '）');
    if (sourceRawSelection?.type !== type || sourceRawSelection?.key !== key) return;
    sourceRawNodes = Array.isArray(result.nodes) ? result.nodes.filter((node) => typeof node === 'string' && node.trim()) : [];
    sourceRawUnfilteredNodes = Array.isArray(result.unfilteredNodes) ? result.unfilteredNodes.filter((node) => typeof node === 'string' && node.trim()) : [];
    sourceRawRecords = result.records && typeof result.records === 'object' ? result.records : {};
    sourceRawRawContent = sourceRawUnfilteredNodes.join('\\n');
    sourceRawUnfilteredSourceNodes = new Map();
    sourceRawNodeSources = new Map();
    sourceRawSourceMeta = new Map();
    sourceRawSourceErrors = new Map();
    sourceRawSourceStats = new Map();
    if (type === 'customApis') {
      (Array.isArray(result.sourceMeta) ? result.sourceMeta : []).forEach((item) => {
        sourceRawSourceMeta.set(sourceGroupId(item.type, item.key), item);
      });
      (Array.isArray(result.nodeSources) ? result.nodeSources : []).forEach((item) => {
        const id = sourceGroupId(item.type, item.key);
        if (!sourceRawSourceMeta.has(id)) sourceRawSourceMeta.set(id, { type: item.type, key: item.key, remark: item.remark || '' });
        const values = sourceRawNodeSources.get(item.value) || [];
        if (!values.includes(id)) values.push(id);
        sourceRawNodeSources.set(item.value, values);
      });
      (Array.isArray(result.rawSources) ? result.rawSources : []).forEach((item) => {
        const id = sourceGroupId(item.type, item.key);
        const values = Array.isArray(item.nodes) ? item.nodes.filter((node) => typeof node === 'string' && node.trim()) : [];
        sourceRawUnfilteredSourceNodes.set(id, values);
        const filterStats = item.filterStats || {};
        sourceRawSourceStats.set(id, { raw: values.length, kept: Number(filterStats.outputCount ?? values.length) || 0 });
        if (!sourceRawSourceMeta.has(id)) sourceRawSourceMeta.set(id, { type: item.type, key: item.key, remark: item.remark || '' });
      });
      (result.status?.errors || []).forEach((item) => {
        const id = sourceGroupId(item.type, item.key);
        if (sourceRawSourceMeta.has(id)) sourceRawSourceErrors.set(id, item.message || '检测失败');
      });
    }
    updateSourceRawGroupControls();
    const nextStatus = result.status || { ...previousStatus, state: sourceRawNodes.length ? 'success' : 'empty', nodeCount: sourceRawNodes.length, rawNodeCount: sourceRawNodes.length };
    saveSourceRawCache(type, key, { nodes: sourceRawNodes.slice(), unfilteredNodes: sourceRawUnfilteredNodes.slice(), records: sourceRawRecords, unfilteredSourceNodes: [...sourceRawUnfilteredSourceNodes], rawContent: sourceRawRawContent, nodeSources: [...sourceRawNodeSources], sourceMeta: [...sourceRawSourceMeta], sourceErrors: [...sourceRawSourceErrors], sourceStats: [...sourceRawSourceStats], status: nextStatus, savedAt: Date.now() });
    if (isManagedSource) sourceStatuses[type][normalizedKey] = nextStatus;
    if (type === 'domains') setPreferredDomainStatus(normalizedKey, nextStatus);
    renderSourceRawSummary(nextStatus);
    renderSourceRawCacheStatus('本次检测完成：' + formatSourceRawTime(Date.now()), sourceRawSourceErrors.size ? 'warning' : '');
    if (type === 'customApis') {
      const rawTotal = [...sourceRawSourceStats.values()].reduce((sum, item) => sum + Number(item.raw || 0), 0);
      const keptTotal = [...sourceRawSourceStats.values()].reduce((sum, item) => sum + Number(item.kept || 0), 0);
      saveSourceRawHistory(type, key, { at: Date.now(), raw: rawTotal, kept: keptTotal, filtered: Math.max(0, rawTotal - keptTotal), errors: sourceRawSourceErrors.size });
      void loadSourceRawHistoryFromDb(type, key, controller.signal);
    }
    renderSourceRawProcess(nextStatus.filterStats || result.status?.filterStats || {});
    renderSourceRawResults();
    renderSourceRawResults(true);
    if (isManagedSource) refreshRenderedSourceStatuses([{ type, key }]);
    if (copy) copy.disabled = sourceRawNodes.length === 0 && sourceRawUnfilteredNodes.length === 0;
  } catch (error) {
    if (error?.name === 'AbortError') return;
    if (sourceRawSelection?.type !== type || sourceRawSelection?.key !== key) return;
    const failedStatus = { ...previousStatus, state: 'network-error', error: error.message || '检测失败' };
    renderSourceRawCacheStatus(cachedResult
      ? '本次检测失败；当前显示最近一次检测结果：' + formatSourceRawTime(cachedResult.savedAt)
      : '本次检测失败：' + failedStatus.error, 'warning');
    if (isManagedSource) sourceStatuses[type][normalizedKey] = failedStatus;
    if (type === 'domains') setPreferredDomainStatus(normalizedKey, failedStatus);
    if (cachedResult && sourceRawNodes.length) {
      renderSourceRawSummary(cachedResult.status);
      renderSourceRawProcess(cachedResult.status?.filterStats || {});
      renderSourceRawResults();
      renderSourceRawResults(true);
    } else {
      renderSourceRawSummary(failedStatus);
      if (content) content.textContent = '数据源检测失败：' + failedStatus.error;
    }
    if (isManagedSource) refreshRenderedSourceStatuses([{ type, key }]);
  } finally {
    if (sourceRawSelection?.type === type && sourceRawSelection?.key === key) {
      sourceRawRequest = null;
      if (reload) {
        reload.disabled = false;
        reload.onclick = () => openSourceRawDialog(type, key);
      }
    }
  }
}

function addApi() {
  const urlInput = $('newApiUrl');
  const remarkInput = $('newApiRemark');
  let url = urlInput.value.trim();
  let remark = remarkInput.value.trim();
  if (!url) { setInputError(urlInput, '请输入 API URL'); showToast('请修正表单中的错误', 'error'); urlInput.focus(); return; }
  if (!/^https?:\\/\\//i.test(url)) { setInputError(urlInput, 'API 地址必须以 http:// 或 https:// 开头'); showToast('请修正表单中的错误', 'error'); urlInput.focus(); return; }
  setInputError(urlInput, '');
  if (apis[url]) {
    if (remark) apis[url].remark = remark;
    showToast('API URL 已存在，已更新备注', 'success');
  } else {
    apis[url] = { remark: remark };
    showToast('添加成功', 'success');
  }
  urlInput.value = '';
  remarkInput.value = '';
  renderApis();
  void queueApisSave();
}

async function saveApis(notify = true) {
  try {
    const response = await fetch('/api/apis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apis)
    });
    if (!response.ok) throw responseError('API 源配置保存', response);
    apisDirty = false;
    if (notify) showToast('API 源配置已保存', 'success');
    if (nodesContainer && typeof fetchNodes === 'function') fetchNodes();
    return true;
  } catch (error) {
    showToast(error.message || 'API 源配置保存失败', 'error', () => saveApis(notify));
    return false;
  }
}

function exportApis() {
  const json = JSON.stringify(apis, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'apis-backup-' + beijingStamp() + '.json';
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
        if (typeof val === 'boolean') data[key] = { remark: '' };
        else if (typeof val === 'object' && val !== null) {
          data[key] = { remark: typeof val.remark === 'string' ? val.remark : '' };
        } else throw new Error('Invalid entry');
      }
      apis = data;
      renderApis();
      showToast('导入成功！', 'success');
      void queueApisSave();
    } catch (err) {
      showToast('导入失败：' + err.message, 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ======================== 黑名单管理 ========================
let blacklist = [];
let savedBlacklist = [];
let blacklistSearchTerm = '';
let blacklistPage = 1;
const blacklistHistory = [];
const selectedBlacklist = new Set();

function normalizeBlacklistClient(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.reduce((result, item) => {
    if (typeof item !== 'string') return result;
    const word = item.trim().slice(0, 128);
    const key = word.toLowerCase();
    if (!word || seen.has(key) || result.length >= 200) return result;
    seen.add(key);
    result.push(word);
    return result;
  }, []);
}

function downloadJsonFile(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function readJsonFile(event, onData, label) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      onData(JSON.parse(e.target.result));
    } catch (error) {
      showToast(label + '导入失败：' + error.message, 'error');
    }
  };
  reader.onerror = () => showToast(label + '导入失败：文件读取失败', 'error');
  reader.readAsText(file);
  event.target.value = '';
}

function setBlacklistDirty(dirty = true) {
  blacklistDirty = dirty;
  const status = $('blacklistSaveStatus');
  const button = $('saveBlacklistButton');
  if (status) {
    status.textContent = dirty ? '有未保存的修改' : '配置已保存';
    status.classList.toggle('dirty', dirty);
  }
  if (button) button.disabled = !dirty;
  updateSettingsActionState();
}

function renderBlacklist() {
  const list = $('blacklistList');
  const empty = $('blacklistEmpty');
  const summary = $('blacklistSummary');
  if (!list) return;
  list.innerHTML = '';
  const query = blacklistSearchTerm.trim().toLowerCase();
  const matches = blacklist
    .map((word, index) => ({ word, index }))
    .filter(({ word }) => !query || word.toLowerCase().includes(query));
  const totalPages = Math.max(1, Math.ceil(matches.length / RULE_PAGE_SIZE));
  blacklistPage = Math.min(Math.max(1, blacklistPage), totalPages);
  const visible = matches.slice((blacklistPage - 1) * RULE_PAGE_SIZE, blacklistPage * RULE_PAGE_SIZE);
  list.classList.toggle('is-large', matches.length > 24);
  list.classList.toggle('is-paged', totalPages > 1);
  const fragment = document.createDocumentFragment();
  visible.forEach(({ word, index }) => {
    const row = document.createElement('div');
    row.className = 'blacklist-row';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'rule-select';
    checkbox.checked = selectedBlacklist.has(word);
    checkbox.setAttribute('aria-label', '选择黑名单词条 ' + (index + 1));
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selectedBlacklist.add(word); else selectedBlacklist.delete(word);
      updateRuleSelectionCount('blacklistSelectionCount', selectedBlacklist.size);
    });

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 128;
    input.value = word;
    input.setAttribute('aria-label', '黑名单词条 ' + (index + 1));
    input.addEventListener('input', () => {
      if (!input.dataset.historyStarted) { pushRuleHistory(blacklistHistory, blacklist); input.dataset.historyStarted = 'true'; }
      blacklist[index] = input.value.slice(0, 128);
      selectedBlacklist.delete(word);
      clearInputError(input);
      setBlacklistDirty(true);
    });
    input.addEventListener('blur', () => validateRuleInput(input, blacklist, index, '黑名单关键词'));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'del-btn';
    deleteButton.textContent = '删除';
    deleteButton.title = '删除此黑名单词条';
    deleteButton.addEventListener('click', () => {
      pushRuleHistory(blacklistHistory, blacklist);
      blacklist.splice(index, 1);
      renderBlacklist();
      setBlacklistDirty(true);
    });

    row.append(checkbox, input, deleteButton);
    fragment.appendChild(row);
  });
  list.appendChild(fragment);
  if (empty) {
    empty.textContent = query ? '没有匹配的黑名单词条。' : '暂无黑名单词条，所有节点都将参与聚合。';
    empty.hidden = matches.length !== 0;
  }
  if (summary) summary.textContent = query ? matches.length + ' / ' + blacklist.length + ' 项' : blacklist.length + ' 项';
  renderRulePagination('blacklistPagination', matches.length, blacklistPage, (page) => { blacklistPage = page; renderBlacklist(); });
  updateRuleSelectionCount('blacklistSelectionCount', selectedBlacklist.size);
}

async function loadBlacklist() {
  if ($('blacklistList')) $('blacklistList').innerHTML = listSkeletonMarkup(2);
  try {
    blacklist = normalizeBlacklistClient(await readJsonResponse('/api/blacklist', '黑名单配置'));
    savedBlacklist = [...blacklist];
    blacklistHistory.length = 0;
    blacklistPage = 1;
    selectedBlacklist.clear();
    renderBlacklist();
    setBlacklistDirty(false);
  } catch (error) {
    renderLoadError('blacklistList', error.message, loadBlacklist);
    showToast(error.message, 'error');
  }
}

function addBlacklistWord() {
  const input = $('newBlacklistWord');
  if (!input) return;
  const word = input.value.trim().slice(0, 128);
  if (!word) {
    setInputError(input, '请输入黑名单关键词');
    showToast('请输入黑名单关键词', 'error');
    input.focus();
    return;
  }
  if (blacklist.length >= 200) {
    showToast('黑名单条目不能超过 200 个', 'error');
    return;
  }
  if (blacklist.some((item) => item.toLowerCase() === word.toLowerCase())) {
    setInputError(input, '该关键词已存在');
    showToast('该关键词已存在', 'error');
    input.focus();
    return;
  }
  pushRuleHistory(blacklistHistory, blacklist);
  blacklist.push(word);
  clearInputError(input);
  input.value = '';
  renderBlacklist();
  setBlacklistDirty(true);
  input.focus();
}

function exportBlacklist() {
  downloadJsonFile(blacklist, 'blacklist-backup-' + beijingStamp() + '.json');
  showToast('黑名单已导出', 'success');
}

function importBlacklist(event) {
  readJsonFile(event, (data) => {
    if (!Array.isArray(data)) throw new Error('文件内容必须是字符串数组');
    const incoming = normalizeBlacklistClient(data);
    openRuleImportPreview('黑名单', blacklist, incoming, () => {
      pushRuleHistory(blacklistHistory, blacklist);
      blacklist = incoming;
      selectedBlacklist.clear(); blacklistPage = 1;
      renderBlacklist(); setBlacklistDirty(true); showToast('黑名单导入成功', 'success');
    });
  }, '黑名单');
}

async function saveBlacklist() {
  const button = $('saveBlacklistButton');
  setButtonBusy(button, true);
  const normalized = normalizeBlacklistClient(blacklist);
  if (normalized.length !== blacklist.length || normalized.some((word, index) => word !== blacklist[index])) {
    blacklist = normalized;
    renderBlacklist();
  }
  try {
    const response = await fetch('/api/blacklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(blacklist)
    });
    if (!response.ok) throw responseError('黑名单配置保存', response);
    setBlacklistDirty(false);
    savedBlacklist = [...blacklist];
    blacklistHistory.length = 0;
    showToast('黑名单配置已保存', 'success');
    closeSettingsDialog('blacklistDialog');
    if (document.body.dataset.page === 'overview' && typeof fetchNodes === 'function') fetchNodes();
  } catch (error) {
    setBlacklistDirty(true);
    showToast(error.message || '黑名单配置保存失败', 'error', saveBlacklist);
  } finally {
    setButtonBusy(button, false);
    if (button) button.disabled = !blacklistDirty;
  }
}

function validateRuleInput(input, values, index, label) {
  const value = input?.value.trim() || '';
  if (!value) { setInputError(input, label + '不能为空'); return false; }
  const duplicate = values.some((item, itemIndex) => itemIndex !== index && item.trim().toLowerCase() === value.toLowerCase());
  if (duplicate) { setInputError(input, '该项已存在'); return false; }
  clearInputError(input);
  return true;
}

function undoBlacklistChanges() {
  if (!blacklistDirty) return;
  if (blacklistHistory.length) blacklist = blacklistHistory.pop();
  else blacklist = [...savedBlacklist];
  selectedBlacklist.clear();
  renderBlacklist();
  const dirty = !sameRuleList(blacklist, savedBlacklist);
  setBlacklistDirty(dirty);
  showToast(dirty ? '已撤销上一步黑名单修改' : '已恢复到最近保存的黑名单', 'info');
}

function resetBlacklistDefaults() {
  if (!settingConfirm('确定恢复默认黑名单吗？当前未保存的修改也会被替换。')) return;
  pushRuleHistory(blacklistHistory, blacklist);
  blacklist = [];
  selectedBlacklist.clear();
  renderBlacklist();
  setBlacklistDirty(true);
  showToast('已恢复默认黑名单，请保存后生效', 'info');
}

function selectAllBlacklist() {
  const query = blacklistSearchTerm.trim().toLowerCase();
  blacklist.filter((word) => !query || word.toLowerCase().includes(query)).forEach((word) => selectedBlacklist.add(word));
  renderBlacklist();
}

function clearBlacklistSelection() { selectedBlacklist.clear(); renderBlacklist(); }

function deleteSelectedBlacklist() {
  if (!selectedBlacklist.size) { showToast('请先选择要删除的黑名单', 'warning'); return; }
  if (!settingConfirm('确定删除选中的 ' + selectedBlacklist.size + ' 个黑名单词条吗？')) return;
  pushRuleHistory(blacklistHistory, blacklist);
  blacklist = blacklist.filter((word) => !selectedBlacklist.has(word));
  selectedBlacklist.clear();
  renderBlacklist();
  setBlacklistDirty(true);
}

function initBlacklistForm() {
  const input = $('newBlacklistWord');
  if (!input) return;
  if (input.dataset.bound !== 'true') {
    input.dataset.bound = 'true';
    input.addEventListener('input', () => clearInputError(input));
  }
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addBlacklistWord();
    }
  });
}

function normalizeCamouflageSettingsClient(value) {
  const source = value && typeof value === 'object' && value.camouflage && typeof value.camouflage === 'object' ? value.camouflage : value;
  if (!source || typeof source !== 'object') return { enabled: false, accessPath: '', redirectUrl: '' };
  return {
    enabled: source.enabled === true,
    accessPath: typeof source.accessPath === 'string' ? source.accessPath.trim().replace(/^\\/+|\\/+$/g, '') : '',
    redirectUrl: source.redirectUrl === '/' ? '' : (typeof source.redirectUrl === 'string' ? source.redirectUrl.trim() : ''),
  };
}

function sameCamouflageSettings(left, right) {
  return left.enabled === right.enabled && left.accessPath === right.accessPath && left.redirectUrl === right.redirectUrl;
}

function updateCamouflageSummary() {
  const summary = $('camouflageSummary');
  if (summary) summary.textContent = camouflageSettings.enabled ? (camouflageSettings.accessPath ? '已启用' : '已启用，未设置入口') : '未启用';
  const status = $('camouflageSaveStatus');
  const button = $('saveCamouflageButton');
  if (status) { status.textContent = camouflageDirty ? '有未保存的修改' : '配置已保存'; status.classList.toggle('dirty', camouflageDirty); }
  if (button) button.disabled = !camouflageDirty;
}

function setCamouflageDirty(dirty = true) {
  camouflageDirty = dirty;
  updateCamouflageSummary();
}

function renderCamouflageSettings() {
  const enabled = $('camouflageEnabled');
  const accessPath = $('camouflageAccessPath');
  const redirectUrl = $('camouflageRedirectUrl');
  if (enabled) enabled.checked = camouflageSettings.enabled;
  if (accessPath) accessPath.value = camouflageSettings.accessPath;
  if (redirectUrl) redirectUrl.value = camouflageSettings.redirectUrl;
  updateCamouflageSummary();
}

async function loadCamouflageSettings() {
  try {
    camouflageSettings = normalizeCamouflageSettingsClient(await readJsonResponse('/api/settings', '伪装首页设置'));
    savedCamouflageSettings = { ...camouflageSettings };
    setCamouflageDirty(false);
    renderCamouflageSettings();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function readCamouflageSettingsForm() {
  return normalizeCamouflageSettingsClient({
    enabled: $('camouflageEnabled')?.checked,
    accessPath: $('camouflageAccessPath')?.value || '',
    redirectUrl: $('camouflageRedirectUrl')?.value || '',
  });
}

async function saveCamouflageSettings() {
  const button = $('saveCamouflageButton');
  const next = readCamouflageSettingsForm();
  if (next.enabled && !next.accessPath) {
    setInputError($('camouflageAccessPath'), '启用伪装首页时必须设置管理入口路径');
    showToast('请先设置管理入口路径', 'error');
    return;
  }
  clearInputError($('camouflageAccessPath'));
  setButtonBusy(button, true);
  try {
    const response = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(next) });
    if (!response.ok) throw responseError('伪装首页设置保存', response);
    camouflageSettings = normalizeCamouflageSettingsClient(await response.json());
    savedCamouflageSettings = { ...camouflageSettings };
    setCamouflageDirty(false);
    showToast('伪装首页设置已保存，重新打开入口后生效', 'success');
  } catch (error) {
    setCamouflageDirty(true);
    showToast(error.message || '伪装首页设置保存失败', 'error', saveCamouflageSettings);
  } finally {
    setButtonBusy(button, false);
    if (button) button.disabled = !camouflageDirty;
  }
}

function initCamouflageSettings() {
  const enabled = $('camouflageEnabled');
  const accessPath = $('camouflageAccessPath');
  const redirectUrl = $('camouflageRedirectUrl');
  if (!enabled || enabled.dataset.bound === 'true') return;
  [enabled, accessPath, redirectUrl].forEach((element) => element?.addEventListener('input', () => {
    camouflageSettings = readCamouflageSettingsForm();
    setCamouflageDirty(!sameCamouflageSettings(camouflageSettings, savedCamouflageSettings));
    if (element !== accessPath) clearInputError(element);
  }));
  enabled.dataset.bound = 'true';
}

let filterRules = [];
let savedFilterRules = [];
let filterRulesSearchTerm = '';
let filterRulesPage = 1;
const filterRulesHistory = [];
const selectedFilterRules = new Set();
const RULE_PAGE_SIZE = 40;

function pushRuleHistory(history, values) {
  const snapshot = [...values];
  if (history.length && JSON.stringify(history[history.length - 1]) === JSON.stringify(snapshot)) return;
  history.push(snapshot);
  if (history.length > 10) history.shift();
}

function sameRuleList(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function renderRulePagination(containerId, total, page, onPage) {
  const container = $(containerId);
  if (!container) return;
  const pages = Math.ceil(total / RULE_PAGE_SIZE);
  container.innerHTML = '';
  container.hidden = pages <= 1;
  if (pages <= 1) return;
  const previous = document.createElement('button');
  previous.type = 'button'; previous.className = 'btn-subtle'; previous.textContent = '上一页'; previous.disabled = page <= 1;
  previous.onclick = () => onPage(page - 1);
  const label = document.createElement('span'); label.textContent = '第 ' + page + ' / ' + pages + ' 页';
  const next = document.createElement('button');
  next.type = 'button'; next.className = 'btn-subtle'; next.textContent = '下一页'; next.disabled = page >= pages;
  next.onclick = () => onPage(page + 1);
  container.append(previous, label, next);
}

function updateRuleSelectionCount(elementId, count) {
  const element = $(elementId);
  if (element) element.textContent = count ? '已选择 ' + count + ' 项' : '未选择';
}

function openRuleImportPreview(label, current, incoming, apply) {
  const dialog = $('ruleImportPreviewDialog');
  const added = incoming.filter((item) => !current.some((value) => value.toLowerCase() === item.toLowerCase())).length;
  const removed = current.filter((item) => !incoming.some((value) => value.toLowerCase() === item.toLowerCase())).length;
  const unchanged = incoming.length - added;
  if (!dialog || typeof dialog.showModal !== 'function') {
    if (settingConfirm('导入预览：' + label + '将新增 ' + added + ' 项、保留 ' + unchanged + ' 项、移除 ' + removed + ' 项。确定导入吗？')) apply();
    return;
  }
  $('ruleImportPreviewTitle').textContent = label + '导入预览';
  $('ruleImportPreviewMessage').textContent = '确认后将替换当前配置，未保存的修改也会被替换。';
  $('ruleImportPreviewStats').innerHTML = '<span><strong>' + incoming.length + '</strong> 导入</span><span><strong>' + added + '</strong> 新增</span><span><strong>' + unchanged + '</strong> 保留</span><span><strong>' + removed + '</strong> 移除</span>';
  dialog._applyRuleImport = apply;
  dialog.showModal();
}

function settingConfirm(message) {
  return typeof window.confirm !== 'function' || window.confirm(message);
}

let settingsDialogPageScrollY = 0;
let settingsDialogScrollLocked = false;

function lockSettingsDialogPageScroll() {
  if (settingsDialogScrollLocked) return;
  settingsDialogPageScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  settingsDialogScrollLocked = true;
  document.documentElement.classList.add('settings-editor-scroll-locked');
  document.body.classList.add('settings-editor-scroll-locked');
}

function unlockSettingsDialogPageScroll() {
  if (!settingsDialogScrollLocked) return;
  settingsDialogScrollLocked = false;
  document.documentElement.classList.remove('settings-editor-scroll-locked');
  document.body.classList.remove('settings-editor-scroll-locked');
  window.scrollTo(0, settingsDialogPageScrollY);
}

function openSettingsDialog(id) {
  const dialog = $(id);
  if (!dialog || dialog.open) return;
  lockSettingsDialogPageScroll();
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
  const body = dialog.querySelector('.settings-dialog-body');
  if (body) { body.scrollTop = 0; body.scrollLeft = 0; }
  dialog.querySelectorAll('.settings-editor-list, [data-scroll-container]').forEach((element) => {
    element.scrollTop = 0;
    element.scrollLeft = 0;
  });
  dialog.querySelector('.settings-dialog-body input, .settings-dialog-body select')?.focus();
}

function closeSettingsDialog(id) {
  const dialog = $(id);
  if (!dialog) return;
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
  unlockSettingsDialogPageScroll();
}

function updateSettingsActionState() {
  const blacklistUndo = $('blacklistSettings')?.querySelector('.setting-undo-button');
  const filterUndo = $('filterRulesSettings')?.querySelector('.setting-undo-button');
  if (blacklistUndo) blacklistUndo.disabled = !blacklistDirty;
  if (filterUndo) filterUndo.disabled = !filterRulesDirty;
}

function filterRuleText(value, ruleList) {
  let result = String(value || '');
  let cutIndex = -1;
  for (const rule of ruleList) {
    if (rule === '符号') continue;
    const index = rule === '空格' ? result.search(/\s/u) : result.toLowerCase().indexOf(rule.toLowerCase());
    if (index >= 0 && (cutIndex < 0 || index < cutIndex)) cutIndex = index;
  }
  if (cutIndex >= 0) result = result.slice(0, cutIndex);
  if (ruleList.includes('符号')) result = result.replace(/[\p{So}\uFE0F]+/gu, '');
  return result.trim();
}

function updateFilterPreview() {
  const input = $('filterPreviewInput');
  const output = $('filterPreviewOutput');
  if (!input || !output) return;
  output.textContent = filterRuleText(input.value, filterRules);
}
function normalizeFilterRulesClient(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.reduce((result, item) => {
    if (typeof item !== 'string') return result;
    const rule = item.trim().slice(0, 128);
    const key = rule.toLowerCase();
    if (!rule || seen.has(key) || result.length >= 200) return result;
    seen.add(key); result.push(rule); return result;
  }, []);
}
function setFilterRulesDirty(dirty = true) {
  filterRulesDirty = dirty;
  const status = $('filterRulesSaveStatus');
  const button = $('saveFilterRulesButton');
  if (status) { status.textContent = dirty ? '有未保存的修改' : '配置已保存'; status.classList.toggle('dirty', dirty); }
  if (button) button.disabled = !dirty;
  updateSettingsActionState();
}
function renderFilterRules() {
  const list = $('filterRulesList');
  if (!list) return;
  list.innerHTML = '';
  const query = filterRulesSearchTerm.trim().toLowerCase();
  const matches = filterRules
    .map((rule, index) => ({ rule, index }))
    .filter(({ rule }) => !query || rule.toLowerCase().includes(query));
  const totalPages = Math.max(1, Math.ceil(matches.length / RULE_PAGE_SIZE));
  filterRulesPage = Math.min(Math.max(1, filterRulesPage), totalPages);
  const visible = matches.slice((filterRulesPage - 1) * RULE_PAGE_SIZE, filterRulesPage * RULE_PAGE_SIZE);
  list.classList.toggle('is-large', matches.length > 24);
  list.classList.toggle('is-paged', totalPages > 1);
  const fragment = document.createDocumentFragment();
  visible.forEach(({ rule, index }) => {
    const row = document.createElement('div'); row.className = 'blacklist-row';
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.className = 'rule-select';
    checkbox.checked = selectedFilterRules.has(rule); checkbox.setAttribute('aria-label', '选择过滤规则 ' + (index + 1));
    checkbox.addEventListener('change', () => { if (checkbox.checked) selectedFilterRules.add(rule); else selectedFilterRules.delete(rule); updateRuleSelectionCount('filterRulesSelectionCount', selectedFilterRules.size); });
    const input = document.createElement('input'); input.type = 'text'; input.maxLength = 128; input.value = rule;
    input.setAttribute('aria-label', '过滤规则 ' + (index + 1));
    input.addEventListener('input', () => { if (!input.dataset.historyStarted) { pushRuleHistory(filterRulesHistory, filterRules); input.dataset.historyStarted = 'true'; } filterRules[index] = input.value.slice(0, 128); selectedFilterRules.delete(rule); clearInputError(input); setFilterRulesDirty(); updateFilterPreview(); });
    input.addEventListener('blur', () => validateRuleInput(input, filterRules, index, '过滤规则'));
    const button = document.createElement('button'); button.type = 'button'; button.className = 'del-btn'; button.textContent = '删除';
    button.onclick = () => { pushRuleHistory(filterRulesHistory, filterRules); filterRules.splice(index, 1); renderFilterRules(); setFilterRulesDirty(); };
    row.append(checkbox, input, button); fragment.appendChild(row);
  });
  list.appendChild(fragment);
  if ($('filterRulesEmpty')) {
    $('filterRulesEmpty').textContent = query ? '没有匹配的过滤规则。' : '暂无过滤规则。';
    $('filterRulesEmpty').hidden = matches.length !== 0;
  }
  if ($('filterRulesSummary')) $('filterRulesSummary').textContent = query ? matches.length + ' / ' + filterRules.length + ' 项' : filterRules.length + ' 项';
  renderRulePagination('filterRulesPagination', matches.length, filterRulesPage, (page) => { filterRulesPage = page; renderFilterRules(); });
  updateRuleSelectionCount('filterRulesSelectionCount', selectedFilterRules.size);
  updateFilterPreview();
}
async function loadFilterRules() {
  if ($('filterRulesList')) $('filterRulesList').innerHTML = listSkeletonMarkup(2);
  try { filterRules = normalizeFilterRulesClient(await readJsonResponse('/api/filter-rules', '备注过滤规则')); savedFilterRules = [...filterRules]; filterRulesHistory.length = 0; filterRulesPage = 1; selectedFilterRules.clear(); renderFilterRules(); setFilterRulesDirty(false); }
  catch (error) { renderLoadError('filterRulesList', error.message, loadFilterRules); showToast(error.message, 'error'); }
}
function addFilterRule() {
  const input = $('newFilterRule'); if (!input) return;
  const rule = input.value.trim().slice(0, 128);
  if (!rule) { setInputError(input, '请输入过滤规则'); showToast('请输入过滤规则', 'error'); input.focus(); return; }
  if (filterRules.length >= 200) { showToast('过滤规则不能超过 200 个', 'error'); return; }
  if (filterRules.some((item) => item.toLowerCase() === rule.toLowerCase())) { setInputError(input, '该规则已存在'); showToast('该规则已存在', 'error'); input.focus(); return; }
  pushRuleHistory(filterRulesHistory, filterRules);
  filterRules.push(rule); clearInputError(input); input.value = ''; renderFilterRules(); setFilterRulesDirty(); input.focus();
}
async function saveFilterRules() {
  const button = $('saveFilterRulesButton'); if (button) button.disabled = true;
  setButtonBusy(button, true);
  filterRules = normalizeFilterRulesClient(filterRules); renderFilterRules();
  try {
    const response = await fetch('/api/filter-rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(filterRules) });
    if (!response.ok) throw responseError('备注过滤规则保存', response);
    setFilterRulesDirty(false); savedFilterRules = [...filterRules]; filterRulesHistory.length = 0; showToast('备注过滤规则已保存', 'success'); closeSettingsDialog('filterRulesDialog');
    if (document.body.dataset.page === 'overview' && typeof fetchNodes === 'function') fetchNodes();
  } catch (error) { setFilterRulesDirty(true); showToast(error.message || '备注过滤规则保存失败', 'error', saveFilterRules); }
  finally { setButtonBusy(button, false); if (button) button.disabled = !filterRulesDirty; }
}
function initFilterRulesForm() {
  const input = $('newFilterRule');
  if (!input) return;
  if (input.dataset.bound !== 'true') {
    input.dataset.bound = 'true';
    input.addEventListener('input', () => clearInputError(input));
  }
  input.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); addFilterRule(); } });
}

function undoFilterRulesChanges() {
  if (!filterRulesDirty) return;
  if (filterRulesHistory.length) filterRules = filterRulesHistory.pop(); else filterRules = [...savedFilterRules];
  selectedFilterRules.clear(); renderFilterRules(); const dirty = !sameRuleList(filterRules, savedFilterRules); setFilterRulesDirty(dirty); showToast(dirty ? '已撤销上一步过滤规则修改' : '已恢复到最近保存的过滤规则', 'info');
}

function resetFilterRulesDefaults() {
  if (!settingConfirm('确定恢复默认过滤规则吗？当前未保存的修改也会被替换。')) return;
  pushRuleHistory(filterRulesHistory, filterRules); filterRules = []; selectedFilterRules.clear(); renderFilterRules(); setFilterRulesDirty(true); showToast('已恢复默认过滤规则，请保存后生效', 'info');
}

function selectAllFilterRules() {
  const query = filterRulesSearchTerm.trim().toLowerCase();
  filterRules.filter((rule) => !query || rule.toLowerCase().includes(query)).forEach((rule) => selectedFilterRules.add(rule));
  renderFilterRules();
}

function clearFilterRulesSelection() { selectedFilterRules.clear(); renderFilterRules(); }

function deleteSelectedFilterRules() {
  if (!selectedFilterRules.size) { showToast('请先选择要删除的过滤规则', 'warning'); return; }
  if (!settingConfirm('确定删除选中的 ' + selectedFilterRules.size + ' 条过滤规则吗？')) return;
  pushRuleHistory(filterRulesHistory, filterRules); filterRules = filterRules.filter((rule) => !selectedFilterRules.has(rule)); selectedFilterRules.clear(); renderFilterRules(); setFilterRulesDirty(true);
}

function initSettingsEnhancements() {
  document.querySelectorAll('.settings-editor-dialog').forEach((dialog) => {
    if (dialog.dataset.scrollBound === 'true') return;
    dialog.dataset.scrollBound = 'true';
    dialog.addEventListener('close', unlockSettingsDialogPageScroll);
  });
  const importDialog = $('ruleImportPreviewDialog');
  if (importDialog && importDialog.dataset.bound !== 'true') {
    importDialog.dataset.bound = 'true';
    $('cancelRuleImportButton')?.addEventListener('click', () => importDialog.close());
    $('confirmRuleImportButton')?.addEventListener('click', () => {
      const apply = importDialog._applyRuleImport;
      importDialog.close();
      if (typeof apply === 'function') apply();
    });
    importDialog.addEventListener('click', (event) => { if (event.target === importDialog) importDialog.close(); });
  }
  const blacklistSearch = $('blacklistSearch');
  if (blacklistSearch && blacklistSearch.dataset.bound !== 'true') {
    blacklistSearch.dataset.bound = 'true';
    blacklistSearch.value = blacklistSearchTerm;
    const updateBlacklistSearch = () => { blacklistSearchTerm = blacklistSearch.value; blacklistPage = 1; renderBlacklist(); };
    blacklistSearch.addEventListener('input', debounce(updateBlacklistSearch, 180));
    blacklistSearch.addEventListener('search', updateBlacklistSearch);
  }
  const filterSearch = $('filterRulesSearch');
  if (filterSearch && filterSearch.dataset.bound !== 'true') {
    filterSearch.dataset.bound = 'true';
    filterSearch.value = filterRulesSearchTerm;
    const updateFilterSearch = () => { filterRulesSearchTerm = filterSearch.value; filterRulesPage = 1; renderFilterRules(); };
    filterSearch.addEventListener('input', debounce(updateFilterSearch, 180));
    filterSearch.addEventListener('search', updateFilterSearch);
  }
  const previewInput = $('filterPreviewInput');
  if (previewInput && previewInput.dataset.bound !== 'true') {
    previewInput.dataset.bound = 'true'; previewInput.addEventListener('input', updateFilterPreview);
  }
  document.querySelectorAll('.rule-preset').forEach((button) => {
    if (button.dataset.bound === 'true') return;
    button.dataset.bound = 'true';
    button.addEventListener('click', () => {
      const input = $('newFilterRule');
      if (!input) return;
      input.value = button.dataset.filterRule || '';
      clearInputError(input); addFilterRule();
    });
  });
  document.querySelectorAll('input[name="themeModeSetting"]').forEach((input) => {
    if (input.dataset.bound === 'true') return;
    input.dataset.bound = 'true';
    input.addEventListener('change', () => { applyTheme(input.value); try { localStorage.setItem('theme', input.value); } catch {} });
  });
  syncThemeSettings();
}

function exportFilterRules() {
  downloadJsonFile(filterRules, 'filter-rules-backup-' + beijingStamp() + '.json');
  showToast('备注过滤规则已导出', 'success');
}

function importFilterRules(event) {
  readJsonFile(event, (data) => {
    if (!Array.isArray(data)) throw new Error('文件内容必须是字符串数组');
    const incoming = normalizeFilterRulesClient(data);
    openRuleImportPreview('备注过滤规则', filterRules, incoming, () => {
      pushRuleHistory(filterRulesHistory, filterRules);
      filterRules = incoming; selectedFilterRules.clear(); filterRulesPage = 1;
      renderFilterRules(); setFilterRulesDirty(true); showToast('备注过滤规则导入成功', 'success');
    });
  }, '备注过滤规则');
}

const pageIntros = {
  overview: '集中查看订阅聚合结果和节点状态。',
  subs: '管理优选订阅源，维护地址和备注。',
  apis: '管理额外 API 源，维护地址和备注。',
  manage: '统一管理优选订阅源和 API 源。',
  customApis: '创建并管理优选 API 的访问路径。',
  settings: '管理节点过滤关键词和备注清理规则，修改后会影响后续数据预览结果。'
};
let pageNavigationRequest = null;
let currentRouteUrl = window.location.href;

function setRouteState(updates) {
  const url = new URL(window.location.href);
  Object.entries(updates).forEach(([key, value]) => {
    const normalized = String(value ?? '').trim();
    if (normalized) url.searchParams.set(key, normalized);
    else url.searchParams.delete(key);
  });
  const nextUrl = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + url.hash;
  window.history.replaceState(window.history.state, '', nextUrl);
  currentRouteUrl = window.location.href;
}

function routeStateValue(key) {
  return new URL(window.location.href).searchParams.get(key) || '';
}

function syncRouteState() {
  const page = document.body.dataset.page || 'overview';
  const updates = {};
  if (page === 'overview') {
    updates.q = nodesSearchEl?.value || '';
    updates.region = nodesRegionFilterEl?.value || '';
    updates.source = nodesSourceFilterEl?.value || '';
    updates.status = nodesStatusFilterEl?.value || '';
    updates.sort = nodesSortEl?.value === 'default' ? '' : nodesSortEl?.value || '';
  }
  if (page === 'subs' || page === 'manage') {
    updates.subsQ = $('subsSearch')?.value || '';
    updates.subsSort = $('subsSort')?.value === 'default' ? '' : $('subsSort')?.value || '';
  }
  if (page === 'apis' || page === 'manage') {
    updates.apisQ = $('apisSearch')?.value || '';
    updates.apisSort = $('apisSort')?.value === 'default' ? '' : $('apisSort')?.value || '';
  }
  if (page === 'customApis') updates.customQ = $('customApiSearch')?.value || '';
  setRouteState(updates);
}

function hydratePageState(page) {
  if (page === 'overview') {
    previewDataMode = loadPreviewDataMode();
    applyPreviewDataMode();
    if (nodesSearchEl) nodesSearchEl.value = routeStateValue('q');
    if (nodesRegionFilterEl) nodesRegionFilterEl.value = routeStateValue('region');
    if (nodesSourceFilterEl) nodesSourceFilterEl.value = routeStateValue('source');
    if (nodesStatusFilterEl) nodesStatusFilterEl.value = routeStateValue('status');
    if (nodesSortEl) nodesSortEl.value = routeStateValue('sort') || 'default';
  }
  if (page === 'subs' || page === 'manage') {
    const search = $('subsSearch');
    const sort = $('subsSort');
    if (search) search.value = routeStateValue('subsQ');
    if (sort) sort.value = routeStateValue('subsSort') || 'default';
  }
  if (page === 'apis' || page === 'manage') {
    const search = $('apisSearch');
    const sort = $('apisSort');
    if (search) search.value = routeStateValue('apisQ');
    if (sort) sort.value = routeStateValue('apisSort') || 'default';
  }
  if (page === 'customApis') {
    const search = $('customApiSearch');
    if (search) search.value = routeStateValue('customQ');
  }
}

function updatePageChrome(page) {
  document.body.dataset.page = page;
  const intro = $('pageIntro');
  if (intro) intro.textContent = pageIntros[page] || pageIntros.overview;
  document.querySelectorAll('[data-nav-page]').forEach((link) => {
    const isActive = link.dataset.navPage === page;
    link.classList.toggle('active', isActive);
    if (isActive) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function cachePageElements() {
  nodesContainer = $('nodesContainer');
  paginationEl = $('pagination');
  nodesCountEl = $('nodesCount');
  nodesSearchEl = $('nodesSearch');
  nodesRegionFilterEl = $('nodesRegionFilter');
  nodesSortEl = $('nodesSort');
  nodesFilterResetEl = $('nodesFilterReset');
  nodesSourceFilterEl = $('nodesSourceFilter');
  nodesStatusFilterEl = $('nodesStatusFilter');
  previewDataStatusEl = $('previewDataStatus');
  previewDataModeHintEl = $('previewDataModeHint');
  previewDataStatsEl = $('previewDataStats');
  previewDataCacheEl = $('previewDataCache');
  previewDataUpdatedEl = $('previewDataUpdated');
  previewModeButtons = document.querySelectorAll('[data-preview-mode]');
  applyPreviewDataMode();
}

function bindPageControls() {
  previewModeButtons?.forEach((button) => {
    if (button.dataset.bound === 'true') return;
    button.dataset.bound = 'true';
    button.addEventListener('click', () => setPreviewDataMode(button.dataset.previewMode));
  });
  const previewApiSelect = $('previewApiSelect');
  if (previewApiSelect && previewApiSelect.dataset.bound !== 'true') {
    previewApiSelect.dataset.bound = 'true';
    previewApiSelect.addEventListener('change', () => savePreviewApiPath(previewApiSelect.value));
  }
  const customApiSearch = $('customApiSearch');
  if (customApiSearch && customApiSearch.dataset.bound !== 'true') {
    customApiSearch.dataset.bound = 'true';
    customApiSearch.addEventListener('input', () => {
      renderCustomApis();
      syncRouteState();
    });
  }
  const exportCustomApisButton = $('exportCustomApisButton');
  if (exportCustomApisButton && exportCustomApisButton.dataset.bound !== 'true') {
    exportCustomApisButton.dataset.bound = 'true';
    exportCustomApisButton.addEventListener('click', exportCustomApis);
  }
  const importCustomApisButton = $('importCustomApisButton');
  const importCustomApisFile = $('importCustomApisFile');
  if (importCustomApisButton && importCustomApisFile && importCustomApisButton.dataset.bound !== 'true') {
    importCustomApisButton.dataset.bound = 'true';
    importCustomApisButton.addEventListener('click', () => importCustomApisFile.click());
    importCustomApisFile.addEventListener('change', importCustomApis);
  }
  [nodesSearchEl, nodesRegionFilterEl, nodesSortEl, nodesSourceFilterEl, nodesStatusFilterEl].forEach((element) => {
    if (!element || element.dataset.bound === 'true') return;
    element.dataset.bound = 'true';
    element.addEventListener(element.tagName === 'INPUT' ? 'input' : 'change', () => { renderNodeView(); syncRouteState(); });
  });
  if (nodesFilterResetEl && nodesFilterResetEl.dataset.bound !== 'true') {
    nodesFilterResetEl.dataset.bound = 'true';
    nodesFilterResetEl.addEventListener('click', () => {
      if (nodesSearchEl) nodesSearchEl.value = '';
      if (nodesRegionFilterEl) nodesRegionFilterEl.value = '';
      if (nodesSortEl) nodesSortEl.value = 'default';
      if (nodesSourceFilterEl) nodesSourceFilterEl.value = '';
      if (nodesStatusFilterEl) nodesStatusFilterEl.value = '';
      renderNodeView();
      syncRouteState();
    });
  }
  ['subs', 'apis'].forEach((type) => {
    const search = $(type + 'Search');
    const sort = $(type + 'Sort');
    if (search && search.dataset.bound !== 'true') {
      search.dataset.bound = 'true';
      search.addEventListener('input', () => { (type === 'subs' ? renderSubs : renderApis)(); syncRouteState(); });
    }
    if (sort && sort.dataset.bound !== 'true') {
      sort.dataset.bound = 'true';
      sort.addEventListener('change', () => { (type === 'subs' ? renderSubs : renderApis)(); syncRouteState(); });
    }
    document.querySelectorAll('[data-batch^="' + type + '-"]').forEach((button) => {
      if (button.dataset.bound === 'true') return;
      button.dataset.bound = 'true';
      button.addEventListener('click', () => applySourceBatch(type, button.dataset.batch.replace(type + '-', ''), button));
    });
  });
  const sourceStatusRefreshButton = $('sourceStatusRefreshButton');
  if (sourceStatusRefreshButton && sourceStatusRefreshButton.dataset.bound !== 'true') {
    sourceStatusRefreshButton.dataset.bound = 'true';
    sourceStatusRefreshButton.addEventListener('click', () => {
      void loadSourceStatuses($('sourceStatusScope')?.value || 'used');
    });
  }
  const sourceStatusIssuesButton = $('sourceStatusIssuesButton');
  if (sourceStatusIssuesButton && sourceStatusIssuesButton.dataset.bound !== 'true') {
    sourceStatusIssuesButton.dataset.bound = 'true';
    sourceStatusIssuesButton.addEventListener('click', detectProblemSources);
  }
  const addPreferredDomainButton = $('addPreferredDomainButton');
  if (addPreferredDomainButton && addPreferredDomainButton.dataset.bound !== 'true') {
    addPreferredDomainButton.dataset.bound = 'true';
    addPreferredDomainButton.addEventListener('click', () => void addPreferredDomain());
  }
  const newPreferredDomain = $('newPreferredDomain');
  if (newPreferredDomain && newPreferredDomain.dataset.bound !== 'true') {
    newPreferredDomain.dataset.bound = 'true';
    newPreferredDomain.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') { event.preventDefault(); void addPreferredDomain(); }
    });
  }
  const preferredDomainSearch = $('preferredDomainsSearch');
  const preferredDomainSort = $('preferredDomainsSort');
  const preferredDomainStatusFilter = $('preferredDomainsStatusFilter');
  if (preferredDomainSearch && preferredDomainSearch.dataset.bound !== 'true') {
    preferredDomainSearch.dataset.bound = 'true';
    preferredDomainSearch.addEventListener('input', renderPreferredDomains);
  }
  if (preferredDomainSort && preferredDomainSort.dataset.bound !== 'true') {
    preferredDomainSort.dataset.bound = 'true';
    preferredDomainSort.addEventListener('change', renderPreferredDomains);
  }
  if (preferredDomainStatusFilter && preferredDomainStatusFilter.dataset.bound !== 'true') {
    preferredDomainStatusFilter.dataset.bound = 'true';
    preferredDomainStatusFilter.addEventListener('change', renderPreferredDomains);
  }
  document.querySelectorAll('[data-batch^="domains-"]').forEach((button) => {
    if (button.dataset.bound === 'true') return;
    button.dataset.bound = 'true';
    button.addEventListener('click', () => {
      const list = $('preferredDomainsList');
      const selected = [...(list?.querySelectorAll('.source-select:checked') || [])].map((input) => input.dataset.key);
      if (button.dataset.batch === 'domains-select') {
        list?.querySelectorAll('.source-select').forEach((input) => { input.checked = true; });
      } else void deletePreferredDomains(selected, button);
    });
  });
  const exportPreferredDomainsButton = $('exportPreferredDomainsButton');
  if (exportPreferredDomainsButton && exportPreferredDomainsButton.dataset.bound !== 'true') {
    exportPreferredDomainsButton.dataset.bound = 'true';
    exportPreferredDomainsButton.addEventListener('click', exportPreferredDomains);
  }
  const importPreferredDomainsButton = $('importPreferredDomainsButton');
  const importPreferredDomainsFile = $('importPreferredDomainsFile');
  if (importPreferredDomainsButton && importPreferredDomainsFile && importPreferredDomainsButton.dataset.bound !== 'true') {
    importPreferredDomainsButton.dataset.bound = 'true';
    importPreferredDomainsButton.addEventListener('click', () => importPreferredDomainsFile.click());
    importPreferredDomainsFile.addEventListener('change', importPreferredDomains);
  }
}

// ======================== 备份与恢复 ========================
const BACKUP_SECTION_LABELS = {  subs: '订阅源',
  apis: 'API 源',
  customApis: '优选 API',
  blacklist: '黑名单',
  filterRules: '过滤规则',
  preferredDomains: '优选域名',
  settings: '伪装设置',
};

// 备份文件名统一使用北京时间（UTC+8），与服务端 WebDAV 备份保持一致。
function backupFileName() {
  return 'sub-api-generator-backup-' + beijingStamp() + '.json';
}

async function exportBackup(button) {
  setButtonBusy(button, true, '备份中…');
  try {
    const data = await readJsonResponse('/api/backup', '备份');
    downloadJsonFile(data, backupFileName());
    showToast('备份已导出', 'success');
  } catch (error) {
    showToast(error.message || '备份失败', 'error', () => exportBackup(button));
  } finally {
    setButtonBusy(button, false);
  }
}

function describeRestoreSections(data) {
  if (!data || typeof data !== 'object') return '';
  const parts = [];
  for (const [key, label] of Object.entries(BACKUP_SECTION_LABELS)) {
    if (!(key in data)) continue;
    const value = data[key];
    if (Array.isArray(value)) parts.push(label + ' ' + value.length + ' 项');
    else if (value && typeof value === 'object') parts.push(label + ' ' + Object.keys(value).length + ' 项');
    else parts.push(label);
  }
  return parts.join('、');
}

function restoreBackup(event) {
  readJsonFile(event, (parsed) => {
    const data = parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)
      ? parsed.data
      : null;
    if (!data) {
      showToast('恢复失败：备份文件格式无效', 'error');
      return;
    }
    const summary = describeRestoreSections(data);
    if (!summary) {
      showToast('恢复失败：备份文件中没有任何配置', 'error');
      return;
    }
    openRestoreConfirm(restoreStatsHtml(data), () => applyRestore(data));
  }, '备份');
}

function openRestoreConfirm(statsHtml, apply) {
  const dialog = $('restoreConfirmDialog');
  if (!dialog || typeof dialog.showModal !== 'function') {
    if (settingConfirm('恢复将覆盖当前对应配置。确定恢复吗？')) void apply();
    return;
  }
  $('restoreConfirmStats').innerHTML = statsHtml;
  dialog._restoreApply = apply;
  dialog.showModal();
}

function restoreStatsHtml(data) {
  const summary = describeRestoreSections(data);
  if (!summary) return '';
  return summary
    .split('、')
    .map((part) => '<span><strong>' + part.replace(/\s\d+ 项$/, '') + '</strong>' + (/\d+ 项$/.test(part) ? part.match(/\d+ 项$/)[0] : '') + '</span>')
    .join('');
}

async function applyRestore(data) {
  const button = $('restoreBackupButton');
  setButtonBusy(button, true, '恢复中…');
  try {
    const response = await fetch('/api/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ version: 1, data }),
    });
    if (!response.ok) throw responseError('恢复备份', response);
    showToast('备份恢复成功：' + (describeRestoreSections(data) || '已完成'), 'success');
    void loadCamouflageSettings();
    void loadBlacklist();
    void loadFilterRules();
  } catch (error) {
    showToast(error.message || '恢复失败', 'error', () => applyRestore(data));
  } finally {
    setButtonBusy(button, false);
  }
}

function initBackupRestore() {
  const dialog = $('restoreConfirmDialog');
  if (!dialog || dialog.dataset.bound === 'true') return;
  dialog.dataset.bound = 'true';
  $('cancelRestoreButton')?.addEventListener('click', () => dialog.close());
  $('confirmRestoreButton')?.addEventListener('click', () => {
    const apply = dialog._restoreApply;
    dialog._restoreApply = null;
    dialog.close();
    if (apply) void apply();
  });
}

// ======================== WebDAV 云备份 ========================
let webdavBackupConfig = { url: '', username: '', filename: 'sub-api-generator-backup.json', passwordSet: false };

function readWebdavConfigForm() {
  return {
    url: ($('webdavUrl')?.value || '').trim(),
    username: ($('webdavUsername')?.value || '').trim(),
    password: $('webdavPassword')?.value || '',
    filename: ($('webdavFilename')?.value || '').trim(),
  };
}

function isWebdavConfiguredClient() {
  return Boolean(webdavBackupConfig.url);
}

function updateWebdavBackupUi(dirty) {
  const status = $('webdavSaveStatus');
  const summary = $('webdavSummary');
  if (status) {
    status.textContent = dirty ? '有未保存的修改' : (isWebdavConfiguredClient() ? '配置已保存' : '未配置');
    status.classList.toggle('dirty', Boolean(dirty));
  }
  if (summary) summary.textContent = isWebdavConfiguredClient() ? '已配置' : '未配置';
  const upload = $('webdavUploadButton');
  const restoreRemote = $('webdavRestoreRemoteButton');
  if (upload) upload.disabled = !isWebdavConfiguredClient();
  if (restoreRemote) restoreRemote.disabled = !isWebdavConfiguredClient();
  const remoteSection = $('webdavRemoteSection');
  if (remoteSection) remoteSection.hidden = !isWebdavConfiguredClient();
}

async function loadWebdavBackupConfig() {
  try {
    webdavBackupConfig = await readJsonResponse('/api/backup/webdav', 'WebDAV 配置');
    if ($('webdavUrl')) $('webdavUrl').value = webdavBackupConfig.url || '';
    if ($('webdavUsername')) $('webdavUsername').value = webdavBackupConfig.username || '';
    if ($('webdavPassword')) $('webdavPassword').value = '';
    if ($('webdavFilename')) $('webdavFilename').value = webdavBackupConfig.filename || 'sub-api-generator-backup.json';
    updateWebdavBackupUi(false);
    // 云端备份列表仅在用户点击"刷新列表"时获取。
    const remoteList = $('webdavRemoteList');
    if (remoteList) remoteList.innerHTML = '<div class="webdav-remote-empty">点击"🔄 刷新列表"获取云端备份。</div>';
  } catch (error) {
    updateWebdavBackupUi(false);
    showToast(error.message, 'error');
  }
}

function initWebdavBackupSettings() {
  const inputs = [$('webdavUrl'), $('webdavUsername'), $('webdavPassword'), $('webdavFilename')];
  if (inputs.every((element) => !element)) return;
  inputs.forEach((element) => {
    if (!element || element.dataset.webdavBound === 'true') return;
    element.dataset.webdavBound = 'true';
    element.addEventListener('input', () => updateWebdavBackupUi(true));
  });
  const deleteDialog = $('webdavDeleteDialog');
  if (deleteDialog && deleteDialog.dataset.bound !== 'true') {
    deleteDialog.dataset.bound = 'true';
    $('cancelWebdavDeleteButton')?.addEventListener('click', () => deleteDialog.close());
    $('confirmWebdavDeleteButton')?.addEventListener('click', () => {
      const target = deleteDialog._deleteTarget;
      deleteDialog._deleteTarget = null;
      deleteDialog.close();
      if (target) void performWebdavDelete(target.filename, target.button);
    });
  }
}

async function saveWebdavConfig() {
  const button = $('saveWebdavConfigButton');
  const form = readWebdavConfigForm();
  if (!form.url) {
    showToast('请先填写 WebDAV 地址', 'error');
    return;
  }
  setButtonBusy(button, true);
  try {
    webdavBackupConfig = await readJsonResponse('/api/backup/webdav', 'WebDAV 配置保存', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(form),
    });
    if ($('webdavPassword')) $('webdavPassword').value = '';
    updateWebdavBackupUi(false);
    const remoteList = $('webdavRemoteList');
    if (remoteList) remoteList.innerHTML = '<div class="webdav-remote-empty">点击"🔄 刷新列表"获取云端备份。</div>';
    showToast('WebDAV 配置已保存', 'success');
  } catch (error) {
    updateWebdavBackupUi(true);
    showToast(error.message || 'WebDAV 配置保存失败', 'error', saveWebdavConfig);
  } finally {
    setButtonBusy(button, false);
  }
}

async function testWebdavConfig(button) {
  const form = readWebdavConfigForm();
  if (!form.url) {
    showToast('请先填写 WebDAV 地址', 'error');
    return;
  }
  setButtonBusy(button, true, '测试中…');
  try {
    // 密码留空时服务端会沿用已保存的密码进行测试。
    const result = await webdavAction('/api/backup/webdav/test', 'WebDAV 连接测试', form);
    showToast(result.message || (result.ok ? '连接成功' : '连接失败'), result.ok ? 'success' : 'error');
  } catch (error) {
    showToast(error.message || 'WebDAV 连接测试失败', 'error', () => testWebdavConfig(button));
  } finally {
    setButtonBusy(button, false);
  }
}

async function webdavAction(url, label, payload) {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    ...(payload ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) } : {}),
  });
  if (!response.ok) {
    const text = await response.text();
    let detail = text;
    try { detail = JSON.parse(text).error || text; } catch { /* text/plain 错误消息 */ }
    throw new Error(detail || label + '失败（HTTP ' + response.status + '）');
  }
  return response.json();
}

async function uploadWebdavBackup(button) {
  setButtonBusy(button, true, '上传中…');
  try {
    const result = await webdavAction('/api/backup/webdav/upload', 'WebDAV 备份');
    showToast('备份已上传：' + (result.filename || '') + (result.pruned ? '，已清理 ' + result.pruned + ' 份旧备份' : ''), 'success');
  } catch (error) {
    showToast(error.message || 'WebDAV 备份失败', 'error', () => uploadWebdavBackup(button));
  } finally {
    setButtonBusy(button, false);
  }
}

async function applyWebdavRestore(filename) {
  const button = $('webdavRestoreRemoteButton');
  setButtonBusy(button, true, '恢复中…');
  try {
    const result = await webdavAction('/api/backup/webdav/restore', 'WebDAV 恢复', filename ? { filename } : undefined);
    showToast('已从 WebDAV 恢复备份：' + (result.filename || filename || ''), 'success');
    void loadCamouflageSettings();
    void loadBlacklist();
    void loadFilterRules();
  } catch (error) {
    showToast(error.message || 'WebDAV 恢复失败', 'error', () => applyWebdavRestore(filename));
  } finally {
    setButtonBusy(button, false);
  }
}

async function restoreWebdavBackup(filename) {
  if (!isWebdavConfiguredClient()) {
    showToast('请先配置并保存 WebDAV 地址', 'error');
    return;
  }
  if (filename) {
    openRestoreConfirm('<span><strong>WebDAV 备份</strong>' + filename + '</span>', () => applyWebdavRestore(filename));
    return;
  }
  // 未指定文件名时先获取云端列表，确认框中展示将要恢复的具体文件。
  const button = $('webdavRestoreRemoteButton');
  setButtonBusy(button, true, '获取中…');
  try {
    const result = await readJsonResponse('/api/backup/webdav/list', '获取云端备份列表');
    const newest = Array.isArray(result.items) && result.items.length ? result.items[0].filename : '';
    if (!newest) {
      showToast('WebDAV 上没有找到备份文件', 'error');
      return;
    }
    openRestoreConfirm('<span><strong>WebDAV 备份</strong>' + newest + '</span>', () => applyWebdavRestore(newest));
  } catch (error) {
    showToast(error.message || '获取云端备份列表失败', 'error', () => restoreWebdavBackup());
  } finally {
    setButtonBusy(button, false);
  }
}

// ======================== WebDAV 云端备份列表 ========================
// 兼容旧命名：时间戳部分同时接受 - 和 _ 连接符。
function formatBackupFilenameTime(filename) {
  const name = String(filename || '');
  // 当前格式：-2026-09-13-12-30-45；兼容旧紧凑格式（-20260913-123045 / _20260913_123045）。
  const extended = name.match(/[-_](\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})\.json$/i);
  if (extended) {
    return extended[1] + '-' + extended[2] + '-' + extended[3] + ' ' + extended[4] + ':' + extended[5] + ':' + extended[6] + '（北京时间）';
  }
  const match = name.match(/[-_](\d{8})[-_](\d{6})\.json$/i);
  if (!match) return '';
  const date = match[1];
  const time = match[2];
  return date.slice(0, 4) + '-' + date.slice(4, 6) + '-' + date.slice(6, 8) + ' ' + time.slice(0, 2) + ':' + time.slice(2, 4) + ':' + time.slice(4, 6) + '（北京时间）';
}

function formatBackupSize(size) {
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes >= 1024 * 1024) return ' ' + (bytes / 1024 / 1024).toFixed(1) + ' MB';
  if (bytes >= 1024) return ' ' + (bytes / 1024).toFixed(1) + ' KB';
  return ' ' + bytes + ' B';
}

function renderWebdavRemoteList(items) {
  const container = $('webdavRemoteList');
  if (!container) return;
  container.innerHTML = '';
  if (!Array.isArray(items) || !items.length) {
    const empty = document.createElement('div');
    empty.className = 'webdav-remote-empty';
    empty.textContent = '云端暂无备份文件。';
    container.appendChild(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'webdav-remote-item';
    const meta = document.createElement('div');
    meta.className = 'webdav-remote-meta';
    const name = document.createElement('span');
    name.className = 'webdav-remote-name';
    name.textContent = item.filename || '';
    name.title = item.filename || '';
    const time = document.createElement('span');
    time.className = 'webdav-remote-time';
    time.textContent = formatBackupFilenameTime(item.filename)
      || (item.lastModified ? new Date(item.lastModified).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '未知时间')
      + formatBackupSize(item.size);
    meta.append(name, time);
    const actions = document.createElement('div');
    actions.className = 'webdav-remote-actions';
    const restoreButton = document.createElement('button');
    restoreButton.type = 'button';
    restoreButton.className = 'btn-subtle';
    restoreButton.textContent = '↩ 恢复';
    restoreButton.onclick = () => restoreWebdavBackup(item.filename);
    const downloadButton = document.createElement('button');
    downloadButton.type = 'button';
    downloadButton.className = 'btn-subtle';
    downloadButton.textContent = '⬇ 下载';
    downloadButton.onclick = () => downloadWebdavBackup(item.filename);
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'btn-subtle setting-reset-button';
    deleteButton.textContent = '🗑 删除';
    deleteButton.onclick = () => deleteWebdavBackup(item.filename, deleteButton);
    actions.append(restoreButton, downloadButton, deleteButton);
    row.append(meta, actions);
    fragment.appendChild(row);
  }
  container.appendChild(fragment);
}

async function refreshWebdavRemoteList() {
  const container = $('webdavRemoteList');
  if (!container) return;
  container.innerHTML = '<div class="webdav-remote-empty">正在获取云端备份列表…</div>';
  try {
    const result = await readJsonResponse('/api/backup/webdav/list', '获取云端备份列表');
    renderWebdavRemoteList(result.items);
  } catch (error) {
    container.innerHTML = '<div class="webdav-remote-empty"></div>';
    const empty = container.firstElementChild;
    empty.textContent = error.message || '获取云端备份列表失败';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'btn-subtle';
    retry.textContent = '重试';
    retry.onclick = () => refreshWebdavRemoteList();
    empty.appendChild(retry);
  }
}

async function downloadWebdavBackup(filename) {
  try {
    const response = await fetch('/api/backup/webdav/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ filename }),
    });
    if (!response.ok) throw responseError('下载云端备份', response);
    downloadJsonFile(await response.json(), filename);
    showToast('云端备份已下载：' + filename, 'success');
  } catch (error) {
    showToast(error.message || '下载云端备份失败', 'error', () => downloadWebdavBackup(filename));
  }
}

function deleteWebdavBackup(filename, button) {
  const dialog = $('webdavDeleteDialog');
  if (!dialog || typeof dialog.showModal !== 'function') {
    if (settingConfirm('确定删除云端备份 ' + filename + ' 吗？删除后无法恢复。')) void performWebdavDelete(filename, button);
    return;
  }
  $('webdavDeleteStats').innerHTML = '<span><strong>云端备份</strong>' + filename + '</span>';
  dialog._deleteTarget = { filename, button };
  dialog.showModal();
}

async function performWebdavDelete(filename, button) {
  setButtonBusy(button, true, '删除中…');
  try {
    await webdavAction('/api/backup/webdav/delete', '删除云端备份', { filename });
    showToast('云端备份已删除：' + filename, 'success');
    void refreshWebdavRemoteList();
  } catch (error) {
    showToast(error.message || '删除云端备份失败', 'error', () => performWebdavDelete(filename, button));
  } finally {
    setButtonBusy(button, false);
  }
}

function loadActivePage(page) {
  initSourceDeleteDialog();
  if (page === 'settings') {
    initSettingsEnhancements();
    initCamouflageSettings();
    void loadCamouflageSettings();
    initBlacklistForm();
    void loadBlacklist();
    initFilterRulesForm();
    void loadFilterRules();
    initBackupRestore();
    initWebdavBackupSettings();
    void loadWebdavBackupConfig();
  }
  if (page === 'customApis') {
    initCustomApiForm();
    void loadCustomApis(true);
  } else if (page === 'subs') {
    void loadSubs();
  } else if (page === 'apis') {
    void loadApis();
  } else if (page === 'manage') {
    void loadSubs();
    void loadApis();
    void loadSourceStatuses('read');
    void loadPreferredDomains();
  } else if (page === 'overview') {
    void loadCustomApis()
      .then(() => {
        hydratePageState(page);
        return fetchNodes();
      })
      .catch(() => {
        renderCustomApiSelect();
        hydratePageState(page);
        return fetchNodes();
      });
  }
}

async function navigateToPage(url, { historyMode = 'push', restoreUrl = window.location.href } = {}) {
  const target = new URL(url, window.location.href);
  const currentPage = document.body.dataset.page || 'overview';
  const basePath = getAdminBasePath();
  const routePath = target.pathname === basePath ? '' : target.pathname.startsWith(basePath + '/') ? target.pathname.slice(basePath.length) : null;
  const nextPage = routePath === '' ? 'overview'
    : routePath === '/custom-apis' ? 'customApis'
      : routePath === '/manage' ? 'manage'
        : routePath === '/settings' ? 'settings'
          : routePath === '/subs' ? 'subs'
            : routePath === '/apis' ? 'apis' : '';
  if (!nextPage || (nextPage === currentPage && target.pathname === window.location.pathname)) return;
  if (hasUnsavedChanges() && !window.confirm('当前有未保存的修改，确定离开吗？')) {
    if (historyMode === 'none') window.history.pushState({}, '', restoreUrl);
    return;
  }
  if (pageNavigationRequest) pageNavigationRequest.abort();
  const navigationController = new AbortController();
  pageNavigationRequest = navigationController;
  document.body.classList.add('page-navigating');
  document.querySelector('.page-load-indicator')?.classList.add('active');
  try {
    const response = await fetch(target.href, { signal: navigationController.signal, credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'text/html' } });
    if (!response.ok) throw new Error('页面请求失败（HTTP ' + response.status + '）');
    const html = await response.text();
    const nextDocument = new DOMParser().parseFromString(html, 'text/html');
    const nextContent = nextDocument.querySelector('#adminPageContent');
    const currentContent = $('adminPageContent');
    if (!nextContent || !currentContent) throw new Error('页面内容格式无效');
    activeNodeRequest?.abort();
    currentContent.replaceWith(nextContent);
    updatePageChrome(nextPage);
    cachePageElements();
    hydratePageState(nextPage);
    bindPageControls();
    loadActivePage(nextPage);
    if (historyMode === 'push') window.history.pushState({ page: nextPage }, '', target.pathname + target.search + target.hash);
    currentRouteUrl = window.location.href;
    window.scrollTo({ top: 0, behavior: 'auto' });
    updateScrollTopButton();
  } catch (error) {
    if (error.name !== 'AbortError') {
      if (historyMode === 'none') {
        window.history.pushState({}, '', restoreUrl);
        currentRouteUrl = window.location.href;
      }
      showToast(error.message || '页面加载失败', 'error', () => navigateToPage(target.href, { historyMode, restoreUrl }));
    }
  } finally {
    if (pageNavigationRequest === navigationController) {
      document.body.classList.remove('page-navigating');
      document.querySelector('.page-load-indicator')?.classList.remove('active');
      pageNavigationRequest = null;
    }
  }
}

function updateScrollTopButton() {
  const button = scrollTopButtonElement || $('scrollTopButton');
  if (!button) return;
  scrollTopButtonElement = button;
  const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
  const visible = scrollTop > 120;
  button.classList.toggle('is-visible', visible);
  button.setAttribute('aria-hidden', String(!visible));
  button.tabIndex = visible ? 0 : -1;
}

function scheduleScrollTopButtonUpdate() {
  if (scrollTopButtonFrame) return;
  const callback = () => {
    scrollTopButtonFrame = 0;
    updateScrollTopButton();
  };
  if (typeof window.requestAnimationFrame === 'function') scrollTopButtonFrame = window.requestAnimationFrame(callback);
  else scrollTopButtonFrame = window.setTimeout(callback, 16);
}

function scrollElementToTop(element, behavior) {
  if (!element) return;
  if (typeof element.scrollTo === 'function') element.scrollTo({ top: 0, left: 0, behavior });
  else {
    element.scrollTop = 0;
    element.scrollLeft = 0;
  }
}

function resetPreviewDataScroll(behavior) {
  document.querySelectorAll('#previewSection .preview-api-data').forEach((element) => {
    scrollElementToTop(element, behavior);
    const dataTopButton = element.parentElement?.querySelector('.preview-api-top-button');
    if (dataTopButton) {
      dataTopButton.classList.remove('is-visible');
      dataTopButton.setAttribute('aria-hidden', 'true');
      dataTopButton.tabIndex = -1;
    }
  });
}

function initScrollTopButton() {
  const button = scrollTopButtonElement || $('scrollTopButton');
  if (!button || button.dataset.bound === 'true') return;
  scrollTopButtonElement = button;
  button.dataset.bound = 'true';
  button.addEventListener('click', () => {
    const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth';
    resetPreviewDataScroll(behavior);
    scrollElementToTop(document.scrollingElement || document.documentElement, behavior);
    updateScrollTopButton();
  });
  window.addEventListener('scroll', scheduleScrollTopButtonUpdate, { passive: true });
  updateScrollTopButton();
}

// 页面初始化
window.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page || 'overview';
  window.addEventListener('beforeunload', (event) => {
    if (!hasUnsavedChanges()) return;
    event.preventDefault();
    event.returnValue = '当前有未保存的修改，确定离开吗？';
  });
  updatePageChrome(page);
  hydratePageState(page);
  document.querySelectorAll('[data-nav-page]').forEach((link) => {
    if (link.dataset.bound === 'true') return;
    link.dataset.bound = 'true';
    link.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      void navigateToPage(link.href);
    });
  });
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const link = event.target?.closest?.('a[href^="' + getAdminBasePath() + '"]');
    if (!link || link.dataset.navPage) return;
    event.preventDefault();
    void navigateToPage(link.href);
  });
  window.addEventListener('popstate', () => {
    const targetUrl = window.location.href;
    void navigateToPage(targetUrl, { historyMode: 'none', restoreUrl: currentRouteUrl });
  });

  cachePageElements();
  bindPageControls();
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
      event.preventDefault();
      nodesSearchEl?.focus();
    }
    if (event.key === 'Escape' && nodesSearchEl?.value && document.activeElement === nodesSearchEl) {
      nodesSearchEl.value = '';
      renderNodeView();
    }
  });
  $('themeSwitch')?.addEventListener('click', toggleTheme);
  $('logoutButton')?.addEventListener('click', logout);
  initScrollTopButton();
  initTheme();
  loadActivePage(page);
});
`;
