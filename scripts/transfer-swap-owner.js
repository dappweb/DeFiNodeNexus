#!/usr/bin/env node
/**
 * Transfer SWAP contract ownership
 * Usage: node scripts/transfer-swap-owner.js <NEW_OWNER_ADDRESS>
 */
require("../env_conf");
const { ethers } = require("ethers");
const readline = require("readline");

const SWAP_ABI = [
  "function owner() public view returns (address)",
  "function transferOwnership(address newOwner) public",
];

async function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "yes" || answer.toLowerCase() === "y");
    });
  });
}

async function main() {
  const newOwnerAddress = process.argv[2];
  const rpcUrl = process.env.CNC_RPC_URL;
  const swapAddress = process.env.SWAP_ADDRESS;
  const ownerPrivateKey = process.env.OWNER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;

  console.log("=== SWAP Contract Ownership Transfer ===\n");

  // Validate inputs
  if (!newOwnerAddress) {
    console.error("❌ Error: New owner address not provided");
    console.error("Usage: node scripts/transfer-swap-owner.js <NEW_OWNER_ADDRESS>");
    process.exit(1);
  }

  if (!ethers.isAddress(newOwnerAddress)) {
    console.error("❌ Error: Invalid Ethereum address format");
    process.exit(1);
  }

  if (!ownerPrivateKey) {
    console.error("❌ Error: OWNER_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY not set in .env");
    process.exit(1);
  }

  if (!swapAddress) {
    console.error("❌ Error: SWAP_ADDRESS not set in .env");
    process.exit(1);
  }

  console.log("SWAP_ADDRESS:     ", swapAddress);
  console.log("New Owner Address:", newOwnerAddress);
  console.log();

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(swapAddress, SWAP_ABI, provider);

  try {
    // Get current owner
    const currentOwner = await contract.owner();
    console.log("Current Owner:", currentOwner);

    // Derive signer from private key
    const signer = new ethers.Wallet(ownerPrivateKey, provider);
    console.log("Signer Address:", signer.address);

    if (signer.address.toLowerCase() !== currentOwner.toLowerCase()) {
      console.error("\n❌ Error: Signer is not the current owner");
      console.error(`   Current Owner: ${currentOwner}`);
      console.error(`   Signer:        ${signer.address}`);
      process.exit(1);
    }

    console.log("\n✓ Signer is authorized (current owner)");
    console.log(`✓ New owner will be: ${newOwnerAddress}`);

    // Ask for confirmation
    console.log("\n⚠️  WARNING: This action is IRREVERSIBLE!");
    const confirmed = await askConfirmation("Are you sure you want to transfer ownership? (yes/no): ");

    if (!confirmed) {
      console.log("❌ Transfer cancelled");
      process.exit(0);
    }

    // Execute transfer
    console.log("\n🔄 Executing ownership transfer...");
    const contractWithSigner = contract.connect(signer);
    const tx = await contractWithSigner.transferOwnership(newOwnerAddress);
    console.log(`✓ Transaction sent: ${tx.hash}`);

    // Wait for confirmation
    console.log("⏳ Waiting for transaction confirmation...");
    const receipt = await tx.wait();

    if (receipt.status === 1) {
      console.log(`\n✅ Ownership transfer successful!`);
      console.log(`   Transaction: ${receipt.hash}`);
      console.log(`   Block:       ${receipt.blockNumber}`);
      console.log(`   From:        ${currentOwner}`);
      console.log(`   To:          ${newOwnerAddress}`);
    } else {
      console.error(`\n❌ Transaction failed`);
      process.exit(1);
    }
  } catch (err) {
    console.error("\n❌ Error:", err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
