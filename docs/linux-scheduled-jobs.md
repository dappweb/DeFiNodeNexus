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

## 6. 定时分配任务总览

| # | 任务 | 触发条件 | 调用方法 | 自动化方式 |
|---|---|---|---|---|
| 1 | **TOT 通缩** | 每 4 小时 | `TOTSwap.deflate()` | keeper 自动 |
| 2 | **TOT NFTB 分红发放** | TOT 池 ≥ threshold（默认值可配）| `TOTSwap.forceDistribute()` | keeper 自动 |
| 3 | **USDT NFTB 分红发放** | USDT 池 ≥ usdtDistributionThreshold（默认 10,000 USDT）| `TOTSwap.forceDistribute()` | keeper 自动 |
| 4 | **预测流水 USDT 分红** | 手动触发（Admin 页面） | `DeFiNodeNexus.distributePredictionFlowUsdt()` | Admin 手动 |

> 任务 2 和 3 共用同一个 `forceDistribute()` 函数，合约内部按池状态分别处理 TOT 和 USDT。  
> 任务 4 的资金来源为链外预测平台收入，需要由管理员手动录入并发放。

## 7. 当前脚本能力

### 7.1 keeper

- 检查并执行 `deflate()`（任务 1）
- 检查 TOT 分红池并在达阈值时执行 `forceDistribute()`（任务 2）
- 检查 USDT 分红池并在达阈值时执行 `forceDistribute()`（任务 3）
- 文件锁防重入（多实例保护）
- 输出状态文件（`runtime/keeper/latest-run.json`）
- 失败时可发送 Discord / Telegram 告警

### 7.2 daily-health-check

- 检查通缩延迟
- 检查 TOT 分红池是否积压待发
- 检查 USDT 分红池是否积压待发
- 检查 TOT/USDT 储备是否低于阈值
- 检查 keeper 上次运行状态
- 输出健康报告（`runtime/health/latest-health-check.json`）
- 有告警时发送 Discord / Telegram

## 8. 建议

- 生产环境优先使用 `systemd timer`，不要只依赖 Web API。
- `KEEPER_LOCK_FILE` 建议使用 Linux 绝对路径（`/var/lock/definode-keeper.lock`）。
- `keeper.env` 必须限制为 `600` 权限，私钥不能明文提交。
- 预测流水分红（任务 4）建议在 Admin 页面操作后在日志中记录金额和 tx hash，用于审计。

---

## 9. Ubuntu 生产服务器完整部署（Next.js Web App）

更新时间：2026-04-02

### 9.1 新增产出文件

| 文件 | 说明 |
|---|---|
| `deploy/linux/definode-web.service` | Next.js standalone 进程的 systemd service |
| `deploy/linux/nginx-definode.conf` | Nginx 反向代理配置（含 HTTPS 注释模板） |
| `deploy/linux/setup.sh` | Ubuntu 一键安装脚本（幂等，可重复执行） |
| `deploy/linux/.env.production.example` | 生产环境变量模板 |

### 9.2 服务目录结构

```
/opt/definode/DeFiNodeNexus/   ← 项目根目录（git clone 到此）
/etc/definode/web.env          ← 生产环境变量（web app + keeper 共用）
/etc/systemd/system/           ← definode-web.service / keeper / health units
/etc/nginx/sites-available/definode  ← nginx 配置
/var/log/definode/             ← 日志目录
runtime/keeper/                ← keeper 状态文件（相对项目根）
runtime/health/                ← 健康报告（相对项目根）
```

### 9.3 快速部署（一键脚本）

```bash
# 1. 先填写环境变量
sudo mkdir -p /etc/definode
sudo cp /opt/definode/DeFiNodeNexus/deploy/linux/.env.production.example /etc/definode/web.env
sudo nano /etc/definode/web.env   # 填入 RPC URL、私钥等
sudo chmod 600 /etc/definode/web.env
sudo chown definode:definode /etc/definode/web.env  # 用户创建后再 chown

# 2. 运行安装脚本（需 root）
cd /opt/definode/DeFiNodeNexus
sudo bash deploy/linux/setup.sh
```

### 9.4 构建原理（standalone 模式）

`next.config.ts` 已设置 `output: 'standalone'`，构建后生成：

```
.next/standalone/server.js    ← 独立 Node.js 入口，无需 node_modules 支持
.next/standalone/.next/       ← 服务端代码
.next/static/                 ← 静态资源（需手动复制进 standalone，setup.sh 已处理）
```

systemd 直接执行：
```
ExecStart=/usr/bin/node .next/standalone/server.js
```

Nginx 对 `/_next/static/` 路径直接 serve 磁盘文件，不经过 Node.js，性能更高。

### 9.5 手动重新部署（代码更新）

```bash
cd /opt/definode/DeFiNodeNexus
git pull
npm ci
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
sudo systemctl restart definode-web.service
```

### 9.6 HTTPS（Let's Encrypt）

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
# certbot 会自动修改 nginx 配置并启用 HTTPS
# 证书自动续期（90 天）：
sudo systemctl status certbot.timer
```

### 9.7 所有 systemd 单元一览

| 单元 | 类型 | 功能 | 触发方式 |
|---|---|---|---|
| `definode-web.service` | service | 运行 Next.js Web 应用 | 开机自启，永久运行 |
| `definode-keeper.service` | oneshot | 执行 keeper 一次 | 由 timer 触发 |
| `definode-keeper.timer` | timer | 每 10 分钟触发 keeper | 开机 2 分钟后首次 |
| `definode-health.service` | oneshot | 执行健康检查一次 | 由 timer 触发 |
| `definode-health.timer` | timer | 每天 08:00 触发健康检查 | 持久，错过则补跑 |

### 9.8 常用运维命令

```bash
# 查看 web 服务状态
systemctl status definode-web.service
journalctl -u definode-web.service -f

# 查看所有定时器
systemctl list-timers --all | grep definode

# 手动触发一次 keeper
sudo systemctl start definode-keeper.service
journalctl -u definode-keeper.service -n 50 --no-pager

# 手动触发一次健康检查
sudo systemctl start definode-health.service

# 查看健康报告
cat /opt/definode/DeFiNodeNexus/runtime/health/latest-health-check.json | python3 -m json.tool
```