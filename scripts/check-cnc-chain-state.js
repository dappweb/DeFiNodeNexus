#!/usr/bin/env node
/**
 * Check if contract addresses are actually deployed on CNC chain
 */
require("../env_conf");
const { ethers } = require("ethers");

async function main() {
  const rpcUrl = process.env.CNC_RPC_URL;
  const totAddress = process.env.TOT_TOKEN_ADDRESS;
  const tofAddress = process.env.TOF_TOKEN_ADDRESS;
  const usdtAddress = process.env.USDT_TOKEN_ADDRESS;
  const nexusAddress = process.env.NEXUS_ADDRESS;
  const swapAddress = process.env.SWAP_ADDRESS;

  console.log("=== CNC Chain State Verification ===\n");
  console.log("RPC URL:", rpcUrl);
  console.log("Chain ID: 50716\n");

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  try {
    const network = await provider.getNetwork();
    console.log(`✓ Connected to network: ${network.name} (Chain ID: ${network.chainId})\n`);

    if (network.chainId !== 50716n) {
      console.warn("⚠️  Chain ID mismatch! Expected 50716, got", network.chainId.toString());
    }
  } catch (err) {
    console.error("❌ Failed to connect to RPC:", err.message);
    process.exit(1);
  }

  // Check if addresses are deployed
  const addresses = {
    "TOT_TOKEN_ADDRESS": totAddress,
    "TOF_TOKEN_ADDRESS": tofAddress,
    "USDT_TOKEN_ADDRESS": usdtAddress,
    "NEXUS_ADDRESS": nexusAddress,
    "SWAP_ADDRESS": swapAddress,
  };

  console.log("=== Checking Contract Deployment State ===\n");

  for (const [name, address] of Object.entries(addresses)) {
    if (!address) {
      console.warn(`⚠️  ${name}: NOT SET`);
      continue;
    }

    try {
      const code = await provider.getCode(address);
      if (code === "0x") {
        console.error(`❌ ${name}: ${address} - NO CODE (not deployed)`);
      } else {
        console.log(`✓ ${name}: ${address} - DEPLOYED (${code.length} bytes)`);
      }
    } catch (err) {
      console.error(`❌ ${name}: Error checking - ${err.message}`);
    }
  }

  console.log("\n=== Summary ===");
  console.log("✓ All configured addresses have been verified against CNC chain");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
