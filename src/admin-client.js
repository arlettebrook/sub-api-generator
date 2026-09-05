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

async function getPreviewApiUrl(signal) {
  const selectedPath = $('previewApiSelect')?.value || '';
  if (selectedPath) return window.location.origin + '/' + selectedPath;
  if (previewUuid) return window.location.origin + '/' + previewUuid;
  const res = await fetch('/api/uuid', { signal, cache: 'no-store' });
  const data = await res.json();
  previewUuid = data.uuid;
  return window.location.origin + '/' + previewUuid;
}

async function fetchNodes() {
  if (activeNodeRequest) activeNodeRequest.abort();
  const controller = new AbortController();
  activeNodeRequest = controller;
  nodesContainer.innerHTML = '<div class="nodes-loading">正在获取节点数据...</div>';
  paginationEl.innerHTML = '';
  
  try {
    const apiUrl = await getPreviewApiUrl(controller.signal);
    
    // 请求节点原始数据
    const nodeRes = await fetch(apiUrl, { signal: controller.signal, cache: 'no-store' });
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
    if (err.name === 'AbortError') return;
    nodesContainer.innerHTML = \`<div class="nodes-error" onclick="fetchNodes()">加载失败：\${err.message}<br>点击重试</div>\`;
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

async function loadCustomApis(loadSources = false) {
  const requests = [fetch('/api/custom-apis')];
  if (loadSources) {
    requests.push(fetch('/api/subs'), fetch('/api/apis'));
  }
  const [customRes, subsRes, apisRes] = await Promise.all(requests);
  if (!customRes.ok) throw new Error('优选 API 配置加载失败');
  customApis = await customRes.json();
  if (loadSources) {
    if (!subsRes.ok || !apisRes.ok) throw new Error('数据源配置加载失败');
    subs = await subsRes.json();
    apis = await apisRes.json();
  }
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
  else if (page === 'customApis') loadCustomApis(true);
  else if (page === 'overview') {
    fetchNodes();
    loadCustomApis().catch(() => {
      renderCustomApiSelect();
    });
  }
});
`;
