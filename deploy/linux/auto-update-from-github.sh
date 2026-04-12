#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/DeFiNodeNexus}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
APP_DOMAIN_VALUE="${APP_DOMAIN:-}"

cd "$APP_DIR"

echo "[auto-deploy] target branch: $DEPLOY_BRANCH"
git fetch --all --prune
git checkout "$DEPLOY_BRANCH"
git pull --ff-only origin "$DEPLOY_BRANCH"

if [[ -n "$APP_DOMAIN_VALUE" ]]; then
  APP_DOMAIN="$APP_DOMAIN_VALUE" bash deploy.sh --skip-pull
else
  bash deploy.sh --skip-pull
fi

echo "[auto-deploy] done"
