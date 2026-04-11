# DeFiNodeNexus Tier 初始化完成指南

## 📋 当前状态

✅ **已完成**:

- 创建了初始化脚本: `scripts/init-tiers.js`
- 创建了状态检查脚本: `scripts/check-tiers-status.js`
- 创建了自动化 Bash 脚本: `scripts/init-tiers.sh`
- Admin 面板已集成"一键初始化"功能
- 前端已部署并运行: https://t1.test2dapp.xyz

⚠️ **待完成**:

- 将 2 NFTA + 3 NFTB tier 数据初始化到链上

---

## 🔧 三种初始化方式

### ⭐ 方式 1: Admin UI (推荐，最简单)

**适用于**: Owner 可以连接 Web3 钱包

**步骤**:

1. 用 Owner 钱包 (0xF6FCDB875a7CdBE4e07Fb7DabE233bF88f35E34b) 打开:

   ```
   https://t1.test2dapp.xyz/admin
   ```

2. 点击页面右上角"连接钱包"

3. 选择 MetaMask 或其他 Web3 钱包

4. 确保钱包已切换到 **CNC Mainnet** (Chain ID: 50716)

5. 页面左侧点击"Tier 管理"标签

6. 看到黄色提示框，包含:
   - 默认 tier 规格预览
   - "一键初始化到链上" 按钮

7. 点击按钮，钱包会弹出 5 笔交易签名请求

8. 依次确认签署 5 笔交易 (2 NFTA + 3 NFTB)

9. 等待所有交易确认，表格会自动填充为真实链上数据

**预期结果**:

```
✅ NFTA Tier 数量: 2
✅ NFTB Tier 数量: 3
```

---

### 🔐 方式 2: Node 脚本 (最快，需要私钥)

**适用于**: 有 Owner 私钥，可以在服务器执行

**前提条件**:

- Owner 私钥: `0x...` (保密!)
- RPC URL 已配置: https://rpc.cncchainpro.com

**执行**:

```bash
cd /home/ubuntu/DeFiNodeNexus

# 方法 a: 命令行直接指定
OWNER_PRIVATE_KEY=0x... node scripts/init-tiers.js

# 方法 b: 使用 Bash 脚本
OWNER_PRIVATE_KEY=0x... bash scripts/init-tiers.sh

# 方法 c: 编辑 .env 后运行
# 1. 编辑 .env 文件，设置 OWNER_PRIVATE_KEY=0x...
# 2. 运行: node scripts/init-tiers.js
```

**脚本会**:

- 验证签名者是合约 Owner
- 显示当前链上 tier 数量
- 提交 5 笔初始化交易
- 等待所有交易确认
- 验证最终状态

**输出示例**:

```
[init-tiers] Initialization started
  RPC URL: https://rpc.cncchainpro.com
  Nexus Address: 0x6D862Bc5E9486C89c959905D18760204851f6203
  Signer Address: 0xF6FCDB875a7CdBE4e07Fb7DabE233bF88f35E34b
  ✓ Signer is the contract owner

Current chain state:
  NFTA Tier count: 0
  NFTB Tier count: 0

Initializing 2 NFTA + 3 NFTB tiers...

Submitted 5 transactions. Waiting for confirmations...

✅ All 5 transactions confirmed:
  NFTA Tier #0: <txHash1>
  NFTA Tier #1: <txHash2>
  NFTB Tier #0: <txHash3>
  NFTB Tier #1: <txHash4>
  NFTB Tier #2: <txHash5>

Final chain state:
  NFTA Tier count: 2
  NFTB Tier count: 3

✅ SUCCESS: 2 NFTA + 3 NFTB tiers initialized on chain!
```

---

### 📊 方式 3: 验证工具 (不修改链，只查询)

**查看当前状态**:

```bash
cd /home/ubuntu/DeFiNodeNexus
node scripts/check-tiers-status.js
```

**输出示例**:

```
[check-tiers] Nexus Contract Status

Contract: 0x6D862Bc5E9486C89c959905D18760204851f6203
RPC: https://rpc.cncchainpro.com

Owner: 0xF6FCDB875a7CdBE4e07Fb7DabE233bF88f35E34b
NFTA Tier Count: 0
NFTB Tier Count: 0

📊 Initialization Status:
Expected:  2 NFTA + 3 NFTB
Actual:    0 NFTA + 0 NFTB

⚠️  Tiers need initialization.
```

