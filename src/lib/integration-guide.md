/**
 * 项目全局对齐实施指南
 * 确保 UI、功能、API 全部对齐
 */

// ============================================
// 1. 完整的 Tier 配置示例
// ============================================

import { getNftaTierName, getNftbTierName, NFTA_TIERS, NFTB_TIERS } from "@/lib/ui-config";

// 获取单个 Tier 名称
const tier1Name = getNftaTierName(1);  // "初级 · 创世荣耀"
const tier2Name = getNftbTierName(2);  // "中级 · 稀有王冠"

// 遍历所有 Tier
NFTA_TIERS.forEach((tier) => {
  console.log(tier.name, tier.icon);
});

// ============================================
// 2. 地址显示统一规范
// ============================================

import { formatAddress, formatFullAddress, getAddressLabel } from "@/lib/ui-config";
import { AddressDisplay } from "@/components/ui-common";

// 在代码中
const shortAddr = formatAddress("0x1234567890abcdef..."); // "0x1234...def"
const fullAddr = formatFullAddress("0x1234567890abcdef...");

// 在 JSX 中
<AddressDisplay 
  address={address} 
  short={true}
  copyable={true}
  label="用户地址"
/>

// ============================================
// 3. 数值格式化统一规范
// ============================================

import { formatBalance, formatPercent } from "@/lib/ui-config";

// 余额显示
const balance = BigInt("1234567890");
const formatted = formatBalance(balance, 18); // "1.2345"

// 百分比显示
const fee = formatPercent(7000); // "70.00%"
const taxRate = formatPercent(1000); // "10.00%"

// ============================================
// 4. 日期/时间对齐规范
// ============================================

import { formatDate, formatDatetime } from "@/lib/ui-config";

const timestamp = 1704067200; // Unix timestamp
const date = formatDate(timestamp);       // "2024-01-01"
const datetime = formatDatetime(timestamp); // "2024-01-01 00:00:00"

// ============================================
// 5. 错误处理统一规范
// ============================================

import { toFriendlyError, toFriendlyTxError } from "@/lib/api-common";

// 在 try-catch 中
try {
  await nexus.buyNfta(tierId, referrer);
} catch (error) {
  // 统一的错误处理
  toast({
    title: "购买失败",
    description: toFriendlyError(error),
    variant: "destructive",
  });
}

// 在 TX 执行中
const result = await execTx(nexus.buyNfta(tierId, referrer));
if (!result.success) {
  toast({
    title: "购买失败",
    description: toFriendlyTxError(result.error),
    variant: "destructive",
  });
}

// ============================================
// 6. 组件使用规范
// ============================================

import { 
  ActionStageBadge,
  OperationCard,
  AlertBox,
  AddressDisplay,
  InputField,
  StatusIndicator,
  TableRow,
} from "@/components/ui-common";

// 6.1 操作阶段指示
<ActionStageBadge 
  stage={nftaStage}
  title="NFTA购买中"
/>

// 6.2 统一的操作卡片
<OperationCard
  title="购买 NFTA"
  description="选择等级并支付 USDT"
  icon={<Coins className="w-5 h-5" />}
>
  {/* 内容 */}
</OperationCard>

// 6.3 提示框
<AlertBox
  type="warning"
  title="提醒"
  message="该等级配额即将用尽"
/>

// 6.4 地址显示
<AddressDisplay
  address={userAddress}
  short={true}
  copyable={true}
  label="推荐人"
/>

// 6.5 输入字段
<InputField
  label="推荐人地址"
  value={referrer}
  onChange={setReferrer}
  placeholder="0x..."
  help="不填则为零地址"
  error={referrerError}
/>

// 6.6 状态指示符
<StatusIndicator
  status={tier.isActive ? "active" : "inactive"}
  label={tier.isActive ? "可用" : "已禁用"}
/>

// 6.7 表格行
<TableRow
  label="日收益"
  value={formatBalance(tier.dailyYield, 18)}
  help="每天自动计算"
/>

// ============================================
// 7. API 调用统一规范
// ============================================

import { callApi, getRefreshManager, getCacheManager } from "@/lib/api-common";

// 7.1 标准 API 调用
const result = await callApi("/api/nodes/summary", {
  method: "GET",
});

if (result.success) {
  const data = result.data;
} else {
  toast({ description: result.error, variant: "destructive" });
}

// 7.2 数据刷新管理
const refreshMgr = getRefreshManager();

useEffect(() => {
  // 定期刷新
  refreshMgr.schedule("nodes-data", refreshData, 5000);
  
  return () => refreshMgr.clear("nodes-data");
}, []);

// 手动刷新（带限流）
await refreshMgr.immediate("nodes-data", refreshData);

