# SWAP 兑换失败 - 故障排除指南

## 问题描述

用户在尝试通过SWAP合约兑换 0.1 USDT 为 TOT 代币时，交易失败。

- 发送账户: `0x744447d8580EB900b199e852C132F626247a36F7` (DEPLOYER_PRIVATE_KEY)
- 金额: 0.1 USDT
- SWAP合约: `0xfE20139dCFA053b819A3745E9ed801b9C6cc84aC` (V3)
- RPC: https://rpc.cncchainpro.com

## 诊断结果

### ✅ 已验证正常的配置

1. **合约存在且可访问** - TOTSwapV3 (V3) 已正确部署
2. **Swap未暂停** - `swapPaused()` 返回 `false`
3. **外部DEX已启用** - `externalDexEnabled()` 返回 `true`
4. **DEX配置完整**
   - Router: `0x9b619b84b2C866ca8445025F5DF4013d95D28A29` ✅
   - Pair: `0x9fEcE7115001086c62d94d9DfA829BE4a1A0a666` ✅
   - Factory: `0x0C36F3c00f1c73CCc9682B6Bbb03Adf52a8A3658` ✅
5. **DEX Pair配置正确**
   - Token0: TOT `0x0C720a3d1AB25b19c132Ba02C74A5D145d7CcDdA`
   - Token1: USDT `0xf54cC0F6CE272125c39C45A8141b84989A8765f4`
   - Liquidity: 60,000 TOT 和 60,000 USDT ✅
6. **DEX路由可用** - `getAmountsOut()` 成功返回值
   - 输入: 0.1 USDT → 输出: 99.584 TOT ✅
7. **USDT配置**
   - 余额: 0.1 USDT ✅
   - 授权: 0.1 USDT ✅
   - 转账成功: ✅

### ⚠️ 问题症状

尽管所有配置看起来正常，但`buyTot()`交易仍然失败：

- 交易状态: Failed (status = 0)
- Gas使用: ~116,069 (远低于500,000限制)
- 错误信息: "missing revert data" (无revert原因)

## 根本原因分析

低gas使用量(116k)表示失败发生在函数执行早期，可能原因：

1. **代理合约问题** - UUPS代理与实现之间的不兼容
2. **内部合约方法问题** - `_grossUpNetAmount()` 或 `_approveExact()` 等
3. **DEX交互问题** - Uniswap V2 `swapExactTokensForTokens()` 调用失败
4. **RPC或网络问题** - 特定RPC端点的quirk

## 解决方案

### 方案 1: 使用前端界面（推荐）

避免脚本问题，直接使用Web界面：

1. 访问 Truth Oracle DApp
2. 连接钱包并确保选择 CNC Chain 网络
3. 使用前端进行USDT → TOT交换
4. 前端代码已实现approve reset-to-0保护机制

### 方案 2: 使用诊断脚本排查

```bash
# 1. 测试合约基础接口
node scripts/test-swap-contract.js

# 2. 检查DEX配置
node scripts/check-dex-config.js

# 3. 测试DEX路由
node scripts/test-dex-router.js

# 4. 测试USDT操作
node scripts/test-usdt-transfer.js

# 5. 完整诊断
node scripts/full-swap-diagnosis.js

# 6. 诊断摘要
node scripts/swap-diagnosis-summary.js
```

### 方案 3: 手动修复USDT授权

按照Tether-style保护机制重新设置授权：

```bash
node scripts/test-usdt-transfer.js
```

这个脚本会：

1. 将USDT授权重置为0
2. 设置新的0.1 USDT授权
3. 验证授权是否生效

## 代码最近修复历史

1. **fix: approve reset-to-0 before re-approve (Tether-style USDT protection)**
   - CNC Chain USDT实现了与真实Tether USDT相同的种族条件保护
   - 要求: approve() 如果当前allowance != 0 且新值 != 0 会revert
   - 修复: 先重置为0，再设置所需金额
   - 影响: BUY(USDT approve) 和 SELL(TOT approve)流程

2. **fix: catch getWithdrawTofFee revert to unblock claim flow**
   - 处理TOF提取费用的revert异常

3. **fix: use viem walletClient for approve**
   - 前端改进，使用viem而不是ethers for approve

## 前端对比

根据提交日志，前端实现了approve重置逻辑：

```javascript
// src/components/pages/swap-page.tsx
if (allowance > BigInt(0)) {
  const resetRes = await execTx(() => usdt.approve(CONTRACTS.SWAP, BigInt(0)));
  if (!resetRes.success) {
    toast({ title: "授权失败", description: resetRes.error });
    return;
  }
}
const approveRes = await execTx(() => usdt.approve(CONTRACTS.SWAP, input));
```

## 检查清单

- [ ] 已验证RPC连接（https://rpc.cncchainpro.com）
- [ ] 已确认Swap未暂停
- [ ] 已确认USDT余额充足
- [ ] 已运行test-usdt-transfer.js重置授权
- [ ] 已在前端界面而不是脚本中尝试
- [ ] 已验证钱包连接到CNC Chain
- [ ] 已检查浏览器控制台是否有错误

## 后续步骤

如果仍然失败：

1. 收集交易Hash和完整错误消息
2. 在区块浏览器上查看交易详情
3. 检查初始化参数是否正确配置
4. 考虑升级合约实现或调整代理

## 相关资源

- Swap合约: `contracts/TOTSwapV3.sol`
- 前端代码: `src/components/pages/swap-page.tsx`
- 诊断脚本: `scripts/` 目录
- RPC配置: 在 `.env` 中配置 `CNC_RPC_URL`
