# DeFiNodeNexus CNC 生产交付部署手册（一步一步可粘贴）

本手册覆盖 4 个交付模块：

1. 环境准备
2. 合约部署（CNC）
3. 页面部署（Next.js 生产）
4. 定时任务部署（Keeper + Health）

适用系统：Ubuntu 22.04/24.04

---

## 0. 变量约定（先复制）

```bash
export PROJECT_DIR=/opt/definode/DeFiNodeNexus
export PROJECT_USER=$USER
```

如果你用 root 直接部署，可把 PROJECT_USER 改成具体用户，例如 deploy。

---

## 1. 环境准备（服务器第一次部署）

### 1.1 安装基础依赖

```bash
sudo apt update
sudo apt install -y git curl build-essential
```

### 1.2 安装 Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

### 1.3 拉取项目

```bash
sudo mkdir -p /opt/definode
sudo chown -R "$PROJECT_USER":"$PROJECT_USER" /opt/definode
cd /opt/definode
cd "$PROJECT_DIR"
```

### 1.4 安装依赖

```bash
cd "$PROJECT_DIR"
npm ci
```

---

## 2. 环境文件配置（一次配置，多处复用）

### 2.1 生成 .env（合约部署 + 后端脚本使用）

把下面模板整块粘贴执行，然后替换占位值。

```bash
cd "$PROJECT_DIR"
cat > .env << 'EOF'
# ===== CNC Network =====
CNC_RPC_URL=https://rpc.cncchainpro.com
CNC_CHAIN_ID=50716

# 兼容 keeper/health 旧键名（当前脚本仍读取）
CNC_RPC_URL=https://rpc.cncchainpro.com

# ===== Keys =====
DEPLOYER_PRIVATE_KEY=0xREPLACE_DEPLOYER_PRIVATE_KEY
OWNER_PRIVATE_KEY=0xREPLACE_OWNER_PRIVATE_KEY_OR_SAME_AS_DEPLOYER

# ===== CNC Tokens =====
TOT_TOKEN_ADDRESS=0x0C720a3d1AB25b19c132Ba02C74A5D145d7CcDdA
TOF_TOKEN_ADDRESS=0x7300f4fd7C8d1baBC8220BFf04788E1B7A50e13D
USDT_TOKEN_ADDRESS=0xf54cC0F6CE272125c39C45A8141b84989A8765f4

# ===== Runtime contract aliases (deploy后更新) =====
NEXUS_ADDRESS=0xREPLACE_NEXUS_ADDRESS
SWAP_ADDRESS=0xREPLACE_SWAP_ADDRESS

# ===== Frontend public =====
NEXT_PUBLIC_CNC_RPC_URL=https://rpc.cncchainpro.com
NEXT_PUBLIC_CNC_EXPLORER_URL=https://cncchainpro.com
NEXT_PUBLIC_NEXUS_ADDRESS=0xREPLACE_NEXUS_ADDRESS
NEXT_PUBLIC_SWAP_ADDRESS=0xREPLACE_SWAP_ADDRESS
NEXT_PUBLIC_TOT_ADDRESS=0x0C720a3d1AB25b19c132Ba02C74A5D145d7CcDdA
NEXT_PUBLIC_TOF_ADDRESS=0x7300f4fd7C8d1baBC8220BFf04788E1B7A50e13D
NEXT_PUBLIC_USDT_ADDRESS=0xf54cC0F6CE272125c39C45A8141b84989A8765f4
NEXT_PUBLIC_CONTRACT_OWNER=0xREPLACE_OWNER_ADDRESS
NEXT_PUBLIC_APP_URL=https://your-domain.com

# ===== Optional wallets =====
ZERO_LINE_WALLET=0xREPLACE_ZERO_LINE_WALLET
COMMUNITY_WALLET=0xREPLACE_COMMUNITY_WALLET
FOUNDATION_WALLET=0xREPLACE_FOUNDATION_WALLET
INSTITUTION_WALLET=0xREPLACE_INSTITUTION_WALLET
EOF
```

