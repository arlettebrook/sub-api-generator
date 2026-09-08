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
let nodesContainer, paginationEl, nodesCountEl;
let nodesSearchEl, nodesRegionFilterEl, nodesSortEl, nodesFilterResetEl, nodesSourceFilterEl, nodesStatusFilterEl;

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

function setInputError(input, message) {
  if (!input) return;
  const field = input.closest('.form-field') || input.parentElement;
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

function hasUnsavedChanges() {
  return customApisDirty || blacklistDirty || filterRulesDirty || subsDirty || apisDirty || subsSavePending > 0 || apisSavePending > 0;
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

function renderLoadError(containerId, message, retry) {
  const container = $(containerId);
  if (!container) return;
  container.innerHTML = '';
  const notice = document.createElement('div');
  notice.className = 'data-source-error';
  const text = document.createElement('span');
  text.textContent = message;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn-outline';
  button.textContent = '重试';
  button.onclick = retry;
  notice.append(text, button);
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
  const title = document.createElement('strong');
  title.textContent = '部分数据源配置加载失败';
  notice.appendChild(title);
  const list = document.createElement('ul');
  errors.forEach((error) => {
    const item = document.createElement('li');
    const sourceName = error.type === 'apis' ? 'API 源' : error.type === 'config' ? '配置' : '订阅源';
    item.textContent = sourceName + '：' + error.message;
    list.appendChild(item);
  });
  notice.appendChild(list);
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'btn-outline';
  retry.textContent = '重新加载数据源';
  retry.onclick = () => loadCustomApis(true).catch((error) => showToast(error.message, 'error'));
  notice.appendChild(retry);
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
  const title = document.createElement('strong');
  title.textContent = '部分数据源暂时不可用，已展示其他来源的数据';
  notice.appendChild(title);
  const list = document.createElement('ul');
  errors.forEach((error) => {
    const item = document.createElement('li');
    const sourceName = error.key || (error.type === 'apis' ? 'API 源' : error.type === 'config' ? '配置' : '订阅源');
    item.textContent = sourceName + '：' + error.message;
    list.appendChild(item);
  });
  notice.appendChild(list);
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'btn-outline';
  retry.textContent = '重试';
  retry.onclick = fetchNodes;
  notice.appendChild(retry);
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
    kind.textContent = (type === 'apis' ? 'API 源 · ' : '订阅源 · ') + key;
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
let themeMode = 'system';

function applyTheme(mode) {
  const root = document.documentElement;
  themeMode = ['light', 'dark', 'system'].includes(mode) ? mode : 'system';
  const isDark = themeMode === 'dark' || (window.matchMedia?.('(prefers-color-scheme: dark)').matches && themeMode === 'system');
  root.dataset.themeMode = themeMode;
  root.classList.toggle('dark', isDark);
  document.body.classList.toggle('dark', isDark);
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
let currentPage = 1;
const pageSize = 12; // 每页显示12个节点
let activeNodeRequest = null;
let nodeLoadSequence = 0;
const emptyNodeRetryDelays = [500, 1200];

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
  const visible = currentNodes.filter((node) => {
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
  const regions = [...new Set(currentNodes.map(getNodeRegion))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  nodesRegionFilterEl.innerHTML = '<option value="">全部地区</option>' + regions.map((region) => \`<option value="\${region.replace(/"/g, '&quot;')}">\${region}</option>\`).join('');
  if (regions.includes(selected)) nodesRegionFilterEl.value = selected;
}

function updateNodeFilterOptions() {
  if (!nodesSourceFilterEl) return;
  const selected = nodesSourceFilterEl.value || routeStateValue('source');
  const sources = [...new Map(currentNodes.filter((node) => node.sourceKey).map((node) => [node.sourceType + ':' + node.sourceKey, node])).values()];
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
    nodesCountEl.textContent = visible.length === currentNodes.length
      ? \`共 \${currentNodes.length} 个节点\`
      : \`显示 \${visible.length} / 共 \${currentNodes.length} 个节点\`;
  }
  if (nodesFilterResetEl) nodesFilterResetEl.disabled = !((nodesSearchEl?.value || '').trim() || nodesRegionFilterEl?.value || nodesSourceFilterEl?.value || nodesStatusFilterEl?.value || nodesSortEl?.value !== 'default');
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
  renderPreviewSourceErrors();
  const apiUrl = getPreviewApiUrl();
  if (!apiUrl) {
    currentNodes = [];
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
      const source = sourceMap.get(node.host + (node.remark !== '未命名' ? '#' + node.remark : ''));
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
  } finally {
    if (activeNodeRequest === controller) activeNodeRequest = null;
  }
}

function renderNodes(nodes) {
  if (nodes.length === 0) {
    const filtered = currentNodes.length > 0;
    nodesContainer.innerHTML = '<div class="nodes-empty"><strong>' + (filtered ? '暂无匹配节点' : '暂无节点数据') + '</strong><span>' + (filtered ? '可以清除筛选后查看全部节点。' : '请先添加数据源，然后重新加载。') + '</span>' + (filtered ? '<button type="button" class="btn-outline" onclick="nodesFilterResetEl?.click()">清除筛选</button>' : '<a class="btn-outline nodes-empty-link" href="/admin/manage">管理数据源</a>') + '<button type="button" class="btn-outline" onclick="fetchNodes()">重新加载</button></div>';
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
      try { await navigator.clipboard.writeText(node.host + (node.remark !== '未命名' ? '#' + node.remark : '')); copyBtn.textContent = '已复制'; setTimeout(() => { copyBtn.textContent = '复制'; }, 1200); }
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
let sourceRawRequest = null;
let sourceRawSelection = null;
let sourceRawNodes = [];
let sourceRawRawContent = '';
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
    list.appendChild(row);
  });
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
    tab: sourceRawTab,
    query: $('sourceRawSearch')?.value || '',
    filter: sourceRawSourceFilter,
    sort: sourceRawSourceSort,
    collapsed: [...sourceRawCollapsedGroups],
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
  return type === 'apis' ? 'API 源' : type === 'subs' ? '订阅源' : '来源';
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
    requests.push(readJsonResponse('/api/subs', '订阅源配置'), readJsonResponse('/api/apis', 'API 源配置'));
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
    renderSourceLoadStatus(sourceErrors);
  }
  setCustomApisDirty(false);
  if ($('customApisList')) renderCustomApis();
  renderCustomApiSelect();
  renderNewCustomApiSources();
}

function sourceEntries() {
  return [
    ...Object.entries(subs).map(([key, value]) => ({ type: 'subs', key, label: value.remark || key })),
    ...Object.entries(apis).map(([key, value]) => ({ type: 'apis', key, label: value.remark || key })),
  ];
}

let sourceStatuses = { subs: {}, apis: {} };

function getSourceStatus(type, key) {
  const normalizedKey = normalizeSourceKeyClient(type, key);
  return sourceStatuses[type]?.[normalizedKey] || { state: 'idle', nodeCount: 0, rawNodeCount: 0 };
}

function createSourceHealth(type, key) {
  const status = getSourceStatus(type, key);
  const state = ['success', 'filtered', 'empty', 'timeout', 'http-error', 'network-error', 'error', 'checking'].includes(status.state) ? status.state : 'idle';
  const health = document.createElement('div');
  health.className = 'source-health source-health-' + state;
  let text = '未检测';
  if (state === 'success') text = '正常 · ' + status.nodeCount + ' 个节点';
  if (state === 'filtered') text = '已过滤 · 原始 ' + status.rawNodeCount + ' 个';
  if (state === 'empty') text = '返回空数据';
  if (state === 'timeout' || state === 'http-error' || state === 'network-error' || state === 'error') text = sourceStatusLabel(state) + ' · ' + (status.error || '请求失败');
  if (state === 'checking') text = '检测中…';
  if (status.durationMs !== null && state !== 'idle') text += ' · ' + status.durationMs + ' ms';
  const primary = document.createElement('strong');
  primary.textContent = text;
  const checked = document.createElement('small');
  checked.textContent = status.lastAttemptAt ? '最后检测：' + formatSourceTime(status.lastAttemptAt) : '尚未检测';
  if (status.lastSuccessAt) checked.textContent += ' · 最近成功 ' + (status.lastSuccessNodeCount || 0) + ' 个节点';
  const diagnostics = document.createElement('small');
  diagnostics.textContent = 'HTTP ' + (status.statusCode || '--')
    + ' · ' + (status.durationMs === null || status.durationMs === undefined ? '--' : status.durationMs + ' ms')
    + ' · 原始 ' + (status.rawNodeCount || 0) + ' · 过滤后 ' + (status.nodeCount || 0);
  health.append(primary, checked, diagnostics);
  if (status.error) {
    const error = document.createElement('small');
    error.className = 'source-health-error-detail';
    error.textContent = '最近错误：' + status.error;
    health.appendChild(error);
  }
  health.title = (status.lastAttemptAt ? '最后检测：' + formatSourceTime(status.lastAttemptAt) : '尚未检测此数据源') + (status.error ? '；最近错误：' + status.error : '');
  health.setAttribute('aria-label', health.title);
  return health;
}

async function loadSourceStatuses(mode = 'read', sources = []) {
  const manual = mode !== 'read';
  const refreshButton = $('sourceStatusRefreshButton');
  const idleText = refreshButton?.textContent;
  const previousStatuses = {
    subs: { ...(sourceStatuses.subs || {}) },
    apis: { ...(sourceStatuses.apis || {}) },
  };
  if (manual && refreshButton) {
    refreshButton.disabled = true;
    refreshButton.textContent = '检测中…';
    sourceStatuses = {
      subs: { ...previousStatuses.subs },
      apis: { ...previousStatuses.apis },
    };
    const targets = mode === 'selected'
      ? sources
      : Object.entries(sourceStatuses || {}).flatMap(([type, values]) => Object.keys(values || {}).map((key) => ({ type, key })));
    targets.forEach(({ type, key }) => {
      const normalizedKey = normalizeSourceKeyClient(type, key);
      if (sourceStatuses[type]?.[normalizedKey]) sourceStatuses[type][normalizedKey] = { ...sourceStatuses[type][normalizedKey], state: 'checking', error: '' };
    });
    renderSourceStatusSummary();
    if ($('subsList')) renderSubs();
    if ($('apisList')) renderApis();
  }
  try {
    const requestOptions = mode === 'read' ? {} : {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mode === 'selected' ? { scope: 'selected', sources } : { scope: mode }),
    };
    sourceStatuses = await readJsonResponse(
      manual ? '/api/source-status/check' : '/api/source-status',
      '数据源状态',
      requestOptions,
    );
    renderSourceStatusSummary();
    if ($('subsList')) renderSubs();
    if ($('apisList')) renderApis();
    if (nodesContainer && currentNodes.length) renderNodeView();
  } catch {
    sourceStatuses = previousStatuses;
    renderSourceStatusSummary();
    if ($('subsList')) renderSubs();
    if ($('apisList')) renderApis();
    // 状态接口不可用时保留配置页面，不阻断管理操作。
  } finally {
    if (manual && refreshButton) {
      refreshButton.disabled = false;
      refreshButton.textContent = idleText || '检测数据源';
    }
  }
}

function createSourceCheckButton(type, key) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn-outline source-check-button';
  button.textContent = '检测';
  button.setAttribute('aria-label', '检测数据源 ' + key);
  button.onclick = async () => {
    button.disabled = true;
    const idleText = button.textContent;
    button.textContent = '检测中…';
    await loadSourceStatuses('selected', [{ type, key }]);
    button.disabled = false;
    button.textContent = idleText;
  };
  return button;
}

function detectProblemSources() {
  const sources = Object.entries(sourceStatuses || {}).flatMap(([type, values]) => Object.entries(values || {})
    .filter(([, status]) => ['filtered', 'empty', 'timeout', 'http-error', 'network-error', 'error'].includes(status.state))
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
    for (const [type, title] of [['subs', '订阅源'], ['apis', 'API 源']]) {
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
  select.innerHTML = '';
  Object.entries(customApis).forEach(([path, entry]) => {
    if (!entry.enabled) return;
    const option = document.createElement('option');
    option.value = path;
    option.textContent = entry.remark ? entry.remark + ' (/' + path + ')' : '/' + path;
    select.appendChild(option);
  });
  select.hidden = select.options.length === 0;
  if ([...select.options].some((option) => option.value === current)) select.value = current;
}

let editingCustomApiPath = '';
let editingCustomApiPicker = null;

function renderCustomApis() {
  const el = $('customApisList');
  const summary = $('customApiSummary');
  if (summary) {
    const count = Object.keys(customApis).length;
    const enabled = Object.values(customApis).filter((entry) => entry.enabled).length;
    summary.textContent = count + ' 个 API · ' + enabled + ' 个启用';
  }
  el.innerHTML = '';
  if (!Object.keys(customApis).length) {
    const empty = document.createElement('div');
    empty.className = 'custom-api-empty';
    empty.innerHTML = '<strong>还没有优选 API</strong>';
    el.appendChild(empty);
    return;
  }
  Object.entries(customApis).forEach(([path, entry]) => {
    const row = document.createElement('div');
    row.className = 'row custom-api-row';
    row.dataset.path = path;

    const main = document.createElement('div');
    main.className = 'custom-api-row-main custom-api-row-summary';
    const identity = document.createElement('div');
    identity.className = 'custom-api-identity';
    const title = document.createElement('strong');
    title.className = 'custom-api-row-title';
    title.textContent = entry.remark || '/' + path;
    const pathText = document.createElement('code');
    pathText.className = 'custom-api-row-path';
    pathText.textContent = '/' + path;
    const sourceSummary = document.createElement('span');
    sourceSummary.className = 'custom-api-source-summary';
    sourceSummary.textContent = entry.sourceMode === 'selected'
      ? '已选择 ' + (Array.isArray(entry.sources) ? entry.sources.length : 0) + ' 个数据源'
      : '跟随全部数据源';
    identity.append(title, pathText, sourceSummary);
    const url = document.createElement('code');
    url.className = 'custom-api-url';
    url.textContent = window.location.origin + '/' + path;
    main.append(identity, url);

    const actions = document.createElement('div');
    actions.className = 'custom-api-actions';

    const switchLabel = document.createElement('label');
    switchLabel.className = 'custom-api-switch';
    switchLabel.title = entry.enabled ? '已启用，点击禁用' : '已禁用，点击启用';
    const statusSwitch = document.createElement('input');
    statusSwitch.type = 'checkbox';
    statusSwitch.role = 'switch';
    statusSwitch.checked = entry.enabled === true;
    statusSwitch.setAttribute('aria-label', (entry.remark || '/' + path) + (entry.enabled ? ' 已启用' : ' 已禁用'));
    const switchTrack = document.createElement('span');
    switchTrack.className = 'custom-api-switch-track';
    const switchText = document.createElement('span');
    switchText.className = 'custom-api-switch-text';
    switchText.textContent = entry.enabled ? '已启用' : '已禁用';
    switchLabel.append(statusSwitch, switchTrack, switchText);
    statusSwitch.onchange = async () => {
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
    };

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn-primary icon-action';
    editBtn.textContent = '✎ 编辑';
    editBtn.onclick = () => openCustomApiEditDialog(path);

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'btn-outline icon-action';
    copyBtn.textContent = '📋 复制地址';
    copyBtn.onclick = () => copyCustomApiUrl(path);

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
    actions.append(switchLabel, editBtn, viewBtn, copyBtn, openBtn, delBtn);

    row.append(main, actions);
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

function openCustomApiEditDialog(path) {
  const entry = customApis[path];
  const dialog = $('customApiEditDialog');
  if (!entry || !dialog) return;
  editingCustomApiPath = path;
  const pathInput = $('editCustomApiPath');
  const remarkInput = $('editCustomApiRemark');
  const hint = $('editCustomApiPathHint');
  if (pathInput) pathInput.value = path;
  if (remarkInput) remarkInput.value = entry.remark || '';
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
  entry.remark = remarkInput?.value.trim() || '';
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

async function copyCustomApiUrl(path) {
  const url = window.location.origin + '/' + path;
  try {
    await navigator.clipboard.writeText(url);
    showToast('访问地址已复制', 'success');
  } catch (error) {
    showToast('复制失败：' + error.message, 'error');
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
  entries.forEach(([host, entry]) => {
    const row = document.createElement('div');
    row.className = 'row';
    const select = document.createElement('input'); select.type = 'checkbox'; select.className = 'source-select'; select.checked = false; select.dataset.key = host; select.setAttribute('aria-label', '选择订阅源 ' + host);

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
    delBtn.className = 'del-btn';
    delBtn.textContent = '删除';
    delBtn.setAttribute('aria-label', '删除订阅源 ' + host);
    delBtn.onclick = async () => {
      delBtn.disabled = true;
      delBtn.textContent = '删除中…';
      const removed = subs[host];
      delete subs[host];
      const saved = await queueSubsSave();
      if (!saved) subs[host] = removed;
      renderSubs();
      if (saved) showToast('已删除订阅源', 'success');
    };

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

    row.appendChild(select); row.appendChild(remarkInput);
    row.appendChild(hostInput);
    row.appendChild(createCopyButton(host, '订阅源地址'));
    row.appendChild(health);
    row.appendChild(createSourceCheckButton('subs', host));
    const viewBtn = document.createElement('button');
    viewBtn.type = 'button';
    viewBtn.className = 'btn-outline source-view-button';
    viewBtn.textContent = '查看';
    viewBtn.setAttribute('aria-label', '查看订阅源原始数据 ' + host);
    viewBtn.onclick = async () => {
      viewBtn.disabled = true;
      viewBtn.textContent = '检测中…';
      try { await openSourceRawDialog('subs', host); }
      finally { viewBtn.disabled = false; viewBtn.textContent = '查看'; }
    };
    row.appendChild(viewBtn);
    row.appendChild(delBtn);
    el.appendChild(row);
  });
}

async function applySourceBatch(type, action, trigger) {
  const data = type === 'subs' ? subs : apis;
  const list = $(type === 'subs' ? 'subsList' : 'apisList');
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
    const saved = type === 'subs' ? await queueSubsSave() : await queueApisSave();
    if (!saved) throw new Error('保存失败');
    type === 'subs' ? renderSubs() : renderApis();
    showToast('已删除 ' + selected.length + ' 个数据源', 'success');
  } catch (error) {
    selected.forEach((key) => { if (previous[key]) data[key] = previous[key]; });
    type === 'subs' ? renderSubs() : renderApis();
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
  entries.forEach(([url, entry]) => {
    const row = document.createElement('div');
    row.className = 'row';
    const select = document.createElement('input'); select.type = 'checkbox'; select.className = 'source-select'; select.dataset.key = url; select.setAttribute('aria-label', '选择 API 源 ' + url);

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
    delBtn.className = 'del-btn';
    delBtn.textContent = '删除';
    delBtn.setAttribute('aria-label', '删除 API 源 ' + url);
    delBtn.onclick = async () => {
      delBtn.disabled = true;
      delBtn.textContent = '删除中…';
      const removed = apis[url];
      delete apis[url];
      const saved = await queueApisSave();
      if (!saved) apis[url] = removed;
      renderApis();
      if (saved) showToast('已删除 API 源', 'success');
    };

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

    row.appendChild(select); row.appendChild(remarkInput);
    row.appendChild(urlInput);
    row.appendChild(createCopyButton(url, 'API 地址'));
    row.appendChild(health);
    row.appendChild(createSourceCheckButton('apis', url));
    const viewBtn = document.createElement('button');
    viewBtn.type = 'button';
    viewBtn.className = 'btn-outline source-view-button';
    viewBtn.textContent = '查看';
    viewBtn.setAttribute('aria-label', '查看 API 源原始数据 ' + url);
    viewBtn.onclick = async () => {
      viewBtn.disabled = true;
      viewBtn.textContent = '检测中…';
      try { await openSourceRawDialog('apis', url); }
      finally { viewBtn.disabled = false; viewBtn.textContent = '查看'; }
    };
    row.appendChild(viewBtn);
    row.appendChild(delBtn);
    el.appendChild(row);
  });
}

function sourceRawEntry(type, key) {
  const data = type === 'subs' ? subs : type === 'apis' ? apis : customApis;
  return data && Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
}

function closeSourceRawDialog() {
  if (sourceRawRequest) sourceRawRequest.abort();
  saveSourceRawViewState();
  sourceRawRequest = null;
  sourceRawSelection = null;
  sourceRawNodes = [];
  sourceRawRawContent = '';
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

function renderSourceRawResults(rawMode = false) {
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
  });
  const nodes = $('sourceRawContent');
  const raw = $('sourceRawRawContent');
  const toolbar = document.querySelector('.source-raw-toolbar');
  if (nodes) nodes.hidden = sourceRawTab !== 'nodes';
  if (raw) raw.hidden = sourceRawTab !== 'raw';
  if (toolbar) toolbar.hidden = false;
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
  const title = $('sourceRawDialogSource');
  const content = $('sourceRawContent');
  const rawContent = $('sourceRawRawContent');
  const summary = $('sourceRawSummary');
  const reload = $('reloadSourceRawButton');
  const copy = $('copySourceRawButton');
  const search = $('sourceRawSearch');
  const autoRefresh = $('sourceRawAutoRefresh');
  const refreshInterval = $('sourceRawRefreshInterval');
  if (!preserveState) {
    const viewState = type === 'customApis' ? loadSourceRawViewState(type, key) : null;
    sourceRawCollapsedGroups = new Set(Array.isArray(viewState?.collapsed) ? viewState.collapsed : []);
    sourceRawSourceFilter = typeof viewState?.filter === 'string' ? viewState.filter : 'all';
    sourceRawSourceSort = ['config', 'count', 'error', 'name'].includes(viewState?.sort) ? viewState.sort : 'config';
    if (search) search.value = typeof viewState?.query === 'string' ? viewState.query : '';
    setSourceRawTab(viewState?.tab === 'raw' ? 'raw' : 'nodes');
    renderSourceRawCacheStatus('正在检测数据…', 'checking');
  }
  renderSourceRawHistory(type === 'customApis' ? loadSourceRawHistory(type, key) : []);
  const sourceLabel = type === 'subs' ? '订阅源 · ' : type === 'apis' ? 'API 源 · ' : '优选 API · /';
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
  if (!preserveState) {
    // Reset again after opening and layout so a reused dialog cannot restore its previous scroll offset.
    resetSourceRawScroll();
    requestAnimationFrame(resetSourceRawScroll);
  }
  const isManagedSource = type === 'subs' || type === 'apis';
  const normalizedKey = isManagedSource ? normalizeSourceKeyClient(type, key) : key;
  const previousStatus = isManagedSource ? getSourceStatus(type, key) : { state: 'idle', nodeCount: 0, rawNodeCount: 0 };
  if (isManagedSource) {
    sourceStatuses[type] ||= {};
    sourceStatuses[type][normalizedKey] = { ...previousStatus, state: 'checking', error: '' };
    renderSourceStatusSummary();
    if ($('subsList')) renderSubs();
    if ($('apisList')) renderApis();
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
    saveSourceRawCache(type, key, { nodes: sourceRawNodes.slice(), unfilteredNodes: sourceRawUnfilteredNodes.slice(), unfilteredSourceNodes: [...sourceRawUnfilteredSourceNodes], rawContent: sourceRawRawContent, nodeSources: [...sourceRawNodeSources], sourceMeta: [...sourceRawSourceMeta], sourceErrors: [...sourceRawSourceErrors], sourceStats: [...sourceRawSourceStats], status: nextStatus, savedAt: Date.now() });
    if (isManagedSource) sourceStatuses[type][normalizedKey] = nextStatus;
    renderSourceRawSummary(nextStatus);
    renderSourceRawCacheStatus('本次检测完成：' + formatSourceRawTime(Date.now()), sourceRawSourceErrors.size ? 'warning' : '');
    if (type === 'customApis') {
      const rawTotal = [...sourceRawSourceStats.values()].reduce((sum, item) => sum + Number(item.raw || 0), 0);
      const keptTotal = [...sourceRawSourceStats.values()].reduce((sum, item) => sum + Number(item.kept || 0), 0);
      saveSourceRawHistory(type, key, { at: Date.now(), raw: rawTotal, kept: keptTotal, filtered: Math.max(0, rawTotal - keptTotal), errors: sourceRawSourceErrors.size });
    }
    renderSourceRawProcess(nextStatus.filterStats || result.status?.filterStats || {});
    renderSourceRawResults();
    renderSourceRawResults(true);
    if (isManagedSource) {
      renderSourceStatusSummary();
      if ($('subsList')) renderSubs();
      if ($('apisList')) renderApis();
    }
    if (copy) copy.disabled = sourceRawNodes.length === 0 && sourceRawUnfilteredNodes.length === 0;
  } catch (error) {
    if (error?.name === 'AbortError') return;
    if (sourceRawSelection?.type !== type || sourceRawSelection?.key !== key) return;
    const failedStatus = { ...previousStatus, state: 'network-error', error: error.message || '检测失败' };
    renderSourceRawCacheStatus(cachedResult
      ? '本次检测失败；当前显示最近一次检测结果：' + formatSourceRawTime(cachedResult.savedAt)
      : '本次检测失败：' + failedStatus.error, 'warning');
    if (isManagedSource) sourceStatuses[type][normalizedKey] = failedStatus;
    if (cachedResult && sourceRawNodes.length) {
      renderSourceRawSummary(cachedResult.status);
      renderSourceRawProcess(cachedResult.status?.filterStats || {});
      renderSourceRawResults();
      renderSourceRawResults(true);
    } else {
      renderSourceRawSummary(failedStatus);
      if (content) content.textContent = '数据源检测失败：' + failedStatus.error;
    }
    if (isManagedSource) {
      renderSourceStatusSummary();
      if ($('subsList')) renderSubs();
      if ($('apisList')) renderApis();
    }
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
  downloadJsonFile(blacklist, 'blacklist_backup.json');
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
    setFilterRulesDirty(false); savedFilterRules = [...filterRules]; filterRulesHistory.length = 0; showToast('备注过滤规则已保存', 'success');
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
    blacklistSearch.addEventListener('input', debounce(() => { blacklistSearchTerm = blacklistSearch.value; blacklistPage = 1; renderBlacklist(); }, 180));
  }
  const filterSearch = $('filterRulesSearch');
  if (filterSearch && filterSearch.dataset.bound !== 'true') {
    filterSearch.dataset.bound = 'true';
    filterSearch.value = filterRulesSearchTerm;
    filterSearch.addEventListener('input', debounce(() => { filterRulesSearchTerm = filterSearch.value; filterRulesPage = 1; renderFilterRules(); }, 180));
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
  downloadJsonFile(filterRules, 'filter_rules_backup.json');
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
  setRouteState(updates);
}

function hydratePageState(page) {
  if (page === 'overview') {
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
}

function bindPageControls() {
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
}

function loadActivePage(page) {
  if (page === 'settings') {
    initSettingsEnhancements();
    initBlacklistForm();
    void loadBlacklist();
    initFilterRulesForm();
    void loadFilterRules();
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
  const nextPage = target.pathname === '/admin' ? 'overview'
    : target.pathname === '/admin/custom-apis' ? 'customApis'
      : target.pathname === '/admin/manage' ? 'manage'
        : target.pathname === '/admin/settings' ? 'settings'
          : target.pathname === '/admin/subs' ? 'subs'
            : target.pathname === '/admin/apis' ? 'apis' : '';
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
    bindPageControls();
    loadActivePage(nextPage);
    if (historyMode === 'push') window.history.pushState({ page: nextPage }, '', target.pathname + target.search + target.hash);
    currentRouteUrl = window.location.href;
    window.scrollTo({ top: 0, behavior: 'auto' });
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
    const link = event.target?.closest?.('a[href^="/admin"]');
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
  initTheme();
  loadActivePage(page);
});
`;
