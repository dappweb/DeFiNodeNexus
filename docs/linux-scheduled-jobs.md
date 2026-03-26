# Linux 定时任务部署方案

更新时间：2026-03-26

## 1. 产出内容

本项目已提供以下 Linux 定时执行脚本与模板：

- Keeper 主任务：[scripts/keeper.js](scripts/keeper.js)
- 每日健康检查：[scripts/daily-health-check.js](scripts/daily-health-check.js)
- systemd keeper service：[deploy/linux/definode-keeper.service](deploy/linux/definode-keeper.service)
- systemd keeper timer：[deploy/linux/definode-keeper.timer](deploy/linux/definode-keeper.timer)
- systemd health service：[deploy/linux/definode-health.service](deploy/linux/definode-health.service)
- systemd health timer：[deploy/linux/definode-health.timer](deploy/linux/definode-health.timer)

## 2. 推荐目录

- 项目目录：`/opt/definode/DeFiNodeNexus`
- 环境变量：`/etc/definode/keeper.env`
- 运行状态文件：`runtime/keeper/latest-run.json`
- 健康检查报告：`runtime/health/latest-health-check.json`

## 3. keeper.env 示例

```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your-key
DEPLOYER_PRIVATE_KEY=0xyourprivatekey
SWAP_ADDRESS=0xYourSwapAddress
NEXUS_ADDRESS=0xYourNexusAddress

KEEPER_LOCK_FILE=/var/lock/definode-keeper.lock
KEEPER_STATUS_FILE=/opt/definode/DeFiNodeNexus/runtime/keeper/latest-run.json
HEALTH_REPORT_FILE=/opt/definode/DeFiNodeNexus/runtime/health/latest-health-check.json

MIN_TOT_RESERVE=10000
MIN_USDT_RESERVE=1000
MAX_DEFLATION_DELAY_HOURS=6

# 可选告警
DISCORD_WEBHOOK_URL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

## 4. 安装步骤

### 4.1 创建用户与目录

```bash
sudo useradd -r -s /usr/sbin/nologin definode || true
sudo mkdir -p /opt/definode /etc/definode /var/log/definode
sudo chown -R definode:definode /opt/definode /var/log/definode
```

### 4.2 部署项目

```bash
cd /opt/definode
git clone https://github.com/dappweb/DeFiNodeNexus.git
cd DeFiNodeNexus
npm install
```

### 4.3 写入环境变量

```bash
sudo cp .env /etc/definode/keeper.env
sudo chmod 600 /etc/definode/keeper.env
sudo chown definode:definode /etc/definode/keeper.env
```

### 4.4 安装 systemd 定时器

```bash
sudo cp deploy/linux/definode-keeper.service /etc/systemd/system/
sudo cp deploy/linux/definode-keeper.timer /etc/systemd/system/
sudo cp deploy/linux/definode-health.service /etc/systemd/system/
sudo cp deploy/linux/definode-health.timer /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable --now definode-keeper.timer
sudo systemctl enable --now definode-health.timer
```

## 5. 手动执行与检查

### 5.1 手动跑一次 keeper

```bash
sudo -u definode -H bash -lc 'cd /opt/definode/DeFiNodeNexus && node scripts/keeper.js --once'
```

### 5.2 手动跑一次健康检查

```bash
sudo -u definode -H bash -lc 'cd /opt/definode/DeFiNodeNexus && node scripts/daily-health-check.js'
```

### 5.3 查看定时器状态

```bash
systemctl status definode-keeper.timer
systemctl status definode-health.timer
systemctl list-timers --all | grep definode
```

### 5.4 查看日志

```bash
journalctl -u definode-keeper.service -n 100 --no-pager
journalctl -u definode-health.service -n 100 --no-pager
```

## 6. 当前脚本能力

### 6.1 keeper

- 检查并执行 `deflate()`
- 检查并执行 `forceDistribute()`
- 文件锁防重入
- 输出状态文件
- 失败时可发送 Discord / Telegram 告警

### 6.2 daily-health-check

- 检查通缩延迟
- 检查分红池是否积压
- 检查 TOT/USDT 储备是否低于阈值
- 检查 keeper 上次状态
- 输出健康报告
- 有告警时发送 Discord / Telegram

## 7. 建议

- 生产环境优先使用 `systemd timer`，不要只依赖 Web API。
- `KEEPER_LOCK_FILE` 建议使用 Linux 绝对路径。
- `keeper.env` 必须限制为 `600` 权限。
- 后续可继续补：USDT 分红自动化、管理员页展示最近一次 keeper 结果。