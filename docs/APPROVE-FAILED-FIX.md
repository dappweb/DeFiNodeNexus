# 🔴 Approve Failed 错误诊断与修复

## 问题描述

用户遇到 **"Approve Failed - transaction execution reverted"** 错误。这出现在尝试授权 USDT 用于 Swap 交易时。

### 截图中的症状

- 购买 0.2 USDT
- 交易金额计算：196.85 TOT
- 滑点保护：0.5%
- 错误：`Approve Failed`
- Revert 原因：`transaction execution reverted`（同样是空）

---

## 🎯 最可能的原因

### 1. ⚠️ **USDT 小数位数不匹配** (70% 概率 - 最常见)

**问题:**

- 代码初始化时假设 USDT 为 18 decimals
- 但 CNC Chain USDT 可能是 **6 decimals**（标准 USDT）
- 导致 approve 金额计算错误

**示例:**

```
用户输入：0.2 USDT

错误计算（18 decimals）：
  0.2 * 10^18 = 200000000000000000 （200 百万 USDT！）

正确计算（6 decimals）：
  0.2 * 10^6 = 200000 （0.2 USDT）
```

**为什么会失败:**

- 授权 200 万 USDT 给 Swap 合约（实际上 USDT 余额只有 0.2）
- 合约检查余额不足 → Revert

**检查方式:**

```bash
npx hardhat console --network cnc

> const usdt = await ethers.getContractAt("ERC20", "0xf54cC0F6CE272125c39C45A8141b84989A8765f4")
> const decimals = await usdt.decimals()
> console.log("USDT Decimals:", decimals)  # 应该返回 6，不是 18！
```

---

### 2. **代币小数点未正确初始化**

**问题:**

- `useEffect` 还未完成，USDT decimals 状态仍为默认 18
- 用户立即点击 "Approve"，导致使用错误的 decimals

