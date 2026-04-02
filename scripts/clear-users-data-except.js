const hre = require("hardhat");

const { ethers } = hre;

const EVENT_NAMES = [
  "ReferrerBound",
  "NftaPurchased",
  "NftbPurchased",
  "NftaYieldClaimed",
  "NftbDividendClaimed",
  "NftbUsdtDividendClaimed",
  "TotWithdrawn"
];

function toAddressSet(values) {
  const set = new Set();
  for (const value of values) {
    if (!value) continue;
    const addr = String(value).toLowerCase();
    if (addr !== ethers.ZeroAddress.toLowerCase()) {
      set.add(addr);
    }
  }
  return set;
}

async function queryInRanges(contract, filter, fromBlock, toBlock, step) {
  const logs = [];
  for (let start = fromBlock; start <= toBlock; start += step) {
    const end = Math.min(start + step - 1, toBlock);
    const part = await contract.queryFilter(filter, start, end);
    logs.push(...part);
  }
  return logs;
}

async function collectUsers(nexus, fromBlock, toBlock, rangeStep) {
  const users = new Set();

  for (const eventName of EVENT_NAMES) {
    const filterBuilder = nexus.filters[eventName];
    if (typeof filterBuilder !== "function") continue;

    const logs = await queryInRanges(nexus, filterBuilder(), fromBlock, toBlock, rangeStep);
    for (const log of logs) {
      if (!log.args) continue;
      for (const [key, value] of Object.entries(log.args)) {
        if (/^\d+$/.test(key)) continue;
        if (typeof value === "string" && ethers.isAddress(value)) {
          users.add(value.toLowerCase());
        }
      }
    }

    console.log(`[scan] ${eventName}: ${logs.length} logs, users=${users.size}`);
  }

  return users;
}

async function main() {
  const nexusAddress = process.env.NEXUS_ADDRESS;
  const keepUserInput = process.env.KEEP_USER || "0x4C10831CBcF9884ba72051b5287b6c87E4F74A48";

  if (!nexusAddress || !ethers.isAddress(nexusAddress)) {
    throw new Error("Missing or invalid NEXUS_ADDRESS");
  }
  if (!ethers.isAddress(keepUserInput)) {
    throw new Error("Invalid KEEP_USER");
  }

  const keepUser = keepUserInput.toLowerCase();
  const dryRun = (process.env.DRY_RUN || "true").toLowerCase() !== "false";
  const forceExecute = (process.env.EXECUTE_CLEAR || "false").toLowerCase() === "true";
  const batchSize = Number(process.env.BATCH_SIZE || "40");
  const fromBlock = Number(process.env.FROM_BLOCK || "0");
  const rangeStep = Number(process.env.RANGE_STEP || "10000");

  if (!Number.isFinite(batchSize) || batchSize <= 0) {
    throw new Error("BATCH_SIZE must be > 0");
  }

  const [operator] = await ethers.getSigners();
  const nexus = await ethers.getContractAt("DeFiNodeNexus", nexusAddress);
  const latest = await ethers.provider.getBlockNumber();

  console.log("Operator:", operator.address);
  console.log("Contract:", nexusAddress);
  console.log("Keep user:", keepUserInput);
  console.log("Scan blocks:", fromBlock, "->", latest);

  const owner = (await nexus.owner()).toLowerCase();
  if (owner !== operator.address.toLowerCase()) {
    throw new Error(`Current signer is not owner. owner=${owner}`);
  }

  const discovered = await collectUsers(nexus, fromBlock, latest, rangeStep);
  const manualUsers = toAddressSet((process.env.CLEAR_USERS || "").split(",").map(s => s.trim()));
  for (const addr of manualUsers) discovered.add(addr);

  const targets = [...discovered].filter((addr) => addr !== keepUser);
  console.log("Discovered users:", discovered.size);
  console.log("Targets to clear:", targets.length);

  if (targets.length === 0) {
    console.log("No users to clear. Done.");
    return;
  }

  if (dryRun || !forceExecute) {
    console.log("DRY RUN enabled or EXECUTE_CLEAR!=true, no state-changing tx sent.");
    console.log("Set DRY_RUN=false and EXECUTE_CLEAR=true to execute.");
    console.log("First 20 targets:", targets.slice(0, 20));
    return;
  }

  for (let i = 0; i < targets.length; i += batchSize) {
    const batch = targets.slice(i, i + batchSize);
    const tx = await nexus.clearUsersDataExcept(keepUserInput, batch);
    console.log(`[tx] batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(targets.length / batchSize)} =>`, tx.hash);
    await tx.wait();
  }

  console.log("All target users cleared.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
