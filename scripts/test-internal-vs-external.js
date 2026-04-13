#!/usr/bin/env node
/**
 * Test Internal Pool vs External DEX
 * Try to identify if issue is with external DEX routing
 */
require("../env_conf");
const { ethers } = require("ethers");

const RPC_URL = process.env.CNC_RPC_URL;
const SWAP_ADDRESS = process.env.SWAP_ADDRESS;
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const USDT_ADDRESS = process.env.USDT_TOKEN_ADDRESS;

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   Test Internal Pool vs External DEX Configuration        ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(DEPLOYER_KEY, provider);
  const deployer = wallet.address;

  const SWAP_ABI = [
    "function externalDexEnabled() public view returns (bool)",
    "function setExternalDexEnabled(bool enabled) external",
    "function totReserve() public view returns (uint256)",
    "function usdtReserve() public view returns (uint256)",
    "function quoteBuy(uint256 usdtAmount) public view returns (uint256, uint256)",
    "function buyTot(uint256 usdtAmount, uint256 minTotOut) external",
  ];

  const swap = new ethers.Contract(SWAP_ADDRESS, SWAP_ABI, provider);
  const swapWrite = new ethers.Contract(SWAP_ADDRESS, SWAP_ABI, wallet);

  console.log("═══ Current Configuration ═══\n");
  
  const [extDexEnabled, totRes, usdtRes] = await Promise.all([
    swap.externalDexEnabled(),
    swap.totReserve(),
    swap.usdtReserve(),
  ]);

  console.log(`External DEX Enabled: ${extDexEnabled}`);
  console.log(`Total Reserve (TOT):  ${ethers.formatUnits(totRes, 18)}`);
  console.log(`USDT Reserve:         ${ethers.formatUnits(usdtRes, 18)}\n`);

  if (totRes > BigInt(0) && usdtRes > BigInt(0)) {
    console.log("✅ Internal pool has liquidity\n");
  } else {
    console.log("⚠️  Internal pool has NO liquidity\n");
  }

  // Test 1: Try buyTot with current config
  console.log("═══ Test 1: Buy TOT with Current Config (External DEX) ═══\n");
  
  const amount = ethers.parseUnits("0.1", 18);
  
  try {
    const [netOut, fee] = await swap.quoteBuy(amount);
    console.log(`Quote returned: ${ethers.formatUnits(netOut, 18)} TOT (fee: ${ethers.formatUnits(fee, 18)})`);
    
    const minOut = (netOut * BigInt(9950)) / BigInt(10000);
    
    const tx = await swapWrite.buyTot(amount, minOut, { gasLimit: 500_000 });
    console.log(`Transaction sent: ${tx.hash}`);
    
    const receipt = await tx.wait();
    if (receipt.status === 1) {
      console.log("✅ Transaction succeeded with external DEX!\n");
    } else {
      console.log("❌ Transaction failed with external DEX\n");
    }
  } catch (err) {
    console.log(`❌ Error with external DEX: ${err.message}`);
    console.log("This suggests the external DEX configuration may be the issue\n");
  }

  // Test 2: If owner, try disabling external DEX and using internal pool
  console.log("═══ Test 2: Check if Contract Owner ═══\n");
  
  const OWNER_ABI = ["function owner() public view returns (address)"];
  const ownerContract = new ethers.Contract(SWAP_ADDRESS, OWNER_ABI, provider);
  
  try {
    const owner = await ownerContract.owner();
    
    if (owner.toLowerCase() === deployer.toLowerCase()) {
      console.log("✅ Current account IS the owner\n");
      console.log("═══ Test 3: Try Internal Pool (Disable External DEX) ═══\n");
      
      try {
        const disableTx = await swapWrite.setExternalDexEnabled(false, { gasLimit: 200_000 });
        console.log(`Disabling external DEX: ${disableTx.hash}`);
        const disableReceipt = await disableTx.wait();
        
        console.log(`Status: ${disableReceipt.status === 1 ? "✅ Success" : "❌ Failed"}\n`);
        
        // Now try buyTot with internal pool
        console.log("Attempting buyTot with internal pool...\n");
        
        const [netOut, fee] = await swap.quoteBuy(amount);
        const minOut = (netOut * BigInt(9950)) / BigInt(10000);
        
        const buyTx = await swapWrite.buyTot(amount, minOut, { gasLimit: 500_000 });
        console.log(`Transaction sent: ${buyTx.hash}`);
        
        const buyReceipt = await buyTx.wait();
        if (buyReceipt.status === 1) {
          console.log("✅ SUCCESS with internal pool!\n");
          console.log("This confirms the issue is with external DEX configuration");
        } else {
          console.log("❌ Even internal pool failed\n");
        }
        
        // Re-enable external DEX
        const enableTx = await swapWrite.setExternalDexEnabled(true, { gasLimit: 200_000 });
        await enableTx.wait();
        console.log("Re-enabled external DEX\n");
        
      } catch (err) {
        console.log(`Error: ${err.message}\n`);
      }
    } else {
      console.log(`Owner is: ${owner}`);
      console.log("Current account is NOT the owner - cannot modify configuration\n");
    }
  } catch (err) {
    console.log(`Could not check owner: ${err.message}\n`);
  }

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                   Test Complete                            ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
