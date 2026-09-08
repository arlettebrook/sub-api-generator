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
<link rel="stylesheet" href="/admin.css?v=__ADMIN_ASSET_VERSION__" />
</head>
<body data-page="__PAGE__">

<!-- Toast 提示容器 -->
<div id="toast" class="toast" role="status" aria-live="polite" aria-atomic="true"></div>

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
  <a href="/admin/custom-apis" data-nav-page="customApis"><span class="nav-icon" aria-hidden="true">🚀</span><span class="nav-label">优选 API</span></a>
  <a href="/admin/manage" data-nav-page="manage"><span class="nav-icon" aria-hidden="true">🧩</span><span class="nav-label">优选管理</span></a>
  <a href="/admin/settings" data-nav-page="settings"><span class="nav-icon" aria-hidden="true">⚙️</span><span class="nav-label">设置</span></a>
</nav>
<div class="page-load-indicator" aria-hidden="true"></div>

<p class="page-intro" id="pageIntro">集中查看订阅聚合结果和节点状态。</p>

<main id="adminPageContent">
<!-- ADMIN_SECTION:customApiDialog:START -->
<dialog class="confirm-dialog" id="customApiDeleteDialog" aria-labelledby="customApiDeleteTitle" aria-describedby="customApiDeleteMessage">
  <div class="confirm-dialog-icon" aria-hidden="true">!</div>
  <h3 id="customApiDeleteTitle">删除优选 API？</h3>
  <p id="customApiDeleteMessage">此操作会移除当前访问路径及其数据源配置。</p>
  <div class="confirm-dialog-actions">
    <button class="btn-outline" type="button" id="cancelCustomApiDeleteButton">取消</button>
    <button class="btn-danger" type="button" id="confirmCustomApiDeleteButton">确认删除</button>
  </div>
</dialog>
<!-- ADMIN_SECTION:customApiDialog:END -->

<!-- ==================== 数据源原始数据查看 ==================== -->
<dialog class="source-raw-dialog" id="sourceRawDialog" aria-labelledby="sourceRawDialogTitle">
  <div class="custom-api-dialog-head">
    <div>
      <h3 id="sourceRawDialogTitle">原始数据查看</h3>
      <p class="source-raw-dialog-subtitle" id="sourceRawDialogSource"></p>
    </div>
    <button class="dialog-close" type="button" onclick="closeSourceRawDialog()" title="关闭" aria-label="关闭">×</button>
  </div>
  <div class="source-raw-body">
    <div class="source-raw-summary" id="sourceRawSummary" aria-live="polite"></div>
    <div class="source-raw-cache-status" id="sourceRawCacheStatus" aria-live="polite" hidden></div>
    <details class="source-raw-history" id="sourceRawHistoryPanel">
      <summary>检测历史</summary>
      <div class="source-raw-history-list" id="sourceRawHistoryList"></div>
    </details>
    <div class="source-raw-process" id="sourceRawProcess" aria-live="polite"></div>
    <div class="source-raw-tabs" role="tablist" aria-label="查看内容">
      <button class="source-raw-tab active" type="button" role="tab" aria-selected="true" data-source-raw-tab="nodes">节点结果</button>
      <button class="source-raw-tab" type="button" role="tab" aria-selected="false" data-source-raw-tab="raw">未过滤节点</button>
    </div>
    <div class="source-raw-toolbar">
      <label class="source-raw-search"><span aria-hidden="true">⌕</span><input id="sourceRawSearch" type="search" placeholder="搜索 IP、端口或备注" autocomplete="off" aria-label="搜索原始数据" /></label>
      <button class="btn-outline" type="button" id="copySourceRawButton">📋 复制筛选结果</button>
    </div>
    <div class="source-raw-group-controls" id="sourceRawGroupControls" hidden>
      <select class="source-raw-source-filter" id="sourceRawSourceFilter" aria-label="按来源筛选"><option value="all">全部来源</option></select>
      <select class="source-raw-source-sort" id="sourceRawSourceSort" aria-label="来源排序">
        <option value="config">配置顺序</option>
        <option value="count">节点数量</option>
        <option value="error">异常优先</option>
        <option value="name">来源名称</option>
      </select>
      <button class="btn-subtle" type="button" id="expandSourceRawGroupsButton">展开全部</button>
      <button class="btn-subtle" type="button" id="collapseSourceRawGroupsButton">收起全部</button>
    </div>
    <pre id="sourceRawContent" class="source-raw-code source-raw-content">正在检测数据源…</pre>
    <div id="sourceRawRawContent" class="source-raw-code source-raw-content" role="region" aria-label="未过滤节点" hidden>正在检测数据源…</div>
    <div class="source-raw-actions">
      <span id="sourceRawResultCount" class="source-raw-result-count"></span>
      <label class="source-raw-auto-refresh"><input id="sourceRawAutoRefresh" type="checkbox" /> 自动刷新 <select id="sourceRawRefreshInterval" aria-label="自动刷新间隔"><option value="30">30 秒</option><option value="60">60 秒</option><option value="120">2 分钟</option></select></label>
      <button class="btn-outline" type="button" id="reloadSourceRawButton">🔄 重新检测</button>
      <button class="btn-primary" type="button" onclick="closeSourceRawDialog()">关闭</button>
    </div>
  </div>
