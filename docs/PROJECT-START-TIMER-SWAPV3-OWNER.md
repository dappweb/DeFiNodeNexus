# 项目启动、Timer 启动、SwapV3 Owner 更换操作手册

本文档提供一套可直接执行的步骤，覆盖以下三件事：
- 启动项目（Web）
- 启动 Timer（Keeper + Health Check）
- 更换 SwapV3 Owner

适用分支：`feat/totswap-external-dex-v3`

---

## 1. 启动项目（Web）

### 1.1 安装依赖

~~~bash
npm install
~~~

### 1.2 准备环境变量

确认以下文件存在并已填写：
- `deploy/linux/.env.production`（生产/Timer 使用）
- `.env.local`（本地开发时使用，如有）

至少保证链上相关变量可用：

~~~bash
CNC_RPC_URL=...
NEXUS_ADDRESS=0x...
SWAP_ADDRESS=0x...
DEPLOYER_PRIVATE_KEY=0x...   # Timer 和链上写操作需要
~~~

### 1.3 本地开发启动

~~~bash
npm run dev
~~~

默认端口为 `9002`。

### 1.4 生产模式本地验证（可选）

~~~bash
npm run build
npm run start -- -p 9002
~~~

---

## 2. 启动 Timer（Keeper + Health Check）

项目已提供一键脚本：`deploy/linux/start-timers.sh`。

### 2.1 启动命令

推荐使用 root/sudo（生产环境）：

~~~bash
sudo bash deploy/linux/start-timers.sh
~~~

该脚本会自动：
- 生成并安装 `definode-keeper` / `definode-health` 的 systemd service 和 timer
- `daemon-reload`
- `enable` + `start` 定时器

### 2.2 验证 Timer 状态

~~~bash
sudo systemctl list-timers 'definode-*'
sudo systemctl status definode-keeper.timer --no-pager
sudo systemctl status definode-health.timer --no-pager
~~~

### 2.3 查看日志

~~~bash
sudo journalctl -u definode-keeper.service -f
sudo journalctl -u definode-health.service -f
~~~

### 2.4 常见问题

1. `DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY` 未替换
- 现象：Keeper 无法执行链上交易。
- 处理：更新 `deploy/linux/.env.production` 为真实私钥。

2. 环境变量未加载或地址为空
- 现象：脚本提示 `SWAP_ADDRESS` / `CNC_RPC_URL` 缺失。
- 处理：检查 `deploy/linux/.env.production` 中变量是否完整。

3. 手动单次验证 Keeper

~~~bash
npm run keeper:once
~~~

---

## 3. 更换 SwapV3 Owner

仓库内置脚本：`scripts/transfer-swap-owner.js`

### 3.1 前置条件

1. 当前环境变量已设置：

~~~bash
CNC_RPC_URL=...
SWAP_ADDRESS=0x...
OWNER_PRIVATE_KEY=0x...      # 可选
DEPLOYER_PRIVATE_KEY=0x...   # OWNER_PRIVATE_KEY 不存在时使用
~~~

2. 签名地址必须是 Swap 当前 owner。

### 3.2 先检查当前 Owner

~~~bash
node -r ./env_conf.js scripts/check-swap-owner.js
~~~

### 3.3 执行 Owner 转移

~~~bash
node -r ./env_conf.js scripts/transfer-swap-owner.js <NEW_OWNER_ADDRESS>
~~~

脚本会执行：
- 地址格式校验
- 比对当前 owner 与签名地址
- 交互确认（输入 yes/y）
- 发送 `transferOwnership(newOwner)` 交易并等待上链

### 3.4 转移后复核

~~~bash
node -r ./env_conf.js scripts/check-swap-owner.js
~~~

确认输出中的 `Current Owner` 已更新为新地址。

---

## 4. 推荐执行顺序（生产）

~~~bash
# 1) 拉取代码并安装依赖
npm install

# 2) 校验关键环境变量（尤其私钥和地址）
grep -E '^(CNC_RPC_URL|NEXUS_ADDRESS|SWAP_ADDRESS|DEPLOYER_PRIVATE_KEY)=' deploy/linux/.env.production

# 3) 启动 Web（按你的部署方式）
npm run dev

# 4) 启动 Timer
sudo bash deploy/linux/start-timers.sh

# 5) 如需更换 SwapV3 Owner
node -r ./env_conf.js scripts/check-swap-owner.js
node -r ./env_conf.js scripts/transfer-swap-owner.js <NEW_OWNER_ADDRESS>
node -r ./env_conf.js scripts/check-swap-owner.js
~~~

---

## 5. 相关文档

- `docs/ENV-SERVICE-PAGE-TIMER-DEPLOYMENT.md`
- `docs/CNC-USER-FULL-DEPLOY-SWAPV3-TIMER.md`
- `docs/ADMIN-PANEL-SWAP-OWNER-TRANSFER.md`