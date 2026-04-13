#!/usr/bin/env node
/**
 * Test USDT Transfer and Approve
 */
require("../env_conf");
const { ethers } = require("ethers");

const RPC_URL = process.env.CNC_RPC_URL;
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const SWAP_ADDRESS = process.env.SWAP_ADDRESS;
const USDT_ADDRESS = process.env.USDT_TOKEN_ADDRESS;

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║         Test USDT Transfer Capability                    ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(DEPLOYER_KEY, provider);
  const deployer = wallet.address;
  
  console.log("Deployer:", deployer);
  console.log("SWAP:", SWAP_ADDRESS);
  console.log("USDT:", USDT_ADDRESS);
  console.log();

  const ERC20_ABI = [
    "function balanceOf(address) public view returns (uint256)",
    "function allowance(address owner, address spender) public view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
  ];
  
  const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, wallet);
  
  const amount = ethers.parseUnits("0.1", 18);
  
  // Get current state
  console.log("═══ Current State ═══");
  const [balance, allowance] = await Promise.all([
    usdt.balanceOf(deployer),
    usdt.allowance(deployer, SWAP_ADDRESS),
  ]);
  
  console.log(`Balance: ${ethers.formatUnits(balance, 18)} USDT`);
  console.log(`Allowance: ${ethers.formatUnits(allowance, 18)} USDT`);
  console.log();

  // Test approve to 0
  console.log("═══ Step 1: Reset Approve to 0 ═══");
  try {
    if (allowance > BigInt(0)) {
      const tx0 = await usdt.approve(SWAP_ADDRESS, BigInt(0));
      console.log(`TX Hash: ${tx0.hash}`);
      const receipt0 = await tx0.wait();
      console.log(`Status: ${receipt0.status === 1 ? "✅ Success" : "❌ Failed"}`);
    } else {
      console.log("Allowance already 0");
    }
  } catch (err) {
    console.error(`❌ Approve(0) failed: ${err.message}`);
  }
  console.log();

  // Test approve to amount
  console.log("═══ Step 2: Approve Amount ═══");
  try {
    const txApprove = await usdt.approve(SWAP_ADDRESS, amount);
    console.log(`TX Hash: ${txApprove.hash}`);
    const receiptApprove = await txApprove.wait();
    console.log(`Status: ${receiptApprove.status === 1 ? "✅ Success" : "❌ Failed"}`);
  } catch (err) {
    console.error(`❌ Approve failed: ${err.message}`);
  }
  console.log();

  // Verify approval
  console.log("═══ Step 3: Verify Allowance ═══");
  const newAllowance = await usdt.allowance(deployer, SWAP_ADDRESS);
  console.log(`New Allowance: ${ethers.formatUnits(newAllowance, 18)} USDT`);
  if (newAllowance >= amount) {
    console.log("✅ Allowance set correctly\n");
  } else {
    console.log("❌ Allowance not set\n");
  }

  // Test gas estimation for transferFrom
  console.log("═══ Step 4: Gas Estimate for transferFrom ═══");
 try {
    const gasEst = await provider.estimateGas({
      from: SWAP_ADDRESS,
      to: USDT_ADDRESS,
      data: new ethers.Interface(ERC20_ABI).encodeFunctionData("transferFrom", [
        deployer,
        SWAP_ADDRESS,
        amount,
      ]),
    });
    console.log(`✅ Gas estimate: ${gasEst.toString()}`);
  } catch (err) {
    console.error(`❌ Gas estimation failed: ${err.message}`);
  }
  console.log();

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                  Test Complete                             ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
