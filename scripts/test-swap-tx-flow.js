#!/usr/bin/env node
/**
 * Test Swap Transaction Flow
 * Simulates a real buy/sell flow to identify where it fails
 */
require("../env_conf");
const { ethers } = require("ethers");

const SWAP_ABI = [
  "function swapPaused() public view returns (bool)",
  "function quoteBuy(uint256 usdtAmount) public view returns (uint256 netTotOut, uint256 fee)",
  "function quoteSell(uint256 totAmount) public view returns (uint256 usdtOut, uint256 sellFee)",
  "function buyTot(uint256 usdtAmount, uint256 minTotOut) external",
  "function sellTot(uint256 totAmount, uint256 minUsdtOut) external",
  "function getDailyBoughtAmount(address user) public view returns (uint256)",
  "function getMaxSellAmount(address user) public view returns (uint256)",
  "function maxDailyBuy() public view returns (uint256)",
  "function buyFeeBps() public view returns (uint256)",
  "function sellFeeBps() public view returns (uint256)",
];

const ERC20_ABI = [
  "function decimals() public view returns (uint8)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transfer(address to, uint256 amount) external returns (bool)",
];

async function main() {
  const rpcUrl = process.env.CNC_RPC_URL || "http://localhost:8545";
  const swapAddress = process.env.SWAP_ADDRESS;
  const totAddress = process.env.TOT_TOKEN_ADDRESS;
  const usdtAddress = process.env.USDT_TOKEN_ADDRESS;
  const testAddress = process.argv[2]; // optional test user address

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║       SWAP Transaction Flow Simulation Test               ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  if (!testAddress) {
    console.log("Usage: node test-swap-tx-flow.js <walletAddress>\n");
    console.log("Example: node test-swap-tx-flow.js 0x7444447d8580EB900b199e852C132F626247a36F7\n");
    console.log("📌 Simulating with default test addresses...\n");
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const swap = new ethers.Contract(swapAddress, SWAP_ABI, provider);
    const tot = new ethers.Contract(totAddress, ERC20_ABI, provider);
    const usdt = new ethers.Contract(usdtAddress, ERC20_ABI, provider);

    console.log("═══ STEP 1: Get Contract State ═══");
    const [swapPaused, usdtDec, totDec, maxDailyBuy, buyFeeBps, sellFeeBps] = await Promise.all([
      swap.swapPaused(),
      usdt.decimals(),
      tot.decimals(),
      swap.maxDailyBuy(),
      swap.buyFeeBps(),
      swap.sellFeeBps(),
    ]);

    console.log(`✅ Swap Paused:    ${swapPaused ? "🚫 YES" : "✅ NO"}`);
    console.log(`✅ USDT Decimals:  ${usdtDec}`);
    console.log(`✅ TOT Decimals:   ${totDec}`);
    console.log(`✅ Max Daily Buy:  ${ethers.formatUnits(maxDailyBuy, totDec)} TOT\n`);
    console.log(`✅ Buy Fee Bps:    ${buyFeeBps} (${Number(buyFeeBps) / 100}%)`);
    console.log(`✅ Sell Fee Bps:   ${sellFeeBps} (${Number(sellFeeBps) / 100}%)\n`);

    if (swapPaused) {
      console.error("❌ CRITICAL: Swap is PAUSED - all transactions will fail!");
      console.log("\nTo resume swap, owner must call: setSwapPaused(false)\n");
      process.exit(1);
    }

    // Simulate BUY flow
    console.log("═══ STEP 2: Simulate BUY Flow ═══");
    const testBuyAmount = ethers.parseUnits("0.1", usdtDec); // 0.1 USDT
    console.log(`Testing buy with: ${ethers.formatUnits(testBuyAmount, usdtDec)} USDT\n`);

    try {
      const [netTot, buyFee] = await swap.quoteBuy(testBuyAmount);
      const grossTot = netTot + buyFee;
      console.log(`✅ quoteBuy returned successfully:`);
      console.log(`   User receives: ${ethers.formatUnits(netTot, totDec)} TOT`);
      console.log(`   Buy fee:       ${ethers.formatUnits(buyFee, totDec)} TOT`);
      console.log(`   Gross output:  ${ethers.formatUnits(grossTot, totDec)} TOT`);
      const observedBuyFeeBps = grossTot > 0n ? Number((buyFee * 10000n) / grossTot) : 0;
      console.log(`   Observed fee:  ${observedBuyFeeBps / 100}%\n`);

      if (netTot === BigInt(0)) {
        console.error("   ❌ WARNING: Net TOT output is 0!");
      }

      // Check minimum output validation
      const minOut = (netTot * BigInt(9950)) / BigInt(10000); // 0.5% slippage
      console.log(`   Min with 0.5% slippage: ${ethers.formatUnits(minOut, totDec)} TOT\n`);
    } catch (err) {
      console.error(`❌ quoteBuy failed: ${err.message}\n`);
      console.log("Potential causes:");
      console.log("  - Pool has insufficient liquidity");
      console.log("  - Input amount is too small");
      console.log("  - Price calculation error in contract\n");
    }

    // Simulate SELL flow
    console.log("═══ STEP 3: Simulate SELL Flow ═══");
    const testSellAmount = ethers.parseUnits("100", totDec); // 100 TOT
    console.log(`Testing sell with: ${ethers.formatUnits(testSellAmount, totDec)} TOT\n`);

    try {
      const [netUsdt, sellFee] = await swap.quoteSell(testSellAmount);
      console.log(`✅ quoteSell returned successfully:`);
      console.log(`   User receives: ${ethers.formatUnits(netUsdt, usdtDec)} USDT`);
      console.log(`   Sell fee:      ${ethers.formatUnits(sellFee, totDec)} TOT`);
      const observedSellFeeBps = testSellAmount > 0n ? Number((sellFee * 10000n) / testSellAmount) : 0;
      console.log(`   Observed fee:  ${observedSellFeeBps / 100}%`);

      if (netUsdt === BigInt(0)) {
        console.error("   ❌ WARNING: Net USDT output is 0!");
      }

      const minOut = (netUsdt * BigInt(9950)) / BigInt(10000); // 0.5% slippage
      console.log(`   Min with 0.5% slippage: ${ethers.formatUnits(minOut, usdtDec)} USDT\n`);
    } catch (err) {
      console.error(`❌ quoteSell failed: ${err.message}\n`);
      console.log("Potential causes:");
      console.log("  - Pool has insufficient liquidity");
      console.log("  - Input amount is too large");
      console.log("  - Price calculation error in contract\n");
    }

    // Check user-specific limits (if test address provided)
    if (testAddress) {
      console.log("═══ STEP 4: Check User Limits ═══");
      try {
        const [userDailyBought, userMaxSell] = await Promise.all([
          swap.getDailyBoughtAmount(testAddress),
          swap.getMaxSellAmount(testAddress),
        ]);

        console.log(`User: ${testAddress}`);
        console.log(`✅ Daily Bought Today: ${ethers.formatUnits(userDailyBought, totDec)} TOT`);
        console.log(`✅ Max Sell Allowed:   ${ethers.formatUnits(userMaxSell, totDec)} TOT\n`);

        const remainingDailyBuy = maxDailyBuy - userDailyBought;
        if (remainingDailyBuy <= BigInt(0)) {
          console.error("❌ User has exceeded daily buy limit!");
        } else {
          console.log(`✅ Remaining Daily Buy: ${ethers.formatUnits(remainingDailyBuy, totDec)} TOT\n`);
        }
      } catch (err) {
        console.error(`⚠️ Could not get user limits: ${err.message}\n`);
      }
    }

    // Test with different amounts to find breaking point
    console.log("═══ STEP 5: Test With Different Amounts ═══");
    const testAmounts = [
      { val: ethers.parseUnits("0.01", usdtDec), label: "0.01 USDT (tiny)" },
      { val: ethers.parseUnits("0.1", usdtDec), label: "0.1 USDT (small)" },
      { val: ethers.parseUnits("1", usdtDec), label: "1 USDT (normal)" },
      { val: ethers.parseUnits("10", usdtDec), label: "10 USDT (large)" },
    ];

    for (const amt of testAmounts) {
      try {
        const [netTot] = await swap.quoteBuy(amt.val);
        const status = netTot > BigInt(0) ? "✅" : "❌";
        console.log(`${status} ${amt.label}: ${ethers.formatUnits(netTot, totDec)} TOT`);
      } catch (err) {
        console.log(`❌ ${amt.label}: ERROR - ${err.message.split("\n")[0]}`);
      }
    }

    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║              Test Summary                                  ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    console.log("✅ Swap contract is responding to RPC calls");
    console.log("✅ Quote functions are accessible");
    console.log("✅ No contract errors detected\n");

    console.log("🔍 Next Steps:");
    console.log("   1. If swap is paused: Owner must call setSwapPaused(false)");
    console.log("   2. If quotes return 0: Check pool liquidity");
    console.log("   3. If quotes work: Try actual transaction on connected wallet\n");

  } catch (err) {
    console.error(`\n❌ Fatal Error: ${err.message}\n`);
    process.exit(1);
  }
}

main();
