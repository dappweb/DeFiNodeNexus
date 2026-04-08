const ENV_CONFIG = {
  // ---------------------------------------------------------------------------
  // 0) Environment Mode
  // ---------------------------------------------------------------------------
  NODE_ENV: "production",
  CI: "false",
  CF_PAGES: "0",
  CLOUDFLARE_PAGES: "0",
  CHECK_ENV_MODE: "strict",

  // ---------------------------------------------------------------------------
  // 1) Network / Chain RPC
  // ---------------------------------------------------------------------------
  SEPOLIA_RPC_URL: "https://sepolia.infura.io/v3/YOUR_PROJECT_ID",
  NEXT_PUBLIC_SEPOLIA_RPC_URL: "https://sepolia.infura.io/v3/YOUR_PROJECT_ID",
  BSC_RPC_URL: "",
  NEXT_PUBLIC_BSC_RPC_URL: "",

  // ---------------------------------------------------------------------------
  // 2) Wallet / Key Material
  // ---------------------------------------------------------------------------
  DEPLOYER_PRIVATE_KEY: "0xYOUR_PRIVATE_KEY",
  ROUND2_A_PRIVATE_KEY: "",
  ROUND2_B_PRIVATE_KEY: "",
  ROUND2_C_PRIVATE_KEY: "",
  KEEPER_SECRET: "",

  // ---------------------------------------------------------------------------
  // 3) Token Deployment Parameters
  // ---------------------------------------------------------------------------
  TOT_NAME: "TOT Token",
  TOT_SYMBOL: "TOT",
  TOT_MAX_SUPPLY: "1000000000",
  TOT_INITIAL_SUPPLY: "1000000000",
  TOT_OWNER_ADDRESS: "",

  TOKEN_OWNER_ADDRESS: "",
  TOF_NAME: "TOF Token",
  TOF_SYMBOL: "TOF",
  TOF_MAX_SUPPLY: "10000000000",
  TOF_INITIAL_SUPPLY: "0",
  TOF_PREDICTION_MINTER: "",

  USDT_NAME: "USDT Test",
  USDT_SYMBOL: "USDT",
  USDT_MAX_SUPPLY: "1000000000",
  USDT_INITIAL_SUPPLY: "1000000000",

  // ---------------------------------------------------------------------------
  // 4) Deployed Contract Addresses (server)
  // ---------------------------------------------------------------------------
  NEXUS_ADDRESS: "0x0000000000000000000000000000000000000000",
  SWAP_ADDRESS: "0x0000000000000000000000000000000000000000",
  TOT_TOKEN_ADDRESS: "0x0000000000000000000000000000000000000000",
  TOF_TOKEN_ADDRESS: "0x0000000000000000000000000000000000000000",
  USDT_TOKEN_ADDRESS: "0x0000000000000000000000000000000000000000",

  // ---------------------------------------------------------------------------
  // 5) Deployed Contract Addresses (public)
  // ---------------------------------------------------------------------------
  NEXT_PUBLIC_NEXUS_ADDRESS: "0x0000000000000000000000000000000000000000",
  NEXT_PUBLIC_SWAP_ADDRESS: "0x0000000000000000000000000000000000000000",
  NEXT_PUBLIC_TOT_ADDRESS: "0x0000000000000000000000000000000000000000",
  NEXT_PUBLIC_TOF_ADDRESS: "0x0000000000000000000000000000000000000000",
  NEXT_PUBLIC_USDT_ADDRESS: "0x0000000000000000000000000000000000000000",
  NEXT_PUBLIC_CONTRACT_OWNER: "0x0000000000000000000000000000000000000000",

  NEXT_PUBLIC_APP_URL: "https://your-domain.example",
  NEXT_PUBLIC_PREDICTION_PLATFORM_URL: "",
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: "",
  NEXT_PUBLIC_DEFAULT_LOG_LEVEL: "info",
  NEXT_PUBLIC_SECURE_SITE_ORIGIN: "",
  NEXT_PUBLIC_SECURE_SITE_SDK_URL: "",
  NEXT_PUBLIC_SECURE_SITE_SDK_VERSION: "",

  // ---------------------------------------------------------------------------
  // 6) Post-deploy Wallet Routing
  // ---------------------------------------------------------------------------
  ZERO_LINE_WALLET: "",
  COMMUNITY_WALLET: "",
  FOUNDATION_WALLET: "",
  INSTITUTION_WALLET: "",

  // ---------------------------------------------------------------------------
  // 7) NFTB Tier Pricing Overrides
  // ---------------------------------------------------------------------------
  NFTB_TIER1_USDT_PRICE: "500",
  NFTB_TIER2_USDT_PRICE: "1000",
  NFTB_TIER3_USDT_PRICE: "2000",
  NFTB_TIER1_TOF_PRICE: "100000",
  NFTB_TIER2_TOF_PRICE: "200000",
  NFTB_TIER3_TOF_PRICE: "400000",

  // ---------------------------------------------------------------------------
  // 8) Swap Deploy / Seed Parameters
  // ---------------------------------------------------------------------------
  SWAP_SEED_TOT: "60000000",
  SWAP_SEED_USDT: "60000000",

  // ---------------------------------------------------------------------------
  // 9) Upgrade Parameters
  // ---------------------------------------------------------------------------
  UPGRADE_CONTRACT_NAME: "",
  UPGRADE_PROXY_ADDRESS: "",

  // ---------------------------------------------------------------------------
  // 10) Keeper / Health Runtime
  // ---------------------------------------------------------------------------
  KEEPER_INTERVAL_MS: "600000",
  KEEPER_LOCK_FILE: "/var/lock/definode-keeper.lock",
  KEEPER_STATUS_FILE: "/opt/definode/DeFiNodeNexus/runtime/keeper/latest-run.json",
  HEALTH_REPORT_FILE: "/opt/definode/DeFiNodeNexus/runtime/health/latest-health-check.json",

  MIN_TOT_RESERVE: "10000",
  MIN_USDT_RESERVE: "1000",
  MAX_DEFLATION_DELAY_HOURS: "6",
  NODES_EVENT_SCAN_LOOKBACK_BLOCKS: "5000",

  // ---------------------------------------------------------------------------
  // 11) Batch / Operations Script Parameters
  // ---------------------------------------------------------------------------
  BATCH_SIZE: "100",
  FROM_BLOCK: "",
  TO_BLOCK: "",
  DRY_RUN: "false",
  CONFIRM_PURGE: "false",
  KEEP_USER: "",
  PURGE_CONTRACT_ADDRESS: "",
  REF_TEST_USERS: "",
  REF_TEST_GAS_ETH: "0.1",
  USDT_MINT_RECIPIENTS: "",
  USDT_MINT_AMOUNTS: "",

  // ---------------------------------------------------------------------------
  // 12) Data Layer / DB / Announcements
  // ---------------------------------------------------------------------------
  MYSQL_HOST: "",
  MYSQL_PORT: "3306",
  MYSQL_USER: "",
  MYSQL_PASSWORD: "",
  MYSQL_DATABASE: "",

  SUPABASE_URL: "",
  SUPABASE_SERVICE_ROLE_KEY: "",

  ANNOUNCEMENT_ADMIN_TOKEN: "",
  ANNOUNCEMENT_DATA_SERVICE_URL: "",
  ANNOUNCEMENT_DATA_SERVICE_TOKEN: "",

  // ---------------------------------------------------------------------------
  // 13) Alerting / Notification Channels
  // ---------------------------------------------------------------------------
  DISCORD_WEBHOOK_URL: "",
  TELEGRAM_BOT_TOKEN: "",
  TELEGRAM_CHAT_ID: ""
};

