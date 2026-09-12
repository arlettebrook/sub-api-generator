# sub-api-generator

基于 Cloudflare Pages Functions Advanced Mode 的优选 API 生成器。

## 部署到 Cloudflare Pages

项目使用根目录的 `_worker.js` 作为 Pages Functions 入口，`wrangler.toml` 中的
`pages_build_output_dir = "."` 表示当前目录就是 Pages 输出目录。

代码结构：

```text
_worker.js          Pages 入口，仅转发到 src/index.js
src/index.js        路由和管理页面
src/config.js       Pages 环境、KV 配置和请求数据校验
src/http.js         统一响应和安全响应头
src/auth.js         登录、登出和 Cookie 认证
src/subscriptions.js 订阅源抓取、过滤和聚合
```

### 1. 创建或选择 KV Namespace

将 `wrangler.toml` 中的 `KV` 绑定替换成你自己的 Namespace ID：

```toml
[[kv_namespaces]]
binding = "KV"
id = "生产环境 Namespace ID"

[[env.preview.kv_namespaces]]
binding = "KV"
id = "预览环境 Namespace ID"
```

生产和预览的 ID 不需要相同，但必须是同一个 Cloudflare 账户下真实存在的 KV Namespace。
Pages 使用 `env.preview.kv_namespaces` 配置预览绑定，不使用 Worker 配置中的 `preview_id` 字段。
建议使用两个 Namespace，避免预览环境修改生产数据。

### 2. 配置环境变量

在 Cloudflare Dashboard 的 Pages 项目中，进入 **Settings -> Variables and Secrets**，分别为
Production 和 Preview 配置：

- `PASSWORD`：后台登录密码，建议添加为 Secret

`PASSWORD` 是必填配置，缺少配置时 Pages Function 会返回 `503` 配置错误。
Pages 不支持 Worker 的 `keep_vars` 配置；环境变量和 Secret 以 Dashboard 中的 Production/Preview
设置为准。

### 3. 配置共享 D1 数据库（可选）

`wrangler.toml` 中的 `DB` 是共享应用数据库，不仅用于检测历史，后续业务表也可以复用该绑定。
当前仓库的首个迁移 `migrations/0001_detection_history.sql` 只会创建
`detection_history` 表和索引，不会修改或删除其他表。未绑定 D1 时，前端仍会使用浏览器本地摘要缓存。

首次部署或新增数据库后，建议分别对生产和 Preview 执行迁移：

```powershell
wrangler d1 migrations apply sub-api-generator --remote
wrangler d1 migrations apply sub-api-generator-preview --remote --env preview
```

迁移由 Wrangler 按编号记录执行，每个版本只执行一次。以后修改表结构时不要编辑已经执行过的 SQL，
请新增下一个文件（例如 `migrations/0002_add_xxx.sql`），然后再次执行上面的 `migrations apply` 命令。
这样可以保留现有数据并使生产、Preview 的结构保持一致。D1 历史接口为
`/api/detection-history?path=<优选API路径>`，支持 `limit` 和 `offset` 分页参数，每个优选 API 自动保留最近 50 条记录。

此外，应用在第一次读写检测历史时也会执行 `CREATE TABLE IF NOT EXISTS` 和索引初始化。
因此即使忘记先执行迁移，检测历史仍可自动创建基础表；自动初始化不会删除或覆盖已有数据。
后续结构变更仍必须通过新的编号迁移文件完成，避免生产和 Preview 的表结构不一致。

### 4. 部署

首次部署可以使用 Wrangler：

```powershell
wrangler login
wrangler pages deploy . --project-name sub-api-generator
```

也可以在 Pages 中连接 Git 仓库，构建命令留空，输出目录填写 `.`。每次部署都必须确保根目录的
`_worker.js` 被包含在输出目录中。

### 5. 本地运行

```powershell
wrangler pages dev .
```

本地开发时，可以在项目根目录创建 `.dev.vars`（不要提交到 Git）：

```text
PASSWORD=change-this-password
```

### 6. 运行测试

项目使用 Node.js 内置测试框架，不需要安装额外依赖：

```powershell
npm test
```

浏览器端自动化测试使用 Playwright，首次运行需要安装 Chromium：

```powershell
npx playwright install chromium
npm run test:e2e
```

端到端测试会自动启动本地测试服务，覆盖桌面端和移动端的管理页加载、主题切换、退出登录、导航以及优选 API 数据源选择。

测试覆盖配置校验、认证 Cookie、登录登出、订阅过滤、Pages 路由和 HTTP 方法限制。

## 路由

- `/`、`/admin`：数据预览页，需要登录
- `/admin/manage`：优选订阅源和 API 源统一管理页，需要登录
- `/admin/custom-apis`：优选 API 访问路径管理页，需要登录
- `/admin/subs`、`/admin/apis`：兼容保留的独立管理页，需要登录
- `/api/subs`、`/api/apis`：后台配置接口，需要登录
- `/api/blacklist`：节点黑名单配置接口，需要登录
- `/api/filter-rules`：节点备注过滤规则配置接口，需要登录
- `/api/settings`：伪装首页和管理入口设置接口，需要登录
- `/api/custom-apis`：优选 API 路径和数据源配置接口，需要登录
- `/api/preferred-domains`：优选域名解析记录管理接口，需要登录；添加或刷新域名时自动查询 A、AAAA、CNAME 记录
- `/api/detection-history`：D1 检测历史分页接口，需要登录（未绑定 D1 时返回空列表）

认证、订阅抓取和 KV 读写全部运行在 Pages Functions 的 Worker 运行时中，不需要额外的服务器。

在管理面板的“设置”中启用“伪装首页”后，可配置管理入口路径和无入口请求的跳转地址。功能默认关闭；启用后，管理页面会使用配置的入口路径及其子路径访问，其他页面请求会跳转到指定地址。
