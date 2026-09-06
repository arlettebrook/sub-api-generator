export const adminHTML = `
<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>优选API•生成器</title>
<link rel="stylesheet" href="/admin.css" />
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
  <div id="sourceErrorNotice" class="source-error-notice" role="status" hidden></div>
  <div id="nodesContainer">
    <div class="nodes-loading">加载中...</div>
  </div>
  <div id="pagination" class="pagination"></div>
</div>

<!-- ==================== 优选 API ==================== -->
<div class="card" id="customApiSection">
  <div class="section-heading">
    <div>
      <h3>🚀 优选 API</h3>
    </div>
    <span class="section-summary" id="customApiSummary">0 个 API</span>
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
    <div id="newCustomApiSources"><span class="nodes-loading">正在加载数据源...</span></div>
    <div id="customApiSourceStatus" class="source-load-status" role="status" hidden></div>
    <div class="create-actions">
      <button class="btn-primary" type="button" onclick="addCustomApi()">➕ 新建 API</button>
    </div>
  </div>
  <div class="toolbar custom-api-toolbar">
    <span class="save-status" id="customApiSaveStatus">配置已保存</span>
    <button class="btn-primary" type="button" id="saveCustomApisButton" onclick="saveCustomApis()">💾 保存配置</button>
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
          <small>清理节点备注中的分隔符、emoji、国旗、商标符号或自定义内容。“符号”规则会自动处理这类符号，无需逐个添加。</small>
        </div>
        <span class="section-summary" id="filterRulesSummary">0 项</span>
      </div>
      <div class="blacklist-add-row">
        <input id="newFilterRule" type="text" maxlength="128" placeholder="例如：🐲 或 ™️" autocomplete="off" />
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
