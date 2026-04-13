import { ethers } from "ethers";

// ==================== CONTRACT ADDRESSES ====================
// Env vars are inlined at build time by Next.js (NEXT_PUBLIC_*) or next.config.ts.
// Hardcoded fallbacks ensure Cloudflare Pages builds work even when the dashboard
// env vars are not configured - these are public on-chain addresses, not secrets.
// Update DEPLOYED values here after each new deployment.
const DEPLOYED = {
  NEXUS: "0x6D862Bc5E9486C89c959905D18760204851f6203",
  SWAP:  "0xfE20139dCFA053b819A3745E9ed801b9C6cc84aC",
  TOT:   "0x0C720a3d1AB25b19c132Ba02C74A5D145d7CcDdA",
  TOF:   "0x7300f4fd7C8d1baBC8220BFf04788E1B7A50e13D",
  USDT:  "0xf54cC0F6CE272125c39C45A8141b84989A8765f4",
} as const;

// Vercel (and some CI systems) sometimes injects \r\n into env var values
// when they were set with Windows line endings. Trim to be safe.
function envAddr(val: string | undefined, fallback: string): string {
  return val?.trim() || fallback;
}

export const CONTRACTS = {
  NEXUS: envAddr(process.env.NEXT_PUBLIC_NEXUS_ADDRESS, DEPLOYED.NEXUS),
  SWAP:  envAddr(process.env.NEXT_PUBLIC_SWAP_ADDRESS,  DEPLOYED.SWAP),
  TOT:   envAddr(process.env.NEXT_PUBLIC_TOT_ADDRESS,   DEPLOYED.TOT),
  TOF:   envAddr(process.env.NEXT_PUBLIC_TOF_ADDRESS,   DEPLOYED.TOF),
  USDT:  envAddr(process.env.NEXT_PUBLIC_USDT_ADDRESS,  DEPLOYED.USDT),
};

