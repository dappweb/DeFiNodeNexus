# 界面对齐完整清单

## 1. 配置统一化

### ✅ Tier 名称映射
- **位置**: `src/lib/ui-config.ts`
- **NFTA Tiers**:
  - Tier 1: "初级 · 创世荣耀"
  - Tier 2: "高级 · 创世王者"
- **NFTB Tiers**:
  - Tier 1: "初级 · 普通权杖"
  - Tier 2: "中级 · 稀有王冠"
  - Tier 3: "高级 · 传说神座"
- **使用函数**: `getNftaTierName()`, `getNftbTierName()`
- **页面适用**: nodes-page, earnings-page, team-page, admin-page

### ✅ 地址格式化
- **短格式**: `formatAddress()` → "0xabc...xyz"
- **完整格式**: `formatFullAddress()` → "0xabcdef..."
- **标签映射**: 零地址、燃烧地址等
- **应用位置**: 所有显示地址的地方

### ✅ 数值格式化
- **余额**: `formatBalance(bigint, decimals)` → "1.2345"
- **百分比**: `formatPercent(bps)` → "12.34%"
- **日期**: `formatDate(timestamp)` → "2026-04-02"
- **日期时间**: `formatDatetime(timestamp)` → "2026-04-02 14:30:45"

---

## 2. 组件统一化

### ✅ UI 组件库 (`src/components/ui-common.tsx`)
- **ActionStageBadge**: 操作阶段指示器（检查、授权、购买、确认）
- **OperationCard**: 统一的操作卡片
- **AlertBox**: 信息/警告/错误/成功提示框
- **AddressDisplay**: 地址显示组件（带复制功能）
- **InputField**: 统一的输入字段
- **StatusIndicator**: 状态指示器（激活/禁用/加载/错误）
- **TableRow**: 统一的表格行

### 应用指南
```tsx
// 替代直接的 Badge 组件
<ActionStageBadge stage="purchasing" title="购买中" />

// 替代复杂的 Card 嵌套
<OperationCard title="NFTA购买" description="选择等级并购买">
  {/* 内容 */}
</OperationCard>

// 替代手写的地址显示
<AddressDisplay address={address} short copyable label="创建者" />
```

---

## 3. 页面对齐检查

### 首页 (home-page.tsx)
- [x] 导入 `formatBalance`, `UI_PARAMS` 
- [x] 余额显示使用 `formatBalance()`
- [x] 使用统一的 Card 样式
- [ ] 待办: 集成 AlertBox 显示警告信息

### 节点页面 (nodes-page.tsx)
- [x] 导入 `getNftaTierName()`, `getNftbTierName()`
- [x] 删除本地 Tier 映射（已移到 ui-config）
- [x] Tier 名称显示统一
- [ ] 待办: 使用 ActionStageBadge 显示购买阶段
- [ ] 待办: 使用 OperationCard 重构购买卡片

### 收益页面 (earnings-page.tsx)
- [ ] 待办: 导入统一配置
- [ ] 待办: Tier 名称显示统一
- [ ] 待办: 日期时间格式统一
- [ ] 待办: 数值格式化统一

### 团队页面 (team-page.tsx)
- [ ] 待办: 地址显示统一
- [ ] 待办: Tier 名称统一

### 交换页面 (swap-page.tsx)
- [ ] 待办: 数值格式化统一
- [ ] 待办: 百分比显示统一

### 管理员页面 (admin-page.tsx)
- [x] 导入 `formatAddress`, `UI_PARAMS`
- [x] Owner 地址使用 `formatAddress()`
- [x] 更新描述文案
- [ ] 待办: 使用 AddressDisplay 组件
- [ ] 待办: 使用 ActionStageBadge 显示操作状态

---

## 4. API 响应处理

### ✅ 统一的 API 工具 (`src/lib/api-common.ts`)
- **callApi()**: 标准化 API 调用
- **toFriendlyError()**: 错误信息转换
- **RefreshManager**: 数据刷新管理
- **CacheManager**: 缓存管理
- **验证函数**: validateAddress, validatePositiveNumber

### 错误处理标准
```tsx
// 旧方式 - 不标准
toast({ description: error.message });

// 新方式 - 标准
import { toFriendlyError } from "@/lib/api-common";
toast({ description: toFriendlyError(error) });
```

---

