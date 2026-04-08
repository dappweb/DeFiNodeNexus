# 页面和定时器部署快速参考

## 快速导航

| 内容 | 文件位置 | 用途 |
|------|--------|------|
| **前端应用** | `src/app/page.tsx` | 主应用入口 |
| **页面组件** | `src/components/pages/` | 各功能页面 |
| **Keeper** | `scripts/keeper.js` | 定时任务脚本 |
| **健康检查** | `scripts/daily-health-check.js` | 系统监控脚本 |
| **API 端点** | `src/app/api/` | 外部接口 |
| **Systemd** | `deploy/linux/` | Linux 定时任务 |

---

## 前端页面概览

### 6 个主要页面

```
Home      → 系统公告、用户概览
  ├─ 加载动态公告
  ├─ 显示在线数据
  └─ 新用户引导

Nodes     → NFT 管理和购买
  ├─ NFTA NFT 查询/购买/转卡
  ├─ NFTB NFT 查询/购买/转卡
  └─ 收益显示

Swap      → 代币交换
  ├─ TOT/USDT 交换
  ├─ 流动性展示
  └─ 价格曲线

Earnings  → 收益统计
  ├─ 分红分布
  ├─ 历史统计
  └─ 预期收益

Team      → 推荐体系
  ├─ 团队数据
  ├─ 推荐关系
  └─ 邀请链接

Admin     → 管理员面板（Owner 仅限）
  ├─ NFTA/NFTB 配置
  ├─ 分红管理
  ├─ 费率设置
  └─ 应急处理
```

### 启动前端

```bash
# 开发环境
npm run dev
# 访问 http://localhost:9002

# 生产构建
npm run build
npm start

# 环境变量必填
NEXT_PUBLIC_NEXUS_ADDRESS=0x...
NEXT_PUBLIC_CONTRACT_OWNER=0x...  # Admin 页面检查
```

---

## Keeper 定时任务

### 三种部署方式

#### 方案 1: Linux Systemd（推荐生产）⭐
```bash
# 部署
sudo cp deploy/linux/definode-*.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable definode-keeper.timer
sudo systemctl start definode-keeper.timer

# 查看状态
sudo systemctl list-timers --all | grep definode
sudo journalctl -u definode-keeper.service -f

# 手动触发
sudo systemctl start definode-keeper.service
```

#### 方案 2: Vercel Crons（云环境）
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
需要环境变量：`KEEPER_SECRET=your_key`

#### 方案 3: 外部 Cron 服务
```bash
# cron-job.org
curl -X POST "https://your-app/api/keeper?token=KEEPER_SECRET"

# GitHub Actions
# 配置 scheduled workflow
on:
  schedule:
    - cron: '*/5 * * * *'
```

---

## Keeper 功能

### 执行的操作
1. **Deflation** - TOT 代币通缩
2. **分红分配** - TOT 和 USDT 分红

### 运行周期
- **Linux Systemd**: 每 5 分钟
- **建议**: 每 5-10 分钟

### 手动测试
```bash
# 一次性运行（开发测试）
node scripts/keeper.js --once

# 查看结果
cat runtime/keeper/latest-run.json | python3 -m json.tool
```

---

## 健康检查

### 执行内容
- 检查通缩延迟
- 检查分红池状态
- 检查储备金水位
- Keeper 上次运行状态

### 运行频率
- **推荐**: 每天 3:00 AM
- **Linux**: 自动通过 systemd timer

### 手动运行
```bash
node scripts/daily-health-check.js

# 查看报告
cat runtime/health/latest-health-check.json
```

---

## API 端点

### /api/keeper - 触发 Keeper
```bash
POST /api/keeper?token=KEEPER_SECRET

# 响应
{
  "success": true,
  "tasks": {
    "deflate": { "executed": true, "hash": "0x..." },
    "distribute_tot": { "executed": false, "reason": "..." }
  }
}
```

### /api/announcements - 获取公告
```bash
GET /api/announcements

# 响应
{
  "data": [
    { "id": "1", "title": "...", "type": "maintenance" }
  ]
}
```

---

## 部署步骤（5步）

### 1️⃣ 前端配置
```bash
# .env.local
NEXT_PUBLIC_NEXUS_ADDRESS=0x...
NEXT_PUBLIC_SWAP_ADDRESS=0x...
NEXT_PUBLIC_TOT_ADDRESS=0x...
NEXT_PUBLIC_TOF_ADDRESS=0x...
NEXT_PUBLIC_USDT_ADDRESS=0x...
NEXT_PUBLIC_CONTRACT_OWNER=0x...
```

