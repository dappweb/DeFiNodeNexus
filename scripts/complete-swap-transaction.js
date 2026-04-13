#!/usr/bin/env node
/**
 * Fix and Complete Swap: Re-enable External DEX and Execute Transaction
 */
require("../env_conf");
const { ethers } = require("ethers");

const RPC_URL = process.env.CNC_RPC_URL;
const SWAP_ADDRESS = process.env.SWAP_ADDRESS;
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const USDT_ADDRESS = process.env.USDT_TOKEN_ADDRESS;

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║      Fix Swap: Re-enable External DEX & Execute TX       ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(DEPLOYER_KEY, provider);
  const deployer = wallet.address;

  console.log(`Deployer: ${deployer}`);
  console.log(`SWAP:     ${SWAP_ADDRESS}\n`);

  const SWAP_ABI = [
    "function externalDexEnabled() public view returns (bool)",
    "function setExternalDexEnabled(bool enabled) external",
    "function quoteBuy(uint256 usdtAmount) public view returns (uint256, uint256)",
    "function buyTot(uint256 usdtAmount, uint256 minTotOut) external",
  ];

  const swap = new ethers.Contract(SWAP_ADDRESS, SWAP_ABI, provider);
  const swapWrite = new ethers.Contract(SWAP_ADDRESS, SWAP_ABI, wallet);

  // Step 1: Check current state
  console.log("═══ STEP 1: Check Current State ═══");
  const extDexEnabled = await swap.externalDexEnabled();
  console.log(`External DEX Enabled: ${extDexEnabled ? "✅ YES" : "❌ NO"}\n`);

  // Step 2: Enable external DEX if disabled
  if (!extDexEnabled) {
    console.log("═══ STEP 2: Enable External DEX ═══");
    try {
      const enableTx = await swapWrite.setExternalDexEnabled(true, { gasLimit: 200_000 });
      console.log(`TX Hash: ${enableTx.hash}`);
      const enableReceipt = await enableTx.wait();
      console.log(`Status: ${enableReceipt.status === 1 ? "✅ Success" : "❌ Failed"}`);
      console.log(`Block: ${enableReceipt.blockNumber}\n`);

      if (enableReceipt.status !== 1) {
        console.error("Failed to enable external DEX");
        process.exit(1);
      }
    } catch (err) {
      console.error(`Error enabling external DEX: ${err.message}`);
      process.exit(1);
    }
  } else {
    console.log("═══ STEP 2: External DEX Already Enabled ═══\n");
  }

  // Step 3: Setup USDT approval
  console.log("═══ STEP 3: Ensure USDT Approval ═══");
  const ERC20_ABI = [
    "function allowance(address owner, address spender) public view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
  ];
  const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, wallet);

  const amount = ethers.parseUnits("0.1", 18);
  const allowance = await usdt.allowance(deployer, SWAP_ADDRESS);

  if (allowance < amount) {
    console.log("Setting USDT approval...");
    if (allowance > BigInt(0)) {
      const resetTx = await usdt.approve(SWAP_ADDRESS, BigInt(0));
      await resetTx.wait();
    }
    const approveTx = await usdt.approve(SWAP_ADDRESS, amount);
    await approveTx.wait();
    console.log("✅ USDT approval set");
  } else {
    console.log("✅ USDT already approved");
  }
  console.log();

  // Step 4: Get quote
  console.log("═══ STEP 4: Get Quote ═══");
  const [netOut, fee] = await swap.quoteBuy(amount);
  console.log(`Input:  0.1 USDT`);
  console.log(`Output: ${ethers.formatUnits(netOut, 18)} TOT (user receives)`);
  console.log(`Fee:    ${ethers.formatUnits(fee, 18)} TOT\n`);

  if (netOut === BigInt(0)) {
    console.error("❌ Quote returned zero - pool may be empty");
    process.exit(1);
  }

  // Step 5: Execute swap
  console.log("═══ STEP 5: Execute Swap Transaction ═══");
  const minOut = (netOut * BigInt(9950)) / BigInt(10000); // 0.5% slippage

  try {
    console.log(`Min Output (0.5% slippage): ${ethers.formatUnits(minOut, 18)} TOT`);
    console.log("Sending transaction...\n");

    const swapTx = await swapWrite.buyTot(amount, minOut, { gasLimit: 500_000 });
    console.log(`TX Hash: ${swapTx.hash}`);
    console.log("Waiting for confirmation...\n");

    const swapReceipt = await swapTx.wait();

    if (swapReceipt.status === 1) {
      console.log("╔════════════════════════════════════════════════════════════╗");
      console.log("║ ✅ SUCCESS! SWAP TRANSACTION COMPLETED!                   ║");
      console.log("╚════════════════════════════════════════════════════════════╝\n");
      
      console.log(`📊 Transaction Details:`);
      console.log(`   Hash:     ${swapTx.hash}`);
      console.log(`   Block:    ${swapReceipt.blockNumber}`);
      console.log(`   Gas Used: ${swapReceipt.gasUsed.toString()}`);
      console.log(`   Status:   ✅ Success\n`);

      console.log(`📈 Trade Details:`);
      console.log(`   Sent:     0.1 USDT`);
      console.log(`   Received: ${ethers.formatUnits(netOut, 18)} TOT`);
      console.log(`   Fee:      ${ethers.formatUnits(fee, 18)} TOT`);
      console.log(`   Rate:     ${(Number(amount) / Number(netOut)).toFixed(8)} USDT/TOT\n`);

    } else {
      console.error("❌ Transaction failed!");
      console.log(`Block: ${swapReceipt.blockNumber}`);
      console.log(`Gas Used: ${swapReceipt.gasUsed.toString()}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    if (err.reason) {
      console.error(`Reason: ${err.reason}`);
    }
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
