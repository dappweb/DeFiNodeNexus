# CNC 链部署完整步骤

## 概述

该部署配置支持 **Deployer 和 Owner 分离**：

- **Deployer**：部署合约并支付 gas 费用
- **Owner**：拥有合约所有权和管理权限

如果不设置 OWNER_PRIVATE_KEY，将默认使用 DEPLOYER_PRIVATE_KEY。

---

## 部署前准备

### 1. 准备账户和私钥

需要两个账户的私钥（或使用同一个账户）：

```bash
# 获取账户 1 的私钥（Deployer）
# - 用于上传合约和支付 gas 费用
# - 需要有 CNC 链的原生代币用于 gas

# 获取账户 2 的私钥（Owner，可选）
# - 用于成为合约的所有者
# - 如果不设置，自动使用 Deployer 账户
```

### 2. 检查 CNC 链代币地址

验证以下代币地址在 CNC 链上已正确部署：

- **TOT Token**: 0x0C720a3d1AB25b19c132Ba02C74A5D145d7CcDdA
- **TOF Token**: 0x7300f4fd7C8d1baBC8220BFf04788E1B7A50e13D
- **USDT Token**: 0x01EDa43B6f88Fb93D48441758B32d26E501F57e0

可以在 CNC 链浏览器上验证这些地址。

### 3. 确保 Deployer 账户有足够 gas

Deployer 的账户需要足够的 CNC 原生代币来支付部署 gas 费用。

---

## 配置步骤

### 步骤 1：配置环境变量

编辑 `.env` 文件，填入以下配置：

```env
# Deployer 账户（必填）
DEPLOYER_PRIVATE_KEY=0x<deployer_private_key>

# Owner 账户（可选，不填则使用 Deployer）
OWNER_PRIVATE_KEY=0x<owner_private_key>

# CNC 链配置（已预配置）
CNC_RPC_URL=https://rpc.cncchainpro.com
CNC_CHAIN_ID=50716

# CNC 代币地址（已预配置）
TOT_TOKEN_ADDRESS=0x0C720a3d1AB25b19c132Ba02C74A5D145d7CcDdA
TOF_TOKEN_ADDRESS=0x7300f4fd7C8d1baBC8220BFf04788E1B7A50e13D
USDART_TOKEN_ADDRESS=0x01EDa43B6f88Fb93D48441758B32d26E501F57e0
```

**示例（使用同一个账户作为 Deployer 和 Owner）：**

```env
DEPLOYER_PRIVATE_KEY=0x4f3b2b7388daa9fbafede197e8c629cb7882a3af942a87aa0988dde7d73d03d2
# 不设置 OWNER_PRIVATE_KEY，将默认使用 DEPLOYER_PRIVATE_KEY
```

**示例（使用不同账户）：**

```env
DEPLOYER_PRIVATE_KEY=0x4f3b2b7388daa9fbafede197e8c629cb7882a3af942a87aa0988dde7d73d03d2
OWNER_PRIVATE_KEY=0x<another_account_private_key>
```

### 步骤 2：验证配置

运行配置验证脚本：

```bash
cd /home/ubuntu/DeFiNodeNexus
node scripts/verify-cnc-config.js
```

**预期输出：**

```
=== CNC Deployment Configuration Verification ===

✓ CNC_RPC_URL: https://rpc.cncchainpro.com
✓ CNC_CHAIN_ID: 50716
✓ TOT_TOKEN_ADDRESS: 0x0C720a3d1AB25b19c132Ba02C74A5D145d7CcDdA
✓ TOF_TOKEN_ADDRESS: 0x7300f4fd7C8d1baBC8220BFf04788E1B7A50e13D
✓ USDT_TOKEN_ADDRESS: 0x01EDa43B6f88Fb93D48441758B32d26E501F57e0
✓ DEPLOYER_PRIVATE_KEY is set

=== Deployment Command ===
npm run deploy:cnc

✓ Configuration verification passed. Ready to deploy.
```

---

## 部署步骤

### 步骤 1：执行部署脚本

```bash
npm run deploy:cnc
```

或显式指定网络：

```bash
npx hardhat run scripts/deploy-cnc.js --network cnc
```

### 步骤 2：部署过程监控

部署脚本将完成以下操作：

1. **部署 DeFiNodeNexus 合约**
   - 创建 UUPS 代理合约
   - 设定 Owner 为指定账户
   - 初始化代币地址

2. **配置 NFTA Tiers**
   - Tier 1: 500 USDT, 1.3% 日收益, 最多 10000
   - Tier 2: 1000 USDT, 2.0% 日收益, 最多 5000