### 2️⃣ 构建前端
```bash
npm run build
```

### 3️⃣ 部署前端
```bash
# Vercel
vercel deploy --prod

# 自服务器
npm start
```

### 4️⃣ 部署 Keeper
```bash
# Linux Systemd
sudo cp deploy/linux/definode-*.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable definode-keeper.timer
sudo systemctl start definode-keeper.timer

# 验证
sudo systemctl list-timers | grep definode-keeper
```

### 5️⃣ 监控验证
```bash
# 查看 Keeper 日志
sudo journalctl -u definode-keeper.service -f

# 查看健康报告
cat runtime/health/latest-health-check.json

# 测试页面
# 访问 http://your-app/
```

---

## 常见问题

### Q: 前端白屏
**A:** 
```bash
# 检查环境变量
grep "NEXT_PUBLIC" .env.local

# 检查 RPC
curl https://sepolia.infura.io/...

# 检查浏览器控制台错误
# 清除缓存后刷新
```

### Q: Keeper 不运行
**A:**
```bash
# 检查定时器
sudo systemctl status definode-keeper.timer

# 查看日志
sudo journalctl -u definode-keeper.service -n 50

# 手动测试
node scripts/keeper.js --once --verbose
```

### Q: Admin 页面不显示
**A:**
```bash
# 确保环境变量中有正确的 OWNER 地址
NEXT_PUBLIC_CONTRACT_OWNER=0x<owner_address>

# 确保钱包连接并切换到 Owner 地址
# 检查浏览器控制台是否有错误
```

### Q: 定时器不触发分红
**A:**
```bash
# 检查储备金
cat runtime/keeper/latest-run.json | grep "threshold"

# 检查分红阈值配置
grep "DISTRIBUTION_THRESHOLD" .env

# 验证合约授权
```

---

## 文件清单

### 前端
- ✅ `src/app/page.tsx` - 主应用
- ✅ `src/components/pages/*.tsx` - 6 个页面
- ✅ `src/app/api/keeper/route.ts` - Keeper API
- ✅ `src/app/api/announcements/route.ts` - 公告 API

### 后端脚本
- ✅ `scripts/keeper.js` - Keeper 主逻辑
- ✅ `scripts/daily-health-check.js` - 健康检查

### 配置
- ✅ `deploy/linux/definode-keeper.service` - Keeper 服务
- ✅ `deploy/linux/definode-keeper.timer` - Keeper 定时器
- ✅ `deploy/linux/definode-health.service` - 健康检查服务
- ✅ `deploy/linux/definode-health.timer` - 健康检查定时器

### 文档
- ✅ [PAGES-AND-TIMERS-DEPLOYMENT.md](PAGES-AND-TIMERS-DEPLOYMENT.md) - 详细部署指南
- ✅ [linux-scheduled-jobs.md](linux-scheduled-jobs.md) - Linux 定时任务指南

---

## 环境变量总结

### 必填（生产）
```env
# 前端
NEXT_PUBLIC_NEXUS_ADDRESS=0x...
NEXT_PUBLIC_CONTRACT_OWNER=0x...

# Keeper
DEPLOYER_PRIVATE_KEY=0x...
SEPOLIA_RPC_URL=https://...
SWAP_ADDRESS=0x...
KEEPER_SECRET=your_secret
```

### 可选
```env
# CNC 链（如果支持）
NEXT_PUBLIC_CNC_RPC_URL=https://rpc.cncchainpro.com
CNC_SWAP_ADDRESS=0x...

# 通知
DISCORD_WEBHOOK_URL=https://...
TELEGRAM_BOT_TOKEN=...
```

---

## 性能指标

| 指标 | 值 | 说明 |
|------|-----|------|
| Keeper 周期 | 5 分钟 | 可调整 3-60 分钟 |
| 健康检查 | 每天 1 次 | 推荐 3 AM 运行 |
| 前端刷新 | 5 秒 | UI 参数可配 |
| API 超时 | 30 秒 | Keeper API 超时 |

---

## 下一步

1. 📖 阅读详细指南: [PAGES-AND-TIMERS-DEPLOYMENT.md](PAGES-AND-TIMERS-DEPLOYMENT.md)
2. 🚀 部署前端应用
3. ⏰ 配置 Keeper 定时任务
4. 📊 监控日志和健康报告
5. 🔧 根据需要调整参数

---

**最后更新**: 2025-04-08
**维护者**: DeFiNodeNexus Team
