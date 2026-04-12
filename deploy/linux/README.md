# DeFiNodeNexus 生产环境部署指南

## 📋 快速开始（3 步）

### 1️⃣ 配置环境变量

```bash
vim deploy/linux/.env.production
```

**必填项：**

```bash
DEPLOYER_PRIVATE_KEY=0x...        # Keeper 执行链上操作的私钥
CNC_RPC_URL=https://...           # CNC 链 RPC 地址（已预设）
SWAP_ADDRESS=0x...                # TOTSwap 合约地址（已预设）
NEXUS_ADDRESS=0x...               # DeFiNodeNexus 合约地址（已预设）
```

### 2️⃣ 启动定时任务

```bash
sudo bash deploy/linux/start-timers.sh
```

启动脚本会自动：

- ✅ 生成 systemd timer 配置（自动检测项目路径）
- ✅ 安装到系统 `/etc/systemd/system/`
- ✅ 启用并启动所有定时器

### 3️⃣ 验证运行

```bash
# 查看定时器状态
sudo systemctl list-timers definode-*

# 查看实时日志
sudo systemctl logs -u definode-keeper.service -f
sudo systemctl logs -u definode-health.service -f
```

---

## 🌐 Web 反向代理（Caddy）

本项目 Web 服务默认监听 9002 端口，推荐使用 Caddy 反向代理到 80/443。

### 一键安装并启用 Caddy

```bash
sudo APP_DOMAIN=your-domain.com bash deploy/linux/setup-caddy.sh
```

可选自定义上游端口：

```bash
sudo APP_DOMAIN=your-domain.com APP_PORT=9002 bash deploy/linux/setup-caddy.sh
```

### 使用 deploy.sh 自动同步 Caddy

deploy.sh 已更新为 Caddy 优先：

```bash
bash deploy.sh
```

可通过环境变量指定域名：

```bash
APP_DOMAIN=your-domain.com bash deploy.sh
```