## 5. 交互设计对齐

### 按钮状态
| 状态 | 样式 | 说明 |
|------|------|------|
| 正常 | `disabled={false}` | 可交互 |
| 禁用 | `disabled={true}` | 钱包未连接或权限不足 |
| 加载 | `disabled && loading` | 交易中 |

### 操作流程阶段
```
idle → checking → approving → purchasing → confirming → done
|
└─→ error (可返回 idle)
```

### Toast 反馈规范
```tsx
// 成功
toast({ title: t("操作名称成功"), description: txHash?.slice(0, 12) });

// 错误
toast({ title: t("操作名称失败"), description: toFriendlyError(error), variant: "destructive" });

// 信息
toast({ title: "提示", description: "信息内容" });
```

---

## 6. 数据刷新策略

### 刷新频率对齐
| 功能 | 频率 | 场景 |
|------|------|------|
| 余额查询 | 5秒 | HomePage, SwapPage |
| 节点列表 | 10秒 | NodesPage（非活动时） |
| 收益查询 | 15秒 | EarningsPage |
| 团队信息 | 30秒 | TeamPage |
| 手动操作后 | 立即 | 买入、领取、提现后 |

### 使用 RefreshManager
```tsx
import { getRefreshManager } from "@/lib/api-common";

const refreshMgr = getRefreshManager();

// 定期刷新
useEffect(() => {
  refreshMgr.schedule("nodes-data", refreshData, 10000);
  return () => refreshMgr.clear("nodes-data");
}, []);

// 立即刷新（有限流控）
await refreshMgr.immediate("nodes-data", refreshData);
```

---

## 7. 翻译 (i18n) 对齐

### 规范
- 所有文本必须使用 `t()` 函数
- 翻译键命名: `camelCase` 或 `snake_case`
- 避免硬编码中文字符串

### 常见翻译键
```
// 操作
toastBuyNftaSuccess
toastBuyNftaFailed
toastClaimSuccess
toastWithdrawSuccess

// 错误
toastTierInactiveOrSoldOut
toastUsdtApproveFailed
toastUsdtQuotaSoldOut

// 常量
initializing
loadingData
noDataAvailable
```

---

## 8. 响应式设计对齐

### 屏幕断点
- **移动**: `< 640px` - 单列布局
- **平板**: `640px - 1024px` - 2列布局  
- **桌面**: `> 1024px` - 3+ 列布局

### 网格类使用
```tsx
// 移动优先
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// 表格输入行
<div className="grid grid-cols-1 md:grid-cols-4 gap-2">
```

---

## 9. 无障碍性 (a11y) 对齐

### 检查清单
- [ ] 所有按钮有 aria-label 或 title
- [ ] 表单字段有关联的 label
- [ ] 颜色信息不是唯一的区分方式
- [ ] 键盘导航可用
- [ ] 对比度满足 WCAG AA 标准

---

## 10. 待办项优先级

### 高优先级（本周完成）
- [ ] 完成 Tier 名称统一（所有页面）
- [ ] 实现 ActionStageBadge 在节点页面
- [ ] 实现 toFriendlyError 在所有 API 调用

### 中优先级（下周完成）
- [ ] 重构所有 Card 使用 OperationCard
- [ ] 统一所有日期/数值格式化
- [ ] 实现 RefreshManager 数据刷新

### 低优先级（持续优化）
- [ ] 性能优化（缓存、虚拟列表）
- [ ] 动画效果统一
- [ ] 黑暗模式支持完善

---

## 验证命令

```bash
# 检查是否有硬编码的 Tier 名称
grep -r "创世荣耀\|稀有王冠\|传说神座" src/components --include="*.tsx"

# 检查是否有未使用 t() 的中文
grep -r "[\\u4e00-\\u9fa5]" src/components --include="*.tsx" | grep -v "//"

# 检查导入是否完整
grep -r "import.*ui-config" src/components/pages --include="*.tsx"
```

---

## 部署检查清单

- [ ] 所有 Tier 名称一致
- [ ] 所有地址显示使用 formatAddress()
- [ ] 所有错误使用 toFriendlyError()
- [ ] 所有操作反馈清晰
- [ ] 响应式设计测试通过
- [ ] 深色/浅色主题测试通过
- [ ] 移动设备测试通过
- [ ] 国际化文本完整

