#!/usr/bin/env bash
# =============================================================================
# DeFiNodeNexus Timer Setup — Quick Start Script
# 
# 功能：一键启用 systemd timer 定时任务（Keeper + Health Check）
# 用法：bash deploy/linux/start-timers.sh
# 
# 特点：
#   - 自动检测项目路径（目录不敏感）
#   - 无需系统用户配置
#   - 可用 root 或普通用户运行
#   - 支持幂等操作（重复运行不影响）
# =============================================================================

set -euo pipefail

# 获取脚本所在目录（即项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
ENV_FILE="$PROJECT_ROOT/deploy/linux/.env.production"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "DeFiNodeNexus Timer Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Project path: $PROJECT_ROOT"
echo "Env file:    $ENV_FILE"
echo ""

# 检查环境文件
if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Error: $ENV_FILE not found"
  echo ""
  echo "Please create the .env.production file first:"
  echo "  cp deploy/linux/.env.production.example deploy/linux/.env.production"
  echo "  vim deploy/linux/.env.production  # Fill in DEPLOYER_PRIVATE_KEY etc."
  exit 1
fi

# 检查环境变量是否填充
if grep -q "DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY" "$ENV_FILE"; then
  echo "⚠️  Warning: DEPLOYER_PRIVATE_KEY still has placeholder value"
  echo "   Please update: $ENV_FILE"
  echo ""
fi

echo "✓ Environment file detected"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# 1. 修改 systemd service 和 timer 文件以指向当前项目路径
# ─────────────────────────────────────────────────────────────────────────────

echo "[1/4] Preparing systemd units..."

KEEPER_SERVICE="/tmp/definode-keeper.service"
KEEPER_TIMER="/tmp/definode-keeper.timer"
HEALTH_SERVICE="/tmp/definode-health.service"
HEALTH_TIMER="/tmp/definode-health.timer"
WEB_SERVICE="/tmp/definode-web.service"

# Keeper Service (with dynamic path)
cat > "$KEEPER_SERVICE" << EOF
[Unit]
Description=DeFiNodeNexus Keeper One-shot Job
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=$PROJECT_ROOT
EnvironmentFile=$ENV_FILE
ExecStart=/usr/bin/env node scripts/keeper.js --once
TimeoutStartSec=300
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Keeper Timer (unchanged)
cat > "$KEEPER_TIMER" << 'EOF'
[Unit]
Description=Run DeFiNodeNexus keeper every 10 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=10min
Persistent=true
Unit=definode-keeper.service

[Install]
WantedBy=timers.target
EOF

# Health Check Service (with dynamic path)
cat > "$HEALTH_SERVICE" << EOF
[Unit]
Description=DeFiNodeNexus Daily Health Check
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=$PROJECT_ROOT
EnvironmentFile=$ENV_FILE
ExecStart=/usr/bin/env node scripts/daily-health-check.js
TimeoutStartSec=300
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Health Check Timer (unchanged)
cat > "$HEALTH_TIMER" << 'EOF'
[Unit]
Description=Run DeFiNodeNexus daily health check

[Timer]
OnCalendar=*-*-* 08:00:00
Persistent=true
Unit=definode-health.service

[Install]
WantedBy=timers.target
EOF

# Web Service (optional, with dynamic path)
cat > "$WEB_SERVICE" << EOF
[Unit]
Description=DeFiNodeNexus Web Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=\$USER
WorkingDirectory=$PROJECT_ROOT
EnvironmentFile=$ENV_FILE
ExecStart=$PROJECT_ROOT/.next/standalone/node_modules/.bin/next start -p 9002
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

echo "✓ Systemd units prepared"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# 2. 安装到系统
# ─────────────────────────────────────────────────────────────────────────────

echo "[2/4] Installing systemd units..."

if [[ $EUID -ne 0 ]]; then
  echo "⚠️  Note: Running as non-root. Timers will NOT persist system reboot."
  echo "   For production, run with: sudo bash deploy/linux/start-timers.sh"
  echo ""
  SYSTEMD_DIR="$HOME/.config/systemd/user"
  mkdir -p "$SYSTEMD_DIR"
  cp "$KEEPER_SERVICE" "$KEEPER_TIMER" "$HEALTH_SERVICE" "$HEALTH_TIMER" "$SYSTEMD_DIR/"
  systemctl --user daemon-reload
  systemctl --user enable definode-keeper.timer
  systemctl --user enable definode-health.timer
  systemctl --user start definode-keeper.timer
  systemctl --user start definode-health.timer
  echo "✓ User-level timers installed"
  echo ""
  SYSTEMCTL_PREFIX="systemctl --user"
else
  sudo cp "$KEEPER_SERVICE" "$KEEPER_TIMER" "$HEALTH_SERVICE" "$HEALTH_TIMER" "$WEB_SERVICE" /etc/systemd/system/
  sudo systemctl daemon-reload
  sudo systemctl enable definode-keeper.timer
  sudo systemctl enable definode-health.timer
  echo "✓ System-level timers installed"
  echo ""
  SYSTEMCTL_PREFIX="sudo systemctl"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 3. 启动定时器
# ─────────────────────────────────────────────────────────────────────────────

echo "[3/4] Starting timers..."

$SYSTEMCTL_PREFIX start definode-keeper.timer
$SYSTEMCTL_PREFIX start definode-health.timer

echo "✓ Timers started"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# 4. 输出状态
# ─────────────────────────────────────────────────────────────────────────────

echo "[4/4] Verifying setup..."
echo ""

$SYSTEMCTL_PREFIX status definode-keeper.timer --no-pager || true
echo ""
$SYSTEMCTL_PREFIX status definode-health.timer --no-pager || true
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# 完成
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Your timers are now running:"
echo "   • Keeper    : Every 10 minutes (chain maintenance + dividend distribution)"
echo "   • Health    : Daily at 08:00 (system monitoring)"
echo ""
echo "🔍 View logs:"
echo "   $SYSTEMCTL_PREFIX logs -u definode-keeper.service -f"
echo "   $SYSTEMCTL_PREFIX logs -u definode-health.service -f"
echo ""
echo "⚙️  Manage timers:"
echo "   $SYSTEMCTL_PREFIX list-timers definode-*"
echo "   $SYSTEMCTL_PREFIX stop definode-keeper.timer"
echo "   $SYSTEMCTL_PREFIX restart definode-keeper.timer"
echo ""
echo "📁 Project path: $PROJECT_ROOT"
echo "📄 Config file:  $ENV_FILE"
echo ""
