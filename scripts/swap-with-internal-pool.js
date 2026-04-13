#!/usr/bin/env node
/**
 * Seed Internal Pool with Liquidity for Testing
 */
require("../env_conf");
const { ethers } = require("ethers");

const RPC_URL = process.env.CNC_RPC_URL;
const SWAP_ADDRESS = process.env.SWAP_ADDRESS;
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const USDT_ADDRESS = process.env.USDT_TOKEN_ADDRESS;
const TOT_ADDRESS = process.env.TOT_TOKEN_ADDRESS;

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║    Seed Internal Pool & Execute Swap                     ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(DEPLOYER_KEY, provider);
  const deployer = wallet.address;

  console.log(`Deployer: ${deployer}`);
  console.log(`SWAP:     ${SWAP_ADDRESS}\n`);

  const ERC20_ABI = [
    "function balanceOf(address) public view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function transfer(address to, uint256 amount) external returns (bool)",
  ];

  const SWAP_ABI = [
    "function externalDexEnabled() public view returns (bool)",
    "function setExternalDexEnabled(bool enabled) external",
    "function totReserve() public view returns (uint256)",
    "function usdtReserve() public view returns (uint256)",
    "function addLiquidity(uint256 totAmount, uint256 usdtAmount) external",
    "function quoteBuy(uint256 usdtAmount) public view returns (uint256, uint256)",
    "function buyTot(uint256 usdtAmount, uint256 minTotOut) external",
  ];

  const tot = new ethers.Contract(TOT_ADDRESS, ERC20_ABI, wallet);
  const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, wallet);
  const swap = new ethers.Contract(SWAP_ADDRESS, SWAP_ABI, provider);
  const swapWrite = new ethers.Contract(SWAP_ADDRESS, SWAP_ABI, wallet);

  // Check balances
  console.log("═══ STEP 1: Check Balances ═══");
  const [totBal, usdtBal] = await Promise.all([
    tot.balanceOf(deployer),
    usdt.balanceOf(deployer),
  ]);

  console.log(`TOT Balance:  ${ethers.formatUnits(totBal, 18)}`);
  console.log(`USDT Balance: ${ethers.formatUnits(usdtBal, 18)}\n`);

  // Check current pool
  console.log("═══ STEP 2: Check Current Pool ═══");
  const [totRes, usdtRes, extDex] = await Promise.all([
    swap.totReserve(),
    swap.usdtReserve(),
    swap.externalDexEnabled(),
  ]);

  console.log(`TOT Reserve:     ${ethers.formatUnits(totRes, 18)}`);
  console.log(`USDT Reserve:    ${ethers.formatUnits(usdtRes, 18)}`);
  console.log(`External DEX:    ${extDex ? "✅ Enabled" : "❌ Disabled"}\n`);

  // If we have TOT balance, add liquidity
  if (totBal > ethers.parseUnits("1", 18)) {
    console.log("═══ STEP 3: Add Liquidity to Internal Pool ═══");
    
    const addAmount = ethers.parseUnits("1000", 18); // Add 1000 TOT
    const addUsdt = ethers.parseUnits("10", 18); // And 10 USDT
    
    // Approve TOT
    console.log("Approving TOT...");
    const totApproveTx = await tot.approve(SWAP_ADDRESS, addAmount);
    await totApproveTx.wait();
    console.log("✅ TOT approved");
    
    // Approve USDT
    console.log("Approving USDT...");
    const usdtApproveTx = await usdt.approve(SWAP_ADDRESS, addUsdt);
    await usdtApproveTx.wait();
    console.log("✅ USDT approved");
    
    // Add liquidity
    console.log(`Adding liquidity: ${ethers.formatUnits(addAmount, 18)} TOT + ${ethers.formatUnits(addUsdt, 18)} USDT...`);
    const liquidityTx = await swapWrite.addLiquidity(addAmount, addUsdt, { gasLimit: 300_000 });
    console.log(`TX Hash: ${liquidityTx.hash}`);
    const liquidityReceipt = await liquidityTx.wait();
    
    if (liquidityReceipt.status === 1) {
      console.log("✅ Liquidity added to internal pool\n");
    } else {
      console.log("❌ Failed to add liquidity\n");
    }
  }

  // Disable external DEX to use internal pool
  console.log("═══ STEP 4: Disable External DEX ═══");
  if (extDex) {
    console.log("Disabling external DEX to use internal pool...");
    const disableTx = await swapWrite.setExternalDexEnabled(false, { gasLimit: 200_000 });
    await disableTx.wait();
    console.log("✅ External DEX disabled\n");
  }

  // Now try swap with internal pool
  console.log("═══ STEP 5: Execute Swap with Internal Pool ═══");
  const swapAmount = ethers.parseUnits("0.1", 18);
  
  try {
    const [netOut, fee] = await swap.quoteBuy(swapAmount);
    console.log(`Quote: ${ethers.formatUnits(netOut, 18)} TOT (fee: ${ethers.formatUnits(fee, 18)})`);
    
    if (netOut === BigInt(0)) {
      console.log("Quote returned 0, trying anyway...\n");
    }
    
    // Ensure USDT approval
    const allowance = await usdt.allowance(deployer, SWAP_ADDRESS);
    if (allowance < swapAmount) {
      console.log("Setting USDT approval...");
      if (allowance > BigInt(0)) {
        await usdt.approve(SWAP_ADDRESS, BigInt(0));
      }
      await usdt.approve(SWAP_ADDRESS, swapAmount);
      console.log("✅ USDT approved\n");
    }
    
    const minOut = netOut > BigInt(0) ? (netOut * BigInt(9950)) / BigInt(10000) : BigInt(1);
    
    console.log(`Sending 0.1 USDT, expecting at least ${ethers.formatUnits(minOut, 18)} TOT...`);
    const swapTx = await swapWrite.buyTot(swapAmount, minOut, { gasLimit: 500_000 });
    console.log(`TX Hash: ${swapTx.hash}`);
    
    const swapReceipt = await swapTx.wait();
    
    if (swapReceipt.status === 1) {
      console.log("\n╔════════════════════════════════════════════════════════════╗");
      console.log("║ ✅ SUCCESS! Swap completed with internal pool!            ║");
      console.log("╚════════════════════════════════════════════════════════════╝\n");
    } else {
      console.log("❌ Swap failed even with internal pool");
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
    if (err.reason) {
      console.log(`Reason: ${err.reason}`);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