export const NEXUS_ABI = [
  "function transferOwnership(address newOwner) external",
  "function setAdmin(address account, bool enabled) external",
  "function setAdmins(address[] accounts_, bool[] enabled_) external",
  "function setUsdtToken(address newUsdt) external",
  "function configureNftaTier(uint256 tierId, uint256 price, uint256 dailyYield, uint256 maxSupply, bool isActive) external returns (uint256)",
  "function configureNftbTier(uint256 tierId, uint256 price, uint256 weight, uint256 maxSupply, uint256 dividendBps, bool isActive) external returns (uint256)",
  "function registerNftaPurchase(address user, uint256 tierId, address referrer) external returns (uint256)",
  "function registerNftbPurchase(address user, uint256 tierId, address referrer) external returns (uint256)",
  "function fundRewardPool(uint256 amount) external",
  "function distributeNftbDividends(uint256 amount) external",
  "function distributeNftbUsdtDividends(uint256 amount) external",
  "function distributePredictionFlowUsdt(uint256 flowAmount) external",
  "function setDistributor(address addr, bool status) external",
  "function setTreasury(address addr) external",
  "function setWallets(address _zeroLine, address _community, address _foundation, address _institution) external",
  "function setProjectWallet(address addr) external",
  "function setTofBurnBps(uint256 bps) external",
  "function setTofClaimFeeBps(uint256 bps) external",
  "function setTofPerUsdt(uint256 rate) external",
  "function setPredictionFlowRateBps(uint256 tierId, uint256 bps) external",
  "function setWithdrawFeeBps(uint8 level, uint256 feeBps) external",
  "function bindReferrer(address referrer) external",
  "function buyNfta(uint256 tierId, address referrer) external returns (uint256)",
  "function transferNftaCard(address to, uint256 nodeId) external",
  "function buyNftbWithUsdt(uint256 tierId, address referrer) external returns (uint256)",
  "function buyNftbWithTof(uint256 tierId, address referrer) external returns (uint256)",
  "function claimNftaYield(uint256 nodeId) external",
  "function claimAllNftaYield() external",
  "function claimNftbDividend(uint256 nodeId) external",
  "function claimAllNftbDividends() external",
  "function claimNftbUsdtDividend(uint256 nodeId) external",
  "function claimAllNftbUsdtDividends() external",
  "function withdrawTot(uint256 amount) external",
  "function treasury() view returns (address)",
  "function zeroLineWallet() view returns (address)",
  "function communityWallet() view returns (address)",
  "function foundationWallet() view returns (address)",
  "function institutionWallet() view returns (address)",
  "function projectWallet() view returns (address)",
  "function tofBurnBps() view returns (uint256)",
  "function tofClaimFeeBps() view returns (uint256)",
  "function tofPerUsdt() view returns (uint256)",
  "function totalWeightByTier(uint256) view returns (uint256)",
  "function accDividendPerWeightByTier(uint256) view returns (uint256)",
  "function accUsdtDividendPerWeightByTier(uint256) view returns (uint256)",
  "function predictionFlowBpsByTier(uint256) view returns (uint256)",
  "function nextNodeId() view returns (uint256)",
  "function nextNftaTierId() view returns (uint256)",
  "function nextNftbTierId() view returns (uint256)",
  "function nftaTiers(uint256) view returns (uint256 price, uint256 dailyYield, uint256 maxSupply, uint256 currentSupply, bool isActive)",
  "function nftbTiers(uint256) view returns (uint256 price, uint256 weight, uint256 maxSupply, uint256 usdtMinted, uint256 tofMinted, uint256 dividendBps, bool isActive)",
  "function nftaNodes(uint256) view returns (address owner, uint256 tierId, uint256 dailyYield, uint256 lastClaimDay, bool isActive)",
  "function nftbNodes(uint256) view returns (address owner, uint256 tierId, uint256 weight, uint256 rewardDebt, bool isActive)",
  "function accounts(address) view returns (address referrer, uint256 pendingTot, uint256 claimedTot, uint256 withdrawnTot, uint256 totalNodes, uint256 directReferrals, uint256 teamNodes, uint256 teamCommissionEarned)",
  "function getUserLevel(address user) view returns (uint8)",
  "function pendingNftaYield(uint256 nodeId) view returns (uint256)",
  "function pendingNftbDividend(uint256 nodeId) view returns (uint256)",
  "function pendingNftbUsdtDividend(uint256 nodeId) view returns (uint256)",
  "function getUserNftaNodes(address user) view returns (uint256[])",
  "function getUserNftbNodes(address user) view returns (uint256[])",
  "function getNftaTierRemaining(uint256 tierId) view returns (uint256)",
  "function getNftbTierRemaining(uint256 tierId) view returns (uint256 usdtRemaining, uint256 tofRemaining)",
  "function withdrawFeeBpsByLevel(uint8) view returns (uint256)",
  "function nftaLastClaimDayByUser(address) view returns (uint256)",
  "function isDistributor(address) view returns (bool)",
  "function admins(address) view returns (bool)",
  "function usdtToken() view returns (address)",
  "function owner() view returns (address)",
  "event NftbTierConfigured(uint256 indexed tierId, uint256 price, uint256 weight, uint256 maxSupply, uint256 dividendBps, bool isActive)",
  "event ReferrerBound(address indexed user, address indexed referrer)",
  "event ProjectWalletUpdated(address indexed newWallet)",
  "event NftaPurchased(address indexed user, uint256 indexed nodeId, uint256 indexed tierId, uint256 price)",
  "event NftaCardTransferred(address indexed from, address indexed to, uint256 indexed nodeId)",
  "event NftbPurchased(address indexed user, uint256 indexed nodeId, uint256 indexed tierId, uint256 price)",
  "event NftaYieldClaimed(address indexed user, uint256 indexed nodeId, uint256 totAmount, uint256 tofConsumed)",
  "event NftbDividendClaimed(address indexed user, uint256 indexed nodeId, uint256 amount)",
  "event NftbUsdtDividendClaimed(address indexed user, uint256 indexed nodeId, uint256 amount)",
  "event TeamCommissionPaid(address indexed beneficiary, address indexed buyer, uint256 amount, uint256 generation)",
  "event TotWithdrawn(address indexed user, uint256 totAmount, uint256 tofFee, uint256 burnedTof)",
  "event DividendRoundFunded(uint256 amount, uint256 newAccDividendPerWeight)",
  "event UsdtDividendRoundFunded(uint256 amount, uint256 newAccDividendPerWeight)",
  "event PredictionFlowRateUpdated(uint256 indexed tierId, uint256 bps)",
  "event PredictionFlowDistributed(uint256 flowAmount, uint256 distributedAmount, uint256 treasuryAmount)",
  "event DistributorUpdated(address indexed addr, bool status)",
  "event TreasuryUpdated(address indexed newTreasury)",
  "event WalletsUpdated(address zeroLine, address community, address foundation, address institution)",
  "event TofBurnRateUpdated(uint256 newBps)",
  "event TofClaimFeeUpdated(uint256 newBps)",
];

