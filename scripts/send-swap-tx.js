#!/usr/bin/env node
/**
 * Send Actual Swap Transaction and Get Detailed Error
 */
require("../env_conf");
const { ethers } = require("ethers");

const RPC_URL = process.env.CNC_RPC_URL;
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const SWAP_ADDRESS = process.env.SWAP_ADDRESS;
const USDT_ADDRESS = process.env.USDT_TOKEN_ADDRESS;

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║      Send Actual Swap Transaction                        ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(DEPLOYER_KEY, provider);
  const deployer = wallet.address;

  console.log(`Deployer: ${deployer}\n`);

  // Ensure USDT approval
  console.log("═══ Setting up USDT Approval ═══");
  const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) public view returns (uint256)",
  ];
  const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, wallet);
  
  const amount = ethers.parseUnits("0.1", 18);
  const currentAllowance = await usdt.allowance(deployer, SWAP_ADDRESS);
  
  if (currentAllowance < amount) {
    console.log("Resetting approval...");
    const reset = await usdt.approve(SWAP_ADDRESS, BigInt(0));
    await reset.wait();
    console.log("Approving 0.1 USDT...");
    const approve = await usdt.approve(SWAP_ADDRESS, amount);
    await approve.wait();
  }
  console.log("✅ USDT approval set\n");

  // Prepare buyTot call
  console.log("═══ Executing buyTot ═══");
  const SWAP_ABI = [
    "function buyTot(uint256 usdtAmount, uint256 minTotOut) external",
  ];
  
  const swapWritable = new ethers.Contract(SWAP_ADDRESS, SWAP_ABI, wallet);
  
  const minTotOut = ethers.parseUnits("50", 18);
 console.log(`Input:      ${ethers.formatUnits(amount, 18)} USDT`);
  console.log(`Min Output: ${ethers.formatUnits(minTotOut, 18)} TOT`);
  console.log();

  try {
    console.log("Sending transaction...");
    const tx = await swapWritable.buyTot(amount, minTotOut, {
      gasLimit: 500_000,
      maxFeePerGas: ethers.parseUnits("100", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
    });

    console.log(`TX Hash: ${tx.hash}`);
    console.log("Waiting for confirmation...\n");

    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log("✅ Transaction successful!");
      console.log(`Block: ${receipt.blockNumber}`);
      console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
    } else {
      console.error("❌ Transaction failed!");
      console.log(`Block: ${receipt.blockNumber}`);
      console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
      console.log(`Status: ${receipt.status}`);
    }

  } catch (error) {
    console.error("❌ Error occurred:");
    console.error(`Message: ${error.message}`);
    
    if (error.code === "INSUFFICIENT_FUNDS") {
      console.error("Reason: Insufficient funds");
    } else if (error.code === "NONCETOO_LOW") {
      console.error("Reason: Nonce too low");
    } else if (error.reason) {
      console.error(`Reason: ${error.reason}`);
    }
    
    // Try to get more details
    if (error.transaction) {
      console.log("\nTransaction details:");
      console.log("From:", error.transaction.from);
      console.log("To:", error.transaction.to);
      console.log("Data:", error.transaction.data?.slice(0, 100) + "...");
    }
  }
  
  console.log();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
