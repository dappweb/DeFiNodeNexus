export const MOCK_USER_DATA = {
  walletAddress: "0x71C...4f32",
  balances: {
    tot: 12450.75,
    tof: 350.20,
    usdt: 1200.50,
  },
  // --- Home: Announcements ---
  announcements: [
    { id: 1, title: "NFTA Node V2 Upgrade Live", date: "2026-03-20", type: "update" as const, content: "All NFTA nodes have been upgraded to V2 with 15% higher yield." },
    { id: 2, title: "TOT Listing on Major Exchange", date: "2026-03-18", type: "news" as const, content: "TOT token is now listed on a top-5 centralized exchange." },
    { id: 3, title: "Scheduled Maintenance Mar 25", date: "2026-03-15", type: "maintenance" as const, content: "Platform maintenance scheduled for March 25, 02:00-04:00 UTC." },
    { id: 4, title: "NFTB Gold Tier Bonus Event", date: "2026-03-12", type: "event" as const, content: "Gold tier NFTB holders receive 2x dividends this month." },
  ],
  // --- Home: Prices ---
  prices: [
    { symbol: "TOT", name: "TOT Token", price: 0.245, change24h: 5.32, volume: "12.4M" },
    { symbol: "TOF", name: "TOF Token", price: 1.82, change24h: -2.15, volume: "3.2M" },
    { symbol: "ETH", name: "Ethereum", price: 3842.50, change24h: 1.87, volume: "18.6B" },
    { symbol: "BTC", name: "Bitcoin", price: 97250.00, change24h: 0.65, volume: "42.1B" },
  ],
  // --- Nodes ---
  nftaNodes: [
    { nodeId: "A-001", status: "Active", yieldPerDay: 45.5, startDate: "2024-01-15", uptime: "99.9%", tier: "Pro" },
    { nodeId: "A-012", status: "Active", yieldPerDay: 42.0, startDate: "2024-02-01", uptime: "98.5%", tier: "Pro" },
    { nodeId: "A-045", status: "Standby", yieldPerDay: 0, startDate: "2024-02-10", uptime: "0%", tier: "Basic" },
  ],
  nftbNodes: [
    {
      nodeId: "B-202",
      level: 3,
      weight: 1.5,
      tier: "Gold",
      historicalDividends: [
        { date: "2024-02-15", totAmount: 120, usdtAmount: 15 },
        { date: "2024-02-01", totAmount: 115, usdtAmount: 14.5 },
        { date: "2024-01-15", totAmount: 110, usdtAmount: 14 },
      ]
    },
    {
      nodeId: "B-501",
      level: 1,
      weight: 0.8,
      tier: "Bronze",
      historicalDividends: [
        { date: "2024-02-15", totAmount: 45, usdtAmount: 5 },
        { date: "2024-02-01", totAmount: 42, usdtAmount: 4.8 },
      ]
    }
  ],
  nftaTiers: [
    { tier: "Basic", price: 500, currency: "USDT", dailyYield: 25, description: "Entry-level mining node" },
    { tier: "Pro", price: 2000, currency: "USDT", dailyYield: 55, description: "High-performance node" },
    { tier: "Elite", price: 5000, currency: "USDT", dailyYield: 150, description: "Maximum yield enterprise node" },
  ],
  nftbTiers: [
    { tier: "Bronze", price: 300, currency: "USDT", level: 1, weight: 0.8, description: "Standard dividend share" },
    { tier: "Silver", price: 1500, currency: "USDT", level: 2, weight: 1.2, description: "Enhanced dividend multiplier" },
    { tier: "Gold", price: 4000, currency: "USDT", level: 3, weight: 1.5, description: "Premium dividend tier" },
  ],
  // --- Purchase Records ---
  purchaseRecords: [
    { id: "TX-001", type: "NFTA" as const, tier: "Pro", price: 2000, currency: "USDT", date: "2024-01-15", status: "completed" as const, nodeId: "A-001" },
    { id: "TX-002", type: "NFTA" as const, tier: "Pro", price: 2000, currency: "USDT", date: "2024-02-01", status: "completed" as const, nodeId: "A-012" },
    { id: "TX-003", type: "NFTA" as const, tier: "Basic", price: 500, currency: "USDT", date: "2024-02-10", status: "completed" as const, nodeId: "A-045" },
    { id: "TX-004", type: "NFTB" as const, tier: "Gold", price: 4000, currency: "USDT", date: "2024-01-10", status: "completed" as const, nodeId: "B-202" },
    { id: "TX-005", type: "NFTB" as const, tier: "Bronze", price: 300, currency: "USDT", date: "2024-02-12", status: "completed" as const, nodeId: "B-501" },
  ],
  // --- Swap ---
  swapTokens: [
    { symbol: "TOT", name: "TOT Token", balance: 12450.75, price: 0.245 },
    { symbol: "TOF", name: "TOF Token", balance: 350.20, price: 1.82 },
    { symbol: "USDT", name: "Tether USD", balance: 1200.50, price: 1.00 },
    { symbol: "ETH", name: "Ethereum", balance: 0.85, price: 3842.50 },
  ],
  // --- Earnings ---
  earningsHistory: [
    { date: "2026-03-21", type: "NFTA Yield" as const, nodeId: "A-001", totAmount: 45.5, usdtEquiv: 11.15, status: "claimed" as const },
    { date: "2026-03-21", type: "NFTA Yield" as const, nodeId: "A-012", totAmount: 42.0, usdtEquiv: 10.29, status: "claimed" as const },
    { date: "2026-03-20", type: "NFTB Dividend" as const, nodeId: "B-202", totAmount: 120, usdtEquiv: 29.40, status: "claimed" as const },
    { date: "2026-03-20", type: "NFTA Yield" as const, nodeId: "A-001", totAmount: 45.5, usdtEquiv: 11.15, status: "claimed" as const },
    { date: "2026-03-20", type: "NFTA Yield" as const, nodeId: "A-012", totAmount: 42.0, usdtEquiv: 10.29, status: "claimed" as const },
    { date: "2026-03-19", type: "NFTB Dividend" as const, nodeId: "B-501", totAmount: 45, usdtEquiv: 11.03, status: "claimed" as const },
    { date: "2026-03-19", type: "NFTA Yield" as const, nodeId: "A-001", totAmount: 45.5, usdtEquiv: 11.15, status: "pending" as const },
    { date: "2026-03-18", type: "Team Bonus" as const, nodeId: "-", totAmount: 200, usdtEquiv: 49.00, status: "claimed" as const },
    { date: "2026-03-17", type: "NFTB Dividend" as const, nodeId: "B-202", totAmount: 120, usdtEquiv: 29.40, status: "claimed" as const },
    { date: "2026-03-16", type: "NFTA Yield" as const, nodeId: "A-001", totAmount: 45.5, usdtEquiv: 11.15, status: "claimed" as const },
  ],
  earningsSummary: {
    totalTot: 28650,
    totalUsdt: 7019.25,
    todayTot: 252.5,
    todayUsdt: 61.86,
    weekTot: 1450.0,
    weekUsdt: 355.25,
  },
  // --- Team Nodes ---
  teamInfo: {
    totalMembers: 24,
    directReferrals: 8,
    teamLevel: 3,
    teamBonus: 200,
    totalTeamEarnings: 4500,
  },
  teamMembers: [
    { address: "0xA3f...8b21", level: 1, nodesCount: 3, contribution: 450, joinDate: "2024-01-20", status: "active" as const },
    { address: "0xB7c...2d45", level: 1, nodesCount: 2, contribution: 320, joinDate: "2024-01-25", status: "active" as const },
    { address: "0xC1e...9f67", level: 1, nodesCount: 1, contribution: 150, joinDate: "2024-02-05", status: "active" as const },
    { address: "0xD4a...3c89", level: 2, nodesCount: 4, contribution: 680, joinDate: "2024-02-10", status: "active" as const },
    { address: "0xE6b...7e12", level: 2, nodesCount: 2, contribution: 280, joinDate: "2024-02-15", status: "active" as const },
    { address: "0xF8d...1a34", level: 1, nodesCount: 1, contribution: 100, joinDate: "2024-03-01", status: "inactive" as const },
    { address: "0xA9e...5c56", level: 3, nodesCount: 5, contribution: 920, joinDate: "2024-01-18", status: "active" as const },
    { address: "0xB2f...8d78", level: 2, nodesCount: 3, contribution: 410, joinDate: "2024-02-20", status: "active" as const },
  ],
  tokenomics: {
    tot: {
      totalSupply: 1000000000,
      circulatingSupply: 450000000,
      burnRate: "1.2% / mo",
      transactionFee: "2%",
    },
    tof: {
      totalSupply: 10000000,
      circulatingSupply: 2500000,
      burnRate: "5% per withdrawal",
      transactionFee: "0.5%",
    }
  },
  // --- Admin ---
  adminData: {
    ownerAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    platformStats: {
      totalUsers: 1284,
      activeNodes: 856,
      totalVolume: 2450000,
      revenue: 185000,
    },
    users: [
      { address: "0xA3f...8b21", nodesCount: 5, teamSize: 12, totalInvested: 12000, status: "enabled" as const },
      { address: "0xB7c...2d45", nodesCount: 3, teamSize: 8, totalInvested: 7500, status: "enabled" as const },
      { address: "0xC1e...9f67", nodesCount: 2, teamSize: 4, totalInvested: 3200, status: "enabled" as const },
      { address: "0xD4a...3c89", nodesCount: 7, teamSize: 22, totalInvested: 24000, status: "enabled" as const },
      { address: "0xE6b...7e12", nodesCount: 1, teamSize: 0, totalInvested: 500, status: "disabled" as const },
      { address: "0xF8d...1a34", nodesCount: 4, teamSize: 15, totalInvested: 8800, status: "enabled" as const },
    ],
    recentTransactions: [
      { from: "0xA3f...8b21", action: "Buy NFTA Pro", amount: 2000, time: "2 min ago" },
      { from: "0xB7c...2d45", action: "Withdraw TOT", amount: 450, time: "8 min ago" },
      { from: "0xD4a...3c89", action: "Buy NFTB Gold", amount: 4000, time: "15 min ago" },
      { from: "0xC1e...9f67", action: "Swap TOT→USDT", amount: 1200, time: "22 min ago" },
      { from: "0xF8d...1a34", action: "Buy NFTA Elite", amount: 5000, time: "35 min ago" },
      { from: "0xA3f...8b21", action: "Claim Dividends", amount: 320, time: "1 hr ago" },
    ],
    settings: {
      withdrawFeeRate: "5%",
      minPurchase: 300,
      maintenanceMode: false,
    },
  },
};