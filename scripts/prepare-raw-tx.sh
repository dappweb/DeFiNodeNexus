#!/bin/bash
# Direct JSON-RPC Swap Transaction

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║    Direct JSON-RPC Swap Transaction                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

RPC_URL="https://rpc.cncchainpro.com"
SWAP_ADDRESS="0xfE20139dCFA053b819A3745E9ed801b9C6cc84aC"

# Use a helper script to create signed TX
node << 'EOF'
const {ethers} = require('ethers');
const fs = require('fs');

(async () => {
  const DEPLOYER_KEY = "0x4f3b2b7388daa9fbafede197e8c629cb7882a3af942a87aa0988dde7d73d03d2";
  const RPC = "https://rpc.cncchainpro.com";
  const SWAP = "0xfE20139dCFA053b819A3745E9ed801b9C6cc84aC";
  
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(DEPLOYER_KEY, provider);
  
  const from = wallet.address;
  const usdtAmount = ethers.parseUnits("0.1", 18);
  const minTotOut = ethers.parseUnits("50", 18);
  
  const buyTotAbi = ["function buyTot(uint256 usdtAmount, uint256 minTotOut) external"];
  const iface = new ethers.Interface(buyTotAbi);
  const data = iface.encodeFunctionData("buyTot", [usdtAmount, minTotOut]);
  
  console.log("Function call data:");
  console.log(data);
  console.log();
  
  // Get nonce and gas price
  const nonce = await provider.getTransactionCount(from);
  const block = await provider.getBlock('latest');
  const gasPrice = block.baseFeePerGas + ethers.parseUnits("2", "gwei");
  
  console.log("Nonce:", nonce);
  console.log("Gas Price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");
  console.log();
  
  // Create raw transaction
  const txData = {
    to: SWAP,
    from: from,
    data: data,
    gasLimit: 500000,
    gasPrice: gasPrice,
    nonce: nonce,
    chainId: 50716,
  };
  
  console.log("TX data prepared. Ready to send...");
  console.log("To:", txData.to);
  console.log("Data length:", data.length, "chars");
})();
EOF
