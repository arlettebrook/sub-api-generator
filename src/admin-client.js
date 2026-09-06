export const adminClientScript = `
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

function responseError(label, response) {
  return new Error(label + '失败（HTTP ' + response.status + '）');
}

async function readJsonResponse(url, label) {
  let response;
  try {
    response = await fetch(url, { cache: 'no-store' });
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
let previewUuid = null;
let activeNodeRequest = null;
let nodeLoadSequence = 0;
const emptyNodeRetryDelays = [500, 1200];

async function getPreviewApiUrl(signal) {
  const selectedPath = $('previewApiSelect')?.value || '';
  if (selectedPath) return window.location.origin + '/' + selectedPath;
  if (previewUuid) return window.location.origin + '/' + previewUuid;
  const res = await fetch('/api/uuid', { signal, cache: 'no-store' });
  const data = await res.json();
  previewUuid = data.uuid;
  return window.location.origin + '/' + previewUuid;
}

async function fetchNodes(emptyRetry = 0) {
  const sequence = ++nodeLoadSequence;
  if (activeNodeRequest) activeNodeRequest.abort();
  const controller = new AbortController();
  activeNodeRequest = controller;
  nodesContainer.innerHTML = '<div class="nodes-loading">正在获取节点数据...</div>';
  paginationEl.innerHTML = '';
  renderPreviewSourceErrors();
  
  try {
    const apiUrl = await getPreviewApiUrl(controller.signal);
    
    // 请求节点原始数据
    const nodeRes = await fetch(apiUrl, { signal: controller.signal, cache: 'no-store' });
    if (!nodeRes.ok) throw new Error('请求失败: ' + nodeRes.status);
    const sourceErrors = parseSourceErrors(nodeRes.headers.get('x-source-errors'));
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
    
    currentNodes = nodes;
    currentPage = 1;
    if (nodes.length === 0 && sourceErrors.length === 0 && emptyRetry < emptyNodeRetryDelays.length) {
      nodesContainer.innerHTML = '<div class="nodes-loading">暂未获取到节点，正在重试...</div>';
      nodesCountEl.textContent = '正在获取节点';
      window.setTimeout(() => {
        if (sequence === nodeLoadSequence) fetchNodes(emptyRetry + 1);
      }, emptyNodeRetryDelays[emptyRetry]);
      return;
    }
    renderNodes(nodes);
    nodesCountEl.textContent = \`共 \${nodes.length} 个节点\`;
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
let customApisDirty = false;

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
    ...Object.entries(subs).map(([key, value]) => ({ type: 'subs', key, enabled: value?.enabled === true, label: value.remark || key })),
    ...Object.entries(apis).map(([key, value]) => ({ type: 'apis', key, enabled: value?.enabled === true, label: value.remark || key })),
  ];
}

let sourceStatuses = { subs: {}, apis: {} };

function getSourceStatus(type, key) {
  const normalizedKey = normalizeSourceKeyClient(type, key);
  return sourceStatuses[type]?.[normalizedKey] || { state: 'idle', nodeCount: 0, rawNodeCount: 0 };
}

function createSourceHealth(type, key) {
  const status = getSourceStatus(type, key);
  const state = ['success', 'filtered', 'empty', 'error'].includes(status.state) ? status.state : 'idle';
  const health = document.createElement('span');
  health.className = 'source-health source-health-' + state;
  let text = '未检测';
  if (state === 'success') text = '正常 · ' + status.nodeCount + ' 个节点';
  if (state === 'filtered') text = '已过滤 · 原始 ' + status.rawNodeCount + ' 个';
  if (state === 'empty') text = '返回空数据';
  if (state === 'error') text = '失败 · ' + (status.error || '请求失败');
  if (status.durationMs !== null && state !== 'idle') text += ' · ' + status.durationMs + ' ms';
  health.textContent = text;
  health.title = status.lastAttemptAt ? '最近检测：' + status.lastAttemptAt : '尚未检测此数据源';
  return health;
}

async function loadSourceStatuses() {
  try {
    sourceStatuses = await readJsonResponse('/api/source-status', '数据源状态');
    if ($('subsList')) renderSubs();
    if ($('apisList')) renderApis();
  } catch {
    // 状态接口不可用时保留配置页面，不阻断管理操作。
  }
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
  [['all-enabled', '全部数据源'], ['selected', '手动选择']].forEach(([mode, text]) => {
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
    count.textContent = picker.dataset.sourceMode === 'all-enabled'
      ? '动态跟随全部源'
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
    if (mode === 'all-enabled') {
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
  const picker = sourcePicker([], '选择此 API 使用的数据源', 'all-enabled');
  container.innerHTML = '';
  container.appendChild(picker);
}

function readSourcePickerSelection(picker) {
  return {
    sourceMode: picker.dataset.sourceMode === 'selected' ? 'selected' : 'all-enabled',
    sources: readSourcePicker(picker),
  };
}

function getNewCustomApiSourceSelection() {
  const picker = $('newCustomApiSources')?.querySelector('.source-picker');
  return picker ? readSourcePickerSelection(picker) : { sourceMode: 'all-enabled', sources: [] };
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
      : '跟随全部启用数据源';
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
    switchText.textContent = '启用';
    switchLabel.append(statusSwitch, switchTrack, switchText);
    statusSwitch.onchange = async () => {
      customApis[path].enabled = statusSwitch.checked;
      setCustomApisDirty();
      renderCustomApis();
      renderCustomApiSelect();
      await persistCustomApis(statusSwitch.checked ? '优选 API 已启用' : '优选 API 已禁用');
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

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'btn-outline icon-action';
    openBtn.textContent = '↗ 打开';
    openBtn.onclick = () => window.open(window.location.origin + '/' + path, '_blank', 'noopener');

    const delBtn = document.createElement('button');
    delBtn.className = 'del-btn custom-api-delete';
    delBtn.textContent = '🗑 删除';
    delBtn.type = 'button';
    delBtn.onclick = () => {
      delete customApis[path];
      setCustomApisDirty();
      renderCustomApis();
      renderCustomApiSelect();
      persistCustomApis('已删除优选 API');
    };
    actions.append(switchLabel, editBtn, copyBtn, openBtn, delBtn);

    row.append(main, actions);
    el.appendChild(row);
  });
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
  const sourceMode = entry.sourceMode === 'selected' ? 'selected' : 'all-enabled';
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
    showToast(error, 'error');
    pathInput?.focus();
    return;
  }
  const entry = customApis[editingCustomApiPath];
  const selection = editingCustomApiPicker ? readSourcePickerSelection(editingCustomApiPicker) : {
    sourceMode: entry.sourceMode === 'selected' ? 'selected' : 'all-enabled',
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
  const saved = await saveCustomApis(false);
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
    showToast(error, 'error');
    pathInput.focus();
    return;
  }
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
  if (button) button.disabled = true;
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
    showToast('优选 API 配置保存失败', 'error');
    return false;
  } finally {
    if (button) button.disabled = !customApisDirty;
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

async function loadSubs() {
  try {
    let data = await readJsonResponse('/api/subs', '订阅源配置');
    for (let key in data) {
      if (typeof data[key] === 'boolean') {
        data[key] = { enabled: data[key], remark: '' };
      }
    }
    subs = data;
    renderSubs();
  } catch (error) {
    renderLoadError('subsList', error.message, loadSubs);
    showToast(error.message, 'error');
  }
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

    const health = createSourceHealth('subs', host);

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
    row.appendChild(health);
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
  try {
    const response = await fetch('/api/subs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subs)
    });
    if (!response.ok) throw responseError('订阅源配置保存', response);
    showToast('订阅源配置已保存', 'success');
    loadSourceStatuses();
    if (nodesContainer && typeof fetchNodes === 'function') fetchNodes();
  } catch (error) {
    showToast(error.message || '订阅源配置保存失败', 'error');
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
  try {
    let data = await readJsonResponse('/api/apis', 'API 源配置');
    for (let key in data) {
      if (typeof data[key] === 'boolean') {
        data[key] = { enabled: data[key], remark: '' };
      }
    }
    apis = data;
    renderApis();
  } catch (error) {
    renderLoadError('apisList', error.message, loadApis);
    showToast(error.message, 'error');
  }
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

    const health = createSourceHealth('apis', url);

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
    row.appendChild(health);
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
  try {
    const response = await fetch('/api/apis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apis)
    });
    if (!response.ok) throw responseError('API 源配置保存', response);
    showToast('API 源配置已保存', 'success');
    loadSourceStatuses();
    if (nodesContainer && typeof fetchNodes === 'function') fetchNodes();
  } catch (error) {
    showToast(error.message || 'API 源配置保存失败', 'error');
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

// ======================== 黑名单管理 ========================
let blacklist = [];

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
      showToast('导入成功！', 'success');
    } catch (error) {
      showToast(label + '导入失败：' + error.message, 'error');
    }
  };
  reader.onerror = () => showToast(label + '导入失败：文件读取失败', 'error');
  reader.readAsText(file);
  event.target.value = '';
}

function setBlacklistDirty(dirty = true) {
  const status = $('blacklistSaveStatus');
  const button = $('saveBlacklistButton');
  if (status) {
    status.textContent = dirty ? '有未保存的修改' : '配置已保存';
    status.classList.toggle('dirty', dirty);
  }
  if (button) button.disabled = !dirty;
}

function renderBlacklist() {
  const list = $('blacklistList');
  const empty = $('blacklistEmpty');
  const summary = $('blacklistSummary');
  if (!list) return;
  list.innerHTML = '';
  blacklist.forEach((word, index) => {
    const row = document.createElement('div');
    row.className = 'blacklist-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 128;
    input.value = word;
    input.setAttribute('aria-label', '黑名单词条 ' + (index + 1));
    input.addEventListener('input', () => {
      blacklist[index] = input.value.slice(0, 128);
      setBlacklistDirty(true);
    });

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'del-btn';
    deleteButton.textContent = '删除';
    deleteButton.title = '删除此黑名单词条';
    deleteButton.addEventListener('click', () => {
      blacklist.splice(index, 1);
      renderBlacklist();
      setBlacklistDirty(true);
    });

    row.append(input, deleteButton);
    list.appendChild(row);
  });
  if (empty) empty.hidden = blacklist.length !== 0;
  if (summary) summary.textContent = blacklist.length + ' 项';
}

async function loadBlacklist() {
  try {
    blacklist = normalizeBlacklistClient(await readJsonResponse('/api/blacklist', '黑名单配置'));
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
    showToast('请输入黑名单关键词', 'error');
    input.focus();
    return;
  }
  if (blacklist.length >= 200) {
    showToast('黑名单条目不能超过 200 个', 'error');
    return;
  }
  if (blacklist.some((item) => item.toLowerCase() === word.toLowerCase())) {
    showToast('该关键词已存在', 'error');
    input.focus();
    return;
  }
  blacklist.push(word);
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
    blacklist = normalizeBlacklistClient(data);
    renderBlacklist();
    setBlacklistDirty(true);
  }, '黑名单');
}

async function saveBlacklist() {
  const button = $('saveBlacklistButton');
  if (button) button.disabled = true;
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
    showToast('黑名单配置已保存', 'success');
    if (document.body.dataset.page === 'overview' && typeof fetchNodes === 'function') fetchNodes();
  } catch (error) {
    setBlacklistDirty(true);
    showToast(error.message || '黑名单配置保存失败', 'error');
  }
}

function initBlacklistForm() {
  const input = $('newBlacklistWord');
  if (!input) return;
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addBlacklistWord();
    }
  });
}

let filterRules = [];
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
  const status = $('filterRulesSaveStatus');
  const button = $('saveFilterRulesButton');
  if (status) { status.textContent = dirty ? '有未保存的修改' : '配置已保存'; status.classList.toggle('dirty', dirty); }
  if (button) button.disabled = !dirty;
}
function renderFilterRules() {
  const list = $('filterRulesList');
  if (!list) return;
  list.innerHTML = '';
  filterRules.forEach((rule, index) => {
    const row = document.createElement('div'); row.className = 'blacklist-row';
    const input = document.createElement('input'); input.type = 'text'; input.maxLength = 128; input.value = rule;
    input.setAttribute('aria-label', '过滤规则 ' + (index + 1));
    input.addEventListener('input', () => { filterRules[index] = input.value.slice(0, 128); setFilterRulesDirty(); });
    const button = document.createElement('button'); button.type = 'button'; button.className = 'del-btn'; button.textContent = '删除';
    button.onclick = () => { filterRules.splice(index, 1); renderFilterRules(); setFilterRulesDirty(); };
    row.append(input, button); list.appendChild(row);
  });
  if ($('filterRulesEmpty')) $('filterRulesEmpty').hidden = filterRules.length !== 0;
  if ($('filterRulesSummary')) $('filterRulesSummary').textContent = filterRules.length + ' 项';
}
async function loadFilterRules() {
  try { filterRules = normalizeFilterRulesClient(await readJsonResponse('/api/filter-rules', '备注过滤规则')); renderFilterRules(); setFilterRulesDirty(false); }
  catch (error) { renderLoadError('filterRulesList', error.message, loadFilterRules); showToast(error.message, 'error'); }
}
function addFilterRule() {
  const input = $('newFilterRule'); if (!input) return;
  const rule = input.value.trim().slice(0, 128);
  if (!rule) { showToast('请输入过滤规则', 'error'); input.focus(); return; }
  if (filterRules.length >= 200) { showToast('过滤规则不能超过 200 个', 'error'); return; }
  if (filterRules.some((item) => item.toLowerCase() === rule.toLowerCase())) { showToast('该规则已存在', 'error'); input.focus(); return; }
  filterRules.push(rule); input.value = ''; renderFilterRules(); setFilterRulesDirty(); input.focus();
}
async function saveFilterRules() {
  const button = $('saveFilterRulesButton'); if (button) button.disabled = true;
  filterRules = normalizeFilterRulesClient(filterRules); renderFilterRules();
  try {
    const response = await fetch('/api/filter-rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(filterRules) });
    if (!response.ok) throw responseError('备注过滤规则保存', response);
    setFilterRulesDirty(false); showToast('备注过滤规则已保存', 'success');
    if (document.body.dataset.page === 'overview' && typeof fetchNodes === 'function') fetchNodes();
  } catch (error) { setFilterRulesDirty(true); showToast(error.message || '备注过滤规则保存失败', 'error'); }
}
function initFilterRulesForm() {
  const input = $('newFilterRule');
  input?.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); addFilterRule(); } });
}

function exportFilterRules() {
  downloadJsonFile(filterRules, 'filter_rules_backup.json');
  showToast('备注过滤规则已导出', 'success');
}

function importFilterRules(event) {
  readJsonFile(event, (data) => {
    if (!Array.isArray(data)) throw new Error('文件内容必须是字符串数组');
    filterRules = normalizeFilterRulesClient(data);
    renderFilterRules();
    setFilterRulesDirty(true);
  }, '备注过滤规则');
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
  if (page === 'settings') {
    initBlacklistForm();
    loadBlacklist();
    initFilterRulesForm();
    loadFilterRules();
  }
  if (page === 'customApis') initCustomApiForm();
  if (page === 'subs') loadSubs();
  else if (page === 'apis') loadApis();
  else if (page === 'manage') {
    loadSubs();
    loadApis();
  }
  else if (page === 'customApis') loadCustomApis(true);
  else if (page === 'overview') {
    fetchNodes();
    loadCustomApis().catch(() => {
      renderCustomApiSelect();
    });
  }
  if (page === 'subs' || page === 'apis' || page === 'manage') loadSourceStatuses();
});
`;
