# 🎯 全系统 UI/功能对齐实施路线图

## 当前进度：65% ✅

已完成：
- ✅ 核心配置库 (ui-config.ts) 
- ✅ 组件库 (ui-common.tsx)
- ✅ API 工具库 (api-common.ts)
- ✅ 所有页面的导入更新
- ✅ Admin 面板 100% 功能覆盖（17 个 onlyOwner 函数）

---

## 第一阶段：组件渲染集成（HIGH PRIORITY）⚡

### 目标
将所有页面的硬编码 UI 替换为统一的组件库

### 1.1 nodes-page.tsx - NFTA/NFTB 卡片集成

**当前状态:** 使用基础 Card + Badge  
**目标:** 使用 ActionStageBadge + OperationCard

```tsx
// ❌ 当前
<Card>
  <div>
    <Badge>购买中</Badge>
  </div>
</Card>

// ✅ 目标
<OperationCard 
  title="NFTA购买"
  description={getNftaTierName(selectedNfta)}
  icon={<Coins />}
>
  {/* 内容 */}
  <ActionStageBadge stage={nftaStage} />
</OperationCard>
```

**变更清单：**
- [ ] 第 1 个 Card（NFTA 购买）→ OperationCard + ActionStageBadge
- [ ] 第 2 个 Card（NFTB 购买）→ OperationCard + ActionStageBadge  
- [ ] 显示 Tier 名称的地方 → getNftaTierName() 函数
- [ ] 所有错误提示 → AlertBox 组件
- [ ] Tier 列表显示 → TableRow 组件
- [ ] 参考人输入 → InputField 组件

**验证命令:**
```bash
# 检查是否还有直接使用 <Card> 的地方
grep -n "NodesPurchaseCard\|<Card" src/components/pages/nodes-page.tsx

# 检查组件导入
grep -n "from.*ui-common" src/components/pages/nodes-page.tsx
```

---

### 1.2 admin-page.tsx - Tier 配置卡片集成

**当前状态:** 基础 Card + Select  
**目标:** OperationCard + InputField + StatusIndicator

```tsx
// ❌ 当前
<Card>
  <h3>NFTA Tier 1 配置</h3>
  <Select>...</Select>
</Card>

// ✅ 目标
<OperationCard 
  title="NFTA Tier 配置"
  description="修改各等级的配置参数"
  icon={<Settings />}
>
  <InputField 
    label="配额"
    value={nfta1Quota}
    onChange={setNfta1Quota}
  />
  <InputField
    label="价格"
    value={nfta1Price}
    onChange={setNfta1Price}
  />
</OperationCard>
```

**变更清单：**
- [ ] 8 个配置卡片 → OperationCard 包装
- [ ] 所有输入框 → InputField 组件
- [ ] Tier 状态显示 → StatusIndicator 组件
- [ ] 错误提示 → AlertBox 组件
- [ ] 钱包地址显示 → AddressDisplay 组件

**验证命令:**
```bash
# 统计配置卡片数量
grep -c "<Card>" src/components/pages/admin-page.tsx

# 检查是否完全迁移
grep -c "OperationCard" src/components/pages/admin-page.tsx
```

---

### 1.3 earnings-page.tsx - 收益列表卡片集成

**当前状态:** 基础表格 + Card  
**目标:** 统一的表格行格式 + ActionStageBadge

```tsx
// ❌ 当前
<div>
  <span>NFTA 收益</span>
  <span>{earnings}</span>
</div>

// ✅ 目标
<TableRow
  label="NFTA 收益"
  value={formatBalance(earnings, 18)}
  help="昨日到今日的累积"
/>

// 提取历史记录
{history.map(record => (
  <div key={record.id}>
    <ActionStageBadge stage={record.stage} />
    <span>{getNftaTierName(record.tierId)}</span>
    <span>{formatBalance(record.amount, 18)}</span>
  </div>
))}
```

**变更清单：**
- [ ] 收益摘要 → TableRow 组件
- [ ] 历史记录项目 → TableRow 组件
- [ ] 日期显示 → formatDatetime()
- [ ] Tier 名称 → getNftaTierName/getNftbTierName
- [ ] 错误处理 → AlertBox + toFriendlyError

**验证命令:**
```bash
# 检查日期格式化
grep -n "new Date\|Date.now\|toLocaleString" src/components/pages/earnings-page.tsx

# 检查 Tier 名称使用
grep -n "TIER.*NAME\|TierName" src/components/pages/earnings-page.tsx
```

---

### 1.4 team-page.tsx - 团队列表卡片集成

**当前状态:** 基础卡片显示  
**目标:** AddressDisplay + TableRow