for (const [key, value] of Object.entries(ENV_CONFIG)) {
  const existing = String(process.env[key] || "").trim();
  if (!existing && value !== "") {
    process.env[key] = String(value).trim();
  }
}

const mirroredPairs = [
  ["NEXT_PUBLIC_SEPOLIA_RPC_URL", "SEPOLIA_RPC_URL"],
  ["NEXT_PUBLIC_NEXUS_ADDRESS", "NEXUS_ADDRESS"],
  ["NEXT_PUBLIC_SWAP_ADDRESS", "SWAP_ADDRESS"],
  ["NEXT_PUBLIC_TOT_ADDRESS", "TOT_TOKEN_ADDRESS"],
  ["NEXT_PUBLIC_TOF_ADDRESS", "TOF_TOKEN_ADDRESS"],
  ["NEXT_PUBLIC_USDT_ADDRESS", "USDT_TOKEN_ADDRESS"],
  ["NEXT_PUBLIC_CONTRACT_OWNER", "TOKEN_OWNER_ADDRESS"]
];

for (const [publicKey, privateKey] of mirroredPairs) {
  const pub = String(process.env[publicKey] || "").trim();
  const pri = String(process.env[privateKey] || "").trim();

  if (!pub && pri) {
    process.env[publicKey] = pri;
  }

  if (!pri && pub) {
    process.env[privateKey] = pub;
  }
}

module.exports = {
  ENV_CONFIG
};
