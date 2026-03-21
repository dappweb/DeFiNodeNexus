export const MOCK_USER_DATA = {
  walletAddress: "0x71C...4f32",
  balances: {
    tot: 12450.75,
    tof: 350.20,
    usdt: 1200.50,
  },
  nftaNodes: [
    { nodeId: "A-001", status: "Active", yieldPerDay: 45.5, startDate: "2024-01-15", uptime: "99.9%" },
    { nodeId: "A-012", status: "Active", yieldPerDay: 42.0, startDate: "2024-02-01", uptime: "98.5%" },
    { nodeId: "A-045", status: "Standby", yieldPerDay: 0, startDate: "2024-02-10", uptime: "0%" },
  ],
  nftbNodes: [
    { 
      nodeId: "B-202", 
      level: 3, 
      weight: 1.5,
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
      historicalDividends: [
        { date: "2024-02-15", totAmount: 45, usdtAmount: 5 },
        { date: "2024-02-01", totAmount: 42, usdtAmount: 4.8 },
      ]
    }
  ],
  predictionHistory: [
    { platform: "PolyNexus", predictionId: "P-882", outcome: "Bullish", stake: 500, winnings: 950, date: "2024-02-10" },
    { platform: "EthPredict", predictionId: "E-104", outcome: "Higher", stake: 200, winnings: 0, date: "2024-02-08" },
    { platform: "PolyNexus", predictionId: "P-721", outcome: "Bearish", stake: 1000, winnings: 1900, date: "2024-01-25" },
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
  }
};