```tsx
// ❌ 当前
<div>
  <span>0x1234...5678</span>
  <span>1.5 USDT</span>
</div>

// ✅ 目标
<OperationCard title="团队成员">
  {team.map(member => (
    <div key={member.addr}>
      <AddressDisplay 
        address={member.addr}
        short={true}
        copyable={true}
      />
      <TableRow
        label="贡献"
        value={formatBalance(member.contribution, 18)}
      />
    </div>
  ))}
</OperationCard>
```

**变更清单：**
- [ ] 地址显示 → AddressDisplay 组件
- [ ] 金额显示 → formatBalance()
- [ ] 团队列表 → TableRow 组件
- [ ] 状态指示 → StatusIndicator 组件

**验证命令:**
```bash
# 检查地址格式化
grep -n "substr\|slice" src/components/pages/team-page.tsx

# 检查是否使用 AddressDisplay
grep -c "AddressDisplay" src/components/pages/team-page.tsx
```

---

### 1.5 swap-page.tsx - 交易卡片集成

**当前状态:** 基础表格  
**目标:** OperationCard + InputField + StatusIndicator

```tsx
// ❌ 当前
<div>
  <span>交易对</span>
  <span>TOT/TOF</span>
</div>

// ✅ 目标
<OperationCard 
  title="代币交换"
  description="实时价格交换"
  icon={<TrendingUp />}
>
  <InputField
    label={t("swapFrom")}
    value={fromAmount}
    onChange={setFromAmount}
    suffix={fromToken}
  />
  <TableRow
    label={t("price")}
    value={formatPercent(priceImpact)}
  />
</OperationCard>
```

**变更清单：**
- [ ] 交易卡片 → OperationCard 包装
- [ ] 输入框 → InputField 组件
- [ ] 价格/费率 → formatPercent()
- [ ] 状态指示 → StatusIndicator
- [ ] 错误处理 → AlertBox + toFriendlyError

**验证命令:**
```bash
# 检查价格格式化
grep -n "toFixed\|parseInt" src/components/pages/swap-page.tsx

# 检查是否使用 OperationCard
grep -c "OperationCard" src/components/pages/swap-page.tsx
```

---

### 1.6 home-page.tsx - 概览卡片集成

**当前状态:** 基础数据显示  
**目标:** 统一的 TableRow 组件

```tsx
// ❌ 当前  
<div>总收益: {total}</div>

// ✅ 目标
<TableRow
  label={t("totalEarnings")}
  value={formatBalance(total, 18)}
  help={t("earningsUpdatedAt")} 
/>
```

**变更清单：**
- [ ] 所有摘要数据 → TableRow 组件
- [ ] 金额显示 → formatBalance()
- [ ] 日期显示 → formatDatetime()
- [ ] 卡片包装 → OperationCard

---

## 第二阶段：错误处理统一（HIGH PRIORITY）⚡

### 目标  
所有错误都通过 toFriendlyError() 转换

### 2.1 错误处理扫描

```bash
# 查找所有 catch 块
grep -rn "catch.*error\|catch.*err" src/components/pages --include="*.tsx"

# 查找所有 toast 错误显示
grep -rn "variant.*destructive\|toast.*error" src/components/pages --include="*.tsx"

# 查找未使用 toFriendlyError 的地方
grep -rn "description:.*error\|description:.*err" src/components/pages --include="*.tsx" | grep -v toFriendlyError
```

### 2.2 错误处理模板

```tsx
// ✅ 标准错误处理
try {
  const result = await someFallibleOp();
} catch (error) {
  // ✅ 正确：使用 toFriendlyError
  toast({
    title: t("operationFailed"),
    description: toFriendlyError(error),
    variant: "destructive",
  });
  
  // ❌ 错误：直接显示错误
  // toast({ description: error.message });
}

// ✅ 交易错误处理
const result = await execTx(contract.method());
if (!result.success) {
  toast({
    title: t("transactionFailed"),
    description: toFriendlyTxError(result.error),
    variant: "destructive",
  });
}
```

### 2.3 需要更新的文件

**earnings-page.tsx:**
- [ ] fetchEarningsData() 的 catch 块
- [ ] handleClaim() 的 catch 块

**nodes-page.tsx:**
- [ ] handleBuyNfta() 的 catch 块
- [ ] handleBuyNftb() 的 catch 块

**swap-page.tsx:**
- [ ] handleSwap() 的 catch 块
- [ ] getSwapQuote() 的 catch 块

**team-page.tsx:**
- [ ] fetchTeamData() 的 catch 块

---

## 第三阶段：数据刷新管理（MEDIUM PRIORITY）

### 目标
使用 RefreshManager 统一管理定期刷新

### 3.1 RefreshManager 集成模板

