# DeFiNodeNexus Tier 初始化 - 快速参考

## 🎯 立即开始

### 情景 1: 有 Owner 钱包，想用 Web3 钱包

```
1. 访问: https://t1.test2dapp.xyz/admin
2. 连接钱包 (0xF6FCDB875a7CdBE4e07Fb7DabE233bF88f35E34b)
3. 切换到 CNC Mainnet (Chain ID 50716)
4. 点击 "Tier 管理" 标签
5. 点击 "一键初始化到链上" 按钮
6. 在钱包中签署 5 笔交易
```

### 情景 2: 有 Owner 私钥，想用脚本

```bash
# 直接执行
OWNER_PRIVATE_KEY=0x<私钥> node scripts/init-tiers.js

# 输出应该是:
# ✅ SUCCESS: 2 NFTA + 3 NFTB tiers initialized on chain!
```

### 情景 3: 只想检查当前状态

```bash
cd /home/ubuntu/DeFiNodeNexus
node scripts/check-tiers-status.js
```

---

## 📊 初始化规格速查表

### NFTA (2个)

| Tier | 价格  | 日收益  | 最大 |
| ---- | ----- | ------- | ---- |
| 1    | 500 U | 6.5 TOT | 10K  |
| 2    | 1K U  | 20 TOT  | 5K   |

### NFTB (3个)

| Tier | 价格  | 权重 | 分红 | 最大 |
| ---- | ----- | ---- | ---- | ---- |
| 1    | 500 U | 1    | 20%  | 2K   |
| 2    | 1K U  | 2    | 30%  | 2K   |
| 3    | 2K U  | 3    | 40%  | 2K   |

---

## 🔗 关键信息

- **合约地址**: 0x6D862Bc5E9486C89c959905D18760204851f6203
- **Owner**: 0xF6FCDB875a7CdBE4e07Fb7DabE233bF88f35E34b
- **网络**: CNC Mainnet (Chain ID 50716)
- **RPC**: https://rpc.cncchainpro.com
- **Admin Panel**: https://t1.test2dapp.xyz/admin
- **Nodes Page**: https://t1.test2dapp.xyz/nodes

---

## ✅ 验证成功

初始化后运行:

```bash
node scripts/check-tiers-status.js
```

预期看到:

```
NFTA Tier Count: 2
NFTB Tier Count: 3
✅ Tiers are properly initialized!
```

---

## 📁 文件位置

| 文件       | 路径                            |
| ---------- | ------------------------------- |
| 初始化脚本 | `scripts/init-tiers.js`         |
| 状态检查   | `scripts/check-tiers-status.js` |
| Bash 脚本  | `scripts/init-tiers.sh`         |
| 完整指南   | `INITIALIZE-TIERS-GUIDE.md`     |
| 详细说明   | `docs/INITIALIZE-TIERS.md`      |

---

## ❓ 遇到问题?

| 问题                 | 解决                           |
| -------------------- | ------------------------------ |
| Admin UI 无法连接    | 检查网络 ChainID 50716，清缓存 |
| 脚本报错 "not owner" | 确认使用正确的 Owner 私钥      |
| 交易卡住             | 等待 5-10 分钟，重试或检查状态 |
| 初始化按钮灰色       | 断开钱包重新连接               |

---

💡 **建议**: 优先使用 Web3 钱包方式 (Admin UI)，这是最安全且用户友好的方式。
