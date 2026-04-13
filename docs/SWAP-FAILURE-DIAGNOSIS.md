# 🔍 Swap 交易失败诊断报告

## 交易信息

- **交易Hash**: `0x3173cd1806558493a8301c5e91051569394fab1c5103c901094fbf7e0fa55367`
- **状态**: ❌ Failed
- **合约**: `0xfE20139dCFA053b819A3745E9ed801b9C6cc84aC` (TOTSwapV3)
- **Revert原因**: 空 (0x)
- **Gas使用**: 116,069 / 500,000 (23.21%)
- **交易价值**: 0 CNC

---

## 📋 可能的失败原因分析

根据合约代码分析，Swap交易可能因以下原因失败：

### 1. ⚠️ **Swap 暂停** (高概率)

```solidity
require(!swapPaused, "Swap paused");
```

**症状**:

- 交易被revert
- 没有返回错误信息（有些RPC会隐藏"Swap paused"）

**解决方案**:

```bash
# 检查 Swap 是否暂停
npx hardhat run scripts/check-swap-status.js --network cnc

# 或查看前端日志
```

---

### 2. 💰 **超出日买入限制** (中等概率)

```solidity
require(dailyBought[msg.sender][today] + totToUser <= maxDailyBuy,
        "Exceeds daily buy limit");
```

**症状**:

- Buy 交易失败
- 用户在24小时内已买入过多TOT

**检查方式**:

```bash
# 查看用户当日买入额度
# 限制: 100,000 TOT 每24小时
```

---

### 3. 🏪 **超出单笔卖出限制** (中等概率)

```solidity
uint256 maxSell = (balance * maxSellBps) / V3_BASIS_POINTS;  // 50% of balance
require(totAmount <= maxSell, "Exceeds 50% of balance");
```

**症状**:

- Sell 交易失败
- 单笔卖出超过余额的50%

**解决方案**: 分次卖出或增加TOT余额

---

### 4. 📉 **滑点超出限制** (高概率)

```solidity
require(usdtOut >= minUsdtOut, "Slippage exceeded");
```

**症状**:

- 交易失败，前端显示同样的错误
- 价格波动剧烈时
- minUsdtOut 设置过高

**原因**:

- 交易前后价格变化太大
- 网络延迟导致价格变化

**解决方案**:

- 降低 minUsdtOut（允许更高的滑点）
- 在流动性更好的时段交易

---

### 5. 💾 **池子空** (低概率，但可能)

```solidity
require(totReserve > 0 && usdtReserve > 0, "Pool empty");
```

**症状**:

- 所有Swap交易都失败
- 多人都无法交易

**原因**:

- TOT或USDT储备为0（极端情况）
- 合约停用

---

### 6. ⛓️ **外部DEX配置错误** (中等概率)

如果使用了外部DEX模式：

```solidity
require(dexRouter != address(0), "Router not set");
require(dexPair != address(0), "Pair not set");
```

**症状**:

- V3模式下交易失败
- 只有外部DEX模式启用时

---

### 7. 🔗 **余额不足或授权不够** (中等概率)

```solidity
totToken.safeTransferFrom(msg.sender, address(this), totAmount);
usdtToken.safeTransferFrom(msg.sender, address(this), usdtAmount);
```

**症状**:

- 用户余额不足
- 未授予合约足够的额度

**检查**:

```bash
# 检查授权额度
const allowance = await usdt.allowance(userAddress, swapAddress);
console.log("USDT Allowance:", allowance);

# 检查余额
const balance = await tot.balanceOf(userAddress);
console.log("TOT Balance:", balance);
```

---

### 8. 📊 **报价计算错误**（低概率）

外部DEX模式中：

```solidity
uint256 quotedUsdtOut = _getDexAmountsOut(totToSwap, _sellPath());
uint256 minGrossUsdtOut = minUsdtOut + quotedProfitTax;
```

**症状**:

- "Tax exceeds output" 错误
- 利润税比交易输出还大

---

## 🔧 故障排查步骤

### 第1步：快速检查（在浏览器控制台）

```javascript
// 1. 检查钱包连接
console.log("Connected:", isConnected);
console.log("Address:", address);

// 2. 检查代合约
console.log("Swap Contract:", swap);
console.log("TOT Contract:", tot);
console.log("USDT Contract:", usdt);

// 3. 检查余额
const totBalance = await tot.balanceOf(address);
const usdtBalance = await usdt.balanceOf(address);
console.log("TOT Balance:", ethers.formatEther(totBalance));
console.log("USDT Balance:", ethers.formatEther(usdtBalance));

// 4. 检查授权
const usdtAllowance = await usdt.allowance(address, CONTRACTS.SWAP);
console.log("USDT Allowance:", ethers.formatEther(usdtAllowance));
```

### 第2步：查看链上状态

