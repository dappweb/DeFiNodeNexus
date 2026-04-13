#!/usr/bin/env node
/**
 * Debug BuyTot Transaction Failure
 * Attempt to get revert reason by calling eth_call
 */
require("../env_conf");
const { ethers } = require("ethers");

const RPC_URL = process.env.CNC_RPC_URL || "https://rpc.cncchainpro.com";
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const SWAP_ADDRESS = process.env.SWAP_ADDRESS;
const USDT_ADDRESS = process.env.USDT_TOKEN_ADDRESS;

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║       Debug BuyTot Transaction Failure                    ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(DEPLOYER_KEY, provider);
    const deployer = wallet.address;

    console.log(`Deployer:  ${deployer}`);
    console.log(`SWAP:      ${SWAP_ADDRESS}\n`);

    // Prepare transaction parameters
    const usdtAmount = ethers.parseUnits("0.1", 18);
    const minTotOut = ethers.parseUnits("98", 18);

    // Create the function call data
    const swapInterface = new ethers.Interface([
      "function buyTot(uint256 usdtAmount, uint256 minTotOut) external",
    ]);

    const callData = swapInterface.encodeFunctionData("buyTot", [usdtAmount, minTotOut]);

    console.log("═══ Preparing eth_call ═══");
    console.log(`Input Amount:   ${ethers.formatUnits(usdtAmount, 18)} USDT`);
    console.log(`Min Output:     ${ethers.formatUnits(minTotOut, 18)} TOT`);
    console.log(`Call Data:      ${callData}\n`);

    // Attempt eth_call to get revert reason
    console.log("═══ Executing eth_call (simulation) ═══");
    
    try {
      const result = await provider.call({
        from: deployer,
        to: SWAP_ADDRESS,
        data: callData,
      });
      console.log("Result:", result);
    } catch (error) {
      console.log("Call Error:", error.message);
      console.log();

      // Try to decode revert reason
      if (error.data) {
        console.log("Revert Data:", error.data);
        try {
          // Try to decode error selector
          const errorData = error.data;
          const selector = errorData.substring(0, 10);
          const params = "0x" + errorData.substring(10);
          
          console.log(`Error Selector: ${selector}`);
          console.log();

          // Known error selectors
          const errors = {
            "0x08c379a0": "Error(string) - String error",
            "0x4e487b71": "Panic(uint256)",
          };

          if (selector in errors) {
            console.log(`Error Type: ${errors[selector]}`);
            if (selector === "0x08c379a0") {
              // Decode string error
              const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["string"], params);
              console.log(`Message: ${decoded[0]}`);
            }
          } else {
            console.log("Unknown error selector");
          }
        } catch (decodeErr) {
          console.log("Could not decode error");
        }
      }
    }

    console.log();

    // Try alternative: use raw JSON-RPC
    console.log("═══ Using Raw JSON-RPC ═══");
    try {
      const response = await axios.post(RPC_URL, {
        jsonrpc: "2.0",
        method: "eth_call",
        params: [
          {
            from: deployer,
            to: SWAP_ADDRESS,
            data: callData,
          },
          "latest",
        ],
        id: 1,
      }, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      });

      if (response.data.error) {
        console.log("RPC Error:", response.data.error);
      } else if (response.data.result) {
        console.log("Call succeeded - result:", response.data.result);
      }
    } catch (rpcErr) {
      console.log("RPC Error:", rpcErr.message);
    }

    console.log();
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║Debugging complete                                          ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}
  // Detailed debugging info
  console.log("═══ Checking Requirements ═══");
  console.log("Possible causes:");
  console.log("1. USDT allowance is insufficient");
  console.log("2. USDT balance is insufficient");
  console.log("3. Swap is paused");
  console.log("4. DEX path not configured correctly");
  console.log("5. Pool has insufficient liquidity\n");

main();
