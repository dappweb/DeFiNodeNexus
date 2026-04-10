# 环境要求与部署方法（Service / Page / Timer）

本文整合当前仓库在 Linux 生产环境的部署要求与执行步骤，覆盖：

- 环境要求
- 页面服务部署（Next.js standalone）
- Caddy 反向代理
- 定时任务部署（keeper / health）
- 运维与排错

## 1. 环境要求

### 1.1 操作系统与基础组件

- Ubuntu 22.04 LTS 或 24.04 LTS
- systemd 可用（支持 service + timer）
- Git、curl
- Caddy（用于 HTTPS 与反向代理）

### 1.2 Node.js 与 npm

- Node.js 20 LTS（推荐 20.20.x）
- npm 10.x（与当前项目环境一致）

说明：项目使用 Next.js 15 + standalone 输出，生产以 Node 进程运行 .next/standalone/server.js。

### 1.3 最低资源建议

- CPU: >= 1 core（建议 >= 2 cores）
- RAM: >= 1 GB
- Disk: >= 1 GB 可用空间
- Network: 可访问 CNC RPC（https://rpc.cncchainpro.com）

## 2. 目录与文件约定

- 代码目录: /opt/definode/DeFiNodeNexus
- 环境文件目录: /etc/definode
- 系统服务目录: /etc/systemd/system

环境文件建议：

- /etc/definode/web.env（页面服务）
- /etc/definode/keeper.env（keeper 与 health timer）

模板来源：deploy/linux/.env.production.example

## 3. 必要环境变量

至少配置以下变量：

- PORT=9002
- HOSTNAME=0.0.0.0
- CNC_RPC_URL=https://rpc.cncchainpro.com
- CNC_RPC_URL=https://rpc.cncchainpro.com
- NEXT_PUBLIC_NEXUS_ADDRESS=0x...
- NEXT_PUBLIC_SWAP_ADDRESS=0x...
- NEXT_PUBLIC_TOT_ADDRESS=0x...
- NEXT_PUBLIC_TOF_ADDRESS=0x...
- NEXT_PUBLIC_USDT_ADDRESS=0x...
- NEXUS_ADDRESS=0x...
- SWAP_ADDRESS=0x...
- TOT_TOKEN_ADDRESS=0x...
- TOF_TOKEN_ADDRESS=0x...
- USDT_TOKEN_ADDRESS=0x...
- DEPLOYER_PRIVATE_KEY=0x...

定时任务相关建议：

- KEEPER_LOCK_FILE=/var/lock/definode-keeper.lock
- KEEPER_STATUS_FILE=/opt/definode/DeFiNodeNexus/runtime/keeper/latest-run.json
- HEALTH_REPORT_FILE=/opt/definode/DeFiNodeNexus/runtime/health/latest-health-check.json
- MIN_TOT_RESERVE=10000
- MIN_USDT_RESERVE=1000
- MAX_DEFLATION_DELAY_HOURS=6

## 4. 页面服务部署（Service + Page）

### 4.1 一键部署（推荐）

执行：

```bash
sudo bash deploy/linux/setup.sh
```

该脚本会：

1. 安装 Node.js 20 LTS
2. 创建系统用户 definode
3. 拉取代码到 /opt/definode/DeFiNodeNexus
4. 执行 npm ci + npm run build
5. 安装并启用 systemd service/timer

### 4.2 手动部署页面服务

#### 步骤 1：准备环境文件

```bash
sudo mkdir -p /etc/definode
sudo cp deploy/linux/.env.production.example /etc/definode/web.env
sudo cp deploy/linux/.env.production.example /etc/definode/keeper.env
sudo chown root:root /etc/definode/web.env /etc/definode/keeper.env
sudo chmod 600 /etc/definode/web.env /etc/definode/keeper.env
```

根据生产配置修改两个 env 文件的真实值。

#### 步骤 2：安装依赖并构建

```bash
cd /opt/definode/DeFiNodeNexus
set -a && source /etc/definode/web.env && set +a
npm ci --prefer-offline --no-audit
npm run build
```

#### 步骤 3：补齐 standalone 静态文件

```bash
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
```

#### 步骤 4：安装并启动页面服务

```bash
sudo cp deploy/linux/definode-web.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now definode-web.service
```

#### 步骤 5：验证页面服务

```bash
systemctl status definode-web.service --no-pager
journalctl -u definode-web.service -n 100 --no-pager
```

## 5. Caddy 反向代理部署

### 5.1 安装 Caddy

```bash
sudo apt-get update
sudo apt-get install -y caddy
```

### 5.2 Caddyfile 示例

将域名替换为你的生产域名：

```caddy
example.com {
    encode gzip zstd

    reverse_proxy 127.0.0.1:9002 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        header_up X-Forwarded-Host {host}
    }
}
```

### 5.3 启用 Caddy

```bash
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo systemctl restart caddy
sudo systemctl enable caddy
sudo systemctl status caddy --no-pager
```

## 6. 定时任务部署（Timer）

项目包含两个 timer：

- definode-keeper.timer: 开机后 2 分钟启动，此后每 10 分钟执行 definode-keeper.service
- definode-health.timer: 每天 08:00 执行 definode-health.service

### 6.1 安装 unit 文件

```bash
sudo cp deploy/linux/definode-keeper.service /etc/systemd/system/
sudo cp deploy/linux/definode-keeper.timer /etc/systemd/system/
sudo cp deploy/linux/definode-health.service /etc/systemd/system/
sudo cp deploy/linux/definode-health.timer /etc/systemd/system/
sudo systemctl daemon-reload
```

### 6.2 启用并启动 timer

```bash
sudo systemctl enable --now definode-keeper.timer
sudo systemctl enable --now definode-health.timer
```

### 6.3 验证 timer 计划与执行

```bash
systemctl list-timers --all | grep definode
systemctl status definode-keeper.timer --no-pager
systemctl status definode-health.timer --no-pager
```

手动触发一次：

```bash
sudo systemctl start definode-keeper.service
sudo systemctl start definode-health.service
```

查看日志：

```bash
journalctl -u definode-keeper.service -n 100 --no-pager
journalctl -u definode-health.service -n 100 --no-pager
```

## 7. 运维常用命令

### 7.1 服务状态

```bash
systemctl status definode-web.service --no-pager
systemctl status definode-keeper.timer --no-pager
systemctl status definode-health.timer --no-pager
```

### 7.2 重启与重新加载

```bash
sudo systemctl daemon-reload
sudo systemctl restart definode-web.service
sudo systemctl restart caddy
```

### 7.3 日志实时查看

```bash
journalctl -u definode-web.service -f
journalctl -u definode-keeper.service -f
journalctl -u definode-health.service -f
journalctl -u caddy -f
```

## 8. 变更发布建议流程

1. 更新代码并拉取到服务器
2. 校验 /etc/definode/web.env 与 /etc/definode/keeper.env
3. 执行 npm ci 与 npm run build
4. 确认 .next/standalone 的 static 与 public 已复制
5. 重启 definode-web.service
6. 验证 Caddy 与页面访问
7. 验证 timer 下次触发时间与最近执行日志

---

参考文件：

- deploy/linux/setup.sh
- deploy/linux/.env.production.example
- deploy/linux/definode-web.service
- deploy/linux/definode-keeper.service
- deploy/linux/definode-keeper.timer
- deploy/linux/definode-health.service
- deploy/linux/definode-health.timer
- deploy/linux/TIMER-DEPLOYMENT-AND-OPS.md
- docs/PAGES-AND-TIMERS-DEPLOYMENT.md
