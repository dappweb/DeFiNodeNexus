#!/bin/bash

# Swap Failure Quick Diagnostic Script
# 快速诊断Swap交易失败的原因

set -e

COLORS='\033[0m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'

print_header() {
    echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${COLORS}"
    echo -e "${BLUE}║ $1${COLORS}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${COLORS}\n"
}

print_status() {
    local status=$1
    local message=$2
    
    case $status in
        "ok")
            echo -e "${GREEN}✓${COLORS} $message"
            ;;
        "fail")
            echo -e "${RED}✗${COLORS} $message"
            ;;
        "warn")
            echo -e "${YELLOW}⚠${COLORS} $message"
            ;;
        "info")
            echo -e "${BLUE}ℹ${COLORS} $message"
            ;;
    esac
}

print_header "DeFiNodeNexus Swap 故障诊断工具"

# Check if .env exists
if [[ ! -f ".env" ]]; then
    print_status "fail" ".env 文件不存在"
    echo "请确保在项目根目录运行此脚本"
    exit 1
fi

# Load environment
export $(grep -v '^#' .env | xargs)

SWAP_ADDRESS="${SWAP_ADDRESS:-0xfE20139dCFA053b819A3745E9ed801b9C6cc84aC}"
RPC_URL="${CNC_RPC_URL:-https://rpc.cncchainpro.com}"
BLOCK_EXPLORER="https://cncchainpro.com"

print_status "info" "RPC URL: $RPC_URL"
print_status "info" "Swap Address: $SWAP_ADDRESS"
print_status "info" "区块浏览器: $BLOCK_EXPLORER"

echo ""
echo "=== 链上 Swap 状态检查 ==="
echo ""

# Create a simple check script
cat > /tmp/check_swap_status.js << 'SCRIPT_EOF'
#!/usr/bin/env node
require("dotenv").config();
const { ethers } = require("ethers");

const SWAP_ABI = [
    "function swapPaused() public view returns (bool)",
    "function maxDailyBuy() public view returns (uint256)",
    "function maxSellBps() public view returns (uint256)",
    "function externalDexEnabled() public view returns (bool)",
    "function dexRouter() public view returns (address)",
    "function dexPair() public view returns (address)",
    "function totReserve() public view returns (uint256)",
    "function usdtReserve() public view returns (uint256)",
    "function owner() public view returns (address)",
    "function version() public view returns (string memory)"
];

async function checkSwapStatus() {
    try {
        const provider = new ethers.JsonRpcProvider(process.env.CNC_RPC_URL);
        const swapAddress = process.env.SWAP_ADDRESS;
        const swap = new ethers.Contract(swapAddress, SWAP_ABI, provider);

        const [
            paused,
            maxDaily,
            maxSellBps,
            externalDex,
            router,
            pair,
            totReserve,
            usdtReserve,
            owner,
            version
        ] = await Promise.all([
            swap.swapPaused(),
            swap.maxDailyBuy(),
            swap.maxSellBps(),
            swap.externalDexEnabled(),
            swap.dexRouter(),
            swap.dexPair(),
            swap.totReserve(),
            swap.usdtReserve(),
            swap.owner(),
            swap.version()
        ]);

        console.log("\n✓ Swap 合约状态检查成功\n");
        console.log("合约版本:", version);
        console.log("Owner:", owner);
        console.log("");
        console.log("状态:");
        console.log("  Swap暂停:", paused ? "YES ❌" : "NO ✓");
        console.log("  外部DEX启用:", externalDex ? "YES" : "NO");
        console.log("");
        console.log("限制:");
        console.log("  日买入限制:", ethers.formatUnits(maxDaily, 18), "TOT");
        console.log("  单笔卖出限制:", (maxSellBps / 100), "%");
        console.log("");
        console.log("储备:");
        console.log("  TOT储备:", ethers.formatUnits(totReserve, 18), "TOT");
        console.log("  USDT储备:", ethers.formatUnits(usdtReserve, 6), "USDT");
        console.log("");

        if (externalDex) {
            console.log("外部DEX配置:");
            console.log("  Router:", router);
            console.log("  Pair:", pair);
            
            if (router === "0x0000000000000000000000000000000000000000") {
                console.log("  ⚠️  Router未配置!");
            }
            if (pair === "0x0000000000000000000000000000000000000000") {
                console.log("  ⚠️  Pair未配置!");
            }
        }

        console.log("");
        
        // Quick diagnosis
        console.log("快速诊断:");
        if (paused) {
            console.log("❌ Swap已暂停 - 这可能是交易失败的原因!");
        } else {
            console.log("✓ Swap正常运行");
        }

        if (totReserve === 0n || usdtReserve === 0n) {
            console.log("❌ 储备为0 - 池子已空!");
        } else {
            console.log("✓ 池子有流动性");
        }

        if (externalDex && (router === "0x0000000000000000000000000000000000000000" || pair === "0x0000000000000000000000000000000000000000")) {
            console.log("❌ 外部DEX配置不完整");
        }

    } catch (err) {
        console.error("❌ 检查失败:", err.message);
        process.exit(1);
    }
}

