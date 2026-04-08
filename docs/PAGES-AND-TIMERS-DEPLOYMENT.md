# 页面和定时器部署文档

## 目录
1. [前端页面架构](#前端页面架构)
2. [定时器和Keeper部署](#定时器和keeper部署)
3. [API端点配置](#api端点配置)
4. [生产部署清单](#生产部署清单)

---

## 前端页面架构

### 页面结构

项目采用 **Next.js App Router** 架构，主要页面在 `src/components/pages/` 目录下：

| 页面 | 文件 | 功能 | 权限 |
|------|------|------|------|
| **Home** | `home-page.tsx` | 系统公告、用户概览、在线统计 | 公开 |
| **Nodes** | `nodes-page.tsx` | NFTA/NFTB NFT 管理、购买、转卡 | 用户 |
| **Swap** | `swap-page.tsx` | TOT/USDT 池交换、流动性图表 | 用户 |
| **Earnings** | `earnings-page.tsx` | 收益统计、分红分布 | 用户 |
| **Team** | `team-page.tsx` | 推荐关系、团队数据、邀请链接 | 用户 |
| **Admin** | `admin-page.tsx` | 合约管理、配置、权限控制 | Owner |

### 页面入口

**主应用文件**: `src/app/page.tsx`

```tsx
// 页面导航配置
const pages: PageTab[] = [
  { key: "home", icon: Home, label: t("navHome") },
  { key: "nodes", icon: Layers, label: t("navNodes") },
  { key: "swap", icon: ArrowDownUp, label: t("navSwap") },
  { key: "earnings", icon: TrendingUp, label: t("navEarnings") },
  { key: "team", icon: Users, label: t("navTeam") },
  ...(shouldShowAdmin ? [{ key: "admin", icon: ShieldCheck, label: t("navAdmin") }] : []),
];
```

### 页面组件示例

#### 1. HomePage - 系统公告和概览
```tsx
// 功能：
// - 加载动态公告
// - 显示在线数据概览
// - 新用户引导流程

export function HomePage() {
  useEffect(() => {
    const loadAnnouncements = async () => {
      const response = await fetch("/api/announcements", {
        method: "GET",
        cache: "no-store",
      });
      const payload = await response.json();
      setAnnouncements(payload.data);
    };
    loadAnnouncements();
  }, []);
  
  return <div>...</div>;
}
```

#### 2. NodesPage - NFT 管理
```tsx
// 功能：
// - NFTA/NFTB NFT 查询和统计
// - 购买 NFT
// - 转卡操作
// - 收益显示

export function NodesPage() {
  const [nftas, setNftas] = useState<NFTCard[]>([]);
  const [nftbs, setNftbs] = useState<NFTCard[]>([]);
  
  useEffect(() => {
    // 加载用户的 NFTA 和 NFTB
    loadUserNFTs();
  }, [address]);
}
```

#### 3. AdminPage - 管理员面板
```tsx
// 权限检查：
// - 检查用户是否为 Owner
// - isOwner = address.toLowerCase() === ownerAddress.toLowerCase()

// 功能模块：
// 1. NFTA Tier 配置
// 2. NFTB Tier 配置
// 3. TOTSwap 配置
// 4. 分红管理
// 5. 费率设置
// 6. 应急处理

export function AdminPage() {
  const isOwner = useMemo(() => {
    if (!address || !ownerAddress) return false;
    return address.toLowerCase() === ownerAddress.toLowerCase();
  }, [address, ownerAddress]);
  
  if (!isOwner) return <div>权限不足</div>;
}
```

### 页面部署

#### 开发环境
```bash
npm run dev
```
- 启动开发服务器，监听 `http://localhost:9002`
- 使用 Turbopack 加速编译

#### 生产环境BUILD
```bash
npm run build
npm start
```

#### 环境变量
```env
# 前端公开变量（浏览器可见）
NEXT_PUBLIC_NEXUS_ADDRESS=0x...
NEXT_PUBLIC_SWAP_ADDRESS=0x...
NEXT_PUBLIC_TOT_ADDRESS=0x...
NEXT_PUBLIC_TOF_ADDRESS=0x...
NEXT_PUBLIC_USDT_ADDRESS=0x...
NEXT_PUBLIC_CONTRACT_OWNER=0x...  # Owner 地址（用于Admin检查）

# CNC 链配置
NEXT_PUBLIC_CNC_RPC_URL=https://rpc.cncchainpro.com
```

---

## 定时器和Keeper部署

### Keeper 脚本概述

**位置**: `scripts/keeper.js`

Keeper 是一个后台任务脚本，定期执行链上关键操作：

#### 主要功能
1. **Deflation** - TOT 代币通缩机制
2. **TOT 分红分配** - 当 TOT 分红池达到阈值
3. **USDT 分红分配** - 当 USDT 分红池达到阈值
4. **文件锁防重入** - 多实例保护

#### 配置参数
```env
# Keeper 运行角色
KEEPER_ROLE=keeper_001

# 分红阈值（单位：最小计量单位）
TOT_DISTRIBUTION_THRESHOLD=1000000000000000000
USDT_DISTRIBUTION_THRESHOLD=1000000

# RPC 和合约
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
SWAP_ADDRESS=0x...
TOT_TOKEN_ADDRESS=0x...
USDT_TOKEN_ADDRESS=0x...

# Private key (for owner/keeper operations)
DEPLOYER_PRIVATE_KEY=0x...
```

#### 手动运行
```bash
# 运行一次
node scripts/keeper.js --once

# 显示日志
node scripts/keeper.js --once --verbose
```

#### 运行结果
Keeper 会生成状态文件：`runtime/keeper/latest-run.json`

```json
{
  "timestamp": "2025-04-08T10:30:45Z",
  "keeper_role": "keeper_001",
  "tasks_executed": [
    {
      "name": "deflate",
      "executed": true,
      "hash": "0xabcd...",
      "gas_used": 150000
    },
    {
      "name": "distribute_tot",
      "executed": false,
      "reason": "below_threshold"
    }
  ],
  "errors": null
}
```

---

### 健康检查脚本

**位置**: `scripts/daily-health-check.js`

定期检查系统健康状态：

#### 检查项
- 通缩延迟
- TOT 分红池状态
- USDT 分红池状态
- 储备金检查
- Keeper 上次运行状态

#### 手动运行
```bash
node scripts/daily-health-check.js
```

#### 输出文件
`runtime/health/latest-health-check.json`

---

### Linux Systemd 定时任务部署

#### 1. Keeper 定时任务

**Service 文件**: `deploy/linux/definode-keeper.service`
```ini
[Unit]
Description=DeFiNodeNexus Keeper - On-chain tasks (deflate, distribute)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=definode
WorkingDirectory=/opt/definode/DeFiNodeNexus
ExecStart=/usr/bin/node scripts/keeper.js --once
StandardOutput=journal
StandardError=journal
SyslogIdentifier=definode-keeper

[Install]
WantedBy=multi-user.target
```

**Timer 文件**: `deploy/linux/definode-keeper.timer`
```ini
[Unit]
Description=Run DeFiNodeNexus Keeper every 5 minutes
Requires=definode-keeper.service

[Timer]
# 启动后延迟 30 秒首次运行
OnBootSec=30sec
# 之后每 5 分钟运行
OnUnitActiveSec=5min
AccuracySec=1sec

[Install]
WantedBy=timers.target
```

#### 2. 健康检查定时任务

**Service 文件**: `deploy/linux/definode-health.service`
```ini
[Unit]
Description=DeFiNodeNexus Daily Health Check
After=network-online.target

[Service]
Type=oneshot
User=definode
WorkingDirectory=/opt/definode/DeFiNodeNexus
ExecStart=/usr/bin/node scripts/daily-health-check.js
StandardOutput=journal
StandardError=journal
SyslogIdentifier=definode-health

[Install]
WantedBy=multi-user.target
```

**Timer 文件**: `deploy/linux/definode-health.timer`
```ini
[Unit]
Description=Run DeFiNodeNexus Health Check daily at 3 AM
Requires=definode-health.service

[Timer]
# 每天 3:00 AM 运行
OnCalendar=daily
OnCalendar=*-*-* 03:00:00
AccuracySec=1sec
Persistent=true

[Install]
WantedBy=timers.target
```

#### 3. 部署步骤

```bash
# 1. 复制文件到 systemd 目录
sudo cp deploy/linux/definode-*.service /etc/systemd/system/
sudo cp deploy/linux/definode-*.timer /etc/systemd/system/

# 2. 刷新 systemd
sudo systemctl daemon-reload

# 3. 启用定时器
sudo systemctl enable definode-keeper.timer
sudo systemctl enable definode-health.timer

# 4. 启动定时器
sudo systemctl start definode-keeper.timer
sudo systemctl start definode-health.timer

# 5. 验证状态
sudo systemctl list-timers --all | grep definode
```

#### 4. 常用命令

```bash
# 查看定时器状态
sudo systemctl status definode-keeper.timer
sudo systemctl status definode-health.timer

# 查看所有定时器
sudo systemctl list-timers --all

# 查看 Keeper 日志
sudo journalctl -u definode-keeper.service -n 50 -f

# 查看健康检查日志
sudo journalctl -u definode-health.service -n 50 -f

# 手动触发 Keeper
sudo systemctl start definode-keeper.service

# 查看 Keeper 状态文件
cat /opt/definode/DeFiNodeNexus/runtime/keeper/latest-run.json | python3 -m json.tool

# 查看健康报告
cat /opt/definode/DeFiNodeNexus/runtime/health/latest-health-check.json | python3 -m json.tool

# 禁用定时器
sudo systemctl disable definode-keeper.timer
sudo systemctl stop definode-keeper.timer
```

---

## API 端点配置

### Keeper API 端点

**位置**: `src/app/api/keeper/route.ts`

#### 用途
允许外部 Cron 服务（Vercel Cron, Cloudflare Workers, cron-job.org, GitHub Actions）触发 Keeper。

#### 请求方式
```bash
POST /api/keeper?token=KEEPER_SECRET
```

#### 环境变量
```env
# Keeper 密钥（安全令牌）
KEEPER_SECRET=your_secret_key

# RPC 和网络
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
DEPLOYER_PRIVATE_KEY=0x...
SWAP_ADDRESS=0x...

# CNC 链配置
CNC_RPC_URL=https://rpc.cncchainpro.com
CNC_SWAP_ADDRESS=0x...
```

#### 使用示例

使用 cron-job.org 或类似服务：
```bash
curl -X POST "https://your-app.vercel.app/api/keeper?token=your_secret_key"
```

使用 Vercel Crons（在 `vercel.json` 中配置）:
```json
{
  "crons": [
    {
      "path": "/api/keeper",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

使用 GitHub Actions:
```yaml
name: Trigger Keeper

on:
  schedule:
    - cron: '*/5 * * * *'

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/http-client@v3
        with:
          url: 'https://your-app.vercel.app/api/keeper?token=${{ secrets.KEEPER_SECRET }}'
          method: 'POST'
```

#### 响应格式
```json
{
  "success": true,
  "message": "Keeper executed successfully",
  "tasks": {
    "deflate": {
      "executed": true,
      "hash": "0x..."
    },
    "distribute_tot": {
      "executed": false,
      "reason": "below_threshold"
    }
  }
}
```

---

### 公告 API 端点

**位置**: `src/app/api/announcements/route.ts`

#### 功能
获取系统公告列表

#### 请求
```bash
GET /api/announcements
```

#### 响应
```json
{
  "data": [
    {
      "id": "1",
      "title": "系统升级",
      "content": "...",
      "type": "maintenance",
      "created_at": "2025-04-08T10:00:00Z"
    }
  ]
}
```

---

## 生产部署清单

### 1. 前端应用部署

- [ ] 构建应用: `npm run build`
- [ ] 验证环境变量完整性
- [ ] 部署到托管平台（Vercel/自服务器）
- [ ] 配置 CNAME/DNS
- [ ] 启用 SSL/TLS
- [ ] 测试所有页面功能

### 2. Keeper 定时任务部署  

#### Linux Systemd 方式（推荐）
- [ ] 复制 systemd 配置文件
- [ ] 执行 `systemctl daemon-reload`
- [ ] 启用并启动定时器
- [ ] 验证日志工作正常
- [ ] 测试手动触发

#### Vercel Crons 方式
- [ ] 配置 `vercel.json`
- [ ] 设置 `KEEPER_SECRET` 
- [ ] 测试 API 端点
- [ ] 监控日志

#### 外部 Cron 服务方式
- [ ] 配置 cron-job.org / 类似服务
- [ ] 设置正确的密钥
- [ ] 配置告警
- [ ] 监控执行状态

### 3. 环境配置

- [ ] 设置所有 `.env` 变量
- [ ] 验证 RPC 连接性
- [ ] 测试合约地址有效性
- [ ] 配置私钥和密钥
- [ ] 备份敏感信息

### 4. 监控和日志

- [ ] 配置日志收集
- [ ] 设置监控告警
- [ ] 定期检查健康报告
- [ ] 验证分红分配
- [ ] 检查通缩执行

### 5. 灾难恢复

- [ ] 备份合约数据
- [ ] 文档化故障处理流程
- [ ] 测试应急提取
- [ ] 验证 Owner 权限转移流程

---

## 故障排查

### Keeper 不运行
```bash
# 检查定时器状态
sudo systemctl status definode-keeper.timer

# 查看日志
sudo journalctl -u definode-keeper.service -n 100

# 手动测试
sudo -u definode /usr/bin/node /opt/definode/DeFiNodeNexus/scripts/keeper.js --once
```

### API 端点 404
- 确保部署了 `src/app/api/keeper/route.ts`
- 检查 `KEEPER_SECRET` 匹配

### 前端页面白屏
- 检查环境变量是否设置
- 验证 RPC URL 连通性
- 查看浏览器控制台错误
- 清理浏览器缓存

### 定时器不触发分红
- 检查储备金是否达到阈值
- 验证合约授权
- 查看 Keeper 日志
- 检查 gas 是否充足

---

## 相关文件引用

- 前端页面: `src/components/pages/`
- Keeper 脚本: `scripts/keeper.js`
- 健康检查: `scripts/daily-health-check.js`
- Systemd 配置: `deploy/linux/`
- API 路由: `src/app/api/`
- 环境配置文档: [CNC-DEPLOYMENT-STEPS.md](CNC-DEPLOYMENT-STEPS.md)
- Linux 定时任务: [docs/linux-scheduled-jobs.md](../linux-scheduled-jobs.md)
