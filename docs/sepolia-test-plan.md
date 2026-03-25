# Sepolia 业务测试方案（TOT/TOF/USDT）

## 1. 准备工作

- 钱包与网络
  - 准备 1 个部署钱包（Owner）和 3~5 个测试钱包（用户A/B/C、交易员）。
  - 所有钱包有少量 Sepolia ETH（用于 Gas）。
- 环境变量
  - 复制 `.env.example` 为 `.env`。
  - 必填：`SEPOLIA_RPC_URL`、`DEPLOYER_PRIVATE_KEY`。
- 地址变量（部署后回填）
  - `TOT_TOKEN_ADDRESS`
  - `TOF_TOKEN_ADDRESS`
  - `USDT_TOKEN_ADDRESS`
  - `NEXUS_ADDRESS`
  - `SWAP_ADDRESS`

## 2. 部署顺序

1) 部署 TOF/USDT

```bash
npx hardhat run scripts/deploy-tof-usdt-sepolia.js --network sepolia
```

2) 部署 TOT

```bash
npx hardhat run scripts/deploy-tot-sepolia.js --network sepolia
```

3) 部署 DeFiNodeNexus + TOTSwap 并联通

```bash
npx hardhat run scripts/deploy-sepolia.js --network sepolia
```

4) 注入初始流动性（默认 6000万 TOT + 6000万 USDT）

```bash
npx hardhat run scripts/seed-swap-liquidity.js --network sepolia
```

## 3. USDT/TOF 测试资金发放

- 在 `.env` 设置：
  - `USDT_MINT_RECIPIENTS=地址1,地址2,地址3`
  - `USDT_MINT_AMOUNTS=5000,5000,10000`
- 执行：

```bash
npm run mint:usdt:sepolia
```

说明：若代币已达上限，脚本会自动从 Owner 余额 `transfer` 分发（无需重部署）。

## 4. 业务测试用例（手工 + 前端联调）

1) 推荐关系
- 用户A绑定推荐人（Owner），再次绑定应失败。

2) NFTA 购买与分账
- 用户A购买 NFTA：校验 USDT 按 30/10/10/10/40 分配。

3) NFTA 每日收益
- 次日领取成功；同日重复领取失败；`pendingTot` 增加。

4) TOT 提现
- 从 `pendingTot` 提现，扣 TOF 手续费，部分 TOF 销毁。

5) NFTB 购买（USDT / TOF）
- 用户B 用 USDT 购买，用户C 用 TOF 购买；均成功创建节点。

6) Swap 买卖
- 交易员买 TOT（触发手续费入 NFTB 分红池）。
- 再卖 TOT（触发卖出费与利润税逻辑）。

7) NFTB 分红领取
- 用户B/C 领取分红，校验 `pendingTot` 上升。

## 5. 通过标准

- 所有交易成功确认，无 `revert`。
- 关键状态正确变化：`pendingTot`、`claimedTot`、`withdrawnTot`、池子储备、分红池。
- 关键资金流符合预期：
  - NFTA 分账比例
  - Swap 手续费与分红累积
  - TOF 销毁与 treasury 入账

## 6. 快速回归（本地）

本地可直接跑完整端到端回归：

```bash
npx hardhat run scripts/user-flow-regression-local.js
```

该脚本覆盖推荐绑定、NFTA/NFTB购买、收益领取、TOT提现、Swap买卖与分红分发主链路。