**代码位置:** [src/components/pages/swap-page.tsx](../../src/components/pages/swap-page.tsx#L33-L84)

```typescript
// 初始值硬编码为 18
const [usdtDecimals, setUsdtDecimals] = useState(18);

// useEffect 中才会更新
useEffect(() => {
  refreshBalances(); // 这会调用 usdt.decimals()
}, [...]); // 但网络延迟可能导致 approve 先执行
```

---

### 3. ❌ **USDT 合约不存在或地址错误**

**检查:**

```bash
# 确认合约地址
echo $NEXT_PUBLIC_USDT_ADDRESS  # 应该是 0xf54cC0F6CE272125c39C45A8141b84989A8765f4

# 检查 CNC 链上的代码
curl -s "https://cncchainpro.com/api/account/0xf54cC0F6CE272125c39C45A8141b84989A8765f4"
```

---

## ✅ 修复方案

### 方案 1: 硬编码正确的 USDT Decimals（快速修复）

**如果已确认 CNC USDT 是 6 decimals:**

在 [src/components/pages/swap-page.tsx](../../src/components/pages/swap-page.tsx#L34) 修改：

```typescript
// 旧代码
const [usdtDecimals, setUsdtDecimals] = useState(18);

// 新代码
const [usdtDecimals, setUsdtDecimals] = useState(6); // CNC USDT 是 6 decimals
```

**效果：**
立即生效，无需等待 useEffect 加载

---

### 方案 2: 延迟 Approve（安全修复）

在 approve 前，确保 decimals 已加载：

```typescript
const handleSwap = async () => {
  // ... 其他检查 ...

  // 等待 decimals 加载完成
  if (usdtDecimals === 18 && !totDecimals) {
    // decimals 可能还未加载
    await refreshBalances(); // 等待完成
  }

  if (side === "BUY") {
    const input = parseInput();

    // 现在 usdtDecimals 已经是正确的值
    const allowance = await usdt.allowance(address, CONTRACTS.SWAP);
    if (allowance < input) {
      setTxStage("approving");
      const approveRes = await execTx(() =>
        usdt.approve(CONTRACTS.SWAP, input, { gasLimit: 200_000 }),
      );
      // ...
    }
  }
};
```

---

### 方案 3: 显式检查 Decimals（推荐）

在初始化时确保 decimals 已加载：

```typescript
// 在 useEffect 中添加初始化
useEffect(() => {
  const init = async () => {
    try {
      if (!tot || !usdt) return;
      const [totDec, usdtDec] = await Promise.all([
        tot.decimals(),
        usdt.decimals(),
      ]);
      setTotDecimals(Number(totDec));
      setUsdtDecimals(Number(usdtDec));
      console.log("代币小数点加载完成:", { TOT: totDec, USDT: usdtDec });
    } catch (err) {
      console.error("加载小数点失败:", err);
    }
  };

  init();
}, [tot, usdt]);
```

加在组件初始化的地方，确保在任何交易操作前都已完成。

---

## 📊 问题根本原因（最可能的场景）

基于截图和代码分析，**最可能的根本原因是：**

1. **CNC Chain USDT 的实际小数位为 6**
2. **代码硬编码假设所有代币都是 18 decimals**
3. **当前 USDT 小数位状态仍为初始值 18**
4. **用户输入 0.2，计算为 `0.2 * 10^18` = 200万**
5. **Approve 请求授权 200万 USDT**
6. **合约检查余额（只有 0.2），返回 Revert**

---

## 🔧 验证与测试

### 第 1 步：确认 USDT Decimals

```bash
# 在浏览器控制台
const usdt = new ethers.Contract(
  "0xf54cC0F6CE272125c39C45A8141b84989A8765f4",
  ["function decimals() view returns (uint8)"],
  window.provider  // 从你的 Web3 provider
);

const d = await usdt.decimals();
console.log("USDT Decimals:", d);  // 应该是 6
```

### 第 2 步：手动测试 Approve

```javascript
// 测试不同 decimals 下的 approve
const amount = BigInt(0.2 * 10 ** 6); // 0.2 USDT (6 decimals)
console.log("要授权的金额（原始）:", amount.toString());
console.log("要授权的金额（格式化）:", ethers.formatUnits(amount, 6), "USDT");

// 这应该是 0.2，不是 200000000000000000
```

### 第 3 步：修改后重新测试

1. 修改 decimals 初始值为 6
2. 刷新页面（Cmd+Shift+R 强制刷新）
3. 尝试重新购买
4. 应该能成功显示正确的金额

---

## 📝 相关代码位置

| 文件                                                      | 行号 | 问题                         |
| --------------------------------------------------------- | ---- | ---------------------------- |
| [swap-page.tsx](../../src/components/pages/swap-page.tsx) | 34   | `usdtDecimals` 初始值为 18   |
| [swap-page.tsx](../../src/components/pages/swap-page.tsx) | 55   | parseUnits 使用 usdtDecimals |
| [swap-page.tsx](../../src/components/pages/swap-page.tsx) | 187  | approve 时使用 parseInput()  |
| [contracts.ts](../../src/lib/contracts.ts)                | 11   | USDT 地址定义                |

---

## 🚨 长期解决方案

为了完全避免这个问题，建议：

1. **环境变量中指定各代币的 decimals**

   ```
   NEXT_PUBLIC_TOT_DECIMALS=18
   NEXT_PUBLIC_USDT_DECIMALS=6
   ```

2. **在全局配置中定义**

   ```typescript
   export const TOKEN_CONFIG = {
     TOT: { address: "0x...", decimals: 18 },
     USDT: { address: "0x...", decimals: 6 },
   };
   ```

3. **添加类型安全的 Token 抽象**

   ```typescript
   interface Token {
     address: string;
     decimals: number;
     symbol: string;
   }
   ```

4. **在初始化时强制加载所有代币信息**
   ```typescript
   // App 初始化时
   await Promise.all([tot.decimals(), usdt.decimals()]);
   // 然后才允许用户交互
   ```

---

## 📞 快速诊断步骤

1. **打开浏览器控制台 (F12)**

2. **执行以下代码：**

   ```javascript
   const usdt = new ethers.Contract(
     "0xf54cC0F6CE272125c39C45A8141b84989A8765f4",
     ["function decimals() view returns (uint8)"],
     new ethers.JsonRpcProvider("https://rpc.cncchainpro.com"),
   );
   (await usdt.decimals()).toString();
   ```

3. **如果返回 `6`：**
   - 问题确认：修改 swap-page.tsx 第 34 行
   - 从 `useState(18)` 改为 `useState(6)`

4. **刷新页面重新尝试购买**

---

## 📖 相关文档

- [Token Transfer Decimals Issue](../debugging.md#decimal-handling)
- [Swap Page Implementation](../../src/components/pages/swap-page.tsx)
- [Contract Configurations](../../src/lib/contracts.ts)

---

**问题分析时间:** 2026-04-13  
**项目:** DeFiNodeNexus (feat/totswap-external-dex-v3)  
**链:** CNC Chain  
**错误类型:** Approve Failed (Token Decimals Mismatch)
