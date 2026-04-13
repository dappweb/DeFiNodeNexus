#!/usr/bin/env node
/**
 * Simple Swap Contract Test using ethers v6
 * No Hardhat dependency - runs directly with node
 */
const { ethers } = require("ethers-v6");

async function main() {
  // Configuration
  const RPC_URL = "https://rpc.cncchainpro.com";
  const SWAP_ADDRESS = "0xfE20139dCFA053b819A3745E9ed801b9C6cc84aC";
  const TOT_ADDRESS = "0x0C720a3d1AB25b19c132Ba02C74A5D145d7CcDdA";
  const USDT_ADDRESS = "0xf54cC0F6CE272125c39C45A8141b84989A8765f4";

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║          SWAP Contract Direct Test (No Hardhat)          ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Connect to provider
  console.log("🔗 Connecting to RPC...");
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  try {
    // Test connection
    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ Connected. Network block: ${blockNumber}\n`);

    // Swap Contract ABI
    const SWAP_ABI = [
      "function swapPaused() public view returns (bool)",
      "function version() public view returns (string memory)",
      "function name() public view returns (string memory)",
      "function owner() public view returns (address)",
      "function externalDexEnabled() public view returns (bool)",
      "function buyFeeBps() public view returns (uint256)",
      "function sellFeeBps() public view returns (uint256)",
      "function maxDailyBuy() public view returns (uint256)",
      "function getCurrentPrice() public view returns (uint256)",
      "function quoteBuy(uint256 usdtAmount) public view returns (uint256 netTotOut, uint256 grossTotOut)",
      "function quoteSell(uint256 totAmount) public view returns (uint256 netUsdtOut, uint256 grossUsdtOut)",
      "function getDailyBoughtAmount(address user) public view returns (uint256)",
      "function getMaxSellAmount(address user) public view returns (uint256)",
    ];

    const ERC20_ABI = [
      "function decimals() public view returns (uint8)",
      "function name() public view returns (string memory)",
      "function symbol() public view returns (string memory)",
      "function balanceOf(address account) public view returns (uint256)",
    ];

    // Create contracts
    const swap = new ethers.Contract(SWAP_ADDRESS, SWAP_ABI, provider);
    const tot = new ethers.Contract(TOT_ADDRESS, ERC20_ABI, provider);
    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);

    // Check contract code
    console.log("═══ TEST 1: Contract Existence ═══");
    const code = await provider.getCode(SWAP_ADDRESS);
    if (code === "0x") {
      console.error("❌ No contract code at SWAP_ADDRESS");
      process.exit(1);
    }
    console.log(`✅ Contract found (${(code.length - 2) / 2} bytes)\n`);

    // Read Swap status
    console.log("═══ TEST 2: Swap Status ═══");
    const [swapPaused, version, name, owner, externalDex, buyFee, sellFee, maxDaily, price] = 
      await Promise.all([
        swap.swapPaused(),
        swap.version(),
        swap.name(),
        swap.owner(),
        swap.externalDexEnabled(),
        swap.buyFeeBps(),
        swap.sellFeeBps(),
        swap.maxDailyBuy(),
        swap.getCurrentPrice(),
      ]);

    console.log(`✅ Name:           ${name}`);
    console.log(`✅ Version:        ${version}`);
    console.log(`✅ Owner:          ${owner}`);
    console.log(`✅ Swap Paused:    ${swapPaused ? "🚫 YES - THIS IS THE PROBLEM!" : "✅ NO (Active)"}`);
    console.log(`✅ External DEX:   ${externalDex ? "✅ Enabled" : "❌ Disabled"}`);
    console.log(`✅ Buy Fee:        ${buyFee} bps (${Number(buyFee) / 100}%)`);
    console.log(`✅ Sell Fee:       ${sellFee} bps (${Number(sellFee) / 100}%)`);
    console.log(`✅ Max Daily Buy:  ${ethers.formatUnits(maxDaily, 18)} TOT`);
    console.log(`✅ Current Price:  ${ethers.formatUnits(price, 18)} USDT/TOT\n`);

    // Token info
    console.log("═══ TEST 3: Token Information ═══");
    const [totDec, usdtDec, totName, usdtName, totSymbol, usdtSymbol] = 
      await Promise.all([
        tot.decimals(),
        usdt.decimals(),
        tot.name(),
        usdt.name(),
        tot.symbol(),
        usdt.symbol(),
      ]);

    console.log(`✅ TOT:  ${totName} (${totSymbol}) - ${totDec} decimals`);
    console.log(`✅ USDT: ${usdtName} (${usdtSymbol}) - ${usdtDec} decimals\n`);

    // Test quotes
    console.log("═══ TEST 4: Quote Functions ═══");
    const testBuyAmount = ethers.parseUnits("1", usdtDec);
    const testSellAmount = ethers.parseUnits("100", totDec);

    try {
      const [buyNetTot, buyGrossTot] = await swap.quoteBuy(testBuyAmount);
      console.log(`✅ quoteBuy(1 USDT):`);
      console.log(`   → ${ethers.formatUnits(buyNetTot, totDec)} TOT (net)`);
      console.log(`   → ${ethers.formatUnits(buyGrossTot, totDec)} TOT (gross)`);
    } catch (e) {
      console.error(`❌ quoteBuy failed: ${e.message.split("\n")[0]}`);
    }

    try {
      const [sellNetUsdt, sellGrossUsdt] = await swap.quoteSell(testSellAmount);
      console.log(`✅ quoteSell(100 TOT):`);
      console.log(`   → ${ethers.formatUnits(sellNetUsdt, usdtDec)} USDT (net)`);
      console.log(`   → ${ethers.formatUnits(sellGrossUsdt, usdtDec)} USDT (gross)\n`);
    } catch (e) {
      console.error(`❌ quoteSell failed: ${e.message.split("\n")[0]}\n`);
    }

    // Summary
    console.log("╔════════════════════════════════════════════════════════════╗");
    if (swapPaused) {
      console.log("║ 🚫 SWAP IS PAUSED - Transactions will fail!              ║");
      console.log("║                                                            ║");
      console.log("║ To fix: Owner must call setSwapPaused(false)              ║");
    } else {
      console.log("║ ✅ Swap contract is ACTIVE and ready for trading         ║");
    }
    console.log("╚════════════════════════════════════════════════════════════╝\n");

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

main();