</dialog>

<dialog class="source-raw-dialog source-raw-history-dialog" id="sourceRawHistoryDialog" aria-labelledby="sourceRawHistoryDialogTitle">
  <div class="custom-api-dialog-head">
    <div>
      <h3 id="sourceRawHistoryDialogTitle">历史检测结果</h3>
      <p class="source-raw-dialog-subtitle" id="sourceRawHistoryDialogMeta"></p>
    </div>
    <button class="dialog-close" type="button" onclick="closeSourceRawHistoryDialog()" title="关闭" aria-label="关闭">×</button>
  </div>
  <div class="source-raw-body">
    <div class="source-raw-summary" id="sourceRawHistoryDialogSummary"></div>
    <div class="source-raw-tabs" role="tablist" aria-label="历史检测内容">
      <button class="source-raw-tab active" type="button" role="tab" aria-selected="true" data-source-history-tab="nodes">节点结果</button>
      <button class="source-raw-tab" type="button" role="tab" aria-selected="false" data-source-history-tab="raw">未过滤节点</button>
    </div>
    <div class="source-raw-toolbar">
      <label class="source-raw-search"><span aria-hidden="true">⌕</span><input id="sourceRawHistoryDialogSearch" type="search" placeholder="搜索 IP、端口或备注" autocomplete="off" aria-label="搜索历史节点" /></label>
      <button class="btn-outline" type="button" id="copySourceRawHistoryDialogButton">📋 复制筛选结果</button>
    </div>
    <pre id="sourceRawHistoryDialogContent" class="source-raw-code source-raw-content" aria-label="历史节点结果"></pre>
  </div>
</dialog>

