#!/usr/bin/env node
/**
 * Check Swap V3 DEX Configuration
 */
require("../env_conf");
const { ethers } = require("ethers");

const RPC_URL = process.env.CNC_RPC_URL || "https://rpc.cncchainpro.com";
const SWAP_ADDRESS = process.env.SWAP_ADDRESS;

const SWAP_ABI = [
  "function getConfig() public view returns (address dexRouter, address dexPair, address dexFactory, bool externalDexEnabled, bool swapPaused)",
  "function dexRouter() public view returns (address)",
  "function dexPair() public view returns (address)",
  "function dexFactory() public view returns (address)",
  "function externalDexEnabled() public view returns (bool)",
];

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║      Check Swap V3 DEX Configuration                     ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const swap = new ethers.Contract(SWAP_ADDRESS, SWAP_ABI, provider);

    const [dexRouter, dexPair, dexFactory, externalDex] = await Promise.all([
      swap.dexRouter(),
      swap.dexPair(),
      swap.dexFactory(),
      swap.externalDexEnabled(),
    ]);

    console.log("═══ DEX Configuration ═══");
    console.log(`DEX Router:      ${dexRouter}`);
    console.log(`DEX Pair:        ${dexPair}`);
    console.log(`DEX Factory:     ${dexFactory}`);
    console.log(`External DEX:    ${externalDex ? "✅ Enabled" : "❌ Disabled"}`);
    console.log();

    // Check configuration validity
    const isConfigured = 
      dexRouter !== ethers.ZeroAddress && 
      dexPair !== ethers.ZeroAddress &&
      dexFactory !== ethers.ZeroAddress;

    console.log("═══ Configuration Status ═══");
    if (!isConfigured) {
      console.error("❌ DEX Configuration Incomplete!");
      console.log(`   Router:  ${dexRouter === ethers.ZeroAddress ? "🚫 NOT SET" : "✅ SET"}`);
      console.log(`   Pair:    ${dexPair === ethers.ZeroAddress ? "🚫 NOT SET" : "✅ SET"}`);
      console.log(`   Factory: ${dexFactory === ethers.ZeroAddress ? "🚫 NOT SET" : "✅ SET"}`);
      console.log();
      console.log("🔧 To fix this, contract owner must call:");
      console.log(`   setDexRouter(0x...)`);
      console.log(`   setDexPair(0x...)`);
      console.log(`   setDexFactory(0x...)`);
      console.log(`   setExternalDexEnabled(true)`);
      process.exit(1);
    }

    console.log("✅ DEX Configuration appears valid");
    console.log();

    // Check if addresses have code
    console.log("═══ Contract Verification ═══");
    const [routerCode, pairCode] = await Promise.all([
      provider.getCode(dexRouter),
      provider.getCode(dexPair),
    ]);

    if (routerCode === "0x") {
      console.error("❌ DEX Router address has no code!");
    } else {
      console.log(`✅ DEX Router: ${(routerCode.length - 2) / 2} bytes`);
    }

    if (pairCode === "0x") {
      console.error("❌ DEX Pair address has no code!");
    } else {
      console.log(`✅ DEX Pair: ${(pairCode.length - 2) / 2} bytes\n`);
    }

    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║✅ DEX Configuration OK - Issue may be elsewhere            ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

main();
