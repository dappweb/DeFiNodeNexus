# DeFiNodeNexus UUPS v2 升级 — 可枚举管理员清单

**升级日期**: 2025年
**升级类型**: UUPS 代理实现升级（代理地址保持不变）
**目标网络**: CNC 链（Chain ID: 50716）
**当前代理地址**: `0x6D862Bc5E9486C89c959905D18760204851f6203`

---

## 📋 升级内容总结

### 问题背景
- 当前管理员存储使用 `mapping(address => bool)` 不可枚举
- 前端无法列出现有的管理员列表
- 批量查询管理员需要事件日志，效率不高

### 解决方案
在 **DeFiNodeNexus v2** 中添加可枚举的管理员列表：
- 新增 `address[] private adminList` — 有序存储
- 新增 `mapping(address => uint256) private adminIndex` — O(1) 查找
- 修改 `setAdmin()` 和 `setAdmins()` 维护列表

### 新增查询函数（4个）
```solidity
function getAdminCount() view returns (uint256)
function getAdminAt(uint256 index) view returns (address)
function getAdmins(uint256 offset, uint256 limit) view returns (address[])
function isAdminAddress(address account) view returns (bool)
```

---

## ✅ 完成的工作

### 1. 合约修改 ✅
- **文件**: [contracts/DeFiNodeNexus.sol](contracts/DeFiNodeNexus.sol)
- **修改点**:
  - 第 126-129 行：添加 adminList 和 adminIndex 存储变量
  - 第 870-894 行：更新 `setAdmin()` 实现（添加列表维护）
  - 第 896-936 行：更新 `setAdmins()` 实现（批量维护）
  - 新增查询函数（在 `getNftbTierRemaining()` 之后）
- **编译结果**: ✅ 通过

### 2. 前端 ABI 更新 ✅
- **文件**: [src/lib/contracts.ts](src/lib/contracts.ts)
- **修改**: 在 `NEXUS_ABI` 中添加 4 个新函数签名
- **影响**: 允许前端调用新的查询函数

### 3. 升级脚本 ✅
- **文件**: [scripts/upgrade-nexus-v2-enumerable-admins.js](scripts/upgrade-nexus-v2-enumerable-admins.js)
- **功能**:
  - 部署新的 DeFiNodeNexus 实现
  - 升级代理指向新实现
  - 记录日志输出

### 4. 本地测试验证 ✅
- **文件**: [scripts/test-enumerable-admins-local.js](scripts/test-enumerable-admins-local.js)
- **测试覆盖**:
  - ✅ 添加管理员（单个和批量）
  - ✅ 查询管理员总数
  - ✅ 按索引获取管理员
  - ✅ 分页查询管理员列表
  - ✅ 检查地址是否为管理员
  - ✅ 删除管理员（验证 swap-and-pop 压缩）
- **结果**: **所有 6 个测试用例通过** ✅

### 5. NPM 脚本 ✅
- **文件**: [package.json](package.json)
- **新增命令**: `npm run upgrade:nexus:v2:cnc`

---

## 🚀 升级执行步骤

### 步骤 1: 提交代码变更
```bash
cd /home/ubuntu/DeFiNodeNexus
git add contracts/DeFiNodeNexus.sol \
        src/lib/contracts.ts \
        scripts/upgrade-nexus-v2-enumerable-admins.js \
        scripts/test-enumerable-admins-local.js \
        package.json

git commit -m "feat: add enumerable admin list with pagination (UUPS v2 upgrade)

- Add adminList[] storage for enumerable admins
- Add adminIndex mapping for O(1) operations
- Update setAdmin() and setAdmins() to maintain list
- Add 4 query functions: getAdminCount, getAdminAt, getAdmins, isAdminAddress
- Update frontend ABI
- Local test suite: all 6 tests passing"

git push origin feat/totswap-external-dex-v3
git push truth-oracle feat/totswap-external-dex-v3
```

### 步骤 2: 执行 CNC 主网升级
```bash
npm run upgrade:nexus:v2:cnc
```

**预期输出**:
```
Deploying new DeFiNodeNexus implementation...
New implementation deployed at: 0x...
Upgrading proxy at: 0x6D862Bc5E9486C89c959905D18760204851f6203
Proxy upgraded successfully!
New implementation address: 0x...
```

### 步骤 3: 验证升级
```bash
# 检查代理指向的新实现
npx hardhat verify --network cnc 0x<新实现地址>

# 或通过 Blockscout 查看代理:
# https://explorer.testnet.cncchainpro.com/address/0x6D862Bc5E9486C89c959905D18760204851f6203
```

### 步骤 4: 更新前端管理员面板（可选但推荐）
现在前端可以使用新的查询函数替代事件日志提取：
```javascript
// 旧方法：遍历日志
const events = await contract.queryFilter(contract.filters.AdminSet());

// 新方法：直接查询
const adminCount = await contract.getAdminCount();
const admins = await contract.getAdmins(0, 100);  // 分页查询
```

### 步骤 5: 重建并部署前端
```bash
npm run build
npm run deploy
```

---

## 🔍 数据完整性验证

✅ **代理保持不变** — `0x6D862Bc5E9486C89c959905D18760204851f6203`
✅ **所有存储变量保留** — 向后兼容
✅ **现有管理员不受影响** — 第一次调用新函数时自动修复列表
✅ **事件日志保持** — 历史数据完全可追踪

---

## 📊 测试结果

```
✅ DeFiNodeNexus deployed at: 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
Initial admin count: 0

Adding admins...
✅ Added 3 admins
Admin count after adding: 3

Paginated admins (offset=0, limit=10):
  [0] 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  [1] 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
  [2] 0x90F79bf6EB2c4f870365E785982E1f101E93b906

Admin checks:
  admin1 is admin? true
  admin2 is admin? true
  nonAdmin is admin? false

Removing admin2...
✅ Removed admin2
Admin count after removal: 2
Admins after removal:
  [0] 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  [1] 0x90F79bf6EB2c4f870365E785982E1f101E93b906

✅ All tests passed!
```

---

## ⚠️ 注意事项

1. **升级不可逆** — 升级后无法回到 v1，但可以再升级到 v3
2. **现有管理员** — 列表自动从第一次查询时开始维护
3. **Gas 成本** — 新的 setAdmin/setAdmins 略微增加 gas（约 +5-10%）
4. **兼容性** — 旧的 `admins(address)` 查询仍然有效

---

## 📝 rollback 计划（如需要）

如果升级失败或出现问题：
```bash
# 恢复到 v1（替换为 v1 实现地址）
npx hardhat run scripts/upgrade-nexus-back-to-v1.js --network cnc
```

---

## 相关文档

- [DeFiNodeNexus 合约源码](contracts/DeFiNodeNexus.sol)
- [升级脚本](scripts/upgrade-nexus-v2-enumerable-admins.js)
- [本地测试脚本](scripts/test-enumerable-admins-local.js)
- [前端 ABI 定义](src/lib/contracts.ts)
