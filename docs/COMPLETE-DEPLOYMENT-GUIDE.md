# 🚀 CNC 链完整部署文档（脚本、页面、Timer）

## 📋 目录

1. [快速开始](#快速开始)
2. [环境准备](#环境准备)
3. [合约部署或配置](#合约部署或配置)
4. [Web 页面部署](#web-页面部署)
5. [Keeper/Timer 部署](#keepertimer-部署)
6. [验证部署](#验证部署)
7. [故障排查](#故障排查)

---

## 快速开始

### 一键配置 PROJECT_ROOT

所有命令均可在任意目录执行。首先定义项目根目录：

```bash
# 自动检测项目根目录
if [[ -d .git ]]; then
  PROJECT_ROOT="$(git rev-parse --show-toplevel)"
else
  PROJECT_ROOT="/opt/definode/DeFiNodeNexus"
fi

# 验证项目根目录
if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
  echo "❌ PROJECT_ROOT 无效: $PROJECT_ROOT"
  exit 1
fi

echo "✅ PROJECT_ROOT=$PROJECT_ROOT"
```

将此加入 `~/.bashrc` 或 `~/.zshrc`：

```bash
echo 'export PROJECT_ROOT="/opt/definode/DeFiNodeNexus"' >> ~/.bashrc
source ~/.bashrc
```

---

## 环境准备

### 2.1 Linux 依赖

```bash
sudo apt-get update
sudo apt-get install -y curl git build-essential

# Optional: 用于生成部署跟踪
sudo apt-get install -y jq
```

### 2.2 Node.js 安装（v20+）

```bash
# 查看版本
node -v

# 如需安装
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证
node -v && npm -v
```

### 2.3 复制项目到服务器

```bash
# 从 GitHub 克隆（如需新部署）
git clone https://github.com/dappweb/DeFiNodeNexus.git /opt/definode/DeFiNodeNexus
cd /opt/definode/DeFiNodeNexus

# 或如果已存在，拉取最新
cd "$PROJECT_ROOT"
git pull origin main
```

### 2.4 配置环境变量

复制 `.env.example` 并修改：

```bash
cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
```

编辑 `$PROJECT_ROOT/.env`：

```env
# 区块链配置
CNC_RPC_URL=https://rpc.cncchainpro.com
CNC_CHAIN_ID=50716

# Token 地址（已预部署）
TOT_TOKEN_ADDRESS=0x0C720a3d1AB25b19c132Ba02C74A5D145d7CcDdA
TOF_TOKEN_ADDRESS=0x7300f4fd7C8d1baBC8220BFf04788E1B7A50e13D
USDT_TOKEN_ADDRESS=0xf54cC0F6CE272125c39C45A8141b84989A8765f4

# 合约地址（已预部署）
NEXUS_ADDRESS=0x6D862Bc5E9486C89c959905D18760204851f6203
SWAP_ADDRESS=0xfE20139dCFA053b819A3745E9ed801b9C6cc84aC

# DEX 路由
SWAP_DEX_ROUTER_ADDRESS=0x9b619b84b2C866ca8445025F5DF4013d95D28A29

# 部署者私钥（可选，仅用于升级合约）
DEPLOYER_PRIVATE_KEY=0x...
OWNER_PRIVATE_KEY=0x...
```

验证配置：

```bash
cd "$PROJECT_ROOT"
npm --prefix "$PROJECT_ROOT" run verify:cnc
# 或
node "$PROJECT_ROOT/scripts/verify-cnc-config.js"
```

---

## 合约部署或配置

### 3.1 检查已部署合约

验证所有合约地址已在 CNC 链上部署：

```bash
cd "$PROJECT_ROOT"
node "$PROJECT_ROOT/scripts/check-cnc-chain-state.js"
```

**预期输出**：
```
✓ TOT_TOKEN_ADDRESS: 0x0C720a3d1AB25b19c132Ba02C74A5D145d7CcDdA - DEPLOYED (342 bytes)
✓ TOF_TOKEN_ADDRESS: 0x7300f4fd7C8d1baBC8220BFf04788E1B7A50e13D - DEPLOYED (342 bytes)
✓ USDT_TOKEN_ADDRESS: 0xf54cC0F6CE272125c39C45A8141b84989A8765f4 - DEPLOYED (25582 bytes)
✓ NEXUS_ADDRESS: 0x6D862Bc5E9486C89c959905D18760204851f6203 - DEPLOYED (342 bytes)
✓ SWAP_ADDRESS: 0xfE20139dCFA053b819A3745E9ed801b9C6cc84aC - DEPLOYED (342 bytes)
```

### 3.2 检查 Swap 版本

验证 SWAP_ADDRESS 是否已升级到 V3：

```bash
cd "$PROJECT_ROOT"
node "$PROJECT_ROOT/scripts/check-swap-version.js"
```

**预期输出**：
```
✅ SWAP_ADDRESS IS TOTSwapV3
Version: 3
Owner: 0x744447d8580EB900b199e852C132F626247a36F7
```

如果是 V2，执行升级：

```bash
cd "$PROJECT_ROOT"
npm --prefix "$PROJECT_ROOT" run replace:swap:v3:cnc
npm --prefix "$PROJECT_ROOT" run configure:totswap:v3:cnc
```

### 3.3 检查所有合约所有者

```bash
cd "$PROJECT_ROOT"
node "$PROJECT_ROOT/scripts/check-all-owners.js"
```

---

## Web 页面部署

### 4.1 安装依赖

```bash
cd "$PROJECT_ROOT"
npm ci
```

### 4.2 构建应用

```bash
cd "$PROJECT_ROOT"
npm --prefix "$PROJECT_ROOT" run build
```

**输出位置**：`$PROJECT_ROOT/.next/standalone` 和 `$PROJECT_ROOT/.next/static`

### 4.3 配置部署环境

复制构建输出到生产目录：

```bash
PROD_DIR="/opt/definode/web-production"

# 创建生产目录
sudo mkdir -p "$PROD_DIR"
sudo chown -R "$(whoami)" "$PROD_DIR"

# 复制构建文件
cp -r "$PROJECT_ROOT/.next/standalone/." "$PROD_DIR/"
mkdir -p "$PROD_DIR/.next/static"
cp -r "$PROJECT_ROOT/.next/static/." "$PROD_DIR/.next/static/"

# 复制 .env
cp "$PROJECT_ROOT/.env" "$PROD_DIR/.env"

# 验证
ls -la "$PROD_DIR"
```

### 4.4 使用 PM2 启动服务

#### 安装 PM2（全局）

```bash
sudo npm install -g pm2
pm2 --version
```

#### 创建 PM2 配置文件

创建 `$PROD_DIR/ecosystem.config.js`：

```javascript
module.exports = {
  apps: [
    {
      name: "definode-web",
      script: "$PROD_DIR/server.js",
      instances: 1,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "$PROD_DIR/logs/error.log",
      out_file: "$PROD_DIR/logs/out.log",
      restart_delay: 5000,
      max_memory_restart: "1G",
    },
  ],
};
```

#### 启动应用

```bash
pm2 start "$PROD_DIR/ecosystem.config.js"
pm2 save
pm2 startup

# 验证
pm2 list
pm2 logs definode-web
```

#### 常用 PM2 命令

```bash
# 查看所有应用
pm2 list

# 查看 Web 应用日志
pm2 logs definode-web

# 重启应用
pm2 restart definode-web

# 停止应用
pm2 stop definode-web

# 删除应用
pm2 delete definode-web

# 清除所有日志
pm2 flush

# 启用自启动
pm2 startup systemd -u $(whoami)
pm2 save
```

### 4.5 Systemd 服务（可选）

创建系统服务文件 `/etc/systemd/system/definode-web.service`：

```ini
[Unit]
Description=DeFi Node Nexus Web Service
After=network.target

[Service]
Type=simple
User=$(whoami)
ExecStart=/usr/bin/node /opt/definode/web-production/server.js
Restart=on-failure
RestartSec=5
StandardOutput=append:/var/log/definode-web.log
StandardError=append:/var/log/definode-web-error.log
Environment="NODE_ENV=production"
Environment="PORT=3000"

[Install]
WantedBy=multi-user.target
```

启用：

```bash
sudo systemctl daemon-reload
sudo systemctl enable definode-web.service
sudo systemctl start definode-web.service
sudo systemctl status definode-web.service
```

### 4.6 验证 Web 服务

```bash
# 检查端口
curl http://localhost:3000

# 查看日志
pm2 logs definode-web

# 或 systemd
sudo journalctl -u definode-web.service -f
```

---

## Keeper/Timer 部署

Timer 用于定时执行 keeper 任务（分红分配、节点收益等）。

### 5.1 Keeper 脚本

有两个主要脚本：

| 脚本 | 用途 | 频率 |
|------|------|------|
| `keeper.js` | 分红分配 + 节点收益处理 | 每隔 N 秒 |
| `daily-health-check.js` | 系统健康检查 | 每天一次 |

### 5.2 Shell 启动脚本

创建 `$PROJECT_ROOT/deploy/linux/start-timers.sh`：

```bash
#!/bin/bash
set -e

PROJECT_ROOT="${PROJECT_ROOT:-/opt/definode/DeFiNodeNexus}"
LOGS_DIR="$PROJECT_ROOT/logs"
PIDS_FILE="$LOGS_DIR/timer.pids"

# 创建日志目录
mkdir -p "$LOGS_DIR"

echo "Starting timers with PROJECT_ROOT=$PROJECT_ROOT"

# 启动 keeper
nohup node "$PROJECT_ROOT/scripts/keeper.js" >> "$LOGS_DIR/keeper.log" 2>&1 &
KEEPER_PID=$!
echo "$KEEPER_PID" >> "$PIDS_FILE"
echo "✓ Keeper started (PID: $KEEPER_PID)"

# 启动 daily-health-check
nohup node "$PROJECT_ROOT/scripts/daily-health-check.js" >> "$LOGS_DIR/health-check.log" 2>&1 &
HEALTH_PID=$!
echo "$HEALTH_PID" >> "$PIDS_FILE"
echo "✓ Health Check started (PID: $HEALTH_PID)"

echo "Timer logs:"
echo "  Keeper: $LOGS_DIR/keeper.log"
echo "  Health: $LOGS_DIR/health-check.log"
echo "  PIDs: $PIDS_FILE"
```

赋予执行权限：

```bash
chmod +x "$PROJECT_ROOT/deploy/linux/start-timers.sh"
```

### 5.3 使用 systemd Timer（推荐）

#### 5.3.1 Keeper 服务

创建 `/etc/systemd/system/definode-keeper.service`：

```ini
[Unit]
Description=DeFi Node Keeper Task
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=/opt/definode/DeFiNodeNexus
ExecStart=/usr/bin/node /opt/definode/DeFiNodeNexus/scripts/keeper.js
Restart=on-failure
RestartSec=10
StandardOutput=append:/var/log/definode-keeper.log
StandardError=append:/var/log/definode-keeper-error.log
Environment="PROJECT_ROOT=/opt/definode/DeFiNodeNexus"

[Install]
WantedBy=multi-user.target
```

创建 `/etc/systemd/system/definode-keeper.timer`：

```ini
[Unit]
Description=DeFi Node Keeper Timer
Requires=definode-keeper.service

[Timer]
# 每 3600 秒（1小时）运行一次
OnBootSec=5min
OnUnitActiveSec=3600

[Install]
WantedBy=timers.target
```

#### 5.3.2 Health Check 服务

创建 `/etc/systemd/system/definode-health-check.service`：

```ini
[Unit]
Description=DeFi Node Daily Health Check
After=network.target

[Service]
Type=oneshot
User=$(whoami)
WorkingDirectory=/opt/definode/DeFiNodeNexus
ExecStart=/usr/bin/node /opt/definode/DeFiNodeNexus/scripts/daily-health-check.js
StandardOutput=append:/var/log/definode-health-check.log
StandardError=append:/var/log/definode-health-check-error.log
Environment="PROJECT_ROOT=/opt/definode/DeFiNodeNexus"
```

创建 `/etc/systemd/system/definode-health-check.timer`：

```ini
[Unit]
Description=DeFi Node Daily Health Check Timer
Requires=definode-health-check.service

[Timer]
# 每天 02:00 UTC 运行
OnCalendar=daily
OnCalendar=*-*-* 02:00:00

[Install]
WantedBy=timers.target
```

#### 5.3.3 启用和管理

```bash
# 重载 systemd
sudo systemctl daemon-reload

# 启用定时器
sudo systemctl enable definode-keeper.timer
sudo systemctl enable definode-health-check.timer

# 启动定时器
sudo systemctl start definode-keeper.timer
sudo systemctl start definode-health-check.timer

# 查看状态
sudo systemctl list-timers definode-*
sudo systemctl status definode-keeper.timer
sudo systemctl status definode-health-check.timer

# 查看定时器运行历史
sudo journalctl -u definode-keeper.service -f
sudo journalctl -u definode-health-check.service -f

# 手动触发定时器
sudo systemctl start definode-keeper.service
sudo systemctl start definode-health-check.service
```

### 5.4 使用 Cron（备选方案）

编辑 crontab：

```bash
crontab -e
```

添加定时任务：

```cron
# 每小时运行一次 keeper
0 * * * * cd /opt/definode/DeFiNodeNexus && node scripts/keeper.js >> logs/keeper.log 2>&1

# 每天早上 2 点运行 health check
0 2 * * * cd /opt/definode/DeFiNodeNexus && node scripts/daily-health-check.js >> logs/health-check.log 2>&1
```

验证 cron：

```bash
crontab -l
```

---

## 验证部署

### 6.1 合约状态验证

```bash
cd "$PROJECT_ROOT"

# 检查所有地址已部署
node "$PROJECT_ROOT/scripts/check-cnc-chain-state.js"

# 检查 Swap 版本
node "$PROJECT_ROOT/scripts/check-swap-version.js"

# 检查 owner
node "$PROJECT_ROOT/scripts/check-all-owners.js"
```

### 6.2 Web 服务验证

```bash
# 检查端口
netstat -tlnp | grep 3000
# 或
lsof -i :3000

# 测试连接
curl http://localhost:3000

# 查看日志
pm2 logs definode-web
```

### 6.3 Timer 服务验证

```bash
# systemd timer 状态
sudo systemctl list-timers definode-keeper.timer
sudo systemctl list-timers definode-health-check.timer

# 查看执行日志
sudo journalctl -u definode-keeper.service -n 50
sudo journalctl -u definode-health-check.service -n 50

# 或者 cron 日志
grep CRON /var/log/syslog | tail -20
```

### 6.4 完整验证检查清单

```bash
# 1. 环境变量
echo "PROJECT_ROOT=$PROJECT_ROOT"
cat "$PROJECT_ROOT/.env" | grep -E "CNC_RPC|TOT_TOKEN|SWAP_ADDRESS"

# 2. 合约
node "$PROJECT_ROOT/scripts/check-cnc-chain-state.js" | grep "DEPLOYED"

# 3. Web
curl -s http://localhost:3000 | head -20

# 4. Timer
sudo systemctl list-timers

# 5. 日志
tail -10 "$PROJECT_ROOT/logs/keeper.log"
tail -10 "$PROJECT_ROOT/logs/health-check.log"
```

---

## 故障排查

### 7.1 合约连接失败

**症状**：`Error: network does not match`

**解决**：
```bash
# 检查 RPC 连接
curl -X POST https://rpc.cncchainpro.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# 应该返回 0xc590 (50896 in decimal, but 50716 for CNC)
```

### 7.2 Web 服务无法启动

**症状**：`PM2 Error | App crashed`

**解决**：
```bash
# 检查构建输出
ls -la "$PROJECT_ROOT/.next/standalone"
ls -la "$PROJECT_ROOT/.next/static"

# 检查 .env
cat "$PROD_DIR/.env"

# 手动运行测试
node "$PROD_DIR/server.js"

# 查看详细日志
pm2 logs definode-web --lines 100
```

### 7.3 Timer 不执行

**症状**：日志无更新

**解决**（systemd）：
```bash
# 检查定时器配置
sudo systemctl cat definode-keeper.timer
sudo systemctl status definode-keeper.timer

# 检查服务
sudo systemctl status definode-keeper.service

# 手动运行测试
node "$PROJECT_ROOT/scripts/keeper.js"

# 查看日志
sudo journalctl -u definode-keeper.service -n 100
```

**解决**（cron）：
```bash
# 检查 cron 守护进程
systemctl status cron

# 验证 cron 任务
crontab -l

# 查看 cron 日志
grep CRON /var/log/syslog | tail -50
```

### 7.4 权限问题

**症状**：`Permission denied`

**解决**：
```bash
# 检查文件权限
ls -la "$PROJECT_ROOT/scripts/keeper.js"
ls -la "$PROJECT_ROOT/deploy/linux/start-timers.sh"

# 赋予执行权限
chmod +x "$PROJECT_ROOT/deploy/linux/start-timers.sh"
chmod +x "$PROJECT_ROOT/scripts/keeper.js"

# 检查目录权限
sudo chown -R "$(whoami)" "$PROJECT_ROOT"
```

### 7.5 磁盘空间不足

**症状**：日志写入失败

**解决**：
```bash
# 检查磁盘
df -h

# 清理日志
cd "$PROJECT_ROOT"
rm -f logs/*.log

# 或压缩旧日志
gzip logs/*.log-*
```

---

## 📝 完整命令速查表

| 任务 | 命令 |
|------|------|
| 检查所有合约 | `node "$PROJECT_ROOT/scripts/check-cnc-chain-state.js"` |
| 检查 Swap 版本 | `node "$PROJECT_ROOT/scripts/check-swap-version.js"` |
| 检查所有 Owner | `node "$PROJECT_ROOT/scripts/check-all-owners.js"` |
| 升级 Swap 到 V3 | `npm --prefix "$PROJECT_ROOT" run replace:swap:v3:cnc` |
| 构建 Web | `npm --prefix "$PROJECT_ROOT" run build` |
| 启动 Web（PM2） | `pm2 start "$PROD_DIR/ecosystem.config.js"` |
| 查看 Web 日志 | `pm2 logs definode-web` |
| 查看 Timer 状态 | `sudo systemctl list-timers definode-*` |
| 查看 Timer 日志 | `sudo journalctl -u definode-keeper.service -f` |
| 手动运行 Keeper | `node "$PROJECT_ROOT/scripts/keeper.js"` |

---

## 📞 支持

遇到问题？

1. 查看 [docs/](../docs/) 目录中的详细文档
2. 检查 [故障排查](#故障排查) 部分
3. 查看日志：
   ```bash
   pm2 logs definode-web
   sudo journalctl -u definode-keeper.service -f
   ```
4. 验证环境变量：
   ```bash
   cat "$PROJECT_ROOT/.env"
   node "$PROJECT_ROOT/scripts/verify-cnc-config.js"
   ```
