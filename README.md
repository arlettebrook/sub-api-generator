# sub-api-generator

基于 Cloudflare Pages Functions Advanced Mode 的优选 API 生成器。

## 部署到 Cloudflare Pages

项目使用根目录的 `_worker.js` 作为 Pages Functions 入口，`wrangler.toml` 中的
`pages_build_output_dir = "."` 表示当前目录就是 Pages 输出目录。

### 1. 创建或选择 KV Namespace

将 `wrangler.toml` 中的 `KV` 绑定替换成你自己的 Namespace ID：

```toml
[[kv_namespaces]]
binding = "KV"
id = "生产环境 Namespace ID"
preview_id = "预览环境 Namespace ID"
```

生产和预览可以使用同一个 Namespace，但建议使用两个 Namespace，避免预览环境修改生产数据。

### 2. 配置环境变量

在 Cloudflare Dashboard 的 Pages 项目中，进入 **Settings -> Variables and Secrets**，分别为
Production 和 Preview 配置：

- `UUID`：公开订阅路径，例如 `my-subscription`
- `PASSWORD`：后台登录密码，建议添加为 Secret

不要依赖代码中的默认值；未配置变量时会回退到公开的默认密码和路径。
Pages 不支持 Worker 的 `keep_vars` 配置；环境变量和 Secret 以 Dashboard 中的 Production/Preview
设置为准。

### 3. 部署

首次部署可以使用 Wrangler：

```powershell
wrangler login
wrangler pages deploy . --project-name sub-api-generator
```

也可以在 Pages 中连接 Git 仓库，构建命令留空，输出目录填写 `.`。每次部署都必须确保根目录的
`_worker.js` 被包含在输出目录中。

### 4. 本地运行

```powershell
wrangler pages dev .
```

本地开发时，可以在项目根目录创建 `.dev.vars`（不要提交到 Git）：

```text
UUID=my-subscription
PASSWORD=change-this-password
```

## 路由

- `/`、`/admin`：后台管理页面，需要登录
- `/<UUID>`：公开订阅聚合接口
- `/api/subs`、`/api/apis`：后台配置接口，需要登录
- `/api/uuid`：读取订阅 UUID，需要登录

认证、订阅抓取和 KV 读写全部运行在 Pages Functions 的 Worker 运行时中，不需要额外的服务器。
