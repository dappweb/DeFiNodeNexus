# 📚 UI 对齐资源索引

## 核心库 (Core Libraries)

### 1. `src/lib/ui-config.ts`
**用途**: 中央配置与格式化函数库  
**大小**: 160 行  
**关键导出**:
- `NFTA_TIERS` - NFTA 等级数组
- `NFTB_TIERS` - NFTB 等级数组
- `getNftaTierName(id)` - 获取 NFTA 等级名称
- `getNftbTierName(id)` - 获取 NFTB 等级名称
- `formatAddress(addr)` - 格式化地址为短格式
- `formatBalance(value, decimals)` - 格式化余额
- `formatPercent(bps)` - 格式化百分比
- `formatDate(timestamp)` - 格式化日期
- `formatDatetime(timestamp)` - 格式化日期时间
- `ERROR_MESSAGES` - 错误信息映射
- `UI_PARAMS` - UI 常数 (刷新间隔等)
- `SPECIAL_ADDRESSES` - 特殊地址标签

**何时使用**: 需要获取任何 Tier 名称、格式化数值或地址时

---

### 2. `src/lib/api-common.ts`
**用途**: API 调用、错误处理、数据生命周期管理  
**大小**: 220 行  
**关键导出**:
- `toFriendlyError(error)` - 转换错误为用户友好的消息
- `toFriendlyTxError(txError)` - 转换交易错误
- `callApi<T>(url, options)` - 标准 API 调用包装
- `RefreshManager` 类 - 管理定期数据刷新
  - `.schedule(key, callback, interval)` - 定期刷新
  - `.immediate(key, callback)` - 立即刷新（带限流）
  - `.clear(key)` - 清除特定刷新
  - `.clearAll()` - 清除所有刷新
- `CacheManager` 类 - 缓存管理
  - `.set(key, value, ttl)` - 设置缓存
  - `.get<T>(key)` - 获取缓存
  - `.has(key)` - 检查缓存存在
  - `.clear()` - 清除所有缓存
- `getRefreshManager()` - 获取全局刷新管理器实例
- `getCacheManager()` - 获取全局缓存管理器实例
- Validators: `validateAddress()`, `validatePositiveNumber()`, `validateUrl()`
- Type guards: `isApiResponse<T>()`, `isTxResult()`

**何时使用**: 需要调用 API、处理错误、管理刷新频率或缓存数据时

---

### 3. `src/components/ui-common.tsx`
**用途**: 可复用的 UI 组件库  
**大小**: 280 行  
**包含的组件**:

#### ActionStageBadge
显示操作阶段的徽章，支持 4 个阶段：`checking`, `approving`, `purchasing`, `confirming`

```tsx
<ActionStageBadge stage={stage} />
```

#### OperationCard
统一的操作卡片包装

```tsx
<OperationCard
  title="标题"
  description="描述"
  icon={<Icon />}
>
  {/* 内容 */}
</OperationCard>
```

#### AlertBox
提示框，支持 4 种类型：`info`, `warning`, `error`, `success`

```tsx
<AlertBox type="warning" title="提醒" message="内容" />
```

#### AddressDisplay
地址显示控件，支持短格式和复制功能

```tsx
<AddressDisplay address={addr} short={true} copyable={true} />
```

#### InputField
标准输入框，支持标签、帮助文本和错误显示

```tsx
<InputField
  label="标签"
  value={value}
  onChange={setValue}
  placeholder="占位符"
  help="帮助文本"
  error={error}
/>
```

#### StatusIndicator
状态指示符，支持 4 种状态：`active`, `inactive`, `loading`, `error`

```tsx
<StatusIndicator status={status} label="标签" />
```

#### TableRow
表格行，用于显示键值对

```tsx
<TableRow label="标签" value="值" help="帮助文本" />
```

**何时使用**: 构建新的 UI 页面或组件时

---

## 文档与指南

