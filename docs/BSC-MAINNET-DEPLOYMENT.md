# BSC 主网部署文档

> Truth Oracle (DeFiNodeNexus) — 从 Sepolia 测试网迁移到 BSC 主网的完整部署指南

---

## 目录

1. [前置准备](#1-前置准备)
2. [合约部署](#2-合约部署)
3. [前端代码改造](#3-前端代码改造)
4. [环境变量配置](#4-环境变量配置)
5. [构建与服务器部署](#5-构建与服务器部署)
6. [部署后验证](#6-部署后验证)
7. [文件改动清单](#7-文件改动清单)

---

## 1. 前置准备

### 1.1 所需账户与资金

| 项目 | 说明 |
|------|------|
| 部署钱包 | 一个拥有 BNB 余额的 BSC 主网钱包（用于支付 Gas） |
| 部署私钥 | `DEPLOYER_PRIVATE_KEY`，建议使用硬件钱包 / 多签 |
| BNB 余额 | 建议准备 ≥ 0.5 BNB（合约部署 + 初始化配置约消耗 0.1–0.3 BNB） |
| USDT (BEP-20) | BSC 主网 USDT 地址: `0x55d398326f99059fF775485246999027B3197955` |

### 1.2 所需工具

```bash
# 确认 Node.js ≥ 18
node -v

# 项目依赖已安装
cd /home/ubuntu/DeFiNodeNexus
npm ci
```

### 1.3 BSC 主网 RPC 端点

| 推荐 RPC | URL |
|-----------|-----|
| 官方 BSC | `https://bsc-dataseed.binance.org` |
| 官方备用 | `https://bsc-dataseed1.defibit.io` |
| 官方备用 | `https://bsc-dataseed1.ninicoin.io` |
| Ankr 公共 | `https://rpc.ankr.com/bsc` |
| 1RPC | `https://1rpc.io/bnb` |

> ⚠️ 生产环境强烈建议使用付费 RPC（QuickNode / Alchemy / Ankr Premium），公共节点有限速。

---

## 2. 合约部署

### 2.1 修改 Hardhat 配置

在 `hardhat.config.js` 中添加 BSC 主网网络：

```js
// hardhat.config.js
require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("@openzeppelin/hardhat-upgrades");

const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || "";

module.exports = {
  solidity: {
    version: "0.8.26",
    settings: {
      evmVersion: "cancun",            // ⚠️ BSC 也已支持 cancun
      optimizer: { enabled: true, runs: 200 },
      viaIR: true
    }
  },
  networks: {
    // 保留 Sepolia 用于测试
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: deployerPrivateKey ? [deployerPrivateKey] : []
    },
    // 新增 BSC 主网
    bsc: {
      url: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org",
      chainId: 56,
      accounts: deployerPrivateKey ? [deployerPrivateKey] : [],
      gasPrice: 3_000_000_000, // 3 Gwei，BSC 通常 3-5 Gwei
    }
  }
};
```

### 2.2 配置 .env

```bash
# .env（BSC 主网部署用）
DEPLOYER_PRIVATE_KEY=0x你的部署钱包私钥
BSC_RPC_URL=https://bsc-dataseed.binance.org

# BSC 主网 USDT (BEP-20)
USDT_TOKEN_ADDRESS=0x55d398326f99059fF775485246999027B3197955
```

### 2.3 部署顺序

BSC 主网部署需按以下顺序执行：

#### 步骤 1: 部署 TOT Token

```bash
npx hardhat run scripts/deploy-tot-sepolia.js --network bsc
```

> 记录输出的 TOT 合约地址，写入 `.env` 的 `TOT_TOKEN_ADDRESS`

#### 步骤 2: 部署 TOF Token

```bash
# 如果有独立的 TOF 部署脚本，执行它
# 否则参考 deploy-tof-usdt-sepolia.js 改 network 为 bsc
npx hardhat run scripts/deploy-tof-usdt-sepolia.js --network bsc
```

> 记录 TOF 合约地址，写入 `.env` 的 `TOF_TOKEN_ADDRESS`

#### 步骤 3: 部署 DeFiNodeNexus + TOTSwap（主合约）

```bash
# 确保 .env 已写入 TOT/TOF/USDT 地址后执行
npx hardhat run scripts/deploy-sepolia.js --network bsc
```

**脚本会自动完成：**
- 部署 DeFiNodeNexus (UUPS Proxy)
- 配置 NFTA Tier 1 & 2
- 配置 NFTB Tier 1/2/3
- 部署 TOTSwap (UUPS Proxy)
- 关联 Nexus ↔ Swap
- 配置 TOF 白名单

#### 步骤 4: 记录所有合约地址

部署完成后会输出类似：

```
=== DEPLOYMENT SUMMARY ===
DeFiNodeNexus: 0x...
TOTSwap:       0x...
TOT token:     0x...
TOF token:     0x...
USDT token:    0x55d398326f99059fF775485246999027B3197955
```

### 2.4 合约验证（BscScan）

```bash
# 安装 hardhat-verify 插件（如未安装）
npm install --save-dev @nomicfoundation/hardhat-verify

# 在 hardhat.config.js 添加:
# require("@nomicfoundation/hardhat-verify");
# etherscan: { apiKey: { bsc: "你的_BSCSCAN_API_KEY" } }

# 验证合约
npx hardhat verify --network bsc <合约地址> <构造参数...>
```

---

## 3. 前端代码改造

以下文件需要从 Sepolia 切换到 BSC 主网：

### 3.1 `src/lib/wagmi.ts` — 链配置

```diff
- import { sepolia } from 'wagmi/chains';
+ import { bsc } from 'wagmi/chains';

  export const config = getDefaultConfig({
    appName: 'Truth Oracle',
    projectId,
-   chains: [sepolia],
+   chains: [bsc],
    ssr: false,
  });
```

### 3.2 `src/lib/web3-provider.tsx` — 链 ID 常量

```diff
- const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111
- const SEPOLIA_CHAIN_ID_DECIMAL = 11155111;
+ const BSC_CHAIN_ID = '0x38'; // 56
+ const BSC_CHAIN_ID_DECIMAL = 56;
```

### 3.3 `src/hooks/use-contract.ts` — 只读 Fallback Provider

```diff
- const sepoliaNetwork = ethers.Network.from("sepolia");
- const rpcUrls = [
-   "https://ethereum-sepolia-rpc.publicnode.com",
-   "https://rpc.sepolia.org",
-   "https://1rpc.io/sepolia",
-   process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL,
- ];
+ const bscNetwork = new ethers.Network("bnb", 56);
+ const rpcUrls = [
+   "https://bsc-dataseed.binance.org",
+   "https://bsc-dataseed1.defibit.io",
+   "https://rpc.ankr.com/bsc",
+   process.env.NEXT_PUBLIC_BSC_RPC_URL,
+ ];
```

### 3.4 `src/app/page.tsx` — 链检测 & 显示

```diff
- done: isConnected && chainId === 11155111,
+ done: isConnected && chainId === 56,

- <span className={chainId === 11155111 ? "text-primary font-medium" : ...}>
-   {chainId === 11155111 ? "Sepolia" : t("notTestnet")}
+ <span className={chainId === 56 ? "text-primary font-medium" : ...}>
+   {chainId === 56 ? "BSC Mainnet" : t("wrongNetwork")}
```

### 3.5 `src/app/api/nodes/summary/route.ts` — 服务端 RPC

```diff
- const sepoliaNetwork = ethers.Network.from("sepolia");
- rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com", ...]
+ const bscNetwork = new ethers.Network("bnb", 56);
+ rpcUrls: ["https://bsc-dataseed.binance.org", ...]
```

### 3.6 `src/app/api/keeper/route.ts` — Keeper Bot

```diff
- const rpcUrl = process.env.SEPOLIA_RPC_URL;
+ const rpcUrl = process.env.BSC_RPC_URL;

- { error: "Missing SEPOLIA_RPC_URL..." }
+ { error: "Missing BSC_RPC_URL..." }
```

### 3.7 `scripts/keeper.js` — 独立 Keeper

```diff
- const rpcUrl = process.env.SEPOLIA_RPC_URL;
+ const rpcUrl = process.env.BSC_RPC_URL;
```

### 3.8 `src/lib/translations.ts` — 翻译文案

```diff
- stepSwitchNetwork: "Switch to Sepolia",     →  "Switch to BSC"
- stepSwitchNetwork: "切换到 Sepolia",         →  "切换到 BSC 主网"
- notTestnet: "Not testnet",                   →  "Wrong Network"
- notTestnet: "非测试网",                       →  "网络错误"
```

### 3.9 `src/lib/contracts.ts` — 默认合约地址

```diff
  const DEPLOYED = {
-   NEXUS: "0x2cc1Ebf7185F4810C620e0A7D3300B1e381f3b44",
-   SWAP:  "0x018F73b493a0F8D0B8f7F85480Ec8E9c9d852ad6",
-   TOT:   "0x46f7729e2158Dd005DC6bdD28FaD457d6f036219",
-   TOF:   "0x2d764DF04FE2A086780ab3F1Edfb4b39E44C0c1B",
-   USDT:  "0x02ED3072eB83e4E0654d30250102aA58cE977789",
+   NEXUS: "BSC部署后的地址",
+   SWAP:  "BSC部署后的地址",
+   TOT:   "BSC部署后的地址",
+   TOF:   "BSC部署后的地址",
+   USDT:  "0x55d398326f99059fF775485246999027B3197955",
  };
```

### 3.10 `next.config.ts` — 环境变量名称

```diff
  env: {
-   NEXT_PUBLIC_SEPOLIA_RPC_URL: e("NEXT_PUBLIC_SEPOLIA_RPC_URL") || e("SEPOLIA_RPC_URL"),
+   NEXT_PUBLIC_BSC_RPC_URL: e("NEXT_PUBLIC_BSC_RPC_URL") || e("BSC_RPC_URL"),
    ...
  },
```

---

## 4. 环境变量配置

### 4.1 生产 .env 完整模板

```bash
# ============================================
# DeFiNodeNexus — BSC 主网生产环境配置
# ============================================

# ── 链 RPC ─────────────────────────────────
BSC_RPC_URL=https://bsc-dataseed.binance.org
NEXT_PUBLIC_BSC_RPC_URL=https://bsc-dataseed.binance.org

# ── 合约地址（BSC 主网部署后填入）──────────
NEXT_PUBLIC_NEXUS_ADDRESS=0x...
NEXT_PUBLIC_SWAP_ADDRESS=0x...
NEXT_PUBLIC_TOT_ADDRESS=0x...
NEXT_PUBLIC_TOF_ADDRESS=0x...
NEXT_PUBLIC_USDT_ADDRESS=0x55d398326f99059fF775485246999027B3197955

# ── 部署 / Keeper 专用（不带 NEXT_PUBLIC_ 前缀，不暴露到前端）──
DEPLOYER_PRIVATE_KEY=0x...
SWAP_ADDRESS=0x...
KEEPER_SECRET=你的keeper密钥

# ── 合约 Owner ─────────────────────────────
NEXT_PUBLIC_CONTRACT_OWNER=0x...

# ── WalletConnect ──────────────────────────
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=你的WalletConnect项目ID

# ── 钱包地址（合约初始化时配置）────────────
ZERO_LINE_WALLET=0x...
COMMUNITY_WALLET=0x...
FOUNDATION_WALLET=0x...
INSTITUTION_WALLET=0x...
```

### 4.2 关键区别对照

| 环境变量 | Sepolia 值 | BSC 主网值 |
|---------|-----------|-----------|
| `*_RPC_URL` | `https://ethereum-sepolia-rpc.publicnode.com` | `https://bsc-dataseed.binance.org` |
| `NEXT_PUBLIC_USDT_ADDRESS` | 测试 USDT 地址 | `0x55d398326f99059fF775485246999027B3197955` |
| Chain ID | `11155111` | `56` |
| 其他合约地址 | Sepolia 部署地址 | BSC 新部署地址 |

---

## 5. 构建与服务器部署

### 5.1 构建

```bash
cd /home/ubuntu/DeFiNodeNexus

# 确保 .env 已更新为 BSC 主网配置
npm run build
```

### 5.2 部署到服务器

```bash
# 方式一：使用项目自带的一键部署脚本
bash deploy.sh --skip-pull

# 方式二：手动操作
pm2 reload ecosystem.config.js --update-env
pm2 save
```

### 5.3 健康检查

```bash
# 检查进程状态
pm2 list

# 检查 HTTP 响应
curl -s -o /dev/null -w "HTTP %{http_code}" http://127.0.0.1:9002/

# 检查日志
pm2 logs definodenexus --lines 50
```

---

## 6. 部署后验证

### 6.1 检查清单

- [ ] 打开网站，钱包能正常连接到 BSC 主网
- [ ] 页面显示 "BSC Mainnet" 而非 "Sepolia"
- [ ] 管理面板能正常读取合约数据（无"读取失败"错误）
- [ ] NFTA 购买流程正常（使用真实 USDT BEP-20）
- [ ] NFTB 购买流程正常
- [ ] TOTSwap 交换功能正常
- [ ] 推荐绑定功能正常
- [ ] Keeper Bot 能正常触发定时任务
- [ ] BscScan 上合约已验证

### 6.2 Owner 初始化操作

部署后 Owner 需要执行：

```
1. swap.addLiquidity()     — 注入初始 TOT + USDT 流动性（6% TOT 总量）
2. nexus.fundRewardPool()  — 注入 NFTA 奖励池资金
3. nexus.setTreasury()     — 设置金库地址（如不同于 deployer）
4. nexus.setProjectWallet()— 设置项目钱包
5. tof.setTransferWhitelist() — 确认 Nexus、Swap 地址已加入 TOF 白名单
```

---

## 7. 文件改动清单

| # | 文件 | 改动类型 | 说明 |
|---|------|----------|------|
| 1 | `hardhat.config.js` | 修改 | 添加 `bsc` 网络配置 |
| 2 | `.env` | 新建/修改 | BSC RPC + 合约地址 |
| 3 | `src/lib/wagmi.ts` | 修改 | `sepolia` → `bsc` |
| 4 | `src/lib/web3-provider.tsx` | 修改 | Chain ID 常量 |
| 5 | `src/lib/contracts.ts` | 修改 | 默认合约地址 |
| 6 | `src/hooks/use-contract.ts` | 修改 | Fallback RPC → BSC |
| 7 | `src/app/page.tsx` | 修改 | Chain ID 判断 |
| 8 | `src/app/api/nodes/summary/route.ts` | 修改 | RPC → BSC |
| 9 | `src/app/api/keeper/route.ts` | 修改 | RPC 环境变量名 |
| 10 | `scripts/keeper.js` | 修改 | RPC 环境变量名 |
| 11 | `src/lib/translations.ts` | 修改 | 网络文案 |
| 12 | `next.config.ts` | 修改 | 环境变量名 |

---

## ⚠️ 安全注意事项

1. **私钥保护**：`DEPLOYER_PRIVATE_KEY` 绝不能提交到 Git，`.env` 已在 `.gitignore` 中
2. **合约审计**：主网部署前建议完成第三方合约审计
3. **多签钱包**：生产环境 Owner 建议使用 Gnosis Safe 多签
4. **渐进上线**：建议先在 BSC Testnet（Chain ID 97）做完整测试后再切主网
5. **备份 .openzeppelin**：UUPS 代理的 manifest 文件（`.openzeppelin/bsc.json`）部署后自动生成，**必须备份**，升级合约时需要
6. **USDT 精度**：BSC 主网 USDT 是 18 位精度（与 Sepolia 测试 USDT 一致），无需改动
7. **Gas**: BSC Gas 价格通常 3-5 Gwei，远低于 Ethereum 主网

---

## BSC Testnet 预演（推荐）

在切生产前，先在 BSC Testnet 做一轮完整测试：

```js
// hardhat.config.js 额外添加
bscTestnet: {
  url: "https://data-seed-prebsc-1-s1.binance.org:8545",
  chainId: 97,
  accounts: deployerPrivateKey ? [deployerPrivateKey] : [],
}
```

wagmi 链配置使用 `bscTestnet`（`import { bscTestnet } from 'wagmi/chains'`），跑通全部流程后再改为 `bsc` 主网。