<!-- ADMIN_SECTION:overview:START -->
<!-- ==================== 优选节点预览 ==================== -->
<div class="card" id="previewSection">
  <h3>🌐 优选API数据预览</h3>
  <div class="toolbar">
    <select id="previewApiSelect" onchange="fetchNodes()" aria-label="选择优选API"></select>
    <button class="btn-primary" onclick="fetchNodes()" aria-label="刷新节点数据">🔄 刷新数据</button>
    <button class="btn-outline" onclick="copySubUrl(event)" title="复制优选API" aria-label="复制优选 API 地址">
      <span>📋</span> 复制优选API
    </button>
    <button class="btn-outline" onclick="copyNodeData(event)" title="复制当前筛选后的优选API数据" aria-label="复制当前筛选结果">
      <span>📝</span> 复制优选API数据
    </button>
    <button class="btn-outline" onclick="downloadNodeData(event)" title="下载当前筛选后的 API 数据" aria-label="下载 API 数据">
      <span>⬇️</span> 下载 API 数据
    </button>
    <div class="preview-view-toggle" role="group" aria-label="数据查看方式">
      <button class="btn-subtle active" type="button" data-preview-mode="nodes" aria-pressed="true">节点结果</button>
      <button class="btn-subtle" type="button" data-preview-mode="api" aria-pressed="false">API 数据</button>
    </div>
    <span class="nodes-count" id="nodesCount">共 0 个节点</span>
  </div>
  <div class="preview-data-status" id="previewDataStatus" role="status" aria-live="polite">
    <span id="previewDataModeHint">节点结果：卡片展示</span>
    <span id="previewDataStats"></span>
    <span id="previewDataCache"></span>
    <span id="previewDataUpdated"></span>
  </div>
  <details class="nodes-filters-panel">
    <summary>筛选条件</summary>
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
      <select id="nodesStatusFilter" aria-label="按可用状态筛选"><option value="">全部状态</option><option value="available">可用</option><option value="unavailable">来源异常</option><option value="unknown">状态未知</option></select>
    </label>
    <label class="nodes-filter-field">
      <span>排序</span>
      <select id="nodesSort" aria-label="节点排序">
        <option value="default">默认顺序</option>
        <option value="host-asc">地址 A-Z</option>
        <option value="host-desc">地址 Z-A</option>
        <option value="remark-asc">备注 A-Z</option>
        <option value="remark-desc">备注 Z-A</option>
        <option value="region-asc">地区</option>
        <option value="source-asc">来源</option>
        <option value="availability-asc">可用状态</option>
        <option value="duration-asc">来源请求耗时（低到高）</option>
        <option value="duration-desc">来源请求耗时（高到低）</option>
      </select>
    </label>
    <button class="btn-outline nodes-filter-reset" id="nodesFilterReset" type="button">清除筛选</button>
    </div>
  </details>
  <div id="sourceErrorNotice" class="source-error-notice" role="status" hidden></div>
  <div id="nodesContainer">
    <div class="nodes-loading nodes-skeleton" aria-label="正在加载节点"></div>
  </div>
  <div id="pagination" class="pagination"></div>
</div>
<!-- ADMIN_SECTION:overview:END -->

<!-- ADMIN_SECTION:sourceStatus:START -->
<!-- ==================== 数据源状态 ==================== -->
<div class="card" id="sourceStatusSection">
  <details class="source-status-panel">
    <summary>
      <div>
      <h3>📊 数据源状态</h3>
      <p class="section-caption">手动检测订阅源和 API 源的最新响应。</p>
      </div>
    </summary>
    <div class="source-status-panel-body">
      <div class="section-heading-actions source-status-actions">
      <select id="sourceStatusScope" aria-label="检测范围">
        <option value="used">检测已使用数据源</option>
        <option value="all">检测全部数据源</option>
      </select>
      <button class="btn-outline" type="button" id="sourceStatusIssuesButton">⚠ 检测异常来源</button>
      <button class="btn-primary" type="button" id="sourceStatusRefreshButton">🔄 检测数据源</button>
      </div>
      <div id="sourceStatusSummary" class="source-status-summary" role="status" hidden></div>
    </div>
  </details>
</div>
<!-- ADMIN_SECTION:sourceStatus:END -->

<!-- ADMIN_SECTION:customApis:START -->
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
<!-- ADMIN_SECTION:customApis:END -->

<!-- ADMIN_SECTION:subs:START -->
<!-- ==================== 订阅源管理 ==================== -->
<div class="card" id="subsSection">
  <details class="management-panel" open>
    <summary><h3>📡 优选订阅器管理</h3></summary>
    <div class="management-panel-body">
  <div class="add-row">
    <label class="add-field"><span class="sr-only">订阅源地址</span><input id="newHost" placeholder="sub.example.com" /><small class="inline-error" hidden></small></label>
    <label class="add-field"><span class="sr-only">订阅源备注</span><input id="newRemark" placeholder="备注（可选）" /></label>
    <button class="btn-primary" onclick="addSub()">➕ 添加订阅源</button>
  </div>
  <div class="toolbar">
    <input id="subsSearch" class="list-search" type="search" placeholder="搜索订阅源或备注" aria-label="搜索订阅源" />
    <select id="subsSort" class="list-sort" aria-label="订阅源排序"><option value="default">默认顺序</option><option value="name-asc">地址 A-Z</option><option value="name-desc">地址 Z-A</option></select>
    <button type="button" class="batch-button" data-batch="subs-select">全选</button><button type="button" class="batch-button batch-delete" data-batch="subs-delete">批量删除</button>
    <button onclick="exportSubs()" aria-label="导出订阅源配置">📤 导出配置</button>
    <button onclick="document.getElementById('importSubsFile').click()" aria-label="导入订阅源配置">📥 导入配置</button>
    <input type="file" id="importSubsFile" accept=".json,application/json" style="display:none" onchange="importSubs(event)" />
  </div>
  <div id="subsList"></div>
    </div>
  </details>