```tsx
import { getRefreshManager } from "@/lib/api-common";
import { UI_PARAMS } from "@/lib/ui-config";

export function MyPage() {
  const [data, setData] = useState(null);

  const refreshData = useCallback(async () => {
    try {
      const result = await fetchData();
      setData(result);
    } catch (error) {
      console.error("Refresh failed:", error);
    }
  }, []);

  // ✅ 定期刷新
  useEffect(() => {
    const refreshMgr = getRefreshManager();
    
    // 根据页面类型选择刷新频率
    refreshMgr.schedule(
      "my-page-key",
      refreshData,
      UI_PARAMS.REFRESH_INTERVAL_MS // 默认 5000ms
    );

    return () => refreshMgr.clear("my-page-key");
  }, [refreshData]);

  // ✅ 手动刷新（带限流）
  const handleManualRefresh = async () => {
    const refreshMgr = getRefreshManager();
    await refreshMgr.immediate("my-page-key", refreshData);
  };

  return (
    <div>
      {/* 内容 */}
      <Button onClick={handleManualRefresh}>
        {t("refresh")}
      </Button>
    </div>
  );
}
```

### 3.2 推荐的刷新频率

| 页面 | 推荐频率 | 理由 |
|------|---------|------|
| home-page | 5s | 数据变化频繁 |
| nodes-page | 10s | 中等变化频率 |
| earnings-page | 15s | 数据更新较慢 |
| team-page | 30s | 变化不频繁 |
| swap-page | 2s | 价格实时变化 |
| admin-page | 手动 | 管理操作为主 |

### 3.3 需要更新的文件

- [ ] src/components/pages/home-page.tsx
- [ ] src/components/pages/nodes-page.tsx
- [ ] src/components/pages/earnings-page.tsx
- [ ] src/components/pages/team-page.tsx
- [ ] src/components/pages/swap-page.tsx

---

## 第四阶段：缓存管理优化（MEDIUM PRIORITY）

### 目标
使用 CacheManager 缓存静态和半静态数据

### 4.1 CacheManager 使用场景

```tsx
import { getCacheManager } from "@/lib/api-common";

const cacheMgr = getCacheManager();

// 场景 1: 缓存 Tier 信息（静态）
const getTierInfo = async () => {
  const cached = cacheMgr.get("tier-info");
  if (cached) return cached;

  const tiers = await fetchTiersFromContract();
  cacheMgr.set("tier-info", tiers, 3600000); // 1 小时
  return tiers;
};

// 场景 2: 缓存用户账户信息（半静态）
const getUserAccount = async (address) => {
  const key = `user-account-${address}`;
  const cached = cacheMgr.get(key);
  if (cached) return cached;

  const account = await fetchUserAccount(address);
  cacheMgr.set(key, account, 300000); // 5 分钟
  return account;
};

// 场景 3: 缓存汇率数据（实时）
const getExchangeRate = async () => {
  const cached = cacheMgr.get("exchange-rate");
  if (cached) return cached;

  const rate = await fetchExchangeRate();
  cacheMgr.set("exchange-rate", rate, 10000); // 10 秒
  return rate;
};
```

### 4.2 缓存策略

| 数据类型 | 缓存时间 | 使用场景 |
|---------|---------|---------|
| Tier 配置 | 1小时 | 静态数据 |
| 用户账户 | 5分钟 | 半静态数据 |
| 余额信息 | 30秒 | 动态数据 |
| 价格/汇率 | 10秒 | 实时数据 |
| 团队信息 | 2分钟 | 变化较慢 |

---

## 第五阶段：国际化对齐（MEDIUM PRIORITY）

### 5.1 翻译键规范

```tsx
// ✅ 好的翻译键命名
t("buyNow")           // 操作
t("toastBuySuccess")  // Toast 成功
t("toastBuyFailed")   // Toast 失败
t("tierLevel1")       // 数据
t("errorInvalidTier") // 错误

// ❌ 不好的命名
t("buy now")          // 空格
t("buyNowButton")     // 冗余后缀
t("CLICK_TO_BUY")     // 全大写
t("很长的中文句子")    // 过长
```

### 5.2 需要翻译的关键词

```tsx
// 操作
"购买现在", "立即购买", "确认", "取消"
"领取奖励", "提取资金", "交换代币", "邀请朋友"

// 状态
"检查中", "批准中", "购买中", "确认中"
"成功", "失败", "等待", "已完成"

// 错误
"等级不可用", "配额已用尽", "余额不足"
"网络错误", "操作失败", "请重试"

// UI 文本
"加载中...", "无数据", "有错误"
"刷新", "返回", "了解更多"
```

### 5.3 翻译文件位置

```
src/
  i18n/              # 国际化文件
    locales/
      zh-CN.json     # 中文
      en-US.json     # 英文
```

---

