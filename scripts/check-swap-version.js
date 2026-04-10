#!/usr/bin/env node
/**
 * Check if SWAP_ADDRESS is TOTSwapV3 or older version
 */
require("../env_conf");
const { ethers } = require("ethers");

// TOTSwap ABI (read-only methods)
const SWAP_ABI = [
  "function version() public view returns (string memory)",
  "function name() public view returns (string memory)",
  "function owner() public view returns (address)",
];

async function main() {
  const rpcUrl = process.env.CNC_RPC_URL;
  const swapAddress = process.env.SWAP_ADDRESS;

  console.log("=== SWAP Contract Version Check ===\n");
  console.log("SWAP_ADDRESS:", swapAddress);
  console.log("RPC URL:", rpcUrl);
  console.log();

  if (!swapAddress || swapAddress === "0x0000000000000000000000000000000000000000") {
    console.error("❌ SWAP_ADDRESS not set or is zero address");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const swapContract = new ethers.Contract(swapAddress, SWAP_ABI, provider);

  try {
    console.log("=== Reading Contract Information ===\n");

    // Check if code exists
    const code = await provider.getCode(swapAddress);
    if (code === "0x") {
      console.error("❌ No contract code at SWAP_ADDRESS");
      process.exit(1);
    }
    console.log("✓ Contract code found");

    // Try to get version
    try {
      const version = await swapContract.version();
      console.log(`✓ Version: ${version}`);
      
      if (version.includes("V3") || version === "3") {
        console.log("\n✅ SWAP_ADDRESS IS TOTSwapV3");
      } else if (version === "2" || version.includes("V2")) {
        console.log("\n⚠️  SWAP_ADDRESS is TOTSwapV2 (not V3)");
      } else {
        console.log(`\n ℹ️  SWAP_ADDRESS version: ${version}`);
      }
    } catch (err) {
      if (err.message.includes("revert")) {
        console.log("⚠️  version() method reverted - checking if contract is V3...");
      } else {
        console.log("⚠️  Could not read version():", err.message);
      }
    }

    // Try to get name/owner
    try {
      const name = await swapContract.name();
      console.log(`✓ Contract name: ${name}`);
    } catch {
      console.log("ℹ️  name() not available");
    }

    try {
      const owner = await swapContract.owner();
      console.log(`✓ Owner: ${owner}`);
    } catch {
      console.log("ℹ️  owner() not available");
    }

    console.log("\n=== Recommendation ===");
    console.log("To upgrade to V3 if not already:");
    console.log("  npm run replace:swap:v3:cnc");
    console.log("  npm run configure:totswap:v3:cnc");

  } catch (err) {
    console.error("❌ Error checking contract:", err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
