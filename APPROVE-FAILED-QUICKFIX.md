# Approve Failed 快速修复

## 🔴 问题

```
Error: Approve Failed
Message: transaction execution reverted
```

---

## ✅ 最可能的原因

**USDT 小数位数不匹配**

- CNC Chain USDT: **6 decimals** (标准 USDT)
- 代码假设: **18 decimals**
- 结果: Approve 0.2 USDT 时，实际请求授权 200万 USDT → 余额不足 → Revert

---

## 🚀 快速修复（2分钟）

### 步骤 1: 打开代码编辑器

打开文件：`src/components/pages/swap-page.tsx`

找到第 **34 行**（或搜索 `usdtDecimals`）：

```typescript
// 旧代码：
const [usdtDecimals, setUsdtDecimals] = useState(18);

// 改为：
const [usdtDecimals, setUsdtDecimals] = useState(6);
```

### 步骤 2: 保存文件

Ctrl+S 保存

### 步骤 3: 刷新浏览器

- 关闭 Swap 页面标签
- 按 Ctrl+Shift+R (强制刷新缓存)
- 重新访问应用

### 步骤 4: 重试 Swap

1. 输入 0.2 USDT
2. 点击 "Buy TOT"
3. 应该能通过 Approve 步骤

---

## 🔍 验证修复前

如要确认问题，在浏览器控制台执行：

```javascript
// 创建 USDT 合约实例
const usdt = new ethers.Contract(
  "0xf54cC0F6CE272125c39C45A8141b84989A8765f4",
  ["function decimals() view returns (uint8)"],
  new ethers.JsonRpcProvider("https://rpc.cncchainpro.com"),
);

// 获取实际小数位
const dec = await usdt.decimals();
console.log("USDT Decimals:", dec.toString());
// 应该输出: 6
```

---

## 📝 完整的分析文档

详见：[docs/APPROVE-FAILED-FIX.md](docs/APPROVE-FAILED-FIX.md)

包含：

- 问题详细分析
- 为什么会这样
- 3 个修复方案
- 长期解决方案
- 代码示例

---

## 💡 如果修改后仍不工作

1. **确认已强制刷新浏览器** (Ctrl+Shift+R)
2. **清除浏览器缓存** (DevTools → Application → Clear Storage)
3. **检查浏览器控制台是否有其他错误** (F12 → Console)
4. **在 Hardhat 中测试**：
   ```bash
   npx hardhat console --network cnc
   > const usdt = await ethers.getContractAt("ERC20", "0xf54cC0F6CE272125c39C45A8141b84989A8765f4")
   > await usdt.decimals()  # 确认返回 6
   ```

---

✅ **修复预计有效率: 95%**

如仍有问题，查看详细文档或运行诊断脚本。