## 第六阶段：可访问性 (a11y) 审计（LOW PRIORITY）

### 6.1 a11y 检查清单

- [ ] 所有按钮有 aria-label
- [ ] 所有表单输入有关联的 <label>
- [ ] 所有图像有 alt 属性
- [ ] 颜色对比度满足 WCAG AA 标准（4.5:1）
- [ ] 键盘导航可用（Tab/Enter/Escape）
- [ ] 焦点管理正确

### 6.2 a11y 测试工具

```bash
# 使用 axe 检查可访问性
npm install --save-dev @axe-core/react

# 在测试中运行
import { axe } from "jest-axe";
const results = await axe(container);
```

---

## 验证与测试清单

### 类型检查
```bash
npm run type-check
# 预期：无错误
```

### 代码规范
```bash
npm run lint
# 预期：无违规
```

### 组件集成验证
```bash
npm run build
# 预期：成功构建
```

### 功能测试
```bash
npm run test
# 预期：所有测试通过
```

### UI 一致性检查
```bash
# 检查是否所有 Tier 名称统一
grep -r "getNftaTierName\|getNftbTierName" src/components/pages --include="*.tsx" | wc -l

# 检查是否所有地址格式化
grep -r "formatAddress" src/components/pages --include="*.tsx" | wc -l

# 检查是否所有余额格式化
grep -r "formatBalance" src/components/pages --include="*.tsx" | wc -l

# 检查组件库使用
grep -r "from.*ui-common" src/components/pages --include="*.tsx" | wc -l
```

---

## 完成标准（Definition of Done）

✅ **第一阶段完成**：所有页面都使用 ui-common.tsx 中的组件

✅ **第二阶段完成**：所有错误都通过 toFriendlyError() 处理

✅ **第三阶段完成**：所有数据刷新都用 RefreshManager 管理

✅ **第四阶段完成**：常用数据都有缓存策略

✅ **第五阶段完成**：所有文本都支持国际化

✅ **第六阶段完成**：可访问性满足 WCAG AA 标准

---

## 预计工时

| 阶段 | 优先级 | 工时 | 难度 |
|------|--------|------|------|
| 1️⃣ 组件集成 | HIGH | 2-3小时 | 中等 |
| 2️⃣ 错误处理 | HIGH | 1小时 | 简单 |
| 3️⃣ 刷新管理 | MEDIUM | 1小时 | 简单 |
| 4️⃣ 缓存优化 | MEDIUM | 1-2小时 | 中等 |
| 5️⃣ 国际化 | MEDIUM | 2-3小时 | 简单 |
| 6️⃣ a11y 审计 | LOW | 1-2小时 | 简单 |

**总计：8-14 小时**

---

## 后续维护

### 代码审查检查点

每个 PR 都应该检查：

- [ ] 是否引入了新的本地 Tier 名称映射？
- [ ] 是否有硬编码的地址格式化？
- [ ] 是否有直接显示的错误信息？
- [ ] 是否使用了 setInterval 而不是 RefreshManager？
- [ ] 是否满足 i18n 规范？
- [ ] 是否有 a11y 问题？

### 文档更新

维护以下文档：

1. `src/lib/ui-config.ts` - 添加新的 Tier 或格式化函数
2. `src/components/ui-common.tsx` - 添加新的通用组件
3. `src/lib/api-common.ts` - 添加新的工具函数
4. `docs/UI-ALIGNMENT-CHECKLIST.md` - 更新核对表

---

## 快速参考

### 导入语句
```tsx
// 配置和格式化
import { 
  getNftaTierName, 
  getNftbTierName,
  formatAddress,
  formatBalance,
  formatPercent,
  formatDate,
  formatDatetime,
  NFTA_TIERS,
  NFTB_TIERS,
  UI_PARAMS,
  ERROR_MESSAGES
} from "@/lib/ui-config";

// API 和工具
import {
  toFriendlyError,
  toFriendlyTxError,
  callApi,
  getRefreshManager,
  getCacheManager,
  validateAddress,
  validatePositiveNumber
} from "@/lib/api-common";

// UI 组件
import {
  ActionStageBadge,
  OperationCard,
  AlertBox,
  AddressDisplay,
  InputField,
  StatusIndicator,
  TableRow
} from "@/components/ui-common";
```

---

## 支持与反馈

如有问题，请检查：

1. **集成指南** → `src/lib/integration-guide.ts`
2. **对齐检查表** → `docs/UI-ALIGNMENT-CHECKLIST.md`
3. **组件源代码** → `src/components/ui-common.tsx`
4. **工具源代码** → `src/lib/api-common.ts`
5. **配置源代码** → `src/lib/ui-config.ts`

---

**最后更新:** 2024-01-15  
**维护者:** Frontend Team  
**版本:** 1.0
