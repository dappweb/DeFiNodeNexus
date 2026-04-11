#!/bin/bash
# 初始化 DeFiNodeNexus 的 2 NFTA + 3 NFTB Tier 自动化脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo ""
echo "=========================================="
echo "DeFiNodeNexus Tier 初始化向导"
echo "=========================================="
echo ""
echo "本脚本将初始化 2 NFTA + 3 NFTB tier 数据到链上"
echo ""

# 检查当前状态
echo "📊 检查当前链上状态..."
cd "$PROJECT_ROOT"
node scripts/check-tiers-status.js

echo ""
echo "=========================================="
echo ""

# 检查 OWNER_PRIVATE_KEY
if [[ -z "$OWNER_PRIVATE_KEY" ]]; then
  echo "❌ 错误: 未设置 OWNER_PRIVATE_KEY 环境变量"
  echo ""
  echo "请通过以下方式提供 Owner 私钥:"
  echo ""
  echo "   方式 1 (推荐): 在命令行中设置"
  echo "   ─────────────────────────────────"
  echo "   OWNER_PRIVATE_KEY=0x... node scripts/init-tiers.js"
  echo ""
  echo "   方式 2: 在 .env 文件中设置"
  echo "   ─────────────────────────────────"
  echo "   # 编辑 .env 文件"
  echo "   OWNER_PRIVATE_KEY=0x..."
  echo "   node scripts/init-tiers.js"
  echo ""
  echo "   方式 3: 临时导出环境变量"
  echo "   ─────────────────────────────────"
  echo "   export OWNER_PRIVATE_KEY=0x..."
  echo "   node scripts/init-tiers.js"
  echo ""
  echo "⚠️  Owner 地址: 0xF6FCDB875a7CdBE4e07Fb7DabE233bF88f35E34b"
  echo ""
  exit 1
fi

echo "✓ OWNER_PRIVATE_KEY 已设置"
echo ""
echo "🚀 开始初始化..."
echo ""

cd "$PROJECT_ROOT"
node scripts/init-tiers.js

echo ""
echo "=========================================="
echo "初始化完成!"
echo "=========================================="
echo ""
echo "✅ 下一步:"
echo "   1. 打开 Admin 面板: https://t1.test2dapp.xyz/admin"
echo "   2. 连接 Owner 钱包"
echo "   3. 在 'Tier 管理' 面板中查看和编辑 tier 规格"
echo "   4. 用户可以在节点购买页面看到真实的链上 tier"
echo ""
