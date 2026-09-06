export const adminHTML = `
<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>优选API•生成器</title>
<script>
  (() => {
    try {
      const mode = localStorage.getItem('theme') || 'system';
      document.documentElement.dataset.themeMode = mode;
      if (mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.classList.add('dark');
    } catch (_) {}
  })();
</script>
<link rel="stylesheet" href="/admin.css" />
</head>
<body data-page="__PAGE__">

<!-- Toast 提示容器 -->
<div id="toast" class="toast"></div>

<dialog class="confirm-dialog" id="customApiDeleteDialog" aria-labelledby="customApiDeleteTitle" aria-describedby="customApiDeleteMessage">
  <div class="confirm-dialog-icon" aria-hidden="true">!</div>
  <h3 id="customApiDeleteTitle">删除优选 API？</h3>
  <p id="customApiDeleteMessage">此操作会移除当前访问路径及其数据源配置。</p>
  <div class="confirm-dialog-actions">
    <button class="btn-outline" type="button" id="cancelCustomApiDeleteButton">取消</button>
    <button class="btn-danger" type="button" id="confirmCustomApiDeleteButton">确认删除</button>
  </div>
</dialog>

<div class="page-header">
  <div class="header-left">
    <h2>优选API•生成器•管理面板</h2>
  </div>
  <div class="header-right">
    <button id="themeSwitch" class="theme-switch" type="button" title="主题：跟随系统" aria-label="主题：跟随系统" aria-pressed="false"></button>
    <button id="logoutButton" class="btn-outline btn-logout" type="button" title="退出登录">
      <span>🚪</span> 退出登录
    </button>
  </div>
</div>

<nav class="admin-nav" aria-label="管理导航">
  <a href="/admin" data-nav-page="overview"><span class="nav-icon" aria-hidden="true">🌐</span><span class="nav-label">数据预览</span></a>
  <a href="/admin/custom-apis" data-nav-page="customApis"><span class="nav-icon" aria-hidden="true">🚀</span><span class="nav-label">优选API</span></a>
  <a href="/admin/manage" data-nav-page="manage"><span class="nav-icon" aria-hidden="true">🧩</span><span class="nav-label">优选管理</span></a>
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
  <div class="nodes-filters" aria-label="节点筛选和排序">
    <label class="nodes-search">
      <span class="sr-only">搜索节点</span>
      <span aria-hidden="true">⌕</span>
      <input id="nodesSearch" type="search" placeholder="搜索地址或备注" autocomplete="off" />
    </label>
    <label class="nodes-filter-field">
      <span>地区</span>
      <select id="nodesRegionFilter" aria-label="按地区筛选">
        <option value="">全部地区</option>
      </select>
    </label>
    <label class="nodes-filter-field">
      <span>来源</span>
      <select id="nodesSourceFilter" aria-label="按来源筛选"><option value="">全部来源</option></select>
    </label>
    <label class="nodes-filter-field">
      <span>状态</span>
      <select id="nodesStatusFilter" aria-label="按状态筛选"><option value="">全部状态</option><option value="named">有备注</option><option value="unnamed">无备注</option></select>
    </label>
    <label class="nodes-filter-field">
      <span>排序</span>
      <select id="nodesSort" aria-label="节点排序">
        <option value="default">默认顺序</option>
        <option value="host-asc">地址 A-Z</option>
        <option value="host-desc">地址 Z-A</option>
        <option value="remark-asc">备注 A-Z</option>
        <option value="remark-desc">备注 Z-A</option>
      </select>
    </label>
    <button class="btn-outline nodes-filter-reset" id="nodesFilterReset" type="button">清除筛选</button>
  </div>
  <div id="sourceErrorNotice" class="source-error-notice" role="status" hidden></div>
  <div id="sourceStatusSummary" class="source-status-summary" role="status" hidden></div>
  <div id="nodesContainer">
    <div class="nodes-loading nodes-skeleton" aria-label="正在加载节点"></div>
  </div>
  <div id="pagination" class="pagination"></div>
</div>

<!-- ==================== 优选 API ==================== -->
<div class="card" id="customApiSection">
  <div class="section-heading custom-api-section-heading">
    <div>
      <h3>🚀 优选 API</h3>
    </div>
    <div class="section-heading-actions">
      <span class="section-summary" id="customApiSummary">0 个 API</span>
      <button class="btn-primary" type="button" id="openCustomApiDialogButton" onclick="openCustomApiDialog()">➕ 新建优选 API</button>
    </div>
  </div>
  <dialog class="custom-api-dialog" id="customApiDialog" aria-labelledby="customApiDialogTitle">
    <div class="custom-api-dialog-head">
      <h3 id="customApiDialogTitle">新建优选 API</h3>
      <button class="dialog-close" type="button" onclick="closeCustomApiDialog()" title="关闭" aria-label="关闭">×</button>
    </div>
    <div class="custom-api-create">
      <div class="form-grid">
        <label class="form-field">
          <span>访问路径</span>
          <span class="path-input"><b>/</b><input id="newCustomApiPath" placeholder="例如 my-api" autocomplete="off" /></span>
          <small id="newCustomApiPathHint">仅支持字母、数字、短横线和下划线。</small>
        </label>
        <label class="form-field">
          <span>备注</span>
          <input id="newCustomApiRemark" placeholder="可选" autocomplete="off" />
        </label>
      </div>
      <div id="newCustomApiSources"><div class="source-picker-skeleton" aria-label="正在加载数据源"></div></div>
      <div id="customApiSourceStatus" class="source-load-status" role="status" hidden></div>
      <div class="create-actions">
        <button class="btn-outline" type="button" onclick="closeCustomApiDialog()">取消</button>
        <button class="btn-primary" type="button" onclick="addCustomApi()">➕ 创建 API</button>
      </div>
    </div>
  </dialog>
  <dialog class="custom-api-dialog custom-api-edit-dialog" id="customApiEditDialog" aria-labelledby="customApiEditDialogTitle">
    <div class="custom-api-dialog-head">
      <h3 id="customApiEditDialogTitle">编辑优选 API</h3>
      <button class="dialog-close" type="button" onclick="closeCustomApiEditDialog()" title="关闭" aria-label="关闭">×</button>
    </div>
    <div class="custom-api-create custom-api-edit-body">
      <div class="form-grid">
        <label class="form-field">
          <span>访问路径</span>
          <span class="path-input"><b>/</b><input id="editCustomApiPath" placeholder="例如 my-api" autocomplete="off" /></span>
          <small id="editCustomApiPathHint">仅支持字母、数字、短横线和下划线。</small>
        </label>
        <label class="form-field">
          <span>备注</span>
          <input id="editCustomApiRemark" placeholder="可选" autocomplete="off" />
        </label>
      </div>
      <div class="custom-api-edit-url" id="editCustomApiUrl"></div>
      <div id="editCustomApiSources"><div class="source-picker-skeleton" aria-label="正在加载数据源"></div></div>
      <div class="create-actions">
        <button class="btn-outline" type="button" onclick="closeCustomApiEditDialog()">取消</button>
        <button class="btn-primary" type="button" id="saveCustomApiEditButton" onclick="saveCustomApiEdit()">💾 保存修改</button>
      </div>
    </div>
  </dialog>
  <div id="customApisList"></div>
</div>

<!-- ==================== 订阅源管理 ==================== -->
<div class="card" id="subsSection">
  <h3>📡 优选订阅器管理</h3>
  <div class="add-row">
    <label class="add-field"><span class="sr-only">订阅源地址</span><input id="newHost" placeholder="sub.example.com" /><small class="inline-error" hidden></small></label>
    <label class="add-field"><span class="sr-only">订阅源备注</span><input id="newRemark" placeholder="备注（可选）" /></label>
    <button class="btn-primary" onclick="addSub()">➕ 添加订阅源</button>
  </div>
  <div class="toolbar">
    <input id="subsSearch" class="list-search" type="search" placeholder="搜索订阅源或备注" aria-label="搜索订阅源" />
    <select id="subsSort" class="list-sort" aria-label="订阅源排序"><option value="default">默认顺序</option><option value="name-asc">地址 A-Z</option><option value="name-desc">地址 Z-A</option><option value="status">启用状态</option></select>
    <button type="button" class="batch-button" data-batch="subs-select">全选</button><button type="button" class="batch-button" data-batch="subs-enable">批量启用</button><button type="button" class="batch-button" data-batch="subs-disable">批量禁用</button>
    <button onclick="exportSubs()">📤 导出配置</button>
    <button onclick="document.getElementById('importSubsFile').click()">📥 导入配置</button>
    <input type="file" id="importSubsFile" accept=".json,application/json" style="display:none" onchange="importSubs(event)" />
  </div>
  <div id="subsList"></div>
</div>

<!-- ==================== API 管理 ==================== -->
<div class="card" id="apisSection">
  <h3>🔗 优选 API 管理</h3>
  <div class="add-row">
    <label class="add-field add-field-wide"><span class="sr-only">API 地址</span><input id="newApiUrl" placeholder="https://api.example.com/v1" /><small class="inline-error" hidden></small></label>
    <label class="add-field"><span class="sr-only">API 备注</span><input id="newApiRemark" placeholder="备注（可选）" /></label>
    <button class="btn-primary" onclick="addApi()">➕ 添加API</button>
  </div>
  <div class="toolbar">
    <input id="apisSearch" class="list-search" type="search" placeholder="搜索 API 地址或备注" aria-label="搜索 API 源" />
    <select id="apisSort" class="list-sort" aria-label="API 源排序"><option value="default">默认顺序</option><option value="name-asc">地址 A-Z</option><option value="name-desc">地址 Z-A</option><option value="status">启用状态</option></select>
    <button type="button" class="batch-button" data-batch="apis-select">全选</button><button type="button" class="batch-button" data-batch="apis-enable">批量启用</button><button type="button" class="batch-button" data-batch="apis-disable">批量禁用</button>
    <button onclick="exportApis()">📤 导出配置</button>
    <button onclick="document.getElementById('importApisFile').click()">📥 导入配置</button>
    <input type="file" id="importApisFile" accept=".json,application/json" style="display:none" onchange="importApis(event)" />
  </div>
  <div id="apisList"></div>
</div>

<!-- ==================== 设置 ==================== -->
<div class="card" id="settingsSection">
  <h3>⚙️ 界面设置</h3>
  <div class="settings-list">
    <div class="setting-block" id="blacklistSettings">
      <div class="setting-block-heading">
        <div class="setting-copy">
          <strong>黑名单</strong>
          <small>过滤包含这些关键词的节点备注，支持添加、编辑和删除。</small>
        </div>
        <span class="section-summary" id="blacklistSummary">0 项</span>
      </div>
      <div class="blacklist-add-row">
        <input id="newBlacklistWord" type="text" maxlength="128" placeholder="输入要过滤的关键词" autocomplete="off" />
        <button class="btn-primary" id="addBlacklistButton" type="button" onclick="addBlacklistWord()">➕ 添加</button>
      </div>
      <div id="blacklistList" class="blacklist-list"></div>
      <div id="blacklistEmpty" class="blacklist-empty" hidden>暂无黑名单词条，所有节点都将参与聚合。</div>
      <div class="blacklist-toolbar">
        <button type="button" onclick="exportBlacklist()">📤 导出</button>
        <button type="button" onclick="document.getElementById('importBlacklistFile').click()">📥 导入</button>
        <input type="file" id="importBlacklistFile" accept=".json,application/json" style="display:none" onchange="importBlacklist(event)" />
        <span class="save-status" id="blacklistSaveStatus">配置已保存</span>
        <button class="btn-primary" id="saveBlacklistButton" type="button" onclick="saveBlacklist()" disabled>💾 保存黑名单</button>
      </div>
    </div>
    <div class="setting-block" id="filterRulesSettings">
      <div class="setting-block-heading">
        <div class="setting-copy">
          <strong>备注过滤规则</strong>
          <small>备注过滤规则用于分割并截断节点备注：匹配到规则后，只保留规则前面的内容。例如添加 <code>|</code> 或 <code>【</code>，会在对应分隔符处截断；“空格”表示从第一个空白字符处截断，“符号”会移除 emoji、国旗和商标符号。</small>
        </div>
        <span class="section-summary" id="filterRulesSummary">0 项</span>
      </div>
      <div class="blacklist-add-row">
        <input id="newFilterRule" type="text" maxlength="128" placeholder="例如：| 或 【" autocomplete="off" />
        <button class="btn-primary" id="addFilterRuleButton" type="button" onclick="addFilterRule()">➕ 添加</button>
      </div>
      <div id="filterRulesList" class="blacklist-list"></div>
      <div id="filterRulesEmpty" class="blacklist-empty" hidden>暂无过滤规则。</div>
      <div class="blacklist-toolbar">
        <button type="button" onclick="exportFilterRules()">📤 导出</button>
        <button type="button" onclick="document.getElementById('importFilterRulesFile').click()">📥 导入</button>
        <input type="file" id="importFilterRulesFile" accept=".json,application/json" style="display:none" onchange="importFilterRules(event)" />
        <span class="save-status" id="filterRulesSaveStatus">配置已保存</span>
        <button class="btn-primary" id="saveFilterRulesButton" type="button" onclick="saveFilterRules()" disabled>💾 保存过滤规则</button>
      </div>
    </div>
  </div>
</div>

<script src="/admin-client.js" defer></script>
</body>
</html>
`;
