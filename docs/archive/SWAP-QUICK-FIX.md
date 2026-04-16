#!/bin/bash

# Swap Failure Quick Diagnostic Script

# 快速诊断Swap交易失败的原因

COLORS='\033[0m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'

print_header() {
echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${COLORS}"
echo -e "${BLUE}║ Swap 故障诊断工具${COLORS}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${COLORS}\n"
}

print_header

cat << 'EOF'
最常见的 Swap 失败原因和解决方案：

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ 问题 1: Swap 已暂停
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

症状:
• 所有交易都失败
• 错误信息: "Swap paused" 或空错误 (0x)

原因:
• 管理员暂停了 Swap 功能（可能是维护或紧急情况）

解决:

1. 检查是否暂停:
   npx hardhat console --network cnc
   > swap = await ethers.getContractAt("TOTSwapV3", "0xfE20139...")
   > await swap.swapPaused()
2. 如果返回 true，则是暂停状态

3. 管理员可通过以下方式恢复:
   > tx = await swap.setSwapPaused(false)
   > await tx.wait()

❌ 问题 2: 超出日买入限制
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

症状:
• Buy 交易失败
• 同一用户多次购买都失败

原因:
• 超出 24 小时内的购买限制（100,000 TOT 每 24 小时）

解决:

1. 等待 24 小时后重试
2. 或在次日 UTC 00:00 后重试
3. 查看已购买额度:
   > const user = "0x..."
   > const today = Math.floor(Date.now() / 1000 / 86400)
   > await swap.dailyBought(user, today)

❌ 问题 3: 超出单笔卖出限制
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

症状:
• Sell 交易失败
• 错误: "Exceeds 50% of balance"

原因:
• 单笔卖出量 > 用户 TOT 余额的 50%

解决:

1. 分次卖出
   • 第 1 次: 20% 的 TOT
   • 第 2 次: 20% 的 TOT
   • 第 3 次: 剩余部分
2. 或增加 TOT 余额后再卖出

❌ 问题 4: 滑点超出限制（最常见 ⚠️）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

症状:
• 交易失败
• 错误: "Slippage exceeded"

原因:
• 交易前后价格变化太大
• 允许的滑点太低
• 池子流动性不足导致价格滑移

解决:

1. 增加允许的滑点:
   • 前端选择 95% 最小输出（允许 5% 滑点）
   • 而不是 99% 最小输出（仅允许 1% 滑点）
2. 在流动性更好的时候交易:
   • 避免高波动性时段
   • 使用 1-3 分钟的交易间隔
3. 减小交易金额:
   • 小额交易滑点更低

❌ 问题 5: 余额或授权不足
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

症状:
• 交易失败，提示授权不足
• 或提示余额不足

原因:
• 未授予合约足够的交易额度
• 用户 USDT/TOT 余额不足

解决:

1. 先检查余额:

   > const totBalance = await tot.balanceOf(userAddress)
   > const usdtBalance = await usdt.balanceOf(userAddress)
   > console.log("TOT:", ethers.formatEther(totBalance))
   > console.log("USDT:", ethers.formatEther(usdtBalance))

2. 检查授权:

   > const allowance = await usdt.allowance(userAddress, swapAddress)
   > console.log("授权额度:", ethers.formatEther(allowance))

3. 如需授权，先调用 approve:
   > tx = await usdt.approve(swapAddress, ethers.parseEther("10000"))
   > await tx.wait()

❌ 问题 6: 池子流动性为空
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

症状:
• 所有交易都失败
• 错误: "Pool empty" 或类似

原因:
• TOT 或 USDT 储备为 0
• 这是极端情况（几乎不会发生）

解决:

1. 联系管理员补充流动性
2. 查看储备状态:
   > const totReserve = await swap.totReserve()
   > const usdtReserve = await swap.usdtReserve()
   > console.log("TOT 储备:", ethers.formatEther(totReserve))
   > console.log("USDT 储备:", ethers.formatEther(usdtReserve))

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 快速检查清单：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

交易前，请检查：

✓ 钱包已连接到正确的网络（CNC Chain）
✓ 有足够的 CTN 用于 gas 费（最少 0.1 CNC）
✓ 购买 TOT：检查 USDT 余额 ≥ 购买金额
✓ 卖出 TOT：检查 TOT 余额 ≥ 卖出金额
✓ 购买前已授权 USDT (approve)
✓ 24 小时内购买总额 < 100,000 TOT（Buy）
✓ 单笔卖出 ≤ 余额的 50%（Sell）
✓ 允许合理的滑点（推荐 3-5%）

📞 需要帮助时：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 查看完整诊断文档:
   docs/SWAP-FAILURE-DIAGNOSIS.md

2. 获取交易详情:
   https://cncchainpro.com/tx/[TRANSACTION_HASH]

3. 在 Hardhat 中测试:
   npx hardhat console --network cnc
   (然后执行上面的示例代码)

4. 查看前端日志:
   F12 -> Console 选项卡 -> 查找 "Swap" 相关日志

5. 联系管理员，提供：
   • 交易 Hash
   • 您的钱包地址
   • 交易类型 (Buy/Sell)
   • 交易金额
   • 问题发生时间

EOF

echo ""
echo "✓ 诊断信息已显示，详见上方"
