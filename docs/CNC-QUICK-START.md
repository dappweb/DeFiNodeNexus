# CNC 部署快速参考

## 配置清单

### .env 文件配置
```env
# 必填：Deployer 私钥（部署并支付gas）
DEPLOYER_PRIVATE_KEY=0x<deployer_private_key>

# 可选：Owner 私钥（合约所有者）
# 如果不设置，将使用 DEPLOYER_PRIVATE_KEY
OWNER_PRIVATE_KEY=0x<owner_private_key>

# CNC 链配置（已预配置，无需修改）
CNC_RPC_URL=https://rpc.cncchainpro.com
CNC_CHAIN_ID=50716

# 代币地址（已预配置，无需修改）
CNC_TOT_TOKEN_ADDRESS=0x0C720a3d1AB25b19c132Ba02C74A5D145d7CcDdA
CNC_TOF_TOKEN_ADDRESS=0x7300f4fd7C8d1baBC8220BFf04788E1B7A50e13D
CNC_USDT_TOKEN_ADDRESS=0x01EDa43B6f88Fb93D48441758B32d26E501F57e0

# 部署完成后更新
CNC_NEXUS_ADDRESS=<部署后填写>
CNC_SWAP_ADDRESS=<部署完成后填写>
```

---

## 部署步骤（3步）

### 1️⃣ 验证配置
```bash
node scripts/verify-cnc-config.js
```
✓ 应该看到"Configuration verification passed"

### 2️⃣ 执行部署
```bash
npm run deploy:cnc
```

部署会自动完成以下操作：
- ✅ 部署 DeFiNodeNexus 合约
- ✅ 配置 NFTA Tiers (2 层)
- ✅ 配置 NFTB Tiers (3 层)
- ✅ 部署 TOTSwap 合约
- ✅ 配置合约链接

### 3️⃣ 保存部署地址
复制部署输出中的地址到 `.env`：
```env
CNC_NEXUS_ADDRESS=0x<部署输出的地址>
CNC_SWAP_ADDRESS=0x<部署输出的地址>
```

---

## 常见配置场景

### 场景 1：单个账户（推荐开发环境）
```env
DEPLOYER_PRIVATE_KEY=0x...
# 不需要设置 OWNER_PRIVATE_KEY
# 同一个账户既部署又拥有合约
```

### 场景 2：分离账户（推荐生产环境）
```env
DEPLOYER_PRIVATE_KEY=0x...  # 支付gas的账户
OWNER_PRIVATE_KEY=0x...      # 合约所有者账户
```

---

## 错误排查

| 错误 | 原因 | 解决方案 |
|------|------|--------|
| insufficient gas | Deployer 账户没有 CNC 代币 | 向 Deployer 地址转入 CNC 代币 |
| connection refused | RPC 不可用 | 检查 CNC_RPC_URL 和网络连接 |
| zero address | Token 地址错误 | 验证代币地址是否在 CNC 链上已部署 |
| unauthorized | Owner 账户错误 | 确保 OWNER_PRIVATE_KEY 匹配 |

---

## 部署结果示例

```
=== DEPLOYMENT SUMMARY ===
Network:       CNC Chain (50716)
Deployer account: 0x1234567890123456789012345678901234567890
Owner account:    0x1234567890123456789012345678901234567890
DeFiNodeNexus:  0xABC...
TOTSwap:        0xDEF...
TOT token:      0x0C720a3d1AB25b19c132Ba02C74A5D145d7CcDdA
TOF token:      0x7300f4fd7C8d1baBC8220BFf04788E1B7A50e13D
USDT token:     0x01EDa43B6f88Fb93D48441758B32d26E501F57e0

--- Update .env with deployed addresses ---
CNC_NEXUS_ADDRESS=0xABC...
CNC_SWAP_ADDRESS=0xDEF...
```

---

## 更多信息

- 完整部署步骤：[CNC-DEPLOYMENT-STEPS.md](CNC-DEPLOYMENT-STEPS.md)
- 部署检查清单：[CNC-DEPLOYMENT-CHECKLIST.md](CNC-DEPLOYMENT-CHECKLIST.md)
- 部署指南：[CNC-DEPLOYMENT-GUIDE.md](CNC-DEPLOYMENT-GUIDE.md)
