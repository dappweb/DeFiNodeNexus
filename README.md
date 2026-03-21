# DeFi Node Nexus

Precision DeFi node management and yield optimization platform built with Next.js, ShadCN UI, and Genkit.

## 如何推送项目到 GitHub

按照以下步骤将此项目推送到你的 GitHub 仓库：

1. **在 GitHub 上创建一个新的仓库**（不要初始化 README 或 .gitignore）。
2. **在终端中运行以下命令：**

```bash
# 初始化 Git 仓库
git init

# 添加所有文件
git add .

# 提交更改
git commit -m "Initial commit: DeFi Node Nexus with Web3 and AI features"

# 设置主分支
git branch -M main

# 关联远程仓库 (请替换 <YOUR_GITHUB_URL> 为你创建的仓库地址)
git remote add origin <YOUR_GITHUB_URL>

# 推送代码
git push -u origin main
```

## 主要功能

- **多语言支持**: 支持中英文切换。
- **Web3 集成**: 连接 MetaMask 钱包并同步链上资产。
- **AI 收益洞察**: 使用 Genkit (Gemini 2.5 Flash) 生成个性化的投资建议。
- **Cloudflare 部署**: 完美兼容 Cloudflare Pages。

## 本地开发

```bash
npm install
npm run dev
```

## 环境变量

在 GitHub 仓库设置或 Cloudflare Dashboard 中，请务必设置以下变量：
- `GEMINI_API_KEY`: 你的 Google AI API 密钥。