// 7.3 缓存管理
const cacheMgr = getCacheManager();

// 设置缓存
cacheMgr.set("tier-info", tierData, 30000); // 30秒过期

// 获取缓存
const cached = cacheMgr.get("tier-info");
if (cached) {
  setTiers(cached);
}

// ============================================
// 8. 页面模板示例
// ============================================

// 新页面应该这样写：
import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { useWeb3 } from "@/lib/web3-provider";
import { useToast } from "@/hooks/use-toast";
import { 
  getNftaTierName, 
  formatBalance, 
  UI_PARAMS 
} from "@/lib/ui-config";
import { 
  toFriendlyError, 
  getRefreshManager 
} from "@/lib/api-common";
import { OperationCard } from "@/components/ui-common";

export function MyPage() {
  const { t } = useLanguage();
  const { address, isConnected } = useWeb3();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  // 数据刷新
  const refreshData = useCallback(async () => {
    if (!address) return;
    try {
      // 获取数据
      const response = await fetch("/api/...");
      const result = await response.json();
      setData(result);
    } catch (error) {
      toast({
        title: t("loadFailed"),
        description: toFriendlyError(error),
        variant: "destructive",
      });
    }
  }, [address]);

  // 定期刷新
  useEffect(() => {
    const refreshMgr = getRefreshManager();
    refreshMgr.schedule("my-page", refreshData, UI_PARAMS.REFRESH_INTERVAL_MS);
    return () => refreshMgr.clear("my-page");
  }, [refreshData]);

  // 初始加载
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <div className="space-y-6">
      <OperationCard
        title={t("myTitle")}
        description={t("myDescription")}
      >
        {/* 内容 */}
      </OperationCard>
    </div>
  );
}

// ============================================
// 9. 翻译键命名规范
// ============================================

// 操作结果
t("toastBuyNftaSuccess")
t("toastBuyNftaFailed")
t("toastClaimSuccess")
t("toastWithdrawSuccess")

// 错误信息
t("toastTierInactive")
t("toastTierSoldOut")
t("toastInsufficientBalance")

// UI 文本
t("buyNow")
t("claimRewards")
t("withdrawFunds")

// ============================================
// 10. 测试检查清单
// ============================================

/*
UI 对齐测试前应该检查：

[ ] 所有 Tier 名称用 getNftaTierName / getNftbTierName 获取
[ ] 所有地址显示用 formatAddress() 或 AddressDisplay 组件
[ ] 所有余额用 formatBalance() 格式化
[ ] 所有百分比用 formatPercent() 格式化
[ ] 所有错误用 toFriendlyError() 转换
[ ] 所有操作阶段用 ActionStageBadge 显示
[ ] 所有卡片用 OperationCard 包装
[ ] 所有警告用 AlertBox 组件
[ ] 所有日期用 formatDate(time) 格式化
[ ] 所有刷新用 RefreshManager 管理

执行命令：
npm run type-check  # 类型检查
npm run lint        # 代码规范检查
npm run test        # 单元测试
*/

// ============================================
// 11. 性能优化建议
// ============================================

/*
1. 使用 getCacheManager() 缓存频繁访问的数据
   - Tier 信息（静态数据）
   - 用户账户信息（变化不频繁）

2. 使用 getRefreshManager() 管理定期刷新
   - 避免多个组件重复创建 interval
   - 上限流控，防止频繁请求

3. 使用 useCallback 和 useMemo 优化渲染
   - refreshData 用 useCallback
   - 计算值用 useMemo

4. 虚拟列表用于大列表
   - 超过 100 项使用虚拟列表
   - 使用 react-window 或 react-virtualized
*/

// ============================================
// 12. 常见问题 (FAQ)
// ============================================

/*
Q: 为什么要统一 Tier 名称？
A: 确保用户在不同页面看到一致的信息，提高 UX 质量。

Q: formatBalance 和 ethers.formatUnits 的区别？
A: formatBalance 更简洁，自动处理小数位数，更适合 UI 显示。

Q: 何时使用 RefreshManager vs 直接 setInterval？
A: RefreshManager 提供限流和去重，避免内存泄漏和频繁请求。

Q: 可以绕过 toFriendlyError 直接显示错误吗？
A: 不建议，会导致用户看到技术术语，降低 UX。

Q: 是否必须使用 UI 组件库中的组件？
A: 对于常见模式（如 ActionStageBadge）必须，其他可选。

Q: 如何处理新增的 Tier？
A: 在 ui-config.ts 中添加到 NFTA_TIERS 或 NFTB_TIERS。

Q: 多语言支持如何处理？
A: 在 translation files 中添加翻译键，在代码中使用 t() 函数。
*/

export {};
