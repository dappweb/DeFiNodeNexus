#!/usr/bin/env node
/**
 * Comprehensive Swap Diagnosis
 */
require("../env_conf");
const { ethers } = require("ethers");

const RPC_URL = process.env.CNC_RPC_URL;
const SWAP_ADDRESS = process.env.SWAP_ADDRESS;
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const USDT_ADDRESS = process.env.USDT_TOKEN_ADDRESS;

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║    Comprehensive Swap Issue Diagnosis                    ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(DEPLOYER_KEY, provider);
  const deployer = wallet.address;

  console.log(`RPC:      ${RPC_URL}`);
  console.log(`SWAP:     ${SWAP_ADDRESS}`);  
  console.log(`DEPLOYER: ${deployer}\n`);

  // Test 1: Get swap code
  console.log("═══ TEST 1: Contract Exists ═══");
  const code = await provider.getCode(SWAP_ADDRESS);
  if (code === "0x") {
    console.error("❌ No contract at SWAP_ADDRESS");
    process.exit(1);
  }
  console.log(`✅ Contract exists (${(code.length - 2) / 2} bytes)\n`);

  // Test 2: Try to read a function directly
  console.log("═══ TEST 2: Can Call View Functions ═══");
  const SWAP_ABI = ["function swapPaused() public view returns (bool)"];
  const swapContract = new ethers.Contract(SWAP_ADDRESS, SWAP_ABI, provider);
  
  try {
    const paused = await swapContract.swapPaused();
    console.log(`✅ swapPaused() = ${paused} (NO ISSUES)\n`);
  } catch (err) {
    console.error(`❌ Cannot call swapPaused: ${err.message}\n`);
  }

  // Test 3: Check if contract is Proxy  
  console.log("═══ TEST 3: Check Implementation ═══");
  const adminSlot = "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";
  const implSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
  
  const admin = await provider.getStorage(SWAP_ADDRESS, adminSlot);
  const impl = await provider.getStorage(SWAP_ADDRESS, implSlot);
  
  if (admin !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log(`Transparent Proxy Admin: ${admin.slice(0, 42)}...`);
  }
  if (impl !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log(`UUPS Implementation: ${impl.slice(0, 42)}...`);
  }
  if (admin === "0x0000000000000000000000000000000000000000000000000000000000000000" &&
      impl === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("Not a proxy - direct contract\n");
  } else {
    console.log();
  }

  // Test 4: Detailed Approval Check
  console.log("═══ TEST 4: USDT Approval State ═══");
  const ERC20_ABI = [
    "function allowance(address owner, address spender) public view returns (uint256)",
    "function balanceOf(address account) public view returns (uint256)",
  ];
  const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
  
  const [allowance, balance] = await Promise.all([
    usdtContract.allowance(deployer, SWAP_ADDRESS),
    usdtContract.balanceOf(deployer),
  ]);

  console.log(`Balance:    ${ethers.formatUnits(balance, 18)} USDT`);
  console.log(`Allowance:  ${ethers.formatUnits(allowance, 18)} USDT`);
  console.log(`Needs:      0.1 USDT`);
  
  if (allowance >= ethers.parseUnits("0.1", 18)) {
    console.log("✅ Allowance sufficient\n");
  } else {
    console.log("⚠️ Allowance insufficient\n");
  }

  // Test 5: Try actual tx
  console.log("═══ TEST 5: Estimate Gas for buyTot ═══");
  const buyTotABI = ["function buyTot(uint256 usdtAmount, uint256 minTotOut) external"];
  const swapWrite = new ethers.Contract(SWAP_ADDRESS, buyTotABI, provider);
  
  try {
    const gasEst = await provider.estimateGas({
      from: deployer,
      to: SWAP_ADDRESS,
      data: new ethers.Interface(buyTotABI).encodeFunctionData("buyTot", [
        ethers.parseUnits("0.1", 18),
        ethers.parseUnits("50", 18),
      ]),
    });
    
    console.log(`✅ Gas estimate successful: ${gasEst.toString()} gas\n`);
  } catch (err) {
    console.error(`❌ Gas estimation failed: ${err.message}\n`);
    console.error("This is likely the root cause of transactions failing!\n");
  }

  // Summary
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                  Diagnosis Complete                        ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
