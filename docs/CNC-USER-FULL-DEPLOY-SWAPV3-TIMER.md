# CNC 用户完整部署文档（页面部署 + SwapV3 升级 + Timer 部署）

本文档用于给最终客户执行，覆盖三件事：
1. 部署前端页面服务（Web）
2. 将已部署的 Swap 升级到 TOTSwapV3（代理地址不变）
3. 部署并启用定时任务（Keeper / Health）

适用范围：
- Linux 服务器（Ubuntu 22.04/24.04）
- CNC 链（Chain ID: 50716）
- 项目目录已存在或可拉取

目录无关执行约定（重要）：
- 本文所有脚本命令均可在任意目录执行。
- 先定义一次 `PROJECT_ROOT`，后续命令统一使用该变量。

```bash
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$PROJECT_ROOT" || ! -f "$PROJECT_ROOT/package.json" ]]; then
	PROJECT_ROOT="/opt/definode/DeFiNodeNexus"
fi

if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
	echo "WARN: project root not found yet. Complete section 1.2 first, then rerun this block."
	echo "Suggested PROJECT_ROOT=/opt/definode/DeFiNodeNexus"
fi

echo "PROJECT_ROOT=$PROJECT_ROOT"
```

---

## 1. 前置条件

### 1.1 服务器依赖

```bash
sudo apt-get update
sudo apt-get install -y curl git build-essential
```

Node.js 建议 20.x，若未安装可执行：

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v
```

### 1.2 获取项目代码

```bash
cd /opt
sudo mkdir -p /opt/definode
sudo chown -R "$USER":"$USER" /opt/definode
cd /opt/definode
git clone https://github.com/dappweb/DeFiNodeNexus.git
cd /opt/definode/DeFiNodeNexus

# 拉取完成后，固定项目根目录（后续命令目录无关）
export PROJECT_ROOT="/opt/definode/DeFiNodeNexus"
```

---

## 2. 环境变量配置

以 `deploy/linux/.env.production` 作为生产主配置文件：

```bash
cp "$PROJECT_ROOT/deploy/linux/.env.production" "$PROJECT_ROOT/deploy/linux/.env.production.bak.$(date +%F-%H%M%S)"
vim "$PROJECT_ROOT/deploy/linux/.env.production"
```

至少确认以下变量：

```env
# CNC RPC
CNC_RPC_URL=https://rpc.cncchainpro.com
CNC_CHAIN_ID=50716

# 现网合约地址
NEXUS_ADDRESS=0x...
SWAP_ADDRESS=0x...
TOT_TOKEN_ADDRESS=0x...
TOF_TOKEN_ADDRESS=0x...
USDT_TOKEN_ADDRESS=0x...

# 前端地址（必须与上面一致）
NEXT_PUBLIC_NEXUS_ADDRESS=0x...
NEXT_PUBLIC_SWAP_ADDRESS=0x...
NEXT_PUBLIC_TOT_ADDRESS=0x...
NEXT_PUBLIC_TOF_ADDRESS=0x...
NEXT_PUBLIC_USDT_ADDRESS=0x...