### 2.2 生成 .env.local（页面运行时读取）

```bash
cd "$PROJECT_DIR"
cp .env .env.local
```

### 2.3 生成 deploy/linux/.env.production（systemd 与定时任务读取）

```bash
cd "$PROJECT_DIR"
cp .env deploy/linux/.env.production
cat >> deploy/linux/.env.production << 'EOF'

# web server runtime
PORT=9002
HOSTNAME=0.0.0.0

# keeper runtime files
KEEPER_LOCK_FILE=/var/lock/definode-keeper.lock
KEEPER_STATUS_FILE=/opt/definode/DeFiNodeNexus/runtime/keeper/latest-run.json
HEALTH_REPORT_FILE=/opt/definode/DeFiNodeNexus/runtime/health/latest-health-check.json

# health thresholds
MIN_TOT_RESERVE=10000
MIN_USDT_RESERVE=1000
MAX_DEFLATION_DELAY_HOURS=6
EOF
```

### 2.4 权限收紧

```bash
cd "$PROJECT_DIR"
chmod 600 .env .env.local deploy/linux/.env.production
```

---

## 3. 合约部署（CNC 主网）

如果合约已部署，可跳到第 4 节。

### 3.1 配置校验

```bash
cd "$PROJECT_DIR"
node scripts/verify-cnc-config.js
```

### 3.2 执行部署

```bash
cd "$PROJECT_DIR"
npm run deploy:cnc | tee deploy-cnc.log
```

部署完成后，终端会输出：

- NEXUS_ADDRESS=0x...
- SWAP_ADDRESS=0x...

### 3.3 回填最新地址到 3 个环境文件

把下面两行替换成你的新地址，然后整段执行。

```bash
cd "$PROJECT_DIR"
export NEW_NEXUS=0xREPLACE_DEPLOYED_NEXUS
export NEW_SWAP=0xREPLACE_DEPLOYED_SWAP

for f in .env .env.local deploy/linux/.env.production; do
  sed -i "s|^NEXUS_ADDRESS=.*|NEXUS_ADDRESS=${NEW_NEXUS}|" "$f" || true
  sed -i "s|^SWAP_ADDRESS=.*|SWAP_ADDRESS=${NEW_SWAP}|" "$f" || true

  sed -i "s|^NEXT_PUBLIC_NEXUS_ADDRESS=.*|NEXT_PUBLIC_NEXUS_ADDRESS=${NEW_NEXUS}|" "$f" || true
  sed -i "s|^NEXT_PUBLIC_SWAP_ADDRESS=.*|NEXT_PUBLIC_SWAP_ADDRESS=${NEW_SWAP}|" "$f" || true
done
```

### 3.4 地址绑定一致性检查

```bash
cd "$PROJECT_DIR"
npm run check:env:bindings
```

---

## 4. 页面部署（Next.js 生产服务）

### 4.1 生产构建

```bash
cd "$PROJECT_DIR"
npm run build
```

### 4.2 创建 systemd 页面服务

```bash
sudo tee /etc/systemd/system/definode-web.service > /dev/null << EOF
[Unit]
Description=DeFiNodeNexus Web Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${PROJECT_USER}
WorkingDirectory=${PROJECT_DIR}
EnvironmentFile=${PROJECT_DIR}/deploy/linux/.env.production
ExecStart=/usr/bin/env node .next/standalone/server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
```

### 4.3 启动并设置开机自启

```bash
sudo systemctl daemon-reload
sudo systemctl enable definode-web.service
sudo systemctl restart definode-web.service
sudo systemctl status definode-web.service --no-pager
```

### 4.4 页面健康检查

```bash
curl -I --max-time 15 http://127.0.0.1:9002
```

预期：HTTP 200。

---

## 5. 定时任务部署（Keeper + Health）

项目已提供一键脚本：deploy/linux/start-timers.sh

### 5.1 启用定时任务

```bash
cd "$PROJECT_DIR"
sudo bash deploy/linux/start-timers.sh
```

