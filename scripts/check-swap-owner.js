#!/usr/bin/env node
/**
 * Check SWAP contract owner transfer capability
 */
require("../env_conf");
const { ethers } = require("ethers");

// Ownable interface
const OWNABLE_ABI = [
  "function owner() public view returns (address)",
  "function pendingOwner() public view returns (address)",
  "function transferOwnership(address newOwner) public",
  "function acceptOwnership() public",
  "function renounceOwnership() public",
];

async function main() {
  const rpcUrl = process.env.CNC_RPC_URL;
  const swapAddress = process.env.SWAP_ADDRESS;
  const ownerPrivateKey = process.env.OWNER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;

  console.log("=== SWAP Contract Owner Management ===\n");
  console.log("SWAP_ADDRESS:", swapAddress);
  console.log();

  if (!swapAddress || swapAddress === "0x0000000000000000000000000000000000000000") {
    console.error("❌ SWAP_ADDRESS not set or is zero address");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(swapAddress, OWNABLE_ABI, provider);

  try {
    console.log("=== Current Owner Information ===\n");

    // Get current owner
    const currentOwner = await contract.owner();
    console.log(`✓ Current Owner: ${currentOwner}`);

    // Try to get pending owner (if using two-step transfer)
    try {
      const pendingOwner = await contract.pendingOwner();
      if (pendingOwner !== "0x0000000000000000000000000000000000000000") {
        console.log(`⚠️  Pending Owner: ${pendingOwner}`);
      }
    } catch {
      // Not a two-step ownership transfer contract
    }

    console.log("\n=== Ownership Transfer Methods ===\n");

    // Check for transferOwnership
    try {
      const iface = new ethers.Interface(OWNABLE_ABI);
      if (iface.fragments.find(f => f.name === "transferOwnership")) {
        console.log("✓ transferOwnership(address newOwner) - Available");
        console.log("  One-step transfer (direct ownership change)");
      }
    } catch {}

    // Check for acceptOwnership (two-step)
    try {
      const iface = new ethers.Interface(OWNABLE_ABI);
      if (iface.fragments.find(f => f.name === "acceptOwnership")) {
        console.log("✓ acceptOwnership() - Available");
        console.log("  Two-step transfer (pending owner must accept)");
      }
    } catch {}

    // Check for renounceOwnership
    try {
      const iface = new ethers.Interface(OWNABLE_ABI);
      if (iface.fragments.find(f => f.name === "renounceOwnership")) {
        console.log("✓ renounceOwnership() - Available");
        console.log("  Permanently remove owner (disable owner functions)");
      }
    } catch {}

    console.log("\n=== How to Transfer Ownership ===\n");
    console.log("Method 1: One-step transfer");
    console.log("  npm run transfer-swap-owner -- <NEW_OWNER_ADDRESS>\n");

    console.log("Method 2: Manual transfer (requires signing transaction)");
    console.log("  1. Create a script to call transferOwnership(newOwnerAddress)");
    console.log("  2. Sign with current owner's private key");
    console.log("  3. Send transaction to CNC chain\n");

    console.log("=== Important Notes ===");
    console.log("⚠️  Ownership transfer is IRREVERSIBLE");
    console.log("⚠️  Only the current owner can transfer ownership");
    console.log("✓  New owner must be a valid Ethereum address");
    console.log("✓  Test on testnet first if unsure\n");

  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