checkSwapStatus();
SCRIPT_EOF

# Check if we have node
if ! command -v node &> /dev/null; then
    print_status "fail" "Node.js 未安装"
    exit 1
fi

# Run the check if ethers is available
if npm list ethers > /dev/null 2>&1 || [[ -f "node_modules/ethers/package.json" ]]; then
    node /tmp/check_swap_status.js 2>/dev/null || {
        print_status "warn" "无法连接到RPC或ethers未安装"
        echo ""
        echo "请在项目目录运行:"
        echo "  npm install ethers"
    }
else
    print_status "warn" "ethers 未安装，跳过智能合约检查"
    echo ""
    echo "要启用完整诊断，请运行:"
    echo "  npm install ethers"
fi

echo ""
echo "=== 本地环境检查 ==="
echo ""

# Check environment variables
if [[ -z "$SWAP_ADDRESS" ]]; then
    print_status "fail" "SWAP_ADDRESS 未设置"
else
    print_status "ok" "SWAP_ADDRESS: $SWAP_ADDRESS"
fi

if [[ -z "$CNC_RPC_URL" ]]; then
    print_status "fail" "CNC_RPC_URL 未设置"
else
    print_status "ok" "CNC_RPC_URL 已设置"
fi

if [[ -z "$NEXUS_ADDRESS" ]]; then
    print_status "warn" "NEXUS_ADDRESS 未设置（可能需要）"
else
    print_status "ok" "NEXUS_ADDRESS: $NEXUS_ADDRESS"
fi

echo ""
echo "=== 诊断信息 ==="
echo ""

cat << 'HELP_EOF'
最常见的 Swap 失败原因：

1. ❌ Swap 已暂停
   └─ 解决: 检查 swapPaused() 状态
   └─ 管理员需要调用 setSwapPaused(false)

2. 💳 余额或授权不足
   └─ 解决: 检查余额和授权额度
   └─ 需要先 approve() 再 swap

3. 📉 滑点超出限制
   └─ 解决: 增加允许的滑点参数
   └─ 或在流动性更好的时候交易

4. 📊 超出日买入限制
   └─ 解决: 等待24小时后重试
   └─ 或检查 maxDailyBuy 配置

5. 📤 超出单笔卖出限制
   └─ 解决: 分次卖出，单笔 ≤ 50% 余额

6. 🏪 流动性池为空
   └─ 解决: 等待流动性补充
   └─ 联系管理员

更详细的诊断，请查看：
  docs/SWAP-FAILURE-DIAGNOSIS.md

测试交易前的检查清单：
  ✓ 钱包已连接
  ✓ 网络正确 (CNC Chain)
  ✓ 余额充足
  ✓ 授权额度足够
  ✓ Swap 未暂停
  ✓ 滑点设置合理

如需查看完整合约状态：
  npx hardhat console --network cnc
  
然后在console中执行:
  > swap = await ethers.getContractAt("TOTSwapV3", "0xfE20139...")
  > await swap.swapPaused()
  > await swap.totReserve()
  > await swap.usdtReserve()

HELP_EOF

echo ""
echo "=== 推荐后续步骤 ==="
echo ""

echo "1. 查看前端控制台日志 (F12 -> Console)"
echo "2. 查看完整诊断: docs/SWAP-FAILURE-DIAGNOSIS.md"
echo "3. 提供以下信息给管理员:"
echo "   - 交易 hash"
echo "   - 用户地址"
echo "   - 交易类型 (Buy/Sell)"
echo "   - 交易金额"
echo "   - 时间 (UTC)"
echo ""

echo "完成！"
