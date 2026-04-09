#!/usr/bin/env bash
# =============================================================================
# DeFiNodeNexus — Ubuntu Server Setup Script
# Tested on Ubuntu 22.04 / 24.04
#
# Usage:
#   sudo bash deploy/linux/setup.sh
#
# What it does:
#   1. Installs Node.js 20 LTS
#   2. Creates system user 'definode'
#   3. Clones / updates the repo to /opt/definode/DeFiNodeNexus
#   4. Builds the Next.js app (standalone output)
#   5. Installs systemd units for web, keeper, and health-check
#   6. Enables and starts all services
# =============================================================================
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/dappweb/DeFiNodeNexus.git}"
APP_DIR="/opt/definode/DeFiNodeNexus"
ENV_DIR="/etc/definode"
LOG_DIR="/var/log/definode"
SYSTEMD_DIR="/etc/systemd/system"
SERVICE_USER="definode"

echo "==> [1/6] Installing system packages..."
apt-get update -qq
apt-get install -y curl git

# Install Node.js 20 LTS via NodeSource if not present
if ! command -v node &>/dev/null || [[ "$(node -e 'process.exit(parseInt(process.version.slice(1)) < 20 ? 1 : 0)' ; echo $?)" == "1" ]]; then
  echo "     Installing Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "     node $(node -v), npm $(npm -v)"

echo "==> [2/6] Creating system user and directories..."
id "$SERVICE_USER" &>/dev/null || useradd -r -s /usr/sbin/nologin "$SERVICE_USER"
mkdir -p "$ENV_DIR" "$LOG_DIR" "$(dirname "$APP_DIR")"
chown "$SERVICE_USER:$SERVICE_USER" "$LOG_DIR"

echo "==> [3/6] Cloning / updating repository..."
if [[ -d "$APP_DIR/.git" ]]; then
  echo "     Existing repo found — pulling latest..."
  sudo -u "$SERVICE_USER" git -C "$APP_DIR" pull --ff-only
else
  sudo -u "$SERVICE_USER" git clone "$REPO_URL" "$APP_DIR"
fi

echo "==> [4/6] Installing npm dependencies and building..."
# Environment file must exist before build (NEXT_PUBLIC_* vars are baked in)
if [[ ! -f "$ENV_DIR/web.env" ]]; then
  echo "     WARNING: $ENV_DIR/web.env not found."
  echo "     Copy deploy/linux/.env.production.example → $ENV_DIR/web.env and fill in your values."
  echo "     Also create $ENV_DIR/keeper.env (can reuse same content with keeper-specific secrets)."
  echo "     Then re-run this script or run: cd $APP_DIR && sudo -u $SERVICE_USER npm run build"
  echo "     Skipping build step."
else
  # Load env vars so NEXT_PUBLIC_* are available during build
  set -a; source "$ENV_DIR/web.env"; set +a
  cd "$APP_DIR"
  sudo -u "$SERVICE_USER" npm ci --prefer-offline --no-audit
  sudo -u "$SERVICE_USER" npm run build
  # Copy static assets into standalone bundle
  cp -r "$APP_DIR/.next/static"  "$APP_DIR/.next/standalone/.next/static"
  cp -r "$APP_DIR/public"        "$APP_DIR/.next/standalone/public" 2>/dev/null || true
  chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_DIR/.next/standalone"
  echo "     Build complete."
fi

echo "==> [5/6] Installing systemd units..."
for unit in definode-web.service definode-keeper.service definode-keeper.timer definode-health.service definode-health.timer; do
  cp "$APP_DIR/deploy/linux/$unit" "$SYSTEMD_DIR/$unit"
done
systemctl daemon-reload

# Enable and start web app
systemctl enable definode-web.service
systemctl restart definode-web.service

# Enable and start scheduled tasks
systemctl enable --now definode-keeper.timer
systemctl enable --now definode-health.timer

echo "==> [6/6] Done!"
echo ""
echo "  Web app : http://$(hostname -I | awk '{print $1}')"
echo "  Logs    : journalctl -u definode-web.service -f"
echo "  Status  : systemctl status definode-web definode-keeper.timer definode-health.timer"
echo ""
echo "  NEXT STEPS:"
echo "  1. Check env: cat $ENV_DIR/web.env"
echo "  2. Check keeper env: cat $ENV_DIR/keeper.env"
echo "  3. Verify timers: systemctl list-timers --all | grep definode"