```bash
# 检查 Swap 合约状态
npx hardhat run scripts/check-toswap-status.js --network cnc

# 查看 Swap 配置
npx hardhat console --network cnc

# 在console中执行:
> swap = await ethers.getContractAt("TOTSwapV3", "0xfE20139dCFA053b819A3745E9ed801b9C6cc84aC")
> await swap.swapPaused()           // 检查是否暂停
> await swap.maxDailyBuy()          // 查看日买入限制
> await swap.maxSellBps()           // 查看卖出限制（基点）
> await swap.externalDexEnabled()   // 外部DEX是否启用
```

### 第3步：检查交易日志

```bash
# 查看交易详情（需要API）
curl "https://cncchainpro.com/api/tx/0x3173cd1806558493a8301c5e91051569394fab1c5103c901094fbf7e0fa55367"

# 检查账户交易历史
# 访问: https://cncchainpro.com/address/[user-address]
```

---

## 🛠️ 修复方案

### 如果是 "Swap paused"

```bash
# 以Owner身份联系管理员
# 执行以下命令取消暂停
npx hardhat console --network cnc

> swap = await ethers.getContractAt("TOTSwapV3", "0xfE20139dCFA053b819A3745E9ed801b9C6cc84aC", signer)
> tx = await swap.setSwapPaused(false)
> await tx.wait()
```

### 如果是 "Daily buy limit exceeded"

等待24小时后重试，或在下一个UTC日期重试。

### 如果是 "Slippage exceeded"

增加前端的允许滑点：

```javascript
// 从 [swap-page.tsx]
const minUsdtOut = ethers.parseEther((outputAmount * 0.97).toString()); // 允许3%滑点
// 改为
const minUsdtOut = ethers.parseEther((outputAmount * 0.95).toString()); // 允许5%滑点
```

### 如果是授权不足

```javascript
// 先授权再交易
const usdtAmount = ethers.parseEther("1000");
const tx = await usdt.approve(CONTRACTS.SWAP, usdtAmount);
await tx.wait();

// 再执行Swap
```

---

## 📊 关键数据检查清单

| 项目       | 检查方式                | 正常值                                |
| ---------- | ----------------------- | ------------------------------------- |
| Swap 状态  | `swapPaused()`          | `false`                               |
| 日买入限制 | `maxDailyBuy()`         | `100000000000000000000000` (100k TOT) |
| 卖出限制%  | `maxSellBps()`          | `5000` (50%)                          |
| 外部DEX    | `externalDexEnabled()`  | 取决于部署                            |
| Router地址 | `dexRouter()`           | 非零地址                              |
| Pair地址   | `dexPair()`             | 非零地址                              |
| TOT余额    | `balanceOf(user)`       | > 0                                   |
| USDT余额   | `balanceOf(user)`       | > 0                                   |
| USDT授权   | `allowance(user, swap)` | >= 交易金额                           |

---

## 📝 调试 Revert 原因为空 (0x) 的方法

当RPC返回空的revert reason时，可以：

### 方法1: 使用本地硬分叉模拟

```bash
npx hardhat console --network cnc

> const swap = await ethers.getContractAt("TOTSwapV3", "0xfE20139...");
> const signer = await ethers.getSigner();
>
> // 尝试执行相同交易
> try {
>   const result = await swap.buyTot(
>     ethers.parseEther("1000"),  // 金额
>     ethers.parseEther("9"),      // minTotOut
>     { gasLimit: 500000 }
>   );
>   console.log("Success:", result);
> } catch (err) {
>   console.log("Error:", err.reason || err.message);
> }
```

### 方法2: 使用ethers调试

```javascript
// 在前端添加调试
try {
  const tx = await swap.buyTot(inputAmount, minOut);
  const receipt = await tx.wait();
} catch (err) {
  console.error("Full error:", err);
  console.error("Reason:", err.reason);
  console.error("Data:", err.data);
  console.error("Transaction:", err.transaction);
}
```

---

## 🚨 紧急查询

如果无法确定原因，需要收集以下信息：

1. **用户地址**: `0x...`
2. **交易金额**: `? TOT` 或 `? USDT`
3. **交易类型**: Buy / Sell
4. **用户当日已交易**: `? TOT`
5. **用户TOT余额**: `? TOT`
6. **用户USDT授权**: `? USDT`
7. **网络状态**: 正常 / 拥堵
8. **时间**: 几点（UTC）

---

## 📞 获取帮助

**查看项目文档**:

- [swap-page.tsx](../../src/components/pages/swap-page.tsx) - 前端实现
- [TOTSwapV3.sol](../../contracts/TOTSwapV3.sol) - 合约代码
- [keeper.js](../../scripts/keeper.js) - 状态检查脚本

**检查合约**:

```bash
NPM_RUN="npm run"
$NPM_RUN check:swap:owner:cnc    # 检查合约所有者
$NPM_RUN check:swap:version:cnc  # 检查合约版本
```

---

**诊断生成时间**: 2026-04-13  
**项目**: DeFiNodeNexus (feat/totswap-external-dex-v3)  
**合约版本**: TOTSwapV3
