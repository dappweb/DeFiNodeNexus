#!/usr/bin/env bash
# =============================================================================
# DeFiNodeNexus — Ubuntu Server Setup Script
# Tested on Ubuntu 22.04 / 24.04
#
# Usage:
#   sudo bash deploy/linux/setup.sh
#
# What it does:
#   1. Installs Node.js 20 LTS + nginx
#   2. Creates system user 'definode'
#   3. Clones / updates the repo to /opt/definode/DeFiNodeNexus
#   4. Builds the Next.js app (standalone output)
#   5. Installs systemd units for web, keeper, and health-check
#   6. Copies nginx config (edit domain name before running!)
#   7. Enables and starts all services
# =============================================================================
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/dappweb/DeFiNodeNexus.git}"
APP_DIR="/opt/definode/DeFiNodeNexus"
ENV_DIR="/etc/definode"
LOG_DIR="/var/log/definode"
SYSTEMD_DIR="/etc/systemd/system"
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
SERVICE_USER="definode"

echo "==> [1/7] Installing system packages..."
apt-get update -qq
apt-get install -y curl git nginx

# Install Node.js 20 LTS via NodeSource if not present
if ! command -v node &>/dev/null || [[ "$(node -e 'process.exit(parseInt(process.version.slice(1)) < 20 ? 1 : 0)' ; echo $?)" == "1" ]]; then
  echo "     Installing Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "     node $(node -v), npm $(npm -v)"

echo "==> [2/7] Creating system user and directories..."
id "$SERVICE_USER" &>/dev/null || useradd -r -s /usr/sbin/nologin "$SERVICE_USER"
mkdir -p "$ENV_DIR" "$LOG_DIR" "$(dirname "$APP_DIR")"
chown "$SERVICE_USER:$SERVICE_USER" "$LOG_DIR"

echo "==> [3/7] Cloning / updating repository..."
if [[ -d "$APP_DIR/.git" ]]; then
  echo "     Existing repo found — pulling latest..."
  sudo -u "$SERVICE_USER" git -C "$APP_DIR" pull --ff-only
else
  sudo -u "$SERVICE_USER" git clone "$REPO_URL" "$APP_DIR"
fi

echo "==> [4/7] Installing npm dependencies and building..."
# Environment file must exist before build (NEXT_PUBLIC_* vars are baked in)
if [[ ! -f "$ENV_DIR/web.env" ]]; then
  echo "     WARNING: $ENV_DIR/web.env not found."
  echo "     Copy deploy/linux/.env.production.example → $ENV_DIR/web.env and fill in your values."
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

echo "==> [5/7] Installing systemd units..."
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

echo "==> [6/7] Configuring nginx..."
cp "$APP_DIR/deploy/linux/nginx-definode.conf" "$NGINX_AVAILABLE/definode"
if [[ ! -L "$NGINX_ENABLED/definode" ]]; then
  ln -s "$NGINX_AVAILABLE/definode" "$NGINX_ENABLED/definode"
fi
# Remove default site if it conflicts on port 80
[[ -L "$NGINX_ENABLED/default" ]] && rm -f "$NGINX_ENABLED/default" || true
nginx -t && systemctl reload nginx

echo "==> [7/7] Done!"
echo ""
echo "  Web app : http://$(hostname -I | awk '{print $1}')"
echo "  Logs    : journalctl -u definode-web.service -f"
echo "  Status  : systemctl status definode-web definode-keeper.timer definode-health.timer"
echo ""
echo "  NEXT STEPS:"
echo "  1. Edit $NGINX_AVAILABLE/definode  →  set 'server_name your-domain.com'"
echo "  2. sudo certbot --nginx -d your-domain.com   (HTTPS)"
echo "  3. Check env: cat $ENV_DIR/web.env"
