#!/usr/bin/env bash
set -euo pipefail

# One-click SOP release script (NO NGINX CONFIG CHANGES)
# Usage:
#   bash scripts/sop-oneclick-release-no-nginx.sh \
#     --package /tmp/DeFiNodeNexus-deploy-package-no-nginx-YYYYMMDD-HHMMSS.tar.gz \
#     --app-dir /home/ubuntu/DeFiNodeNexus

PACKAGE=""
APP_DIR="/home/ubuntu/DeFiNodeNexus"
SYSTEMD_DIR="/etc/systemd/system"
ENV_DIR="/etc/definode"
ENABLE_TIMERS="true"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --package)
      PACKAGE="$2"
      shift 2
      ;;
    --app-dir)
      APP_DIR="$2"
      shift 2
      ;;
    --disable-timers)
      ENABLE_TIMERS="false"
      shift 1
      ;;
    --help|-h)
      cat <<'EOF'
Usage:
  bash scripts/sop-oneclick-release-no-nginx.sh --package <path-to-no-nginx-tar.gz> [--app-dir <app-dir>] [--disable-timers]

Options:
  --package         Required. Deployment package path (no-nginx tar.gz).
  --app-dir         App root path. Default: /home/ubuntu/DeFiNodeNexus
  --disable-timers  Do not enable timers automatically.
EOF
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

if [[ -z "$PACKAGE" ]]; then
  echo "ERROR: --package is required"
  exit 1
fi

if [[ ! -f "$PACKAGE" ]]; then
  echo "ERROR: package not found: $PACKAGE"
  exit 1
fi

if [[ ! -d "$APP_DIR" ]]; then
  echo "ERROR: app dir not found: $APP_DIR"
  exit 1
fi

command -v node >/dev/null 2>&1 || { echo "ERROR: node not found"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "ERROR: npm not found"; exit 1; }
command -v pm2 >/dev/null 2>&1 || { echo "ERROR: pm2 not found"; exit 1; }
command -v systemctl >/dev/null 2>&1 || { echo "ERROR: systemctl not found"; exit 1; }
command -v tar >/dev/null 2>&1 || { echo "ERROR: tar not found"; exit 1; }

TS="$(date +%Y%m%d-%H%M%S)"
TMP_DIR="/tmp/definode-release-${TS}"

echo "==> [1/9] Extract package"
mkdir -p "$TMP_DIR"
tar -xzf "$PACKAGE" -C "$TMP_DIR"

echo "==> [2/9] Verify package does not include nginx config"
if tar -tzf "$PACKAGE" | grep -q "nginx-definode.conf"; then
  echo "ERROR: package unexpectedly contains nginx-definode.conf"
  exit 1
fi

echo "==> [3/9] Backup app scripts/config"
mkdir -p "$APP_DIR/release-backups/$TS"
cp -a "$APP_DIR/ecosystem.config.js" "$APP_DIR/release-backups/$TS/" 2>/dev/null || true
cp -a "$APP_DIR/deploy.sh" "$APP_DIR/release-backups/$TS/" 2>/dev/null || true
cp -a "$APP_DIR/env_conf.js" "$APP_DIR/release-backups/$TS/" 2>/dev/null || true

echo "==> [4/9] Sync package files into app dir"
install -m 644 "$TMP_DIR/scripts/ecosystem.config.js" "$APP_DIR/ecosystem.config.js"
install -m 755 "$TMP_DIR/scripts/deploy.sh" "$APP_DIR/deploy.sh"
install -m 644 "$TMP_DIR/config/env_conf.js" "$APP_DIR/env_conf.js"

echo "==> [5/9] Install/refresh systemd unit files (no nginx)"
sudo install -m 644 "$TMP_DIR/linux/definode-web.service" "$SYSTEMD_DIR/definode-web.service"
sudo install -m 644 "$TMP_DIR/linux/definode-keeper.service" "$SYSTEMD_DIR/definode-keeper.service"
sudo install -m 644 "$TMP_DIR/linux/definode-keeper.timer" "$SYSTEMD_DIR/definode-keeper.timer"
sudo install -m 644 "$TMP_DIR/linux/definode-health.service" "$SYSTEMD_DIR/definode-health.service"
sudo install -m 644 "$TMP_DIR/linux/definode-health.timer" "$SYSTEMD_DIR/definode-health.timer"
sudo systemctl daemon-reload

echo "==> [6/9] Validate env files"
[[ -f "$ENV_DIR/web.env" ]] || { echo "ERROR: missing $ENV_DIR/web.env"; exit 1; }
[[ -f "$ENV_DIR/keeper.env" ]] || { echo "ERROR: missing $ENV_DIR/keeper.env"; exit 1; }

echo "==> [7/9] Build app"
cd "$APP_DIR"
if [[ -f package-lock.json ]]; then
  npm ci --prefer-offline --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi
npm run build

echo "==> [8/9] Reload PM2 app"
if pm2 list | grep -q "definodenexus"; then
  pm2 reload ecosystem.config.js --update-env
else
  pm2 start ecosystem.config.js
fi
pm2 save

echo "==> [9/9] Run one-shot checks and enable timers"
sudo systemctl start definode-keeper.service
sudo systemctl start definode-health.service

if [[ "$ENABLE_TIMERS" == "true" ]]; then
  sudo systemctl enable --now definode-keeper.timer
  sudo systemctl enable --now definode-health.timer
fi

echo
echo "Release completed."
echo "Package: $PACKAGE"
echo "App dir: $APP_DIR"
echo "Timers enabled: $ENABLE_TIMERS"
echo
echo "Quick checks:"
echo "  pm2 list"
echo "  systemctl list-timers --all | grep definode"
echo "  journalctl -u definode-keeper.service -n 100 --no-pager"
echo "  journalctl -u definode-health.service -n 100 --no-pager"