</div>
<!-- ADMIN_SECTION:subs:END -->

<!-- ADMIN_SECTION:apis:START -->
<!-- ==================== API 管理 ==================== -->
<div class="card" id="apisSection">
  <details class="management-panel" open>
    <summary><h3>🔗 优选 API 管理</h3></summary>
    <div class="management-panel-body">
  <div class="add-row">
    <label class="add-field add-field-wide"><span class="sr-only">API 地址</span><input id="newApiUrl" placeholder="https://api.example.com/v1" /><small class="inline-error" hidden></small></label>
    <label class="add-field"><span class="sr-only">API 备注</span><input id="newApiRemark" placeholder="备注（可选）" /></label>
    <button class="btn-primary" onclick="addApi()">➕ 添加API</button>
  </div>
  <div class="toolbar">
    <input id="apisSearch" class="list-search" type="search" placeholder="搜索 API 地址或备注" aria-label="搜索 API 源" />
    <select id="apisSort" class="list-sort" aria-label="API 源排序"><option value="default">默认顺序</option><option value="name-asc">地址 A-Z</option><option value="name-desc">地址 Z-A</option></select>
    <button type="button" class="batch-button" data-batch="apis-select">全选</button><button type="button" class="batch-button batch-delete" data-batch="apis-delete">批量删除</button>
    <button onclick="exportApis()" aria-label="导出 API 源配置">📤 导出配置</button>
    <button onclick="document.getElementById('importApisFile').click()" aria-label="导入 API 源配置">📥 导入配置</button>
    <input type="file" id="importApisFile" accept=".json,application/json" style="display:none" onchange="importApis(event)" />
  </div>
  <div id="apisList"></div>
    </div>
  </details>
</div>
<!-- ADMIN_SECTION:apis:END -->