3. **配置 NFTB Tiers**
   - Tier 1: 500 USDT / 100k TOF, 配额 50/50
   - Tier 2: 1000 USDT / 200k TOF, 配额 50/50
   - Tier 3: 2000 USDT / 400k TOF, 配额 50/50

4. **部署 TOTSwap 合约**
   - 创建 UUPS 代理合约
   - 设定 Owner 为指定账户

5. **配置合约链接**
   - 将 TOTSwap 设置为 Nexus 的分配器
   - 将 Nexus 和 TOTSwap 加入 TOF 白名单

### 步骤 3：部署成功确认

部署完成时会输出类似内容：

```
=== DEPLOYMENT SUMMARY ===
Network:       CNC Chain (50716)
Deployer account: 0x...
Owner account:    0x...
DeFiNodeNexus:  0x...
TOTSwap:        0x...
TOT token:      0x0C720a3d1AB25b19c132Ba02C74A5D145d7CcDdA
TOF token:      0x7300f4fd7C8d1baBC8220BFf04788E1B7A50e13D
USDT token:     0x01EDa43B6f88Fb93D48441758B32d26E501F57e0

NOTE: Owner must call swap.addLiquidity() to seed 6% TOT + USDT into pool.

--- Update .env with deployed addresses ---
NEXUS_ADDRESS=0x...
SWAP_ADDRESS=0x...
```

---

## 部署后配置

### 步骤 1：更新 .env 文件

将部署输出的地址添加到 `.env`：

```env
NEXUS_ADDRESS=0x<deployed_nexus_address>
SWAP_ADDRESS=0x<deployed_swap_address>
```

### 步骤 2：添加流动性（可选）

如果需要为 TOTSwap 添加初始流动性：

```bash
# Owner 账户需要执行此操作
npx hardhat run scripts/seed-swap-liquidity.js --network cnc
```

这会向流动性池中注入 6% 的 TOT 和对应的 USDT。

### 步骤 3：验证部署

可以通过 Owner 账户验证合约配置：

```bash
# 检查 Nexus 的 Owner
cast call 0x<nexus_address> "owner()" --rpc-url https://rpc.cncchainpro.com

# 检查 TOTSwap 的 Owner
cast call 0x<swap_address> "owner()" --rpc-url https://rpc.cncchainpro.com
```

---

## 账户角色说明

### Deployer 账户职责

- 上传合约代码到 CNC 链
- 支付部署的 gas 费用
- 初始化合约（仅在部署阶段）
- **任何链上操作都需要 CNC 原生代币用于 gas**

### Owner 账户职责

- 拥有合约所有权（owner）
- 管理合约配置：
  - 添加/修改 NFTA 和 NFTB Tiers
  - 设置分配器和白名单
  - 升级代理合约（UUPS）
- 执行管理员操作
- 添加流动性

---

## 常见问题

### Q: 部署失败，提示 "insufficient gas"

**A:** Deployer 账户的 CNC 原生代币不足。需要向 Deployer 账户充值 CNC 代币。

### Q: 如何只使用一个账户？

**A:** 不要设置 `OWNER_PRIVATE_KEY`，脚本会自动使用 `DEPLOYER_PRIVATE_KEY` 作为 Owner。

### Q: Owner 和 Deployer 地址不同，Owner 无法执行管理操作

**A:** 确保：

1. Owner 账户有足够 CNC 代币用于 gas
2. `OWNER_PRIVATE_KEY` 的值与 Owner 账户匹配

### Q: 需要转移 Owner 权限怎么办？

**A:** Owner 可以通过合约的 `transferOwnership()` 方法转移权限：

```bash
# 使用 Hardhat
npx hardhat run --network cnc << 'EOF'
const address = '0xNexusAddress';
const contract = await ethers.getContractAt('DeFiNodeNexus', address);
const tx = await contract.transferOwnership('0xNewOwner');
await tx.wait();
EOF
```

---

## 支持的脚本命令

```bash
# 验证 CNC 配置
node scripts/verify-cnc-config.js

# 执行完整部署
npm run deploy:cnc

# 查看硬件规范配置
cat hardhat.config.js | grep -A 10 "cnc:"

# 查看当前环境变量
grep "^CNC_" .env
```

---

## 安全建议

1. **不要提交私钥到 Git**

   ```bash
   # .gitignore 中应该包含
   .env
   .env.local
   .env.*.local
   ```

2. **使用测试网络先行验证**
   - 部署到 CNC 主网络进行验证
   - 确认部署流程无误后再部署到主网

3. **备份 Owner 私钥**
   - Owner 私钥掌控合约所有权至关重要
   - 应该安全保管此私钥

4. **验证部署地址**
   - 在链浏览器上验证部署的合约地址
   - 确认代码正确上链
