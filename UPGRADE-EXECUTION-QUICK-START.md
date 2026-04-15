# UUPS v2 升级 - 快速执行指南

## 🔥 立即执行升级（CNC 主网）

```bash
cd /home/ubuntu/DeFiNodeNexus

# 方法 1: 使用 NPM 脚本（推荐）
npm run upgrade:nexus:v2:cnc

# 方法 2: 直接运行 Hardhat
npx hardhat run scripts/upgrade-nexus-v2-enumerable-admins.js --network cnc
```

## ⏱️ 升级时间表

| 步骤            | 时间         | 说明                      |
| --------------- | ------------ | ------------------------- |
| 1. 本地验证编译 | 5秒          | `npx hardhat compile`     |
| 2. 部署新实现   | 10-15秒      | 新 DeFiNodeNexus 合约部署 |
| 3. 升级代理     | 20-30秒      | 调用 proxy.upgradeTo()    |
| 4. 交易确认     | 30-60秒      | CNC 链确认（通常很快）    |
| **总计**        | **1-2 分钟** | **完整升级**              |

## 📋 升级前检查清单

- [x] 合约代码已修改
- [x] 前端 ABI 已更新
- [x] 本地测试已通过（6/6）
- [x] 编译成功
- [x] 升级脚本已创建
- [x] 代码已提交（本地）

## ⚠️ 升级风险评估

| 风险项       | 概率       | 缓解措施                   |
| ------------ | ---------- | -------------------------- |
| 代理损坏     | **非常低** | 使用标准 OpenZeppelin UUPS |
| 数据丢失     | **零**     | 代理存储完全保留           |
| 函数调用失败 | **极低**   | 本地测试全通过             |
| 网络超时     | **低**     | 可以重试                   |

## 🎯 升级成功指标

升级完成后应该看到：

```
✅ Deployment successful
   - New implementation address: 0x...
   - Proxy address: 0x6D862Bc5E9486C89c959905D18760204851f6203 (unchanged)
   - Transaction confirmed

✅ New functions available:
   - contract.getAdminCount()
   - contract.getAdminAt(index)
   - contract.getAdmins(offset, limit)
   - contract.isAdminAddress(address)
```

## 📊 升级后验证

```bash
# 1. 查看新实现地址
npx hardhat run -e "
const proxy = '0x6D862Bc5E9486C89c959905D18760204851f6203';
const impl = await ethers.provider.getStorageAt(proxy, '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc');
console.log('New implementation:', '0x' + impl.slice(-40));
" --network cnc

# 2. 测试新函数
npx hardhat run -e "
const contract = await ethers.getContractAt('DeFiNodeNexus', '0x6D862Bc5E9486C89c959905D18760204851f6203');
const count = await contract.getAdminCount();
console.log('Admin count:', count.toString());
" --network cnc
```

## 🚀 升级失败恢复

如果升级失败或需要回滚：

```bash
# 回滚到 v1（如果需要）
npx hardhat run scripts/rollback-to-v1.js --network cnc
```

## 📞 升级进度跟踪

升级执行后，在 [Blockscout CNC 浏览器](https://explorer.testnet.cncchainpro.com/address/0x6D862Bc5E9486C89c959905D18760204851f6203) 检查：

1. **代理交易** — 应该看到 `upgradeTo` 调用
2. **新实现地址** — 在合约详情页面看到
3. **交易状态** — "Success" 绿色标记

## 📝 升级后任务清单

```
升级完成后（用于前端团队）：
- [ ] 刷新前端缓存（CTRL+SHIFT+Delete）
- [ ] 测试管理员查询函数
- [ ] 更新管理员面板以使用 getAdmins() 分页
- [ ] 检查浏览器控制台是否有错误
- [ ] 重建 Next.js: npm run build
- [ ] 部署更新: npm run deploy
```

## 🔗 相关文件

- [完整升级文档](UUPS-V2-ENUMERABLE-ADMINS-UPGRADE.md)
- [升级脚本源码](scripts/upgrade-nexus-v2-enumerable-admins.js)
- [本地测试源码](scripts/test-enumerable-admins-local.js)
- [合约源码](contracts/DeFiNodeNexus.sol)
- [前端 ABI](src/lib/contracts.ts)

---

**准备好吗？执行升级：**

```bash
npm run upgrade:nexus:v2:cnc
```
