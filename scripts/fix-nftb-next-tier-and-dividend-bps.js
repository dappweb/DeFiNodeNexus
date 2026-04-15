#!/usr/bin/env node
require("../env_conf");
const { ethers } = require("ethers");

const NEXUS_ABI = [
  "function owner() view returns (address)",
  "function nextNftbTierId() view returns (uint256)",
  "function nftbTiers(uint256) view returns (uint256 price, uint256 weight, uint256 maxSupply, uint256 usdtMinted, uint256 tofMinted, uint256 dividendBps, bool isActive)",
  "function configureNftbTier(uint256 tierId, uint256 price, uint256 weight, uint256 maxSupply, uint256 dividendBps, bool isActive) external returns (uint256)",
];

const TARGET_TIERS = [
  { tierId: 1, dividendBps: 2000n },
  { tierId: 2, dividendBps: 3000n },
  { tierId: 3, dividendBps: 4000n },
];

async function main() {
  const rpc = process.env.CNC_RPC_URL || process.env.NEXT_PUBLIC_CNC_RPC_URL;
  const nexusAddress = process.env.NEXUS_ADDRESS || process.env.NEXT_PUBLIC_NEXUS_ADDRESS;
  const key = process.env.OWNER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;

  if (!rpc || !nexusAddress || !key) {
    throw new Error("Missing CNC_RPC_URL/NEXUS_ADDRESS/OWNER_PRIVATE_KEY(or DEPLOYER_PRIVATE_KEY)");
  }

  const provider = new ethers.JsonRpcProvider(rpc);
  const signer = new ethers.Wallet(key, provider);
  const nexus = new ethers.Contract(nexusAddress, NEXUS_ABI, signer);

  const [owner, nextBefore] = await Promise.all([nexus.owner(), nexus.nextNftbTierId()]);
  console.log("[fix] signer:", signer.address);
  console.log("[fix] owner :", owner);
  console.log("[fix] nextNftbTierId(before):", nextBefore.toString());

  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error("Signer is not owner, cannot execute configureNftbTier");
  }

  const before = {};
  for (const t of TARGET_TIERS) {
    before[t.tierId] = await nexus.nftbTiers(BigInt(t.tierId));
    console.log(
      `[fix] tier${t.tierId} before -> price=${before[t.tierId].price} weight=${before[t.tierId].weight} max=${before[t.tierId].maxSupply} minted=${before[t.tierId].usdtMinted}/${before[t.tierId].tofMinted} bps=${before[t.tierId].dividendBps} active=${before[t.tierId].isActive}`
    );
  }

  console.log("[fix] applying 3 safe writes using tierId=0 to advance nextNftbTierId...");

  // The contract assigns configuredTierId = nextNftbTierId++ when tierId == 0.
  // Given nextNftbTierId is currently 1, these three writes map to tiers 1,2,3.
  for (const t of TARGET_TIERS) {
    const current = before[t.tierId];
    const tx = await nexus.configureNftbTier(
      0,
      current.price,
      current.weight,
      current.maxSupply,
      t.dividendBps,
      current.isActive,
      { gasLimit: 400000 }
    );
    console.log(`[fix] sent tx for logical tier${t.tierId}: ${tx.hash}`);
    await tx.wait();
  }

  const nextAfter = await nexus.nextNftbTierId();
  console.log("[fix] nextNftbTierId(after):", nextAfter.toString());

  for (const t of TARGET_TIERS) {
    const aft = await nexus.nftbTiers(BigInt(t.tierId));
    console.log(
      `[fix] tier${t.tierId} after  -> price=${aft.price} weight=${aft.weight} max=${aft.maxSupply} minted=${aft.usdtMinted}/${aft.tofMinted} bps=${aft.dividendBps} active=${aft.isActive}`
    );
  }

  if (nextAfter < 4n) {
    throw new Error("nextNftbTierId was not advanced to >=4");
  }

  console.log("[fix] SUCCESS: NFTB tier counter and dividend bps repaired (no dividend distribution executed).");
}

main().catch((e) => {
  console.error("[fix] FAIL:", e.message || e);
  process.exit(1);
});
