require("dotenv").config();
const { ethers } = require("ethers");

const NEXUS_ABI = [
  "function configureNftaTier(uint256 tierId, uint256 price, uint256 dailyYield, uint256 maxSupply, bool isActive) external returns (uint256)",
  "function configureNftbTier(uint256 tierId, uint256 price, uint256 weight, uint256 maxSupply, uint256 dividendBps, bool isActive) external returns (uint256)",
  "function owner() view returns (address)",
  "function nextNftaTierId() view returns (uint256)",
  "function nextNftbTierId() view returns (uint256)",
];

// Default tier specifications
const NFTA_TIERS = [
  { tierId: 0, price: "500", dailyYield: "6.5", maxSupply: "10000", isActive: true },
  { tierId: 1, price: "1000", dailyYield: "20", maxSupply: "5000", isActive: true },
];

const NFTB_TIERS = [
  { tierId: 0, price: "500", weight: "1", maxSupply: "2000", dividendBps: "2000", isActive: true },
  { tierId: 1, price: "1000", weight: "2", maxSupply: "2000", dividendBps: "3000", isActive: true },
  { tierId: 2, price: "2000", weight: "3", maxSupply: "2000", dividendBps: "4000", isActive: true },
];

function toWAD(value) {
  return ethers.parseUnits(value, 18).toString();
}

async function main() {
  const rpcUrl = process.env.CNC_RPC_URL || process.env.NEXT_PUBLIC_CNC_RPC_URL;
  const nexusAddress = process.env.NEXUS_ADDRESS || process.env.NEXT_PUBLIC_NEXUS_ADDRESS;
  const ownerPrivateKey = process.env.OWNER_PRIVATE_KEY;

  if (!rpcUrl || !nexusAddress || !ownerPrivateKey) {
    console.error("Missing required environment variables:");
    console.error(`  CNC_RPC_URL: ${rpcUrl ? "✓" : "✗"}`);
    console.error(`  NEXUS_ADDRESS: ${nexusAddress ? "✓" : "✗"}`);
    console.error(`  OWNER_PRIVATE_KEY: ${ownerPrivateKey ? "✓" : "✗"}`);
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(ownerPrivateKey, provider);
  const nexus = new ethers.Contract(nexusAddress, NEXUS_ABI, signer);

  console.log(`\n[init-tiers] Initialization started`);
  console.log(`  RPC URL: ${rpcUrl}`);
  console.log(`  Nexus Address: ${nexusAddress}`);
  console.log(`  Signer Address: ${signer.address}`);

  // Verify signer is owner
  const owner = await nexus.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    console.error(`\n❌ ERROR: Signer ${signer.address} is not the contract owner ${owner}`);
    process.exit(1);
  }
  console.log(`  ✓ Signer is the contract owner\n`);

  // Check current tier counts
  const nextNftaTierId = await nexus.nextNftaTierId();
  const nextNftbTierId = await nexus.nextNftbTierId();
  console.log(`Current chain state:`);
  console.log(`  NFTA Tier count: ${Number(nextNftaTierId) - 1}`);
  console.log(`  NFTB Tier count: ${Number(nextNftbTierId) - 1}`);

  if (nextNftaTierId > 1n || nextNftbTierId > 1n) {
    console.error(`\n⚠️  WARNING: Chain already has tiers configured. Continuing will update existing tiers.`);
  }

  console.log(`\nInitializing 2 NFTA + 3 NFTB tiers...\n`);

  const txPromises = [];

  // Configure NFTA tiers
  for (const tier of NFTA_TIERS) {
    const txPromise = nexus.configureNftaTier(
      tier.tierId,
      toWAD(tier.price),
      toWAD(tier.dailyYield),
      tier.maxSupply,
      tier.isActive
    ).then((tx) => ({
      type: "NFTA",
      tierId: tier.tierId,
      txHash: tx.hash,
      tx,
    }));
    txPromises.push(txPromise);
  }

  // Configure NFTB tiers
  for (const tier of NFTB_TIERS) {
    const txPromise = nexus.configureNftbTier(
      tier.tierId,
      toWAD(tier.price),
      tier.weight,
      tier.maxSupply,
      tier.dividendBps,
      tier.isActive
    ).then((tx) => ({
      type: "NFTB",
      tierId: tier.tierId,
      txHash: tx.hash,
      tx,
    }));
    txPromises.push(txPromise);
  }

  // Wait for all tx submissions
  const txs = await Promise.all(txPromises);

  console.log(`Submitted ${txs.length} transactions. Waiting for confirmations...\n`);

  // Wait for all confirmations
  const receipts = await Promise.all(
    txs.map(async (item) => {
      const receipt = await item.tx.wait();
      return { ...item, receipt };
    })
  );

  console.log(`\n✅ All ${receipts.length} transactions confirmed:\n`);
  for (const item of receipts) {
    console.log(`  ${item.type} Tier #${item.tierId}: ${item.txHash}`);
  }

  // Verify final state
  const finalNftaTierId = await nexus.nextNftaTierId();
  const finalNftbTierId = await nexus.nextNftbTierId();
  console.log(`\nFinal chain state:`);
  console.log(`  NFTA Tier count: ${Number(finalNftaTierId) - 1}`);
  console.log(`  NFTB Tier count: ${Number(finalNftbTierId) - 1}`);

  if (Number(finalNftaTierId) - 1 === 2 && Number(finalNftbTierId) - 1 === 3) {
    console.log(`\n✅ SUCCESS: 2 NFTA + 3 NFTB tiers initialized on chain!`);
  } else {
    console.error(`\n❌ ERROR: Unexpected tier count on chain`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
