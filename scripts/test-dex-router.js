#!/usr/bin/env node
/**
 * Test DEX Router - getAmountsOut call
 */
require("../env_conf");
const { ethers } = require("ethers");

const RPC_URL = process.env.CNC_RPC_URL;
const DEX_ROUTER = process.env.SWAP_DEX_ROUTER_ADDRESS;
const TOT_ADDRESS = process.env.TOT_TOKEN_ADDRESS;
const USDT_ADDRESS = process.env.USDT_TOKEN_ADDRESS;

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║          Test DEX Router - getAmountsOut                  ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  console.log("DEX Router:", DEX_ROUTER);
  console.log("USDT:", USDT_ADDRESS);
  console.log("TOT:", TOT_ADDRESS);
  console.log();

  const ROUTER_ABI = [
    "function getAmountsOut(uint256 amountIn, address[] calldata path) public view returns (uint256[] memory amounts)",
  ];
  
  const router = new ethers.Contract(DEX_ROUTER, ROUTER_ABI, provider);
  
  // Test the getAmountsOut path
  const path = [USDT_ADDRESS, TOT_ADDRESS];
  const amountIn = ethers.parseUnits("0.1", 18);
  
  console.log("═══ Calling getAmountsOut ═══");
  console.log(`Path: ${path[0]} -> ${path[1]}`);
  console.log(`Amount In: ${ethers.formatUnits(amountIn, 18)} USDT`);
  console.log();

  try {
    const amounts = await router.getAmountsOut(amountIn, path);
    console.log("✅ getAmountsOut succeeded!");
    console.log(`Amounts: ${amounts.map((a, i) => {
      const decimals = i === 0 ? 18 : 18;
      return ethers.formatUnits(a, decimals);
    }).join(' -> ')}`);
    console.log();
    console.log(`Expected TOT: ${ethers.formatUnits(amounts[1], 18)}`);
  } catch (err) {
    console.error("❌ getAmountsOut failed!");
    console.error(`Error: ${err.message}`);
    console.error();
    
    // Check if router exists
    const code = await provider.getCode(DEX_ROUTER);
    if (code === "0x") {
      console.error("Router address has no code!");
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
