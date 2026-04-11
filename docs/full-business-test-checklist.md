# 全业务测试清单（本地全量 + CNC联调）

更新时间：2026-03-24

## 一、测试目标

确保以下业务环节全部被验证：

- 代币发行与分发（TOT/TOF/USDT）
- NFTA/NFTB 购买、配额、推荐关系
- 收益累计、领取、提现与手续费
- 交易池买卖、限额、分红、通缩
- 管理员权限与参数边界
- 升级兼容（UUPS）

## 二、执行入口

- 全业务本地回归：
  - `npm run regression:full:local`
  - 脚本：[scripts/full-business-regression-local.js](scripts/full-business-regression-local.js)
- 升级回归：
  - `npx hardhat run scripts/upgrade-regression-local.js`
  - 脚本：[scripts/upgrade-regression-local.js](scripts/upgrade-regression-local.js)
- CNC 发行与联调（已验证部署流程）：
  - 一体化部署：[scripts/deploy-cnc.js](scripts/deploy-cnc.js)
  - 注入流动性：[scripts/seed-swap-liquidity.js](scripts/seed-swap-liquidity.js)

## 三、业务覆盖矩阵（必测项）

### A. TOTToken（发行与分发）

- [x] onlyOwner `mint` 权限校验
- [x] `mint` 正常增发
- [x] `airdrop` 数组长度不一致回退
- [x] 代币上限（Cap）生效（满额后不能 mint）
- [x] 满额时通过 owner 余额转账分发（测试网发币可用）

### B. DeFiNodeNexus（核心业务）

- [x] 推荐绑定：自推荐/零地址/重复绑定均被拒绝
- [x] 推荐绑定：首次绑定成功
- [x] NFTA 购买：
  - [x] 非激活档位拒绝
  - [x] 每地址仅 1 张限制生效
  - [x] 档位售罄限制生效
  - [x] 资金分账生效（推荐+钱包+treasury）
- [x] NFTA 收益：
  - [x] 非 owner 不能领取他人节点收益
  - [x] 跨天可领、同日重复领取被拒绝
  - [x] `pendingNftaYield` 返回值正确（1天收益）
- [x] TOT 提现：
  - [x] 0 金额与余额不足被拒绝
  - [x] 提现到账正确
  - [x] TOF 手续费燃烧生效
- [x] NFTB 购买：
  - [x] USDT 半额配额生效
  - [x] TOF 半额配额生效
  - [x] `getNftbTierRemaining` 返回剩余额度正确
- [x] NFTB 分红：
  - [x] 未授权地址不能分发
  - [x] Owner 分发成功
  - [x] 节点领取后 `pendingTot` 增长
  - [x] 同轮重复领取被拒绝
- [x] Owner 参数治理：
  - [x] `setTofBurnBps`、`setTofClaimFeeBps` 上界限制
  - [x] `setWithdrawFeeBps` level 与 bps 边界
  - [x] `setTreasury`/`setWallets`/`setProjectWallet` 零地址限制
- [x] 后台登记购买：
  - [x] `registerNftaPurchase` 成功
  - [x] `registerNftbPurchase` 成功

### C. TOTSwap（交易、分红、通缩）

- [x] onlyOwner 权限：`setNexus`/`addLiquidity`/`removeLiquidity`/`forceDistribute`/`emergencyWithdraw`
- [x] 参数边界：
  - [x] `setBuyFeeBps <= 1000`
  - [x] `setSellFeeBps <= 2000`
  - [x] `setProfitTaxBps <= 5000`
  - [x] `setDeflationBps <= 1000`
  - [x] `setDistributionThreshold > 0`
- [x] 流动性注入成功，报价函数 `quoteBuy/quoteSell` 有效
- [x] 买入日限额（`maxDailyBuy`）生效
- [x] 单次卖出不超过 50% 持仓限制生效
- [x] 卖出成功并完成费率逻辑
- [x] 4 小时通缩执行后：
  - [x] `totReserve` 下降
  - [x] 分红池增加
- [x] `forceDistribute` 后分红池归零
- [x] 移除流动性边界校验生效

### D. UUPS 升级回归

- [x] TOTToken 升级：实现地址变化、状态保持、新函数可用
- [x] TOTSwap 升级：实现地址变化、状态保持、新函数可用
- [x] DeFiNodeNexus 升级：实现地址变化、状态保持、新函数可用

## 四、实际执行结果（本次）

- [x] `npx hardhat run scripts/full-business-regression-local.js`
  - 结果：`✅ FULL business regression passed.`
- [x] `npx hardhat run scripts/upgrade-regression-local.js`
  - 结果：`All upgrade regression checks passed.`
- [x] CNC 部署与联调关键步骤
  - 结果：Nexus/Swap 部署成功，流动性注入成功，链路验证通过

## 五、判定结论

在当前代码版本下，核心业务环节、权限边界、费率与通缩分红逻辑、以及升级兼容性均已覆盖并通过本地自动化验证；CNC 环境完成了真实部署与关键联调步骤验证，可用于继续前端联调与验收。