<!-- ADMIN_SECTION:settings:START -->
<!-- ==================== 设置 ==================== -->
<div class="card" id="settingsSection">
  <div class="section-heading settings-page-heading">
    <div>
      <h3>🧹 数据处理设置</h3>
      <p class="section-caption">管理节点过滤关键词和备注清理规则，修改后会影响后续数据预览结果。</p>
    </div>
  </div>
  <div class="settings-list">
    <div class="setting-block theme-settings" id="themeSettings">
      <div class="setting-block-heading">
        <div class="setting-copy">
          <h4>主题模式</h4>
          <p>选择亮色、暗色，或跟随操作系统的主题设置。</p>
        </div>
        <span class="section-summary" id="themeModeSummary">跟随系统</span>
      </div>
      <div class="theme-mode-options" role="radiogroup" aria-label="主题模式">
        <label><input type="radio" name="themeModeSetting" value="light" /> <span>☀️ 亮色</span></label>
        <label><input type="radio" name="themeModeSetting" value="dark" /> <span>🌙 暗色</span></label>
        <label><input type="radio" name="themeModeSetting" value="system" /> <span>◐ 跟随系统</span></label>
      </div>
    </div>
    <div class="setting-block" id="blacklistSettings">
      <div class="setting-block-heading">
        <div class="setting-copy">
          <h4>黑名单</h4>
          <p>过滤包含这些关键词的节点备注，支持添加、编辑和删除。</p>
        </div>
        <span class="section-summary" id="blacklistSummary">0 项</span>
      </div>
      <button class="btn-outline settings-edit-button" type="button" onclick="openSettingsDialog('blacklistDialog')">⚙ 编辑黑名单</button>
      <dialog class="settings-dialog settings-editor-dialog" id="blacklistDialog" aria-labelledby="blacklistDialogTitle">
        <div class="settings-dialog-head">
          <div><span class="settings-dialog-kicker">数据过滤设置</span><h3 id="blacklistDialogTitle">黑名单</h3><p>过滤包含这些关键词的节点备注。</p></div>
          <button class="dialog-close" type="button" onclick="closeSettingsDialog('blacklistDialog')" aria-label="关闭">×</button>
        </div>
        <div class="settings-dialog-body">
      <div class="blacklist-add-row settings-editor-add">
        <input id="newBlacklistWord" type="text" maxlength="128" placeholder="输入要过滤的关键词" autocomplete="off" />
        <button class="btn-outline setting-add-button" id="addBlacklistButton" type="button" onclick="addBlacklistWord()">➕ 添加</button>
      </div>
      <div class="rule-list-toolbar settings-editor-toolbar">
        <label class="rule-search"><span aria-hidden="true">⌕</span><input id="blacklistSearch" type="search" placeholder="搜索黑名单" autocomplete="off" aria-label="搜索黑名单" /></label>
        <span class="selection-count" id="blacklistSelectionCount">未选择</span>
        <button class="btn-subtle" type="button" onclick="selectAllBlacklist()">全选</button>
        <button class="btn-subtle" type="button" onclick="clearBlacklistSelection()">清除选择</button>
      </div>
      <div id="blacklistList" class="blacklist-list settings-editor-list"></div>
      <div id="blacklistPagination" class="rule-pagination" hidden></div>
      <div id="blacklistEmpty" class="blacklist-empty" hidden>暂无黑名单词条，所有节点都将参与聚合。</div>
      <div class="blacklist-toolbar settings-editor-footer">
        <span class="save-status" id="blacklistSaveStatus">配置已保存</span>
        <button class="btn-primary" id="saveBlacklistButton" type="button" onclick="saveBlacklist()" disabled>💾 保存黑名单</button>
      </div>
      <details class="settings-editor-more">
        <summary>批量操作与备份</summary>
        <div class="settings-editor-more-actions">
          <button class="btn-subtle setting-tool-button" type="button" onclick="exportBlacklist()">📤 导出</button>
          <button class="btn-subtle setting-tool-button" type="button" onclick="document.getElementById('importBlacklistFile').click()">📥 导入</button>
          <input type="file" id="importBlacklistFile" accept=".json,application/json" style="display:none" onchange="importBlacklist(event)" />
          <button class="btn-subtle setting-undo-button" type="button" onclick="undoBlacklistChanges()" disabled>↩ 撤销修改</button>
          <button class="btn-subtle setting-reset-button" type="button" onclick="resetBlacklistDefaults()">↺ 恢复默认</button>
          <button class="btn-danger setting-batch-delete" type="button" onclick="deleteSelectedBlacklist()">🗑 删除选中</button>
        </div>
      </details>
        </div>
      </dialog>
    </div>
    <div class="setting-block" id="filterRulesSettings">
      <div class="setting-block-heading">
        <div class="setting-copy">
          <h4>备注过滤规则</h4>
          <p>匹配到规则后只保留前面的内容，例如 <code>|</code> 或 <code>【</code> 会在对应位置截断；“空格”从第一个空白字符处截断，“符号”会移除 emoji、国旗和商标符号。</p>
        </div>
        <span class="section-summary" id="filterRulesSummary">0 项</span>
      </div>
      <button class="btn-outline settings-edit-button" type="button" onclick="openSettingsDialog('filterRulesDialog')">⚙ 编辑备注过滤规则</button>
      <dialog class="settings-dialog settings-editor-dialog" id="filterRulesDialog" aria-labelledby="filterRulesDialogTitle">
        <div class="settings-dialog-head">
          <div><span class="settings-dialog-kicker">数据清理设置</span><h3 id="filterRulesDialogTitle">备注过滤规则</h3><p>设置节点备注的截断和清理规则。</p></div>
          <button class="dialog-close" type="button" onclick="closeSettingsDialog('filterRulesDialog')" aria-label="关闭">×</button>
        </div>
        <div class="settings-dialog-body">
      <div class="blacklist-add-row settings-editor-add">
        <input id="newFilterRule" type="text" maxlength="128" placeholder="例如：| 或 【" autocomplete="off" />
        <button class="btn-outline setting-add-button" id="addFilterRuleButton" type="button" onclick="addFilterRule()">➕ 添加</button>
      </div>
      <div class="filter-rule-presets" aria-label="常用过滤规则">
        <span>快捷示例</span>
        <button class="rule-preset" type="button" data-filter-rule="|">|</button>
        <button class="rule-preset" type="button" data-filter-rule="【">【</button>
        <button class="rule-preset" type="button" data-filter-rule="空格">空格</button>
        <button class="rule-preset" type="button" data-filter-rule="符号">符号</button>
      </div>
      <div class="rule-list-toolbar settings-editor-toolbar">
        <label class="rule-search"><span aria-hidden="true">⌕</span><input id="filterRulesSearch" type="search" placeholder="搜索过滤规则" autocomplete="off" aria-label="搜索过滤规则" /></label>
        <span class="selection-count" id="filterRulesSelectionCount">未选择</span>
        <button class="btn-subtle" type="button" onclick="selectAllFilterRules()">全选</button>
        <button class="btn-subtle" type="button" onclick="clearFilterRulesSelection()">清除选择</button>
      </div>
      <div id="filterRulesList" class="blacklist-list settings-editor-list"></div>
      <div id="filterRulesPagination" class="rule-pagination" hidden></div>
      <div id="filterRulesEmpty" class="blacklist-empty" hidden>暂无过滤规则。</div>
      <div class="filter-preview settings-editor-preview" aria-live="polite">
        <details class="settings-editor-preview-details">
          <summary><strong>实时预览</strong><span>点击查看处理结果</span></summary>
          <div class="settings-editor-preview-body">
            <label><span class="sr-only">输入示例备注</span><input id="filterPreviewInput" type="text" value="🇭🇰 香港 | IEPL 专线" placeholder="输入一段备注查看处理结果" /></label>
            <div class="filter-preview-result"><span>处理结果</span><code id="filterPreviewOutput">🇭🇰 香港</code></div>
          </div>
        </details>
      </div>
      <div class="blacklist-toolbar settings-editor-footer">
        <span class="save-status" id="filterRulesSaveStatus">配置已保存</span>
        <button class="btn-primary" id="saveFilterRulesButton" type="button" onclick="saveFilterRules()" disabled>💾 保存过滤规则</button>
      </div>
      <details class="settings-editor-more">
        <summary>批量操作与备份</summary>
        <div class="settings-editor-more-actions">
          <button class="btn-subtle setting-tool-button" type="button" onclick="exportFilterRules()">📤 导出</button>
          <button class="btn-subtle setting-tool-button" type="button" onclick="document.getElementById('importFilterRulesFile').click()">📥 导入</button>
          <input type="file" id="importFilterRulesFile" accept=".json,application/json" style="display:none" onchange="importFilterRules(event)" />
          <button class="btn-subtle setting-undo-button" type="button" onclick="undoFilterRulesChanges()" disabled>↩ 撤销修改</button>
          <button class="btn-subtle setting-reset-button" type="button" onclick="resetFilterRulesDefaults()">↺ 恢复默认</button>
          <button class="btn-danger setting-batch-delete" type="button" onclick="deleteSelectedFilterRules()">🗑 删除选中</button>
        </div>
      </details>
        </div>
      </dialog>
    </div>
  </div>
  <dialog class="confirm-dialog rule-import-dialog" id="ruleImportPreviewDialog" aria-labelledby="ruleImportPreviewTitle" aria-describedby="ruleImportPreviewMessage">
    <div class="confirm-dialog-icon" aria-hidden="true">↓</div>
    <h3 id="ruleImportPreviewTitle">导入预览</h3>
    <p id="ruleImportPreviewMessage"></p>
    <div class="import-preview-stats" id="ruleImportPreviewStats"></div>
    <div class="confirm-dialog-actions">
      <button class="btn-outline" type="button" id="cancelRuleImportButton">取消</button>
      <button class="btn-primary" type="button" id="confirmRuleImportButton">确认导入</button>
    </div>
  </dialog>
</div>
<!-- ADMIN_SECTION:settings:END -->

</main>

<script src="/admin-client.js?v=__ADMIN_ASSET_VERSION__" defer></script>
</body>
</html>
`;
