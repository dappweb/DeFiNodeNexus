#!/bin/bash

# DeFiNodeNexus Caddy 部署脚本
# 自动化部署到 Caddy 服务器

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}DeFiNodeNexus Caddy 部署脚本${NC}"
echo -e "${GREEN}========================================${NC}\n"

# 配置变量
APP_NAME="DeFiNodeNexus"
APP_DIR="/opt/DeFiNodeNexus"
SERVICE_NAME="nexus-nextjs"
PORT=3001
DOMAIN="t1.test2dapp.xyz"

# 步骤 1: 检查权限
echo -e "${YELLOW}步骤 1: 检查权限...${NC}"
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}此脚本必须以 root 身份运行${NC}"
   exit 1
fi
echo -e "${GREEN}✓ 权限检查通过${NC}\n"

# 步骤 2: 检查依赖
echo -e "${YELLOW}步骤 2: 检查依赖...${NC}"
command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js 未安装${NC}"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}npm 未安装${NC}"; exit 1; }
echo -e "${GREEN}✓ 依赖检查通过${NC}\n"

# 步骤 3: 构建项目
echo -e "${YELLOW}步骤 3: 安装依赖并构建项目...${NC}"
cd /home/ubuntu/DeFiNodeNexus
npm install
npm run build
echo -e "${GREEN}✓ 项目构建完成${NC}\n"

# 步骤 4: 创建生产目录
echo -e "${YELLOW}步骤 4: 创建生产部署目录...${NC}"
mkdir -p $APP_DIR
rm -rf $APP_DIR/.next
cp -r .next public package.json package-lock.json /opt/DeFiNodeNexus/ 2>/dev/null || true
cp -r .next public package.json /opt/DeFiNodeNexus/
cd $APP_DIR
npm install --omit=dev --legacy-peer-deps
echo -e "${GREEN}✓ 部署文件已复制${NC}\n"

# 步骤 5: 创建 systemd 服务
echo -e "${YELLOW}步骤 5: 创建 systemd 服务...${NC}"
tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null <<EOF
[Unit]
Description=DeFiNodeNexus Next.js Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$APP_DIR
Environment="NODE_ENV=production"
Environment="PORT=$PORT"
ExecStart=/usr/bin/node $APP_DIR/.next/standalone/server.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/${SERVICE_NAME}.log
StandardError=append:/var/log/${SERVICE_NAME}.log

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ${SERVICE_NAME}.service
systemctl restart ${SERVICE_NAME}.service
echo -e "${GREEN}✓ systemd 服务已配置${NC}\n"

# 步骤 6: 检查或安装 Caddy
echo -e "${YELLOW}步骤 6: 检查/安装 Caddy...${NC}"
if ! command -v caddy >/dev/null 2>&1; then
    echo -e "${YELLOW}Caddy 未安装，正在安装...${NC}"
    apt-get update
    apt-get install -y caddy
else
    echo -e "${GREEN}✓ Caddy 已安装${NC}"
fi

# 步骤 7: 配置 Caddyfile
echo -e "${YELLOW}步骤 7: 配置 Caddyfile...${NC}"
mkdir -p /etc/caddy

# 检查是否有 Caddyfile，如果没有创建一个基础配置
if [ ! -f "/etc/caddy/Caddyfile" ]; then
    tee /etc/caddy/Caddyfile > /dev/null <<EOF
$DOMAIN {
    reverse_proxy localhost:$PORT {
        header_up X-Forwarded-For {http.request.remote}
        header_up X-Forwarded-Proto {http.request.scheme}
    }
    
    # 启用 gzip 压缩
    encode gzip
    
    # 设置缓存头
    header /assets/* Cache-Control "public, max-age=31536000, immutable"
    header /_next/* Cache-Control "public, max-age=31536000, immutable"
}
EOF
    echo -e "${GREEN}✓ Caddyfile 已创建${NC}"
else
    echo -e "${GREEN}✓ Caddyfile 已存在${NC}"
fi

# 步骤 8: 启动 Caddy
echo -e "${YELLOW}步骤 8: 启动 Caddy...${NC}"
systemctl enable caddy.service
systemctl restart caddy.service
echo -e "${GREEN}✓ Caddy 已启动${NC}\n"

# 步骤 9: 验证部署
echo -e "${YELLOW}步骤 9: 验证部署...${NC}"
sleep 3

if systemctl is-active --quiet ${SERVICE_NAME}.service; then
    echo -e "${GREEN}✓ Next.js 服务运行正常${NC}"
else
    echo -e "${RED}✗ Next.js 服务未运行${NC}"
    systemctl status ${SERVICE_NAME}.service
    exit 1
fi

if systemctl is-active --quiet caddy.service; then
    echo -e "${GREEN}✓ Caddy 服务运行正常${NC}"
else
    echo -e "${RED}✗ Caddy 服务未运行${NC}"
    systemctl status caddy.service
    exit 1
fi

# 完成
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "应用名称: $APP_NAME"
echo -e "部署目录: $APP_DIR"
echo -e "Next.js 端口: $PORT"
echo -e "域名: https://$DOMAIN"
echo -e "\n常用命令:"
echo -e "  查看日志: tail -f /var/log/${SERVICE_NAME}.log"
echo -e "  重启服务: sudo systemctl restart ${SERVICE_NAME}"
echo -e "  重启 Caddy: sudo systemctl restart caddy"
echo -e "  查看状态: sudo systemctl status ${SERVICE_NAME}"
echo -e "${GREEN}========================================${NC}\n"
