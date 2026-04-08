# DeFi Node Nexus

Precision DeFi node management and yield optimization platform built with Next.js, ShadCN UI, and Genkit.

## 如何推送项目到 GitHub

按照以下步骤将此项目推送到你的 GitHub 仓库：

1. **在本地打开终端**。
2. **在项目根目录下运行以下命令：**

```bash
# 初始化 Git 仓库
git init

# 添加所有文件
git add .

# 提交更改
git commit -m "Initial commit: DeFi Node Nexus with Web3 and AI features"

# 设置主分支名为 main
git branch -M main

# 关联远程仓库
git remote add origin https://github.com/dappweb/DeFiNodeNexus.git

# 推送代码
git push -u origin main
```

## 主要功能

- **多语言支持**: 支持中英文无缝切换。
- **Web3 集成**: 连接 MetaMask 钱包，基于 Ethereum/Sepolia 同步链上资产。
- **AI 收益洞察**: 使用 Genkit (Gemini 2.0 Flash) 提供个性化的投资组合优化建议。
- **Cloudflare 兼容**: 针对 Cloudflare Pages 进行了 Next.js 15 的适配。

## 环境变量

配置参数统一在 [env_conf.js](env_conf.js) 中维护（`ENV_CONFIG` 对象）。

在 GitHub Secrets 或 Cloudflare 控制面板中，也请务必设置以下变量（用于线上运行时注入）：
- `GEMINI_API_KEY`: 你的 Google AI API 密钥。
- `MYSQL_HOST`: MySQL 主机地址。
- `MYSQL_PORT`: MySQL 端口。
- `MYSQL_USER`: MySQL 用户名。
- `MYSQL_PASSWORD`: MySQL 密码。
- `MYSQL_DATABASE`: MySQL 数据库名。
- `ANNOUNCEMENT_ADMIN_TOKEN`: 可选，后台发布公告令牌。
- `ANNOUNCEMENT_DATA_SERVICE_URL`: 公告 HTTP 数据服务地址（Edge 运行时推荐）。
- `ANNOUNCEMENT_DATA_SERVICE_TOKEN`: 公告 HTTP 数据服务访问令牌（可选）。

## MySQL 公告功能初始化

1. 在 MySQL 执行公告建表 SQL（可参考 [docs/supabase-announcements.sql](docs/supabase-announcements.sql) 并按 MySQL 语法调整）。
2. 在 `.env.local` 填写 `MYSQL_HOST`、`MYSQL_PORT`、`MYSQL_USER`、`MYSQL_PASSWORD`、`MYSQL_DATABASE`。
3. （可选）设置 `ANNOUNCEMENT_ADMIN_TOKEN`，并在 Admin 页发布公告时填写同一个令牌。
4. 启动项目后：
	- 首页通过 `/api/announcements` 拉取公告。
	- Admin 页通过 `/api/admin/announcements` 发布公告。

## 通过 HTTP 数据服务层访问数据库

当项目部署在 Cloudflare Pages（Edge Runtime）时，推荐通过 HTTP 数据服务层访问数据库：

1. 提供一个独立 HTTP 服务，至少包含：
	- `GET /announcements`（返回 `data` 或 `announcements` 数组）
	- `POST /announcements`（接收 `title/content/type`，返回 `data` 或 `announcement`）
2. 在 `.env.local` 配置：
	- `ANNOUNCEMENT_DATA_SERVICE_URL`
	- `ANNOUNCEMENT_DATA_SERVICE_TOKEN`（可选）
3. 本项目 API 将自动转发请求到该 HTTP 服务，并保持前端接口不变。

## 本地开发

```bash
npm install
npm run dev
```

## 本地与 Vercel 保持一致

1. 先把 Vercel 环境变量拉到本地：`npm run vercel:env:pull`
2. 校验本地关键变量是否与线上部署口径一致：`npm run vercel:env:check`
3. 用生产构建方式在本地启动，而不是仅使用开发模式：`npm run dev:vercel`

说明：
- `npm run dev` 使用 `next dev --turbopack`，用于开发效率，不保证与 Vercel 生产环境完全一致。
- `npm run dev:vercel` 会先做环境校验，再执行生产构建并用 `next start -p 9002` 启动，更接近 Vercel 实际行为。
- `postbuild` 已改为 Node 脚本，Windows 本地构建也能与线上一样复制 standalone 产物。

## Cloudflare 部署配置

- **构建命令**: `npm run pages:build`
- **输出目录**: `.vercel/output/static`
- **部署命令**: 留空（不要使用 `npx wrangler deploy`）
- **环境变量**: `NODE_VERSION: 20`
- **说明**: 本项目不再依赖 `wrangler.toml`，按 Cloudflare Pages 的构建产物目录直接发布。
