# DeFiNodeNexus 业务功能与部署手册（CNC）

## 1. 文档目标
本手册用于统一说明 DeFiNodeNexus 当前包含的核心业务功能，以及在 CNC 生产环境的标准部署流程。

适用对象：产品、测试、运维、链上部署工程师。

## 2. 业务功能清单

### 2.1 代币与核心合约
- TOT：系统收益与流通主代币。
- TOF：手续费与功能驱动代币（提取/领取相关费用）。
- USDT：节点购买与部分分红结算代币。
- DeFiNodeNexus：主业务合约（NFTA/NFTB、推荐关系、收益与分红）。
- TOTSwap：TOT 与 USDT 的兑换及流动性管理合约。

### 2.2 NFTA 业务
- 支持 NFTA 分层配置（价格、日产出、总量、开关状态）。
- 用户购买 NFTA 后按业务规则进行 USDT 分配：
  - 团队推荐奖励
  - 0 号线钱包
  - 社区钱包
  - 基金会钱包
  - 机构钱包
- 产出规则支持按天领取（含 use-it-or-lose-it 约束）。
- NFTA 收益领取需消耗 TOF（费率可配置）。

### 2.3 NFTB 业务
- 支持 NFTB 分层配置（价格、weight、maxSupply、dividendBps、开关状态）。
- 支持按层分红权重和比例进行分红分配。
- 支持 USDT 分红与收益领取。

### 2.4 团队与推荐体系
- 支持绑定推荐人。
- 支持多代团队关系统计与团队奖励分发（最高深度由合约限制）。
- 支持团队业绩相关查询与管理。

### 2.5 提取与费用体系
- TOT 提取时按等级收取 TOF 手续费（等级费率可配置）。
- TOF 费用中可配置 burn 比例。
- 支持 TOF 汇率参数（tofPerUsdt）配置。

### 2.6 Swap 与分发体系
- TOTSwap 支持与 Nexus 联动。
- Nexus 支持 distributor 白名单管理。
- 支持分红池资金注入和分发。

### 2.7 定时任务（Timer）
- keeper 定时任务：执行链上日常业务动作（如 deflate/distribute 等流程）。
- health 定时任务：执行每日健康检查与告警输出。

## 3. CNC 部署文档

### 3.1 前置要求
- Linux 服务器（建议 Ubuntu 22.04/24.04）。
- Node.js 20+。
- npm 可用。
- 具备 CNC RPC 可访问能力。
- 已准备部署私钥、Owner 私钥、生产地址配置。

### 3.2 必要环境变量
最小必填（链上部署）：
- DEPLOYER_PRIVATE_KEY
- OWNER_PRIVATE_KEY（可与 deployer 相同）
- CNC_RPC_URL
- TOT_TOKEN_ADDRESS
- TOF_TOKEN_ADDRESS
- USDT_TOKEN_ADDRESS

应用运行必填（Web/脚本）：
- CNC_CHAIN_ID
- NEXUS_ADDRESS
- SWAP_ADDRESS
- NEXT_PUBLIC_NEXUS_ADDRESS
- NEXT_PUBLIC_SWAP_ADDRESS
- NEXT_PUBLIC_TOT_TOKEN_ADDRESS
- NEXT_PUBLIC_TOF_TOKEN_ADDRESS
- NEXT_PUBLIC_USDT_TOKEN_ADDRESS

建议以 deploy/linux/.env.production.example 为基准生成：
- /etc/definode/web.env
- /etc/definode/keeper.env

### 3.3 合约部署（CNC）
1. 校验配置：

```bash
npm run verify:cnc
```

2. 执行部署：

```bash
npm run deploy:cnc
```

3. 记录输出地址并回写环境变量：
- NEXUS_ADDRESS
- SWAP_ADDRESS

4. 部署后检查：
- Nexus 与 TOTSwap 均有地址输出。
- TOTSwap 已 setNexus。
- Nexus 已 setDistributor(TOTSwap, true)。

说明：TOF 白名单步骤若当前账户不是 TOF owner，脚本会提示跳过，不阻塞主部署。

### 3.4 服务器应用部署（无 Nginx 方案）
1. 执行安装脚本：

```bash
sudo bash deploy/linux/setup.sh
```

2. 构建（如脚本中未自动完成）：

```bash
cd /opt/definode/DeFiNodeNexus
sudo -u definode npm ci --prefer-offline --no-audit
sudo -u definode npm run build
```

3. 启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable definode-web.service
sudo systemctl restart definode-web.service
```

4. 验证：

```bash
systemctl status definode-web.service --no-pager
curl -I http://127.0.0.1:9002
```

### 3.5 Timer 部署与验证
1. 安装并启用 timer：

```bash
sudo systemctl enable --now definode-keeper.timer
sudo systemctl enable --now definode-health.timer
```

2. 查看计划与下次执行：

```bash
systemctl list-timers --all | grep definode
```

3. 手工触发验证：

```bash
sudo systemctl start definode-keeper.service
sudo systemctl start definode-health.service
journalctl -u definode-keeper.service -n 80 --no-pager
journalctl -u definode-health.service -n 80 --no-pager
```

### 3.6 回滚与重部署
- Web 回滚：
  - 保留上一个可运行构建目录，切换后重启 definode-web.service。
- 合约重部署：
  - 重新执行 deploy:cnc 并更新 NEXUS_ADDRESS/SWAP_ADDRESS。
  - 前端 NEXT_PUBLIC 地址必须同步。
- UUPS 升级：
  - 仅在 ABI/存储布局确认后执行，避免直接覆盖生产合约状态。

### 3.7 生产检查清单
- 环境变量文件存在且权限正确：/etc/definode/web.env, /etc/definode/keeper.env。
- Web 服务状态为 active。
- keeper/health timer 状态为 active，且 next run 正常。
- 链上配置正确：
  - Nexus/TOTSwap 地址一致
  - distributor 授权存在
  - 必要 whitelist 状态已确认
- 前端页面读取地址与链配置一致。

## 4. 推荐阅读
- docs/CNC-QUICK-START.md
- docs/CNC-DEPLOYMENT-GUIDE.md
- docs/PAGES-AND-TIMERS-DEPLOYMENT.md
- docs/linux-scheduled-jobs.md

## 5. 维护建议
- 每次发布后固定执行一次健康检查和 keeper 手工触发验证。
- 发布前后保留 .env 快照与部署日志。
- 生产地址变更后，必须同时更新 .env 与 .env.local 的公开地址变量。
