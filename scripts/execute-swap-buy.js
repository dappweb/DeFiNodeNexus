#!/usr/bin/env node
/**
 * Execute Swap Transaction: Buy TOT with USDT
 * Account: DEPLOYER_PRIVATE_KEY
 * Amount: 0.1 USDT
 */
require("../env_conf");
const { ethers } = require("ethers");

const RPC_URL = process.env.CNC_RPC_URL || "https://rpc.cncchainpro.com";
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const SWAP_ADDRESS = process.env.SWAP_ADDRESS;
const TOT_ADDRESS = process.env.TOT_TOKEN_ADDRESS;
const USDT_ADDRESS = process.env.USDT_TOKEN_ADDRESS;
const USDT_AMOUNT = "0.1"; // USDT to swap

const SWAP_ABI = [
  "function swapPaused() public view returns (bool)",
  "function quoteBuy(uint256 usdtAmount) public view returns (uint256 totOut, uint256 fee)",
  "function buyTot(uint256 usdtAmount, uint256 minTotOut) external",
  "function getDailyBoughtAmount(address user) public view returns (uint256)",
  "function maxDailyBuy() public view returns (uint256)",
  "function buyFeeBps() public view returns (uint256)",
];

const ERC20_ABI = [
  "function decimals() public view returns (uint8)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transfer(address to, uint256 amount) external returns (bool)",
];

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║        SWAP Transaction: Buy TOT with USDT                 ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  if (!DEPLOYER_KEY) {
    console.error("❌ DEPLOYER_PRIVATE_KEY not configured in .env");
    process.exit(1);
  }

  try {
    // Setup
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(DEPLOYER_KEY, provider);
    const deployer = wallet.address;

    console.log(`📍 RPC URL:     ${RPC_URL}`);
    console.log(`📍 Deployer:    ${deployer}`);
    console.log(`📍 SWAP:        ${SWAP_ADDRESS}`);
    console.log(`📍 USDT Amount: ${USDT_AMOUNT} USDT\n`);

    // Create contract instances
    const swap = new ethers.Contract(SWAP_ADDRESS, SWAP_ABI, wallet);
    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, wallet);
    const tot = new ethers.Contract(TOT_ADDRESS, ERC20_ABI, wallet);

    // Step 1: Get decimals and current balances
    console.log("═══ STEP 1: Check Setup ═══");
    const [usdtDec, totDec, usdtBalance, totBalance, swapPaused, dailyBought, maxDaily] = 
      await Promise.all([
        usdt.decimals(),
        tot.decimals(),
        usdt.balanceOf(deployer),
        tot.balanceOf(deployer),
        swap.swapPaused(),
        swap.getDailyBoughtAmount(deployer),
        swap.maxDailyBuy(),
      ]);

    console.log(`✅ USDT Decimals: ${usdtDec}`);
    console.log(`✅ TOT Decimals:  ${totDec}`);
    console.log(`✅ USDT Balance:  ${ethers.formatUnits(usdtBalance, usdtDec)} USDT`);
    console.log(`✅ TOT Balance:   ${ethers.formatUnits(totBalance, totDec)} TOT`);
    console.log(`✅ Swap Paused:   ${swapPaused ? "🚫 YES" : "✅ NO"}`);
    console.log(`✅ Daily Bought:  ${ethers.formatUnits(dailyBought, totDec)} TOT`);
    console.log(`✅ Max Daily:     ${ethers.formatUnits(maxDaily, totDec)} TOT\n`);

    if (swapPaused) {
      console.error("❌ CRITICAL: Swap is PAUSED - transaction will fail!");
      process.exit(1);
    }

    // Check balance
    const inputAmount = ethers.parseUnits(USDT_AMOUNT, usdtDec);
    if (usdtBalance < inputAmount) {
      console.error(`❌ Insufficient USDT balance: ${ethers.formatUnits(usdtBalance, usdtDec)} < ${USDT_AMOUNT}`);
      process.exit(1);
    }

    // Step 2: Get quote
    console.log("═══ STEP 2: Get Quote ═══");
    const [quotedTotOut, quotedFee] = await swap.quoteBuy(inputAmount);
    console.log(`✅ Input:  ${USDT_AMOUNT} USDT`);
    console.log(`✅ Output: ${ethers.formatUnits(quotedTotOut, totDec)} TOT (user receives)`);
    console.log(`✅ Fee:    ${ethers.formatUnits(quotedFee, totDec)} TOT\n`);

    if (quotedTotOut === BigInt(0)) {
      console.error("❌ Quote returned 0 TOT - transaction would fail");
      process.exit(1);
    }

    // Step 3: Check and set approval
    console.log("═══ STEP 3: Check USDT Approval ═══");
    const currentAllowance = await usdt.allowance(deployer, SWAP_ADDRESS);
    console.log(`Current allowance: ${ethers.formatUnits(currentAllowance, usdtDec)} USDT`);

    if (currentAllowance < inputAmount) {
      console.log(`⚠️  Allowance is insufficient, need to approve...\n`);

      // Reset to 0 first if there's existing allowance (USDT Tether-style protection)
      if (currentAllowance > BigInt(0)) {
        console.log("📤 Step 3a: Resetting allowance to 0...");
        const resetTx = await usdt.approve(SWAP_ADDRESS, BigInt(0));
        console.log(`   TX Hash: ${resetTx.hash}`);
        const resetReceipt = await resetTx.wait();
        console.log(`   ✅ Confirmed in block ${resetReceipt.blockNumber}\n`);
      }

      // Now approve the full amount
      console.log("📤 Step 3b: Setting new allowance...");
      const approveTx = await usdt.approve(SWAP_ADDRESS, inputAmount);
      console.log(`   TX Hash: ${approveTx.hash}`);
      const approveReceipt = await approveTx.wait();
      console.log(`   ✅ Confirmed - Approved ${USDT_AMOUNT} USDT\n`);
    } else {
      console.log(`✅ Allowance sufficient: ${ethers.formatUnits(currentAllowance, usdtDec)} USDT\n`);
    }

    // Step 4: Execute swap
    console.log("═══ STEP 4: Execute Swap ═══");
    
    // Set minimum output with 0.5% slippage tolerance
    const minTotOut = (quotedTotOut * BigInt(9950)) / BigInt(10000);
    console.log(`Input Amount:  ${USDT_AMOUNT} USDT`);
    console.log(`Expected Out:  ${ethers.formatUnits(quotedTotOut, totDec)} TOT`);
    console.log(`Min Out (0.5%): ${ethers.formatUnits(minTotOut, totDec)} TOT\n`);

    console.log("📤 Calling swap.buyTot()...");
    const buyTx = await swap.buyTot(inputAmount, minTotOut, { 
      gasLimit: 500_000 
    });

    console.log(`TX Hash: ${buyTx.hash}`);
    console.log("⏳ Waiting for confirmation...\n");

    const receipt = await buyTx.wait();
    
    console.log(`✅ Transaction confirmed!`);
    console.log(`   Block:       ${receipt.blockNumber}`);
    console.log(`   Gas Used:    ${receipt.gasUsed.toString()}`);
    console.log(`   Status:      ${receipt.status === 1 ? "✅ Success" : "❌ Failed"}\n`);

    if (receipt.status !== 1) {
      console.error("❌ Transaction failed!");
      process.exit(1);
    }

    // Step 5: Verify balance change
    console.log("═══ STEP 5: Verify Results ═══");
    const [newUsdtBalance, newTotBalance] = await Promise.all([
      usdt.balanceOf(deployer),
      tot.balanceOf(deployer),
    ]);

    const usdtSpent = usdtBalance - newUsdtBalance;
    const totReceived = newTotBalance - totBalance;

    console.log(`USDT after:  ${ethers.formatUnits(newUsdtBalance, usdtDec)} USDT (spent ${ethers.formatUnits(usdtSpent, usdtDec)})`);
    console.log(`TOT after:   ${ethers.formatUnits(newTotBalance, totDec)} TOT (received ${ethers.formatUnits(totReceived, totDec)})\n`);

    // Summary
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║ ✅ SWAP SUCCESSFUL!                                        ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    console.log(`📊 Summary:`);
    console.log(`   Input:    ${ethers.formatUnits(usdtSpent, usdtDec)} USDT`);
    console.log(`   Output:   ${ethers.formatUnits(totReceived, totDec)} TOT`);
    console.log(`   Rate:     ${totReceived === BigInt(0) ? "N/A" : (Number(usdtSpent) / Number(totReceived)).toFixed(8)} USDT/TOT`);
    console.log(`   TX Hash:  ${buyTx.hash}\n`);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    if (error.reason) {
      console.error(`Reason: ${error.reason}`);
    }
    if (error.data) {
      console.error(`Data: ${error.data}`);
    }
    process.exit(1);
  }
}

main();
