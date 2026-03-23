# DeFiNodeNexus 部署初始化文档

本文档用于 **首次部署前初始化** 与 **Sepolia 合约部署**。所有命令默认在项目根目录执行。

## 1. 环境要求

- Node.js 20+
- npm 10+
- 已准备 Sepolia RPC（如 Alchemy/Infura）
- 已准备可用部署钱包（含少量 Sepolia ETH）

## 2. 安装依赖

```bash
npm install
```

## 3. 创建环境变量文件

在项目根目录新建 `.env`，可从以下模板开始：

```dotenv
# ===== Hardhat 基础 =====
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_key
DEPLOYER_PRIVATE_KEY=0xyour_private_key_without_quotes

# ===== Step A: TOT 部署参数（deploy-tot-sepolia.js） =====
TOT_NAME=TOT Token
TOT_SYMBOL=TOT
TOT_MAX_SUPPLY=1000000000
TOT_INITIAL_SUPPLY=1000000000
TOT_OWNER_ADDRESS=

# ===== Step B: TOF/USDT 部署参数（deploy-tof-usdt-sepolia.js） =====
TOKEN_OWNER_ADDRESS=
TOF_NAME=TOF Token
TOF_SYMBOL=TOF
TOF_MAX_SUPPLY=1000000000
TOF_INITIAL_SUPPLY=1000000000
USDT_NAME=USDT Test
USDT_SYMBOL=USDT
USDT_MAX_SUPPLY=1000000000
USDT_INITIAL_SUPPLY=1000000000

# ===== Step C: 主协议部署输入（deploy-sepolia.js） =====
# 先执行 Step A/B 后，回填下列地址
TOT_TOKEN_ADDRESS=
TOF_TOKEN_ADDRESS=
USDT_TOKEN_ADDRESS=

# 可选：项目钱包（都填才会链上设置）
ZERO_LINE_WALLET=
COMMUNITY_WALLET=
FOUNDATION_WALLET=
INSTITUTION_WALLET=

# ===== 升级脚本参数（upgrade-uups.js） =====
UPGRADE_CONTRACT_NAME=
UPGRADE_PROXY_ADDRESS=

# ===== 前端（Next.js）读取的链上地址 =====
NEXT_PUBLIC_NEXUS_ADDRESS=
NEXT_PUBLIC_SWAP_ADDRESS=
NEXT_PUBLIC_TOT_ADDRESS=
NEXT_PUBLIC_TOF_ADDRESS=
NEXT_PUBLIC_USDT_ADDRESS=

# ===== 其他后端能力（按需） =====
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ANNOUNCEMENT_ADMIN_TOKEN=
```

> 注意：`DEPLOYER_PRIVATE_KEY` 建议使用独立测试钱包，且不要提交 `.env` 到 Git。

## 4. 编译合约

```bash
npx hardhat compile
```

## 5. Sepolia 首次部署顺序

按以下顺序执行：

### Step A：部署 TOT

```bash
npx hardhat run scripts/deploy-tot-sepolia.js --network sepolia
```

执行后将输出 `TOT_TOKEN_ADDRESS=...`，复制回 `.env`。

### Step B：部署 TOF 和 USDT

```bash
npx hardhat run scripts/deploy-tof-usdt-sepolia.js --network sepolia
```

执行后将输出 `TOF_TOKEN_ADDRESS=...`、`USDT_TOKEN_ADDRESS=...`，复制回 `.env`。

### Step C：部署 DeFiNodeNexus + TOTSwap

```bash
npx hardhat run scripts/deploy-sepolia.js --network sepolia
```

该步骤会：
- 部署 `DeFiNodeNexus` UUPS Proxy
- 部署 `TOTSwap` UUPS Proxy
- 自动把 `TOTSwap` 关联到 `DeFiNodeNexus`
- 将 `TOTSwap` 设置为 `DeFiNodeNexus` 的 distributor

## 6. 回填前端链上地址

将部署输出的地址写入 `.env`：

```dotenv
NEXT_PUBLIC_NEXUS_ADDRESS=0x...
NEXT_PUBLIC_SWAP_ADDRESS=0x...
NEXT_PUBLIC_TOT_ADDRESS=0x...
NEXT_PUBLIC_TOF_ADDRESS=0x...
NEXT_PUBLIC_USDT_ADDRESS=0x...
```

然后启动前端：

```bash
npm run dev
```

## 7. UUPS 升级流程（可选）

1) 在 `.env` 中设置：

```dotenv
UPGRADE_CONTRACT_NAME=DeFiNodeNexusV2
UPGRADE_PROXY_ADDRESS=0xYourProxyAddress
```

2) 执行升级：

```bash
npx hardhat run scripts/upgrade-uups.js --network sepolia
```

## 8. 常见问题排查

- `Missing DEPLOYER_PRIVATE_KEY in .env`：检查私钥是否配置并以 `0x` 开头。
- `Missing SEPOLIA_RPC_URL in .env`：检查 RPC URL 是否可访问。
- `must be real deployed token addresses`：`TOT_TOKEN_ADDRESS/TOF_TOKEN_ADDRESS/USDT_TOKEN_ADDRESS` 仍为空或为零地址。
- 前端读不到地址：确认 `NEXT_PUBLIC_*` 已设置并重启 `npm run dev`。

## 9. 初始化完成检查清单

- [ ] `.env` 已创建并填写基础项（RPC/私钥）
- [ ] 合约已成功编译
- [ ] TOT、TOF、USDT 地址已产出并回填
- [ ] Nexus、Swap 地址已产出并回填到 `NEXT_PUBLIC_*`
- [ ] 前端可正常启动并读取链上合约地址
