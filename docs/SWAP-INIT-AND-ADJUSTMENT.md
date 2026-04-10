# Swap 初始化与参数调整操作手册

本文用于指导运维与管理员完成 TOTSwap 的初始化、联动配置、参数调整、验收与排错。

适用范围：
- 本地开发网络
- CNC 生产网络（按本仓库现有脚本）

---

## 1. 目标与边界

初始化目标：
1. 确保 TOTSwap 已部署并可用。
2. 完成 Swap 与 Nexus 绑定。
3. 向池子注入初始流动性。
4. 验证储备、价格、分红触发链路正常。

调整目标：
1. 管理费率、限制、通缩与分红阈值参数。
2. 在不破坏交易可用性的前提下迭代经济参数。

边界说明：
- 用户交易滑点参数由用户交易时传入，不是全局管理员参数。
- onlyOwner 受链上 owner 地址控制，前端 Admin 页不自动等于链上权限。

---

## 2. 相关脚本与合约

核心脚本：
- scripts/init-swap-local.js
- scripts/upgrade-totswap-v3.js
- scripts/seed-swap-liquidity.js
- scripts/deploy-cnc.js

核心合约：
- contracts/TOTSwap.sol
- contracts/TOTSwapV3.sol

---

## 3. 初始化前检查

### 3.1 必备环境

1. Node.js 20+
2. 已安装依赖：npm install
3. 部署账户有足够链上 Gas 代币
4. 对应网络 RPC 可访问

### 3.2 关键环境变量

最少必需（测试网/生产）：
- DEPLOYER_PRIVATE_KEY
- CNC_RPC_URL
- TOT_TOKEN_ADDRESS
- USDT_TOKEN_ADDRESS

建议同时配置：
- NEXUS_ADDRESS
- SWAP_SEED_TOT
- SWAP_SEED_USDT
- SWAP_ADDRESS（已部署后回填）

如需直接部署或升级为 TOTSwapV3，额外可配置：
- SWAP_CONTRACT_NAME=TOTSwapV3
- SWAP_DEX_FACTORY_ADDRESS
- SWAP_DEX_ROUTER_ADDRESS
- SWAP_DEX_PAIR_ADDRESS
- SWAP_ENABLE_EXTERNAL_DEX=true
- SWAP_PAUSE_SWAP=false

---

## 4. 本地一键初始化

执行命令：

    npx hardhat run scripts/init-swap-local.js

该脚本会自动执行：
1. 部署 TOT、USDT、TOF。
2. 部署 DeFiNodeNexus。
3. 部署 TOTSwap。
4. 执行 Swap 与 Nexus 绑定。
5. 注入初始流动性（默认 60,000,000 TOT + 60,000,000 USDT）。
6. 输出地址、储备、当前价格。

本地验收最小标准：
1. totReserve > 0。
2. usdtReserve > 0。
3. getCurrentPrice 返回有效值。
4. buyTot 与 sellTot 小额交易可成功。

---

## 5. CNC 初始化

如使用一体化部署脚本：

    npm run deploy:cnc

如需直接部署 TOTSwapV3：

    npm run deploy:cnc:v3

部署后建议动作：
1. 回填 NEXUS_ADDRESS、SWAP_ADDRESS。
2. 使用 owner 账户执行 addLiquidity（或使用脚本补流动性）。
3. 做一次小额买卖闭环验收。

若升级现有代理到 TOTSwapV3：
    npm run upgrade:totswap:v3:cnc

升级脚本会：
1. 自动从 SWAP_ADDRESS 读取代理地址。
2. 执行 UUPS 升级到 TOTSwapV3。
3. 若提供 SWAP_DEX_* 变量，自动配置外部 DEX 参数。
4. 若设置 SWAP_ENABLE_EXTERNAL_DEX=true，则自动切换到外部 DEX 模式。

---

## 6. 管理员可调整参数

以下参数均为 onlyOwner：

1. 买入手续费 buyFeeBps
- 函数：setBuyFeeBps
- 上限：1000（10%）
- 影响：买入到手 TOT 下降，分红池增长更快。

2. 卖出手续费 sellFeeBps
- 函数：setSellFeeBps
- 上限：2000（20%）
- 影响：卖出成本上升，抑制抛压。

3. 利润税率 profitTaxBps
- 函数：setProfitTaxBps
- 上限：5000（50%）
- 影响：盈利卖出扣税增加，USDT 分红池增长更快。

4. TOT 分红阈值 distributionThreshold
- 函数：setDistributionThreshold
- 要求：大于 0
- 影响：阈值越低，分发越频繁，Gas 开销更高。