### 5.2 验证定时器

```bash
sudo systemctl list-timers definode-*
sudo systemctl status definode-keeper.timer --no-pager
sudo systemctl status definode-health.timer --no-pager
```

### 5.3 手动触发一次 Keeper 与健康检查

```bash
sudo systemctl start definode-keeper.service
sudo systemctl start definode-health.service
```

### 5.4 查看日志

```bash
sudo journalctl -u definode-keeper.service -n 100 --no-pager
sudo journalctl -u definode-health.service -n 100 --no-pager
```

### 5.5 查看运行结果文件

```bash
cat /opt/definode/DeFiNodeNexus/runtime/keeper/latest-run.json
cat /opt/definode/DeFiNodeNexus/runtime/health/latest-health-check.json
```

---

## 6. 域名与反向代理（Caddy，可选）

如果你希望通过域名直接访问 9002，推荐使用 Caddy（自动申请和续期 HTTPS 证书）。

### 6.1 安装 Caddy

```bash
sudo apt update
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list > /dev/null
sudo apt update
sudo apt install -y caddy
```

### 6.2 配置 Caddyfile

```bash
sudo tee /etc/caddy/Caddyfile > /dev/null << 'EOF'
your-domain.com {
  reverse_proxy 127.0.0.1:9002
}
EOF
```

### 6.3 启用配置

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl enable caddy
sudo systemctl restart caddy
sudo systemctl status caddy --no-pager
```

### 6.4 HTTPS 说明

1. 确保域名 DNS 已指向当前服务器公网 IP。
2. 放行 80 和 443 端口。
3. Caddy 会自动申请并续期证书，无需额外 certbot 命令。

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

---

## 7. 交付验收清单（上线前逐条执行）

### 7.1 页面服务

```bash
sudo systemctl is-active definode-web.service
curl -I --max-time 15 http://127.0.0.1:9002
```

### 7.2 定时任务

```bash
sudo systemctl is-enabled definode-keeper.timer
sudo systemctl is-enabled definode-health.timer
sudo systemctl list-timers definode-*
```

### 7.3 环境一致性

```bash
cd "$PROJECT_DIR"
npm run check:env:bindings
```

### 7.4 合约配置

```bash
cd "$PROJECT_DIR"
node scripts/verify-cnc-config.js
```

### 7.5 浏览器访问

```bash
curl -I --max-time 15 https://your-domain.com/
```

---

## 8. 升级发布（后续版本）

每次发版按下面 7 行执行：

```bash
cd "$PROJECT_DIR"
git pull origin main
npm ci
npm run check:env:bindings
npm run build
sudo systemctl restart definode-web.service
sudo systemctl restart definode-keeper.timer
sudo systemctl restart definode-health.timer
```

---

## 9. 回滚（安全方式）

```bash
cd "$PROJECT_DIR"
git log --oneline -n 10
git checkout <COMMIT_ID>
npm ci
npm run build
sudo systemctl restart definode-web.service
```

说明：如需恢复到主分支最新版本，执行以下命令。

```bash
cd "$PROJECT_DIR"
git checkout main
git pull origin main
```

---

## 10. 常见问题快速排查

### 10.1 页面起不来

```bash
sudo systemctl status definode-web.service --no-pager
sudo journalctl -u definode-web.service -n 200 --no-pager
```

### 10.2 Keeper 不执行

```bash
sudo systemctl status definode-keeper.timer --no-pager
sudo journalctl -u definode-keeper.service -n 200 --no-pager
```

### 10.3 地址绑定报错

```bash
cd "$PROJECT_DIR"
npm run check:env:bindings
```

### 10.4 RPC 连通性

```bash
curl -sS https://rpc.cncchainpro.com | head
```

---

本手册对应当前仓库脚本：

- 合约部署: scripts/deploy-cnc.js
- 页面构建: npm run build
- 页面启动: node .next/standalone/server.js
- 定时任务一键部署: deploy/linux/start-timers.sh
