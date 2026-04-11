#!/usr/bin/env bash
# =============================================================================
# DeFiNodeNexus — 一键部署 / 更新脚本
# 适用环境: Ubuntu 24.04 · Node.js 20 · PM2 · Caddy / OpenResty / Nginx
# 应用目录: /home/ubuntu/DeFiNodeNexus
# 应用端口: 9002  (Caddy/OpenResty/Nginx 反代 80/443 → 9002)
#
# 用法:
#   bash deploy.sh              # 拉取最新代码 + 构建 + 重载
#   bash deploy.sh --skip-pull  # 仅构建 + 重载（不拉取 git）
#   bash deploy.sh --startup    # 额外配置 PM2 开机自启
#   bash deploy.sh --help       # 显示帮助
# =============================================================================
set -euo pipefail

# ── 配置 ──────────────────────────────────────────────────────────────────────
APP_DIR="/home/ubuntu/DeFiNodeNexus"
APP_NAME="definodenexus"
APP_PORT="9002"
PROXY_CADDY_TEMPLATE="$APP_DIR/deploy/linux/Caddyfile"
CADDY_CONF_DST="/etc/caddy/Caddyfile"
OPENRESTY_CONF_DST="/etc/openresty/conf.d/definodexus.conf"
OPENRESTY_1PANEL_CONF_DST="/opt/1panel/docker/compose/openresty/conf.d/definodexus.conf"
NGINX_CONF_DST="/etc/nginx/sites-available/definodexus"
NGINX_LINK="/etc/nginx/sites-enabled/definodexus"
APP_DOMAIN="${APP_DOMAIN:-localhost}"

# ── 参数解析 ──────────────────────────────────────────────────────────────────
SKIP_PULL=false
SETUP_STARTUP=false

for arg in "$@"; do
  case "$arg" in
    --skip-pull)   SKIP_PULL=true ;;
    --startup)     SETUP_STARTUP=true ;;
    --help|-h)
      echo "用法: bash deploy.sh [--skip-pull] [--startup] [--help]"
      echo "  --skip-pull   跳过 git pull，仅重新构建"
      echo "  --startup     配置 PM2 开机自启（需 sudo）"
      exit 0
      ;;
  esac
done

# ── 彩色输出 ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
step()  { echo -e "\n${GREEN}==>${NC} $*"; }
warn()  { echo -e "${YELLOW}  ! $*${NC}"; }
error() { echo -e "${RED}  ✗ $*${NC}"; exit 1; }

# ── 前置检查 ──────────────────────────────────────────────────────────────────
step "[0/6] 前置检查"
[[ -d "$APP_DIR" ]]       || error "应用目录不存在: $APP_DIR"
command -v node &>/dev/null || error "Node.js 未安装"
command -v npm  &>/dev/null || error "npm 未安装"
command -v pm2  &>/dev/null || error "PM2 未安装 (npm install -g pm2)"
echo "  node $(node -v), npm $(npm -v), pm2 $(pm2 -v)"

cd "$APP_DIR"

# 检查环境变量文件
if [[ ! -f "$APP_DIR/.env" ]] && [[ ! -f "$APP_DIR/.env.local" ]]; then
  warn ".env 和 .env.local 均不存在，构建可能跳过合约地址校验"
fi

# ── 拉取最新代码 ──────────────────────────────────────────────────────────────
if [[ "$SKIP_PULL" == false ]]; then
  step "[1/6] 拉取最新代码"
  if [[ -d "$APP_DIR/.git" ]]; then
    CURRENT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    git pull --ff-only
    NEW_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    if [[ "$CURRENT_COMMIT" == "$NEW_COMMIT" ]]; then
      warn "代码无变化 ($CURRENT_COMMIT)，仍继续构建以确保配置最新"
    else
      echo "  $CURRENT_COMMIT → $NEW_COMMIT"
    fi
  else
    warn "非 git 仓库目录，跳过 pull"
  fi
else
  step "[1/6] 跳过 git pull (--skip-pull)"
fi

# ── 安装依赖 ──────────────────────────────────────────────────────────────────
step "[2/6] 安装 npm 依赖"
# 优先使用 npm ci（更快、更可靠），package-lock.json 存在才能用
if [[ -f "package-lock.json" ]]; then
  npm ci --prefer-offline --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi

# ── 构建 ──────────────────────────────────────────────────────────────────────
step "[3/6] 构建 Next.js (output: standalone)"
BUILD_START=$(date +%s)
npm run build
BUILD_END=$(date +%s)
echo "  构建耗时: $((BUILD_END - BUILD_START))s"

# postbuild 已自动复制 static/ 和 public/，此处做二次保障
if [[ ! -d ".next/standalone/.next/static" ]]; then
  warn "postbuild 未复制静态文件，手动补充..."
  cp -r .next/static .next/standalone/.next/static
fi
if [[ ! -d ".next/standalone/public" ]] && [[ -d "public" ]]; then
  cp -r public .next/standalone/public
fi

# ── PM2 重载 ──────────────────────────────────────────────────────────────────
step "[4/6] 重载应用进程 (PM2 零停机重载)"
if pm2 list | grep -q "$APP_NAME"; then
  # 已有进程：用 ecosystem 文件 reload（热重载，中断时间 <1s）
  pm2 reload ecosystem.config.js --update-env
else
  # 首次启动
  warn "PM2 中未找到进程 '$APP_NAME'，首次启动..."
  pm2 start ecosystem.config.js
