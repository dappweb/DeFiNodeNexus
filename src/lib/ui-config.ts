/**
 * 统一 UI 配置 - 确保全系统的一致性
 */

// ===== Tier 配置 =====
export const NFTA_TIERS = [
  {
    id: 1,
    name: "初级 · 创世荣耀",
    nameZh: "初级 · 创世荣耀",
    nameEn: "Genesis Glory",
    icon: "⭐",
  },
  {
    id: 2,
    name: "高级 · 创世王者",
    nameZh: "高级 · 创世王者",
    nameEn: "Genesis Sovereign",
    icon: "👑",
  },
] as const;

export const NFTB_TIERS = [
  {
    id: 1,
    name: "初级 · 普通权杖",
    nameZh: "初级 · 普通权杖",
    nameEn: "Ordinary Scepter",
    icon: "⚔️",
  },
  {
    id: 2,
    name: "中级 · 稀有王冠",
    nameZh: "中级 · 稀有王冠",
    nameEn: "Rare Crown",
    icon: "💎",
  },
  {
    id: 3,
    name: "高级 · 传说神座",
    nameZh: "高级 · 传说神座",
    nameEn: "Legendary Throne",
    icon: "🏆",
  },
] as const;

// ===== 获取 Tier 名称 =====
export function getNftaTierName(tierId: number | bigint): string {
  const id = Number(tierId);
  const tier = NFTA_TIERS.find((t) => t.id === id);
  return tier ? tier.name : `NFTA #${id}`;
}

export function getNftbTierName(tierId: number | bigint): string {
  const id = Number(tierId);
  const tier = NFTB_TIERS.find((t) => t.id === id);
  return tier ? tier.name : `NFTB #${id}`;
}

export function getNftaTierIcon(tierId: number | bigint): string {
  const id = Number(tierId);
  const tier = NFTA_TIERS.find((t) => t.id === id);
  return tier ? tier.icon : "📦";
}

export function getNftbTierIcon(tierId: number | bigint): string {
  const id = Number(tierId);
  const tier = NFTB_TIERS.find((t) => t.id === id);
  return tier ? tier.icon : "📦";
}

// ===== 地址格式化 =====
export function formatAddress(address: string | null | undefined): string {
  if (!address) return "-";
  if (address.toLowerCase() === "0x0000000000000000000000000000000000000000") return "零地址";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatFullAddress(address: string | null | undefined): string {
  if (!address) return "-";
  return address;
}

// ===== 数值格式化 =====
export function formatBalance(balance: bigint | string, decimals: number = 18): string {
  const num = typeof balance === "string" ? BigInt(balance) : balance;
  const divider = BigInt(10 ** decimals);
  const integer = num / divider;
  const fraction = num % divider;
  const fractionStr = fraction.toString().padStart(decimals, "0").slice(0, 4);
  if (fractionStr === "0000" || fractionStr === "000" || fractionStr === "00") {
    return integer.toString();
  }
  return `${integer}.${fractionStr}`;
}

export function formatPercent(bps: number | bigint): string {
  const n = Number(bps);
  return `${(n / 100).toFixed(2)}%`;
}

// ===== 时间格式化 =====
export function formatDate(timestamp: number): string {
  if (!timestamp || timestamp === 0) return "-";
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString("zh-CN");
}

export function formatDatetime(timestamp: number): string {
  if (!timestamp || timestamp === 0) return "-";
  const date = new Date(timestamp * 1000);
  return date.toLocaleString("zh-CN");
}

// ===== 虚拟地址标签 =====
export const SPECIAL_ADDRESSES = {
  ZERO: "0x0000000000000000000000000000000000000000",
  BURN: "0x000000000000000000000000000000000000dEaD",
};

export function getAddressLabel(address: string): string {
  const lower = address.toLowerCase();
  if (lower === SPECIAL_ADDRESSES.ZERO.toLowerCase()) return "Zero Address";
  if (lower === SPECIAL_ADDRESSES.BURN.toLowerCase()) return "Burn Address";
  return formatAddress(address);
}

// ===== UI 状态映射 =====
export const STAGE_LABELS: Record<string, string> = {
  idle: "就绪",
  checking: "检查中",
  approving: "授权中",
  purchasing: "购买中",
  purchasing_nftb: "购买中",
  confirming: "确认中",
  withdrawing: "提现中",
  claiming: "领取中",
  done: "完成",
};

export const STAGE_COLORS: Record<string, string> = {
  idle: "text-gray-500",
  checking: "text-blue-500",
  approving: "text-yellow-500",
  purchasing: "text-purple-500",
  purchasing_nftb: "text-purple-500",
  confirming: "text-orange-500",
  withdrawing: "text-red-500",
  claiming: "text-green-500",
  done: "text-green-600",
};

// ===== 通用参数 =====
export const UI_PARAMS = {
  REFRESH_INTERVAL_MS: 5000,        // 5秒刷新一次
  SLOW_REFRESH_INTERVAL_MS: 15000,  // 15秒慢速刷新
  ADDRESS_SHORTEN_LENGTH: 6,        // 地址缩短长度
  TOAST_DURATION_MS: 5000,          // Toast 显示时长
  MAX_RETRY_COUNT: 3,               // 最大重试次数
} as const;

// ===== 错误消息映射 =====
export const ERROR_MESSAGES: Record<string, string> = {
  "Tier inactive": "该等级已禁用",
  "Tier sold out": "该等级已售罄",
  "USDT quota sold out": "USDT 配额已用尽",
  "TOF quota sold out": "TOF 配额已用尽",
  "Zero address": "地址无效",
  "Self referral": "不能自行推荐自己",
  "Already bound": "已经绑定过推荐人",
  "Not authorized": "权限不足",
};

export function getFriendlyErrorMessage(error: string): string {
  if (!error) return "操作失败，请重试";
  for (const [key, message] of Object.entries(ERROR_MESSAGES)) {
    if (error.includes(key)) return message;
  }
  return error.length > 100 ? error.slice(0, 100) + "..." : error;
}
