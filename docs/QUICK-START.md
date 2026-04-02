# 🚀 UI 对齐快速启动卡

## 5 分钟快速入门

### 1️⃣ 导入核心库

```tsx
// 始终在文件顶部添加这些
import { 
  getNftaTierName, 
  formatAddress, 
  formatBalance 
} from "@/lib/ui-config";
import { toFriendlyError } from "@/lib/api-common";
import { ActionStageBadge, OperationCard } from "@/components/ui-common";
```

### 2️⃣ 显示 Tier 名称

```tsx
// ❌ 错误
<span>Tier {tierId}</span>

// ✅ 正确
<span>{getNftaTierName(tierId)}</span>
```

### 3️⃣ 格式化数值

```tsx
// ❌ 错误
<span>{balance.toString()}</span>

// ✅ 正确
<span>{formatBalance(balance, 18)}</span>
```

### 4️⃣ 显示地址

```tsx
// ❌ 错误
<span>{address}</span>

// ✅ 正确
<AddressDisplay address={address} short={true} copyable={true} />
```

### 5️⃣ 处理错误

```tsx
// ❌ 错误
catch (error) {
  toast({ description: error.message });
}

// ✅ 正确
catch (error) {
  toast({ description: toFriendlyError(error), variant: "destructive" });
}
```

### 6️⃣ 包装卡片

```tsx
// ❌ 错误
<div className="border rounded-lg p-4">
  <h3>标题</h3>
</div>

// ✅ 正确
<OperationCard 
  title="标题"
  description="描述"
  icon={<Coins />}
>
  {/* 内容 */}
</OperationCard>
```

### 7️⃣ 显示操作阶段

```tsx
// ❌ 错误
<Badge>{stage === 'buying' ? '购买中' : '完成'}</Badge>

// ✅ 正确
<ActionStageBadge stage={stage} />
```

---

## 常用代码片段

### 复制粘贴模板：购买卡片

```tsx
<OperationCard 
  title={`购买 ${getNftaTierName(selectedTier)}`}
  description={`价格: ${formatBalance(tierPrice, 18)} USDT`}
  icon={<Coins className="w-5 h-5" />}
>
  <ActionStageBadge stage={buyingStage} />
  
  <InputField
    label="推荐人"
    value={referrer}
    onChange={setReferrer}
    placeholder="0x..."
    help="可选，留空为零地址"
    error={referrerError}
  />
  
  <Button onClick={handleBuy} disabled={!referrer}>
    {t("buyNow")}
  </Button>
</OperationCard>
```

### 复制粘贴模板：数据显示

```tsx
<OperationCard title="我的信息">
  <TableRow
    label="持有 NFTA"
    value={getNftaTierName(myNfta?.tierId || 0)}
    help="最高等级"
  />
  
  <TableRow
    label="总余额"
    value={formatBalance(totalBalance, 18)}
    help={`更新于 ${formatDatetime(lastUpdate)}`}
  />
  
  <TableRow
    label="推荐人"
    value={
      referrer ? (
        <AddressDisplay address={referrer} short={true} />
      ) : (
        "未设置"
      )
    }
  />
</OperationCard>
```

### 复制粘贴模板：错误处理

```tsx
const handleOperation = async () => {
  try {
    setLoading(true);
    const result = await contract.someMethod();
    toast({
      title: t("operationSuccess"),
      description: t("operationSuccessMsg"),
    });
  } catch (error) {
    toast({
      title: t("operationFailed"),
      description: toFriendlyError(error),
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};
```

### 复制粘贴模板：定期刷新

```tsx
const refreshData = useCallback(async () => {
  try {
    const data = await fetchData();
    setData(data);
  } catch (error) {
    console.error("Refresh failed:", error);
  }
}, []);

useEffect(() => {
  const mgr = getRefreshManager();
  mgr.schedule("page-key", refreshData, 5000);
  return () => mgr.clear("page-key");
}, [refreshData]);
```

---

## 性能优化技巧

### 禁止事项 ❌

```tsx
// ❌ 每次都获取新实例
const formatters = { formatBalance };

// ❌ 重复的 setInterval
setInterval(() => fetch(), 1000);

// ❌ 直接显示错误
toast({ description: error.message });

// ❌ 硬编码地址格式
address.substr(0, 6) + '...' + address.substr(-4);

// ❌ 每个页面定义自己的 Tier 名称
const TIER_NAMES = { 1: "初级" };
```

### 推荐做法 ✅

```tsx
// ✅ 从中央库导入（共享实例）
import { formatBalance } from "@/lib/ui-config";

// ✅ 使用 RefreshManager（自动限流）
getRefreshManager().schedule("key", fn, 1000);

// ✅ 使用 toFriendlyError（统一处理）
toast({ description: toFriendlyError(error) });

// ✅ 使用 formatAddress（一致的格式）
formatAddress(address);

// ✅ 使用中央的 Tier 数组
getNftaTierName(tierId);
```

---

## 调试技巧

### 检查类型安全

```bash
npm run type-check
```

### 查找未格式化的数值

```bash
grep -r "\.toString()\|toFixed()\|substr(" \
  src/components/pages --include="*.tsx"
```

### 查找硬编码的 Tier 名称

```bash
grep -r "初级\|高级\|普通\|稀有" \
  src/components/pages --include="*.tsx" | \
  grep -v "getNfta"
```

### 查找未统一的错误处理

```bash
grep -r "error\.message\|error\.toString()" \
  src/components/pages --include="*.tsx"
```

### 查找直接的地址格式化

```bash
grep -r "substr\|slice\|substring" \
  src/components/pages --include="*.tsx" | \
  grep -i "address\|addr"
```

---

## 常见问题答案

| 问题 | 答案 |
|------|------|
| 何时使用 formatAddress? | 在 UI 显示地址时始终使用 |
| formatBalance 的参数? | (值, 小数位数) 通常是 (balance, 18) |
| 如何获取 Tier 图标? | `NFTA_TIERS.find(t => t.id === id)?.icon` |
| ActionStageBadge 的 stage 值? | 'checking' \| 'approving' \| 'purchasing' \| 'confirming' |
| 何时创建新的 Tier? | 在 ui-config.ts 中更新数组，然后刷新 |
| 错误信息是否支持国际化? | 支持，在 ERROR_MESSAGES 中使用 t() |

---

## 关键文件位置

| 功能 | 文件位置 |
|------|---------|
| Tier 名称 | `src/lib/ui-config.ts` 第 15-40 行 |
| 格式化函数 | `src/lib/ui-config.ts` 第 60-100 行 |
| UI 组件 | `src/components/ui-common.tsx` |
| 错误处理 | `src/lib/api-common.ts` 第 10-30 行 |
| RefreshManager | `src/lib/api-common.ts` 第 50-80 行 |

---

## 下一步

1. 阅读完整的 [实施路线图](./IMPLEMENTATION-ROADMAP.md)
2. 参考 [集成指南](../src/lib/integration-guide.ts)
3. 查看 [对齐检查表](./UI-ALIGNMENT-CHECKLIST.md)
4. 运行验证: `npm run type-check && npm run lint`

---

**需要帮助?** 查看相关文件或在 code 中搜索使用示例