### 4. `docs/UI-ALIGNMENT-CHECKLIST.md`
**用途**: UI 对齐核心检查表  
**内容**:
- 当前进度（65%）
- 10 个核查维度
- Tier 映射表
- 组件采用指南
- 页面逐一检查清单
- API 响应处理标准
- 数据刷新策略表
- 国际化指南
- 可访问性要求
- 验证命令
- 部署检查清单

**位置**: `docs/UI-ALIGNMENT-CHECKLIST.md`

---

### 5. `docs/IMPLEMENTATION-ROADMAP.md`
**用途**: 完整实施路线图  
**内容**:
- 6 个实施阶段（每个 HIGH/MEDIUM/LOW 优先级）
- 每个阶段的具体目标和检查清单
- 代码示例和验证命令
- 预计工时
- 后续维护指南
- 完成标准 (Definition of Done)
- 代码评审检查点

**阶段**:
1. 组件渲染集成 (HIGH)
2. 错误处理统一 (HIGH)
3. 数据刷新管理 (MEDIUM)
4. 缓存管理优化 (MEDIUM)
5. 国际化对齐 (MEDIUM)
6. 可访问性审计 (LOW)

**位置**: `docs/IMPLEMENTATION-ROADMAP.md`

---

### 6. `docs/QUICK-START.md`
**用途**: 5 分钟快速入门卡  
**内容**:
- 7 个核心模式（导入、Tier、数值、地址、错误、卡片、阶段）
- 常用代码片段（可复制粘贴模板）
- 性能优化技巧
- 调试技巧
- 常见问题答案
- 关键文件位置表

**模板**:
- 购买卡片模板
- 数据显示模板
- 错误处理模板
- 定期刷新模板

**位置**: `docs/QUICK-START.md`

---

### 7. `src/lib/integration-guide.md`
**用途**: 代码示例和集成指南  
**内容**:
- 12 个主题的完整代码示例
- Tier 配置示例
- 地址显示规范
- 数值格式化规范
- 日期/时间对齐规范
- 错误处理规范
- 组件使用规范
- API 调用规范
- 页面模板示例
- 翻译键命名规范
- 测试检查清单
- 性能优化建议
- 常见问题解答

**位置**: `src/lib/integration-guide.md`

---

## 更新的页面组件

### 已更新文件清单

| 文件 | 更新内容 | 状态 |
|------|---------|------|
| `src/components/pages/admin-page.tsx` | 从 400→750 行，添加 8 个新的管理卡片 | ✅ |
| `src/components/pages/nodes-page.tsx` | 导入中央 Tier 函数，移除本地映射 | ✅ |
| `src/components/pages/home-page.tsx` | 导入格式化函数 | ✅ |
| `src/components/pages/earnings-page.tsx` | 导入 Tier、日期格式化和错误处理 | ✅ |
| `src/components/pages/team-page.tsx` | 导入地址和余额格式化 | ✅ |
| `src/components/pages/swap-page.tsx` | 导入百分比格式化和错误处理 | ✅ |

---

## 快速参考：何时使用什么

### 需要 Tier 名称?
```tsx
import { getNftaTierName, getNftbTierName } from "@/lib/ui-config";
const name = getNftaTierName(tierId);
```

### 需要格式化地址?
```tsx
import { formatAddress, AddressDisplay } from "@/lib/ui-config";
// 在代码中
const short = formatAddress(address);
// 在 JSX 中
<AddressDisplay address={address} short={true} />
```

### 需要格式化数值?
```tsx
import { formatBalance, formatPercent } from "@/lib/ui-config";
const balance = formatBalance(value, 18);
const pct = formatPercent(bps);
```

### 需要包装卡片?
```tsx
import { OperationCard } from "@/components/ui-common";
<OperationCard title="操作" description="描述">
  {/* 内容 */}
</OperationCard>
```

### 需要处理错误?
```tsx
import { toFriendlyError } from "@/lib/api-common";
try {
  // 操作
} catch (error) {
  toast({ description: toFriendlyError(error) });
}
```

