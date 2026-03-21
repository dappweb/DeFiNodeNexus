# DeFi Node Nexus

Precision DeFi node management and yield optimization platform built with Next.js, ShadCN UI, and Genkit.

## 如何推送项目到 GitHub

按照以下步骤将此项目推送到你的 GitHub 仓库：

1. **在本地打开终端**。
2. **在项目根目录下运行以下命令：**

```bash
# 如果还没初始化，先初始化 Git 仓库
git init

# 添加所有文件
git add .

# 提交更改
git commit -m "Initial commit: DeFi Node Nexus with Web3 and AI features"

# 设置主分支名为 main
git branch -M main

# 关联你指定的远程仓库
git remote add origin https://github.com/dappweb/DeFiNodeNexus.git

# 推送代码 (如果远程已有内容，可能需要先 git pull 或强制推送 -f)
git push -u origin main
```

## 主要功能

- **多语言支持**: 支持中英文无缝切换。
- **Web3 集成**: 连接 MetaMask 钱包，基于 Ethereum/Sepolia 同步链上资产。
- **AI 收益洞察**: 使用 Genkit (Gemini 2.0 Flash) 提供个性化的投资组合优化建议。
- **Cloudflare 兼容**: 针对 Cloudflare Pages 进行了 Next.js 15 的适配。

## 环境变量

在 GitHub Secrets 或 Cloudflare 控制面板中，请务必设置以下变量：
- `GEMINI_API_KEY`: 你的 Google AI API 密钥。

## 本地开发

```bash
npm install
npm run dev
```

## Cloudflare 部署配置

- **构建命令**: `npm run pages:build`
- **输出目录**: `.vercel/output/static`
- **环境变量**: `NODE_VERSION: 20`
- **兼容性标志**: `nodejs_compat`
