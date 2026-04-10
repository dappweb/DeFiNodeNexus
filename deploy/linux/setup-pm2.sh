#!/usr/bin/env bash
# =============================================================================
# setup-pm2.sh — 安装 Node/npm/PM2 并启动 DeFiNodeNexus Web 服务
# 用法：bash deploy/linux/setup-pm2.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "DeFiNodeNexus — PM2 Setup"
echo "Project: $PROJECT_ROOT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ─── 1. 安装 Node.js（如未安装）──────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "[1/4] Installing Node.js 20 via NodeSource..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  echo "[1/4] Node.js already installed: $(node --version)"
fi

# ─── 2. 安装 PM2（如未安装）──────────────────────────────────────────────────
if ! command -v pm2 &>/dev/null; then
  echo "[2/4] Installing PM2..."
  npm install -g pm2
else
  echo "[2/4] PM2 already installed: $(pm2 --version)"
fi

# ─── 3. 构建（如 .next/standalone 不存在则执行）──────────────────────────────
if [[ ! -f "$PROJECT_ROOT/.next/standalone/server.js" ]]; then
  echo "[3/4] .next/standalone not found, running build..."
  cd "$PROJECT_ROOT"
  npm install
  npm run build
else
  echo "[3/4] .next/standalone already exists, skipping build"
fi

# ─── 4. 启动/重载 PM2 服务────────────────────────────────────────────────────
echo "[4/4] Starting service via PM2..."
cd "$PROJECT_ROOT"

if pm2 describe definodenexus &>/dev/null; then
  echo "  → Process exists, reloading..."
  pm2 reload ecosystem.config.js --update-env
else
  echo "  → Starting new process..."
  pm2 start ecosystem.config.js
fi

# 持久化（开机自启）
pm2 save

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Done! Service is running on port 9002"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "常用命令："
echo "  pm2 status                    # 查看运行状态"
echo "  pm2 logs definodenexus        # 查看实时日志"
echo "  pm2 reload definodenexus      # 热重载（新构建后）"
echo "  pm2 stop definodenexus        # 停止服务"
echo ""
echo "开机自启（首次运行 pm2 startup 时执行输出的命令）："
echo "  pm2 startup"
echo "  pm2 save"
echo ""