export const SWAP_ABI = [
  "function transferOwnership(address newOwner) external",
  "function setAdmin(address account, bool enabled) external",
  "function setAdmins(address[] accounts_, bool[] enabled_) external",
  "function setUsdtToken(address newUsdt) external",
  "function addLiquidity(uint256 totAmount, uint256 usdtAmount) external",
  "function removeLiquidity(uint256 totAmount, uint256 usdtAmount) external",
  "function setNexus(address _nexus) external",
  "function setDexRouter(address router) external",
  "function setDexPair(address pair) external",
  "function setDexFactory(address factory) external",
  "function setExternalDexEnabled(bool enabled) external",
  "function setSwapPaused(bool paused) external",
  "function setBuyFeeBps(uint256 bps) external",
  "function setSellFeeBps(uint256 bps) external",
  "function setProfitTaxBps(uint256 bps) external",
  "function setDistributionThreshold(uint256 threshold) external",
  "function setUsdtDistributionThreshold(uint256 threshold) external",
  "function setMaxDailyBuy(uint256 amount) external",
  "function setMaxSellBps(uint256 bps) external",
  "function setDeflationBps(uint256 bps) external",
  "function forceDistribute() external",
  "function emergencyWithdraw(address token, uint256 amount) external",
  "function buyTot(uint256 usdtAmount, uint256 minTotOut) external",
  "function sellTot(uint256 totAmount, uint256 minUsdtOut) external",
  "function deflate() external",
  "function totReserve() view returns (uint256)",
  "function usdtReserve() view returns (uint256)",
  "function getDexReserves() view returns (uint256 totR, uint256 usdtR)",
  "function getRouterConfig() view returns (address router, address pair, address factory, bool enabled, bool paused)",
  "function dexRouter() view returns (address)",
  "function dexPair() view returns (address)",
  "function dexFactory() view returns (address)",
  "function externalDexEnabled() view returns (bool)",
  "function swapPaused() view returns (bool)",
  "function buyFeeBps() view returns (uint256)",
  "function sellFeeBps() view returns (uint256)",
  "function profitTaxBps() view returns (uint256)",
  "function nftbDividendPool() view returns (uint256)",
  "function nftbUsdtDividendPool() view returns (uint256)",
  "function distributionThreshold() view returns (uint256)",
  "function usdtDistributionThreshold() view returns (uint256)",
  "function maxDailyBuy() view returns (uint256)",
  "function maxSellBps() view returns (uint256)",
  "function deflationBps() view returns (uint256)",
  "function lastDeflationTime() view returns (uint256)",
  "function nexus() view returns (address)",
  "function totToken() view returns (address)",
  "function usdtToken() view returns (address)",
  "function getCurrentPrice() view returns (uint256)",
  "function getUserAvgPrice(address user) view returns (uint256)",
  "function getDailyBoughtAmount(address user) view returns (uint256)",
  "function getMaxSellAmount(address user) view returns (uint256)",
  "function admins(address) view returns (bool)",
  "function quoteBuy(uint256 usdtAmount) view returns (uint256 totOut, uint256 fee)",
  "function quoteSell(uint256 totAmount) view returns (uint256 usdtOut, uint256 sellFee)",
  "function timeUntilNextDeflation() view returns (uint256)",
  "function owner() view returns (address)",
  "event TotBought(address indexed buyer, uint256 usdtIn, uint256 totOut, uint256 fee)",
  "event TotSold(address indexed seller, uint256 totIn, uint256 usdtOut, uint256 sellFee, uint256 profitTax)",
  "event Deflated(uint256 burned, uint256 toDividend, uint256 intervals, uint256 timestamp)",
  "event DividendsDistributed(uint256 amount)",
  "event UsdtDividendsDistributed(uint256 amount)",
  "event LiquidityAdded(uint256 totAmount, uint256 usdtAmount)",
  "event LiquidityRemoved(uint256 totAmount, uint256 usdtAmount)",
  "event NexusUpdated(address indexed newNexus)",
  "event DexRouterUpdated(address indexed oldRouter, address indexed newRouter)",
  "event DexPairUpdated(address indexed oldPair, address indexed newPair)",
  "event DexFactoryUpdated(address indexed oldFactory, address indexed newFactory)",
  "event ExternalDexModeUpdated(bool enabled)",
  "event SwapPausedUpdated(bool paused)",
];

export const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function totalSupply() view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

/** TOF token — superset of ERC20 with whitelist management */
export const TOF_ABI = [
  ...ERC20_ABI,
  "function owner() view returns (address)",
  "function transferWhitelist(address) view returns (bool)",
  "function setTransferWhitelist(address account, bool status) external",
  "event TransferWhitelistUpdated(address indexed account, bool status)",
];

export function getNexusContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  if (!CONTRACTS.NEXUS) return null;
  return new ethers.Contract(CONTRACTS.NEXUS, NEXUS_ABI, signerOrProvider);
}

export function getSwapContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  if (!CONTRACTS.SWAP) return null;
  return new ethers.Contract(CONTRACTS.SWAP, SWAP_ABI, signerOrProvider);
}

export function getERC20Contract(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(address, ERC20_ABI, signerOrProvider);
}