---

## 📝 初始化规格

### NFTA Tier (2个)

| Tier | 价格       | 日收益  | 最大数量 | 状态 |
| ---- | ---------- | ------- | -------- | ---- |
| 1    | 500 USDT   | 6.5 TOT | 10,000   | 激活 |
| 2    | 1,000 USDT | 20 TOT  | 5,000    | 激活 |

### NFTB Tier (3个)

| Tier | 价格       | 权重 | 分红比例 | 最大数量 | 状态 |
| ---- | ---------- | ---- | -------- | -------- | ---- |
| 1    | 500 USDT   | 1    | 20%      | 2,000    | 激活 |
| 2    | 1,000 USDT | 2    | 30%      | 2,000    | 激活 |
| 3    | 2,000 USDT | 3    | 40%      | 2,000    | 激活 |

---

## ✅ 初始化后的功能

### Admin 面板操作

1. **查看 Tier** - 显示链上实时数据
2. **编辑 Tier** - 修改价格、收益、权重等参数
3. **切换状态** - 上架/下架任何 tier
4. **新建 Tier** - 从 "新建" 按钮创建新 tier

### 用户页面更新

1. **节点购买页** - 显示真实链上规格（不再是默认数据）
2. **收益计算** - 基于链上 tier 数据
3. **实时同步** - 6 秒自动刷新链上数据

---

## 🔍 故障排除

### 问题 1: Admin UI 无法连接钱包

**原因**: Web3 Modal 未正确配置或网络不匹配

**解决**:

1. 检查 MetaMask 是否已切换到 CNC Mainnet (ChainID: 50716)
2. 清空浏览器缓存，刷新页面
3. 尝试切断 VPN 或代理

### 问题 2: 脚本报错 "Signer is not the contract owner"

**原因**: 提供的私钥不对应 Owner 地址

**解决**:

- 确认私钥对应地址: `0xF6FCDB875a7CdBE4e07Fb7DabE233bF88f35E34b`
- 使用正确的 Owner 私钥重试

### 问题 3: 交易一直待处理

**原因**: Gas 设置不足或网络拥堵

**解决**:

1. 等待 5-10 分钟让交易处理
2. 如果仍未完成，检查链上状态:
   ```bash
   node scripts/check-tiers-status.js
   ```
3. 如果 NFTA/NFTB Tier Count 仍为 0，重新运行初始化

### 问题 4: Admin 面板的初始化按钮灰色

**原因**: 钱包未连接或当前用户不是 Owner

**解决**:

1. 确保用户地址: `0xF6FCDB875a7CdBE4e07Fb7DabE233bF88f35E34b`
2. 断开钱包重新连接
3. 检查浏览器控制台是否有错误

---

## 🎯 完成标志

初始化完成后，使用验证脚本检查:

```bash
node scripts/check-tiers-status.js
```

预期输出:

```
✅ Tiers are properly initialized!
```

---

## 📂 相关文件

| 文件                                             | 用途               |
| ------------------------------------------------ | ------------------ |
| `scripts/init-tiers.js`                          | Node.js 初始化脚本 |
| `scripts/check-tiers-status.js`                  | 状态检查脚本       |
| `scripts/init-tiers.sh`                          | Bash 自动化脚本    |
| `src/components/admin/tier-management-panel.tsx` | Admin UI 组件      |
| `src/app/api/nodes/summary/route.ts`             | 链上数据 API 端点  |
| `docs/INITIALIZE-TIERS.md`                       | 详细初始化文档     |

---

## ❓ 需要帮助?

**选择适合的初始化方式**:

- 有 Web3 钱包? → 使用方式 1 (Admin UI)
- 有 Owner 私钥? → 使用方式 2 (Node 脚本)
- 只想查状态? → 使用方式 3 (验证工具)

**合约信息**:

- 地址: `0x6D862Bc5E9486C89c959905D18760204851f6203`
- Owner: `0xF6FCDB875a7CdBE4e07Fb7DabE233bF88f35E34b`
- 网络: CNC Mainnet (ChainID: 50716)
- RPC: `https://rpc.cncchainpro.com`
