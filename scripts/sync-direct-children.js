#!/usr/bin/env node
/**
 * Backfill and sync direct children index on upgraded DeFiNodeNexus.
 *
 * Usage:
 *   node scripts/sync-direct-children.js --dry-run
 *   node scripts/sync-direct-children.js --execute
 *   node scripts/sync-direct-children.js --execute --from-block 0 --to-block latest --batch-size 80
 *   node scripts/sync-direct-children.js --execute --referrer 0xabc... --batch-size 50
 */

require("../env_conf");
const hre = require("hardhat");
const { ethers } = hre;

const ZERO = ethers.ZeroAddress.toLowerCase();

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function readArg(name, fallback = "") {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx + 1 >= process.argv.length) return fallback;
  return String(process.argv[idx + 1] || "").trim();
}

function parsePositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return fallback;
  return n;
}

function chunkArray(items, size) {
  if (size <= 0) return [items];
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function safeGetDirectChildrenCount(contract, referrer) {
  try {
    const value = await contract.getDirectChildrenCount(referrer);
    return Number(value);
  } catch {
    return null;
  }
}

async function main() {
  const nexusAddress = (process.env.NEXUS_ADDRESS || process.env.NEXT_PUBLIC_NEXUS_ADDRESS || "").trim();
  if (!nexusAddress) {
    throw new Error("Missing NEXUS_ADDRESS or NEXT_PUBLIC_NEXUS_ADDRESS in env");
  }

  const execute = hasFlag("--execute");
  const dryRun = !execute || hasFlag("--dry-run");
  const allowNonCnc = hasFlag("--allow-non-cnc");
  const batchSize = parsePositiveInt(readArg("--batch-size", process.env.SYNC_BATCH_SIZE || "100"), 100);
  const fromBlockArg = readArg("--from-block", process.env.SYNC_FROM_BLOCK || "0");
  const toBlockArg = readArg("--to-block", process.env.SYNC_TO_BLOCK || "latest");
  const referrerOnlyArg = readArg("--referrer", "");

  const provider = hre.ethers.provider;
  const network = await provider.getNetwork();

  if (!allowNonCnc && network.chainId !== 50716n) {
    throw new Error(
      `Unexpected chainId ${network.chainId}. Run with CNC network, e.g. ` +
      `npx hardhat run scripts/sync-direct-children.js --network cnc -- --dry-run ` +
      `or pass --allow-non-cnc explicitly.`
    );
  }

  const latestBlock = await provider.getBlockNumber();
  const fromBlock = parsePositiveInt(fromBlockArg, 0);
  const toBlock = toBlockArg.toLowerCase() === "latest"
    ? latestBlock
    : parsePositiveInt(toBlockArg, latestBlock);

  if (fromBlock > toBlock) {
    throw new Error(`Invalid block range: fromBlock ${fromBlock} > toBlock ${toBlock}`);
  }

  const nexusRead = await ethers.getContractAt("DeFiNodeNexus", nexusAddress);

  let nexusWrite = null;
  if (execute) {
    const pk = (process.env.DEPLOYER_PRIVATE_KEY || process.env.OWNER_PRIVATE_KEY || "").trim();
    if (pk) {
      const signer = new ethers.Wallet(pk, provider);
      nexusWrite = nexusRead.connect(signer);
      console.log(`Using signer from private key: ${signer.address}`);
    } else {
      const [signer] = await ethers.getSigners();
      if (!signer) {
        throw new Error("No signer available. Set DEPLOYER_PRIVATE_KEY/OWNER_PRIVATE_KEY or hardhat signer.");
      }
      nexusWrite = nexusRead.connect(signer);
      console.log(`Using hardhat signer: ${await signer.getAddress()}`);
    }
  }

  console.log("=== Direct Children Sync ===");
  console.log("Mode:", dryRun ? "DRY-RUN" : "EXECUTE");
  console.log("Network:", `${network.name} (${network.chainId})`);
  console.log("Nexus:", nexusAddress);
  console.log("Block range:", `${fromBlock} -> ${toBlock}`);
  console.log("Batch size:", batchSize);
  if (referrerOnlyArg) {
    console.log("Referrer filter:", referrerOnlyArg);
  }
  console.log("");

  const filter = nexusRead.filters.ReferrerBound();
  const events = await nexusRead.queryFilter(filter, fromBlock, toBlock);
  console.log(`Loaded ReferrerBound events: ${events.length}`);

  const candidateByReferrer = new Map();
  for (const ev of events) {
    const user = String(ev.args?.user || "").toLowerCase();
    const referrer = String(ev.args?.referrer || "").toLowerCase();
    if (!ethers.isAddress(user) || !ethers.isAddress(referrer)) continue;
    if (user === ZERO || referrer === ZERO || user === referrer) continue;

    if (referrerOnlyArg) {
      if (!ethers.isAddress(referrerOnlyArg)) {
        throw new Error(`Invalid --referrer value: ${referrerOnlyArg}`);
      }
      if (referrer !== referrerOnlyArg.toLowerCase()) continue;
    }

    if (!candidateByReferrer.has(referrer)) {
      candidateByReferrer.set(referrer, new Set());
    }
    candidateByReferrer.get(referrer).add(user);
  }

  const referrers = Array.from(candidateByReferrer.keys()).map((addr) => ethers.getAddress(addr));
  console.log(`Referrers to process: ${referrers.length}`);

  let totalValidChildren = 0;
  let totalOrphans = 0;
  let txCount = 0;

  for (const referrer of referrers) {
    const candidates = Array.from(candidateByReferrer.get(referrer.toLowerCase()) || []).map((a) => ethers.getAddress(a));

    // Verify with current state: accounts[child].referrer must still equal referrer.
    const validChildren = [];
    for (const chunk of chunkArray(candidates, batchSize)) {
      const settled = await Promise.allSettled(
        chunk.map(async (child) => {
          const account = await nexusRead.accounts(child);
          const currentReferrer = String(account.referrer || "");
          return currentReferrer.toLowerCase() === referrer.toLowerCase() ? child : null;
        })
      );

      for (const item of settled) {
        if (item.status === "fulfilled" && item.value) {
          validChildren.push(item.value);
        }
      }
    }

    const orphanCount = candidates.length - validChildren.length;
    totalValidChildren += validChildren.length;
    totalOrphans += orphanCount;

    const currentCount = await safeGetDirectChildrenCount(nexusRead, referrer);
    console.log(
      `[${referrer}] candidates=${candidates.length}, valid=${validChildren.length}, orphans=${orphanCount}, onchainNow=${currentCount === null ? "n/a" : currentCount}`
    );

    if (dryRun) {
      continue;
    }

    const chunks = chunkArray(validChildren, batchSize);
    if (chunks.length === 0) {
      // Clear existing index if no valid children should remain.
      if (currentCount !== null && currentCount > 0) {
        const tx = await nexusWrite.syncDirectChildren(referrer, [], true);
        await tx.wait();
        txCount += 1;
        console.log(`  -> cleared existing children, tx=${tx.hash}`);
      }
      continue;
    }

    for (let i = 0; i < chunks.length; i++) {
      const clearExisting = i === 0;
      const tx = await nexusWrite.syncDirectChildren(referrer, chunks[i], clearExisting);
      await tx.wait();
      txCount += 1;
      console.log(`  -> synced chunk ${i + 1}/${chunks.length}, size=${chunks[i].length}, tx=${tx.hash}`);
    }

    const syncedCount = await safeGetDirectChildrenCount(nexusRead, referrer);
    if (syncedCount !== null && syncedCount !== validChildren.length) {
      console.warn(`  !! count mismatch after sync: expected=${validChildren.length}, onchain=${syncedCount}`);
    }
  }

  console.log("\n=== Summary ===");
  console.log("Referrers processed:", referrers.length);
  console.log("Total valid children:", totalValidChildren);
  console.log("Total orphan events:", totalOrphans);
  if (!dryRun) {
    console.log("Transactions sent:", txCount);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error("[sync-direct-children] Error:", err?.message || err);
  process.exit(1);
});
