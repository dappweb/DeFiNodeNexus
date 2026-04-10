#!/usr/bin/env node
/**
 * Verify CNC deployment configuration
 */
require("../env_conf");

const cncRpcUrl = process.env.CNC_RPC_URL;
const cncChainId = process.env.CNC_CHAIN_ID;
const cncTotToken = process.env.TOT_TOKEN_ADDRESS;
const cncTofToken = process.env.TOF_TOKEN_ADDRESS;
const cncUsdtToken = process.env.USDT_TOKEN_ADDRESS;
const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
const ownerPrivateKey = process.env.OWNER_PRIVATE_KEY;
const zeroAddress = "0x0000000000000000000000000000000000000000";

let hasErrors = false;

console.log("=== CNC Deployment Configuration Verification ===\n");

// Check RPC URL
if (!cncRpcUrl) {
  console.error("❌ CNC_RPC_URL is not set");
  hasErrors = true;
} else {
  console.log("✓ CNC_RPC_URL:", cncRpcUrl);
}

// Check Chain ID
if (!cncChainId) {
  console.error("❌ CNC_CHAIN_ID is not set");
  hasErrors = true;
} else {
  console.log("✓ CNC_CHAIN_ID:", cncChainId);
  if (cncChainId !== "50716") {
    console.warn("⚠️  Chain ID", cncChainId, "differs from expected 50716");
  }
}

// Check Token Addresses
if (!cncTotToken || cncTotToken === zeroAddress) {
  console.error("❌ TOT_TOKEN_ADDRESS is not set or is zero address");
  hasErrors = true;
} else {
  console.log("✓ TOT_TOKEN_ADDRESS:", cncTotToken);
}

if (!cncTofToken || cncTofToken === zeroAddress) {
  console.error("❌ TOF_TOKEN_ADDRESS is not set or is zero address");
  hasErrors = true;
} else {
  console.log("✓ TOF_TOKEN_ADDRESS:", cncTofToken);
}

if (!cncUsdtToken || cncUsdtToken === zeroAddress) {
  console.error("❌ USDT_TOKEN_ADDRESS is not set or is zero address");
  hasErrors = true;
} else {
  console.log("✓ USDT_TOKEN_ADDRESS:", cncUsdtToken);
}

// Check Deployer Private Key
if (!deployerPrivateKey) {
  console.error("❌ DEPLOYER_PRIVATE_KEY is not set");
  hasErrors = true;
} else {
  console.log("✓ DEPLOYER_PRIVATE_KEY is set");
}

// Check Owner Private Key (optional)
if (!ownerPrivateKey) {
  console.log("ℹ️  OWNER_PRIVATE_KEY is not set (will use DEPLOYER_PRIVATE_KEY as owner)");
} else {
  if (ownerPrivateKey === deployerPrivateKey) {
    console.log("ℹ️  OWNER_PRIVATE_KEY is same as DEPLOYER_PRIVATE_KEY");
  } else {
    console.log("✓ OWNER_PRIVATE_KEY is set (separate from deployer)");
  }
}

console.log("\n=== Deployment Command ===");
console.log("npm run deploy:cnc");

if (hasErrors) {
  console.error("\n❌ Configuration verification failed. Please set all required environment variables.");
  process.exitCode = 1;
} else {
  console.log("\n✓ Configuration verification passed. Ready to deploy.");
  process.exitCode = 0;
}