### 验证 Caddy 状态

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl status caddy --no-pager
sudo journalctl -u caddy -n 100 --no-pager
```

### Caddy 配置模板位置

- `deploy/linux/Caddyfile`

## 🤖 提交后自动部署（GitHub -> 服务器 -> Caddy）

已新增自动部署工作流：

- `.github/workflows/auto-deploy-server.yml`
- `deploy/linux/auto-update-from-github.sh`

触发条件：

- push 到 `main`
- push 到 `feat/**`
- 手动触发工作流（workflow_dispatch）

服务器执行内容：

1. 拉取对应分支最新代码
2. 执行 `bash deploy.sh --skip-pull`
3. `deploy.sh` 内自动同步并重载 Caddy（如检测到 Caddy）

### 需要在 GitHub 仓库配置的 Secrets

- `DEPLOY_HOST`: 服务器 IP 或域名
- `DEPLOY_USER`: SSH 用户名（例如 `ubuntu`）
- `DEPLOY_SSH_KEY`: 私钥内容（建议专用 deploy key）

可选：

- `DEPLOY_PORT`: SSH 端口，默认 `22`
- `DEPLOY_APP_DOMAIN`: 注入到 `APP_DOMAIN`，用于 Caddy 模板替换
- `DEPLOY_APP_DIR`: 服务器项目目录，默认 `/home/ubuntu/DeFiNodeNexus`

### 服务器前置条件

- 服务器已可通过 SSH 登录
- 项目目录存在并已初始化为 git 仓库
- `deploy.sh` 可执行，且服务器具备 `node`、`npm`、`pm2`
- 若使用 Caddy，已安装 `caddy` 且有 `/etc/caddy/Caddyfile` 写权限

模板中的占位符由脚本自动替换：

- `__APP_DOMAIN__`
- `__UPSTREAM__`

---

## 🎯 Keeper 定时任务说明

### 执行的业务

| 任务                  | 触发条件           | 频率      | 说明             |
| --------------------- | ------------------ | --------- | ---------------- |
| **Deflation（通缩）** | 计时器到期         | 每 4 小时 | TOT 铸币销毁机制 |
| **TOT 分红分发**      | 分红池 ≥ 阈值      | 每 1-3 天 | 分给 NFTB 持有者 |
| **USDT 分红分发**     | USDT 分红池 ≥ 阈值 | 每 1-3 天 | 利润分红分发     |

### 定时安排

```
Keeper 任务：
  启动后 2 分钟首次执行
  之后每 10 分钟执行一次

Health Check 任务：
  每天上午 08:00 执行一次
  检查系统监控指标，异常时告警
```

---

## 💰 Gas 费用预算

### 单次操作 Gas 消耗

```
deflate()           ≈ 200k - 400k gas
forceDistribute()   ≈ 300k - 500k gas
```

### 月度预算估算（CNC 链）

```
执行次数/月：
  deflate:      6-7 次
  TOT 分发:     10-15 次
  USDT 分发:    10-15 次

总 gas:       ≈ 11.7M gas/月
成本:         ≈ 1-2 ETH/月（Gas 价格 0.1 Gwei）

推荐准备：2-5 ETH
  • 覆盖 3-6 个月安全运行
  • 易于管理，不需频繁充值
```

---

## 🔧 常用命令

### 查看运行状态

```bash
# 查看所有 definode 定时器
sudo systemctl list-timers definode-*

# 查看 Keeper 定时器详情
sudo systemctl status definode-keeper.timer

# 查看上次运行结果（JSON 格式）
cat /opt/definode/DeFiNodeNexus/runtime/keeper/latest-run.json
```

### 管理定时任务

```bash
# 手动触发一次 Keeper
sudo systemctl start definode-keeper.service

# 停止定时器（不再自动执行）
sudo systemctl stop definode-keeper.timer

# 重启定时器（恢复自动执行）
sudo systemctl restart definode-keeper.timer

# 查看定时器日志
sudo journalctl -u definode-keeper.timer -f

# 查看服务日志
sudo journalctl -u definode-keeper.service -f
```

### 调试与测试

```bash
# 立即执行一次 Keeper（不等待定时器）
npm run keeper:once

# 查看执行输出和是否有错误
npm run keeper:once 2>&1 | tee keeper-test.log

# 检查环境变量是否正确加载
source deploy/linux/.env.production && node -e "console.log(process.env.SWAP_ADDRESS)"
```

---

## ⚙️ 环境文件说明

### .env.production 各字段含义

```bash
# 网络配置
CNC_RPC_URL=https://rpc.cncchainpro.com
CNC_CHAIN_ID=50716

# 合约地址（CNC 生产环境）
NEXT_PUBLIC_NEXUS_ADDRESS=0x6D862Bc5E9486C89c959905D18760204851f6203
NEXT_PUBLIC_SWAP_ADDRESS=0xcF4a673687B3DDEFDedC10C98fcBf43224488dB9
NEXT_PUBLIC_TOT_ADDRESS=0x0C720a3d1AB25b19c132Ba02C74A5D145d7CcDdA
NEXT_PUBLIC_TOF_ADDRESS=0x7300f4fd7C8d1baBC8220BFf04788E1B7A50e13D
NEXT_PUBLIC_USDT_ADDRESS=0x01EDa43B6f88Fb93D48441758B32d26E501F57e0

# Keeper 配置（必填）
DEPLOYER_PRIVATE_KEY=0x...  # ⚠️ 必须填写！这是执行链上操作的私钥

# 运行时文件路径（可选调整）
KEEPER_LOCK_FILE=/var/lock/definode-keeper.lock
KEEPER_STATUS_FILE=/opt/definode/DeFiNodeNexus/runtime/keeper/latest-run.json
HEALTH_REPORT_FILE=/opt/definode/DeFiNodeNexus/runtime/health/latest-health-check.json

# 监控阈值（可选调整）
MIN_TOT_RESERVE=10000              # TOT 储备最小值告警阈值
MIN_USDT_RESERVE=1000              # USDT 储备最小值告警阈值
MAX_DEFLATION_DELAY_HOURS=6        # 通缩延迟超过6小时告警
```

---

## 🚀 完整部署流程

### 第一次部署

```bash
# 1. 进入项目目录
cd /path/to/DeFiNodeNexus

# 2. 配置环境文件
cp deploy/linux/.env.production.example deploy/linux/.env.production
vim deploy/linux/.env.production
# 填写 DEPLOYER_PRIVATE_KEY 和其他必填项

# 3. 安装依赖（首次）
npm ci

# 4. 构建（可选，Keeper 不需要）
npm run build

# 5. 启动定时任务
sudo bash deploy/linux/start-timers.sh

# 6. 验证
sudo systemctl list-timers definode-*
npm run keeper:once  # 手动测试一次
```

### 已部署环境重新部署

```bash
# 仅更新配置
vim deploy/linux/.env.production

# 拉取最新代码
git pull origin main

# 重启定时器（自动加载新配置）
sudo systemctl restart definode-keeper.timer
sudo systemctl restart definode-health.timer

# 验证
npm run keeper:once
```

---

## ❌ 故障排除

### 问题 1：Keeper 不执行

```bash
# 检查定时器是否启用
sudo systemctl is-enabled definode-keeper.timer

# 检查是否有错误
sudo systemctl status definode-keeper.timer

# 查看日志找出错误原因
sudo journalctl -u definode-keeper.service -n 50
```

### 问题 2：环境变量未加载

```bash
# 检查 .env.production 是否存在
ls -la deploy/linux/.env.production

# 验证关键变量
source deploy/linux/.env.production
echo $DEPLOYER_PRIVATE_KEY
echo $SWAP_ADDRESS
```

### 问题 3：Gas 不足

```bash
# 检查钱包余额
node -r ./env_conf.js -e "
const ethers = require('ethers');
const pk = process.env.DEPLOYER_PRIVATE_KEY;
const rpc = process.env.CNC_RPC_URL;
const provider = new ethers.JsonRpcProvider(rpc);
const w = new ethers.Wallet(pk, provider);
provider.getBalance(w.address).then(bal => {
  console.log('Balance:', ethers.formatEther(bal), 'ETH');
});
"

# 给钱包充值更多 ETH（建议 2-5 ETH）
```

### 问题 4：权限错误

```bash
# 确保脚本有执行权限
chmod +x deploy/linux/start-timers.sh

# 确保日志目录可写
sudo mkdir -p /var/log/definode
sudo chown $USER:$USER /var/log/definode
```

---

## 📞 更多帮助

### 查看详细文档

```bash
cat TIMER-DEPLOYMENT-AND-OPS.md
```

### 测试 Keeper

```bash
# 模式 1：一次性执行
npm run keeper:once

# 模式 2：后台持续运行（用 Ctrl+C 停止）
node scripts/keeper.js

# 模式 3：通过 API 触发
curl -X POST http://localhost:9002/api/keeper?token=YOUR_SECRET
```

### 查看链上数据

访问 [CNC 区块浏览器](https://cncscan.com)，输入 `SWAP_ADDRESS` 查询交易历史。

---

## ✅ 检查清单

部署前确认已完成：

- [ ] 填写 `DEPLOYER_PRIVATE_KEY`（Keeper 钱包私钥）
- [ ] 钱包有 2-5 ETH（用于 Gas 费用）
- [ ] 项目依赖已安装（`npm ci`）
- [ ] 运行 `sudo bash deploy/linux/start-timers.sh` 启动
- [ ] 验证定时器已启用：`systemctl list-timers`
- [ ] 手动测试一次：`npm run keeper:once`
- [ ] 查看日志无错误

---

**最后更新：2026-04-09**  
**版本：1.0**