# 升级/定时任务执行私钥（owner 或 keeper）
DEPLOYER_PRIVATE_KEY=0x...
```

SwapV3 可选参数（若要同时配置外部 DEX）：

```env
SWAP_DEX_ROUTER_ADDRESS=0x...
SWAP_DEX_PAIR_ADDRESS=0x...
SWAP_DEX_FACTORY_ADDRESS=0x...
SWAP_ENABLE_EXTERNAL_DEX=false
SWAP_PAUSE_SWAP=false
```

---

## 3. 页面部署（Web）

### 3.1 安装依赖并构建

```bash
npm --prefix "$PROJECT_ROOT" ci
npm --prefix "$PROJECT_ROOT" run build
```

### 3.2 启动页面（临时验证）

```bash
PORT=9002 HOSTNAME=0.0.0.0 npm --prefix "$PROJECT_ROOT" run start
```

另开终端验证：

```bash
curl -I http://127.0.0.1:9002
```

返回 `HTTP/1.1 200` 或 `HTTP/1.1 3xx` 即正常。

### 3.3 页面长期运行（推荐 PM2）

```bash
sudo npm i -g pm2
pm2 start "npm --prefix '$PROJECT_ROOT' run start" --name definodenexus
pm2 save
pm2 startup
```

检查状态：

```bash
pm2 list
pm2 logs definodenexus --lines 100
```

---

## 4. 升级 Swap 到 TOTSwapV3（已部署场景）

关键原则：
- 已上线系统请使用升级命令，不要重部署新 Swap。
- 升级后代理地址保持不变，只替换实现地址。

### 4.1 升级前检查

```bash
rg -n "CNC_RPC_URL|SWAP_ADDRESS|DEPLOYER_PRIVATE_KEY|SWAP_DEX_" "$PROJECT_ROOT/deploy/linux/.env.production"
```

### 4.2 执行升级（推荐）

```bash
set -a && source "$PROJECT_ROOT/deploy/linux/.env.production" && set +a
npm --prefix "$PROJECT_ROOT" run replace:swap:v3:cnc
```

### 4.3 仅变更 V3 配置（可重复执行）

```bash
set -a && source "$PROJECT_ROOT/deploy/linux/.env.production" && set +a
npm --prefix "$PROJECT_ROOT" run configure:totswap:v3:cnc
```

### 4.4 升级验收

确认输出中包含并正确：
- `Old implementation`
- `New implementation`
- `Owner`
- `Router`
- `Pair`
- `Factory`
- `External DEX enabled`
- `Swap paused`

并确认以下地址一致：
- `SWAP_ADDRESS` 与 `NEXT_PUBLIC_SWAP_ADDRESS`
- 升级前后代理地址一致（不能变化）

---

## 5. 部署 Timer（Keeper / Health）

仓库已提供一键脚本：`deploy/linux/start-timers.sh`。

### 5.1 启动定时任务

```bash
sudo bash "$PROJECT_ROOT/deploy/linux/start-timers.sh"
```

脚本会自动：
1. 读取 `deploy/linux/.env.production`
2. 生成并安装 systemd unit
3. 启用并启动：
- `definode-keeper.timer`（每 10 分钟）
- `definode-health.timer`（每天 08:00）

### 5.2 检查 timer 状态

```bash
sudo systemctl list-timers definode-*
sudo systemctl status definode-keeper.timer --no-pager
sudo systemctl status definode-health.timer --no-pager
```

### 5.3 手动触发一次

```bash
sudo systemctl start definode-keeper.service
sudo systemctl start definode-health.service
```

查看日志：

```bash
sudo journalctl -u definode-keeper.service -n 100 --no-pager
sudo journalctl -u definode-health.service -n 100 --no-pager
```

---

## 6. 联合验收清单（页面 + 合约 + timer）

1. 页面访问正常
- 9002 端口返回 200
- 前端可读到 CNC 合约数据

2. SwapV3 升级完成
- 代理地址不变
- 实现地址变更成功
- Owner 与路由参数正确

3. 定时任务正常
- `definode-keeper.timer` 已启用并存在下次触发时间
- `definode-health.timer` 已启用并存在下次触发时间
- 手动触发无报错

---

## 7. 常见问题

### 7.1 升级报 Ownable 或权限错误

原因：`DEPLOYER_PRIVATE_KEY` 不是 Swap 代理 owner。

处理：切换为 owner 私钥后重试。

### 7.2 升级后前端仍显示旧状态

原因：环境变量或页面进程未重启。

处理：

```bash
npm --prefix "$PROJECT_ROOT" run build
pm2 restart definodenexus
```

### 7.3 timer 无触发

检查：

```bash
sudo systemctl daemon-reload
sudo systemctl restart definode-keeper.timer
sudo systemctl restart definode-health.timer
sudo systemctl list-timers definode-*
```

---

## 8. 最短上线命令（客户版）

```bash
npm --prefix "$PROJECT_ROOT" ci
npm --prefix "$PROJECT_ROOT" run build

# 页面启动
pm2 start "npm --prefix '$PROJECT_ROOT' run start" --name definodenexus || pm2 restart definodenexus

# 加载环境并升级 SwapV3
set -a && source "$PROJECT_ROOT/deploy/linux/.env.production" && set +a
npm --prefix "$PROJECT_ROOT" run replace:swap:v3:cnc
npm --prefix "$PROJECT_ROOT" run configure:totswap:v3:cnc

# 启动定时任务
sudo bash "$PROJECT_ROOT/deploy/linux/start-timers.sh"

# 验证
pm2 list
sudo systemctl list-timers definode-*
```

---

## 9. 相关文件

- `deploy/linux/.env.production`
- `deploy/linux/start-timers.sh`
- `scripts/replace-swap-v3.js`
- `scripts/configure-totswap-v3.js`
- `scripts/upgrade-totswap-v3.js`
- `docs/SWAP-REPLACEMENT-TUTORIAL.md`
- `docs/ENV-SERVICE-PAGE-TIMER-DEPLOYMENT.md`
- `deploy/linux/TIMER-DEPLOYMENT-AND-OPS.md`