### 需要定期刷新?
```tsx
import { getRefreshManager } from "@/lib/api-common";
const mgr = getRefreshManager();
mgr.schedule("key", callback, 5000);
```

### 需要缓存?
```tsx
import { getCacheManager } from "@/lib/api-common";
const cache = getCacheManager();
cache.set("key", data, 30000);
```

---

## 文件关系图

```
┌─────────────────────────────────────────────────────────────┐
│                    文档与指南                                 │
├─────────────────────────────────────────────────────────────┤
│  • UI-ALIGNMENT-CHECKLIST.md (核心检查表)                   │
│  • IMPLEMENTATION-ROADMAP.md (详细路线图)                   │
│  • QUICK-START.md (快速入门)                                 │
│  • RESOURCES-INDEX.md (本文件)                              │
└──────────────┬──────────────────────┬──────────────────────┘
               │                      │
        ┌──────┴──────┐         ┌─────┴────────┐
        │              │         │               │
        v              v         v               v
    ┌────────┐    ┌──────────┐ ┌──────────┐ ┌─────────┐
    │ui-config│   │api-common│ │ui-common │ │integration
    │.ts      │   │.ts       │ │.tsx      │ │guide.md
    │         │   │          │ │          │ │
    │• Tier   │   │• Errors  │ │• Component│ │• Examples
    │• Format │   │• Refresh │ │• stdUI   │ │• Patterns
    │• Const  │   │• Cache   │ │         │ │
    └────────┘   └──────────┘ └──────────┘ └─────────┘
        │              │             │
        └──────────────┼─────────────┘
                       │
        ┌──────────────┴───────────────┐
        │                              │
        v                              v
   ┌──────────────────────┐   ┌───────────────────┐
   │   页面组件            │   │   其他组件         │
   ├──────────────────────┤   ├───────────────────┤
   │ • admin-page.tsx     │   │ • language-provider
   │ • nodes-page.tsx     │   │ • web3-provider│
   │ • home-page.tsx      │   │ • hooks/*
   │ • earnings-page.tsx  │   │
   │ • team-page.tsx      │   │
   │ • swap-page.tsx      │   │
   └──────────────────────┘   └───────────────────┘
```

---

## 验证清单

在开始实施前，请确保：

- [ ] 已阅读 `QUICK-START.md`（5 分钟）
- [ ] 已浏览 `UI-ALIGNMENT-CHECKLIST.md`（10 分钟）
- [ ] 已查看 `integration-guide.md` 相关示例（按需）
- [ ] 已运行 `npm run type-check`（0 错误）
- [ ] 已运行 `npm run lint`（0 违规）

## 快速命令

```bash
# 类型检查
npm run type-check

# 代码规范
npm run lint

# 构建检查
npm run build

# 测试
npm run test

# 查找需要迁移的代码
grep -rn "getNftaTierName\|getNftbTierName" src/components/pages
grep -rn "formatAddress" src/components/pages
grep -rn "toFriendlyError" src/components/pages
```

---

## 支持

**问题排查流程**:

1. **"如何使用 X 功能?"** → 查看 `QUICK-START.md`
2. **"应该用什么方法?"** → 查看 `integration-guide.md`
3. **"下一步应该做什么?"** → 查看 `IMPLEMENTATION-ROADMAP.md`
4. **"已完成多少了?"** → 查看 `UI-ALIGNMENT-CHECKLIST.md`

**文件选择指南**:

| 我需要... | 查看文件 |
|---------|---------|
| 快速上手 | QUICK-START.md |
| 完整地址 | IMPLEMENTATION-ROADMAP.md |
| 代码示例 | integration-guide.md |
| 进度跟踪 | UI-ALIGNMENT-CHECKLIST.md |
| 找东西 | 本文件 (RESOURCES-INDEX.md) |

---

**版本**: 1.0  
**最后更新**: 2024-01-15  
**维护者**: Frontend Team