fi

# 持久化 PM2 进程列表（用于自启）
pm2 save

# ── Nginx 更新 ────────────────────────────────────────────────────────────────
step "[5/6] 检查反向代理配置 (Caddy 优先)"
# 保证目录有反向代理可读权限
sudo chmod o+x /home/ubuntu 2>/dev/null || true

# 同步 Caddy 模板。如果 Caddyfile 已含多站点配置（非模板生成），跳过覆盖避免破坏。
if command -v caddy &>/dev/null && [[ -f "$PROXY_CADDY_TEMPLATE" ]] && [[ -d "/etc/caddy" ]]; then
  if grep -q "__APP_DOMAIN__\|__UPSTREAM__" "$CADDY_CONF_DST" 2>/dev/null || [[ ! -f "$CADDY_CONF_DST" ]]; then
    TMP_CADDY="$(mktemp)"
    sed \
      -e "s|__APP_DOMAIN__|$APP_DOMAIN|g" \
      -e "s|__UPSTREAM__|127.0.0.1:$APP_PORT|g" \
      "$PROXY_CADDY_TEMPLATE" > "$TMP_CADDY"

    sudo install -m 644 "$TMP_CADDY" "$CADDY_CONF_DST"
    rm -f "$TMP_CADDY"

    sudo caddy validate --config "$CADDY_CONF_DST"
    if systemctl is-active --quiet caddy; then
      sudo systemctl reload caddy
    else
      sudo systemctl enable --now caddy
    fi
    echo "  Caddy 配置已同步并重载: $CADDY_CONF_DST"
  else
    warn "检测到自定义多站点 Caddyfile，跳过模板覆盖（如需更新请手动编辑 $CADDY_CONF_DST）"
    if systemctl is-active --quiet caddy; then
      echo "  Caddy 当前运行中，无需重载"
    fi
  fi
elif [[ -d "/opt/1panel/docker/compose/openresty/conf.d" ]]; then
  if [[ -f "$APP_DIR/deploy/linux/nginx-definode.conf" ]]; then
    sudo install -m 644 "$APP_DIR/deploy/linux/nginx-definode.conf" "$OPENRESTY_1PANEL_CONF_DST"
    echo "  已同步 1Panel OpenResty 配置: $OPENRESTY_1PANEL_CONF_DST"
  else
    warn "未找到 nginx-definode.conf，跳过 OpenResty 配置同步"
  fi
elif [[ -d "/etc/openresty/conf.d" ]]; then
  if [[ -f "$APP_DIR/deploy/linux/nginx-definode.conf" ]]; then
    sudo install -m 644 "$APP_DIR/deploy/linux/nginx-definode.conf" "$OPENRESTY_CONF_DST"
    echo "  已同步 OpenResty 配置: $OPENRESTY_CONF_DST"
  else
    warn "未找到 nginx-definode.conf，跳过 OpenResty 配置同步"
  fi
elif [[ -d "/etc/nginx" ]]; then
  if [[ -f "$APP_DIR/deploy/linux/nginx-definode.conf" ]]; then
    sudo install -m 644 "$APP_DIR/deploy/linux/nginx-definode.conf" "$NGINX_CONF_DST"
    [[ ! -L "$NGINX_LINK" ]] && sudo ln -s "$NGINX_CONF_DST" "$NGINX_LINK"
    [[ -L "/etc/nginx/sites-enabled/default" ]] && sudo rm -f "/etc/nginx/sites-enabled/default" || true
    sudo nginx -t
    if systemctl is-active --quiet nginx; then
      sudo systemctl reload nginx
      echo "  Nginx 已重载"
    fi
  else
    warn "未找到 nginx-definode.conf，跳过 Nginx 配置同步"
  fi
else
  warn "未检测到 Caddy/OpenResty/Nginx，可执行 deploy/linux/setup-caddy.sh 安装 Caddy"
fi

# ── 健康检查 ──────────────────────────────────────────────────────────────────
step "[6/6] 健康检查"
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$APP_PORT/" || echo "000")
PROXY_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/" || echo "000")

echo "  应用直连 (:$APP_PORT): HTTP $HTTP_CODE"
echo "  反向代理 (:80):       HTTP $PROXY_CODE"

if [[ "$HTTP_CODE" != "200" ]] && [[ "$HTTP_CODE" != "308" ]] && [[ "$HTTP_CODE" != "301" ]]; then
  warn "应用响应异常 ($HTTP_CODE)，请检查日志: pm2 logs $APP_NAME --lines 50"
else
  echo -e "\n${GREEN}  ✓ 部署成功！${NC}"
fi

# ── PM2 开机自启（可选）─────────────────────────────────────────────────────
if [[ "$SETUP_STARTUP" == true ]]; then
  step "[可选] 配置 PM2 开机自启"
  sudo env PATH="$PATH:/usr/bin" \
    "$(command -v pm2)" startup systemd -u ubuntu --hp /home/ubuntu
  pm2 save
  echo "  PM2 开机自启已配置"
fi

# ── 完成 ──────────────────────────────────────────────────────────────────────
echo ""
echo "============================================================"
echo -e "  ${GREEN}部署完成${NC}"
echo "  访问地址 : http://${APP_DOMAIN}"
echo "  应用日志 : pm2 logs $APP_NAME"
echo "  进程状态 : pm2 list"
echo "  代理日志 : sudo journalctl -u caddy -f"
echo "============================================================"
