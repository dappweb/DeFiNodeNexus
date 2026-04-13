#!/usr/bin/env node
/**
 * Test Swap Contract Interface
 * Diagnoses whether the swap contract is working and accessible
 */
require("../env_conf");
const { ethers } = require("ethers");

// TOTSwapV3 ABI - all key read/write methods
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
  "function totalLiquidity() public view returns (uint256)",
  "function getConfig() public view returns (address dexRouter, address dexPair, address dexFactory, bool externalDexEnabled, bool swapPaused)",
];

// ERC20 ABI for token info
const ERC20_ABI = [
  "function decimals() public view returns (uint8)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function name() public view returns (string memory)",
  "function symbol() public view returns (string memory)",
];

async function main() {
  const rpcUrl = process.env.CNC_RPC_URL || "http://localhost:8545";
  const swapAddress = process.env.SWAP_ADDRESS;
  const totAddress = process.env.TOT_TOKEN_ADDRESS;
  const usdtAddress = process.env.USDT_TOKEN_ADDRESS;

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║          SWAP Contract Interface Test                      ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log(`📍 RPC URL:        ${rpcUrl}`);
  console.log(`📍 SWAP Address:   ${swapAddress}`);
  console.log(`📍 TOT Address:    ${totAddress}`);
  console.log(`📍 USDT Address:   ${usdtAddress}\n`);

  if (!swapAddress || swapAddress === "0x0000000000000000000000000000000000000000") {
    console.error("❌ SWAP_ADDRESS not configured");
    process.exit(1);
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const swap = new ethers.Contract(swapAddress, SWAP_ABI, provider);

    // Test 1: Contract exists
    console.log("═══ TEST 1: Contract Existence ═══");
    const code = await provider.getCode(swapAddress);
    if (code === "0x") {
      console.error("❌ No contract code found at SWAP_ADDRESS");
      process.exit(1);
    }
    console.log("✅ Contract code exists");
    console.log(`   Bytecode size: ${(code.length - 2) / 2} bytes\n`);

    // Test 2: Basic Contract Info
    console.log("═══ TEST 2: Contract Information ═══");
    try {
      const [version, name, owner, swapPaused, config] = await Promise.all([
        swap.version(),
        swap.name(),
        swap.owner(),
        swap.swapPaused(),
        swap.getConfig(),
      ]);

      console.log(`✅ Version:       ${version}`);
      console.log(`✅ Name:          ${name}`);
      console.log(`✅ Owner:         ${owner}`);
      console.log(`✅ Swap Paused:   ${swapPaused ? "🚫 YES (PAUSED)" : "✅ NO (ACTIVE)"}`);
      console.log(`✅ External DEX:  ${config[3] ? "✅ ENABLED" : "❌ DISABLED"}`);
      console.log(`✅ DEX Router:    ${config[0]}`);
      console.log(`✅ DEX Pair:      ${config[1]}\n`);

      // Test 3: Swap Status
      console.log("═══ TEST 3: Swap Configuration ═══");
      const [buyFee, sellFee, maxDaily, price] = await Promise.all([
        swap.buyFeeBps(),
        swap.sellFeeBps(),
        swap.maxDailyBuy(),
        swap.getCurrentPrice(),
      ]);

      console.log(`✅ Buy Fee:       ${Number(buyFee)} bps (${(Number(buyFee) / 100).toFixed(2)}%)`);
      console.log(`✅ Sell Fee:      ${Number(sellFee)} bps (${(Number(sellFee) / 100).toFixed(2)}%)`);
      console.log(`✅ Max Daily Buy: ${ethers.formatUnits(maxDaily, 18)} TOT`);
      console.log(`✅ Current Price: ${ethers.formatUnits(price, 18)} USDT per TOT\n`);

      // Test 4: Quote Tests
      console.log("═══ TEST 4: Quote Functions ═══");
      
      // Test buy quote with 1 USDT
      const testUsdtAmount = ethers.parseUnits("1", 18);
      try {
        const [netTotOut, grossTotOut] = await swap.quoteBuy(testUsdtAmount);
        console.log(`✅ quoteBuy(1 USDT):`);
        console.log(`   Net Out (user receives): ${ethers.formatUnits(netTotOut, 18)} TOT`);
        console.log(`   Gross Out (before fee):  ${ethers.formatUnits(grossTotOut, 18)} TOT`);
      } catch (err) {
        console.error(`❌ quoteBuy failed: ${err.message}`);
      }

      // Test sell quote with 100 TOT
      const testTotAmount = ethers.parseUnits("100", 18);
      try {
        const [netUsdtOut, grossUsdtOut] = await swap.quoteSell(testTotAmount);
        console.log(`✅ quoteSell(100 TOT):`);
        console.log(`   Net Out (user receives): ${ethers.formatUnits(netUsdtOut, 18)} USDT`);
        console.log(`   Gross Out (before fee):  ${ethers.formatUnits(grossUsdtOut, 18)} USDT`);
      } catch (err) {
        console.error(`❌ quoteSell failed: ${err.message}`);
      }
      console.log();

      // Test 5: Token Info
      console.log("═══ TEST 5: Token Information ═══");
      const tot = new ethers.Contract(totAddress, ERC20_ABI, provider);
      const usdt = new ethers.Contract(usdtAddress, ERC20_ABI, provider);

      const [totDec, usdtDec, totName, usdtName, totSymbol, usdtSymbol] = await Promise.all([
        tot.decimals(),
        usdt.decimals(),
        tot.name(),
        usdt.name(),
        tot.symbol(),
        usdt.symbol(),
      ]);

      console.log(`✅ TOT Token:`);
      console.log(`   Name:     ${totName}`);
      console.log(`   Symbol:   ${totSymbol}`);
      console.log(`   Decimals: ${totDec}`);

      console.log(`✅ USDT Token:`);
      console.log(`   Name:     ${usdtName}`);
      console.log(`   Symbol:   ${usdtSymbol}`);
      console.log(`   Decimals: ${usdtDec}\n`);

      // Test 6: Pool Status
      console.log("═══ TEST 6: Pool & Liquidity Status ═══");
      try {
        const liquidity = await swap.totalLiquidity();
        console.log(`✅ Total Liquidity: ${ethers.formatUnits(liquidity, 18)} USDT equivalent\n`);
      } catch (err) {
        console.error(`⚠️ Could not get total liquidity: ${err.message}\n`);
      }

      // Summary
      console.log("╔════════════════════════════════════════════════════════════╗");
      if (swapPaused) {
        console.log("║ ⚠️  SWAP IS PAUSED - Transactions will fail               ║");
      } else if (!config[3]) {
        console.log("║ ⚠️  External DEX disabled - using internal pool only     ║");
      } else {
        console.log("║ ✅ SWAP Contract is operational and ready for trading    ║");
      }
      console.log("╚════════════════════════════════════════════════════════════╝\n");

    } catch (err) {
      console.error(`❌ Error reading contract methods: ${err.message}\n`);
      process.exit(1);
    }

  } catch (err) {
    console.error(`\n❌ Fatal Error: ${err.message}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