5. USDT 分红阈值 usdtDistributionThreshold
- 函数：setUsdtDistributionThreshold
- 要求：大于 0
- 影响：阈值越低，分发越频繁，Gas 开销更高。

6. 每日最大买入 maxDailyBuy
- 函数：setMaxDailyBuy
- 影响：限制单地址日内买入上限，降低短期冲击。

7. 单次最大卖出比例 maxSellBps
- 函数：setMaxSellBps
- 上限：10000（100%）
- 影响：限制单次抛售比例，保护池子深度。

8. 通缩比例 deflationBps
- 函数：setDeflationBps
- 上限：1000（10%）
- 影响：每周期缩量速度；过高会显著影响流动性稳定。

9. Nexus 地址 nexus
- 函数：setNexus
- 影响：决定分红转发目标；错误地址会导致分发失败。

10. 强制分发
- 函数：forceDistribute
- 影响：可在低于阈值时手动结算 TOT/USDT 分红池。

11. 流动性管理
- 函数：addLiquidity、removeLiquidity
- 影响：直接改变池深与价格弹性。

12. 紧急提取
- 函数：emergencyWithdraw
- 影响：可提取合约内指定代币，需严格权限与审计流程。

---

## 8. 建议参数档位（运营起步）

### 8.1 保守档（上线早期）

1. buyFeeBps = 100
2. sellFeeBps = 500
3. profitTaxBps = 1000
4. maxSellBps = 5000
5. deflationBps = 80

说明：与默认值一致，先保证稳定运行与数据可观测。

### 8.2 平衡档（有稳定成交后）

1. buyFeeBps = 100 到 150
2. sellFeeBps = 500 到 700
3. profitTaxBps = 1000 到 1500
4. maxSellBps = 4000 到 5000
5. deflationBps = 80 到 120

说明：抑制短期抛压，同时保持交易可用性。

### 8.3 激进档（高波动治理）

1. 临时提高 sellFeeBps 或 profitTaxBps
2. 临时降低 maxSellBps
3. 变更窗口建议不超过 24 小时，需公告并复盘

说明：用于风险事件处置，不建议长期常态化。

---

## 9. 参数调整变更流程

1. 变更前
- 记录当前参数快照。
- 确认 owner 账户权限与 Gas。
- 评估用户侧影响（成交成本、滑点、分红频率）。

2. 变更中
- 单次只改 1 到 2 个核心参数。
- 每次变更后等待一个观测窗口（建议 2 到 6 小时）。

3. 变更后
- 观察：交易成功率、平均滑点、池子储备变化、分红触发成功率。
- 若异常，回滚到上一个稳定参数组。

---

## 10. 常见问题与处理

1. 报错 Missing DEPLOYER_PRIVATE_KEY
- 原因：环境变量未配置
- 处理：补齐环境变量并重新加载终端

2. 报错 Missing or zero TOT_TOKEN_ADDRESS / USDT_TOKEN_ADDRESS
- 原因：地址为空、错误或零地址
- 处理：替换为正确网络的已部署代币地址

3. addLiquidity 失败（余额不足）
- 原因：owner 持币不够
- 处理：先补充 owner 余额或降低注入量

4. addLiquidity 失败（allowance 不足）
- 原因：approve 未成功或额度不足
- 处理：重新授权并校验额度

5. setNexus 或 setDistributor 失败
- 原因：非 owner 调用或地址错误
- 处理：确认 owner 与目标合约地址

6. 前端显示无池子数据
- 原因：前端地址未更新
- 处理：同步 NEXT_PUBLIC_SWAP_ADDRESS、NEXT_PUBLIC_TOT_ADDRESS、NEXT_PUBLIC_USDT_ADDRESS

---

## 11. 上线验收清单

1. 合约地址
- SWAP_ADDRESS、NEXUS_ADDRESS、TOT_TOKEN_ADDRESS、USDT_TOKEN_ADDRESS 已落盘。

2. 池子状态
- totReserve、usdtReserve 均大于 0。

3. 交易链路
- 小额 buyTot 成功。
- 小额 sellTot 成功。

4. 分红链路
- nexus 已设置。
- 分红函数可被成功触发（自动或 forceDistribute）。

5. 运维链路
- 参数调整流程可复现。
- 紧急操作权限留痕。

---

## 12. 参考

- contracts/TOTSwap.sol
- scripts/init-swap-local.js
- scripts/seed-swap-liquidity.js
- docs/CNC-DEPLOYMENT-GUIDE.md