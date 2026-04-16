const hre = require("hardhat");

const { ethers } = hre;

function normalizeAddress(address) {
  return ethers.getAddress(address);
}

async function collectUsers(nexus, fromBlock, toBlock) {
  const users = new Set();

  const add = (address) => {
    if (!address || address === ethers.ZeroAddress) return;
    users.add(normalizeAddress(address));
  };

  const nftaPurchased = await nexus.queryFilter(nexus.filters.NftaPurchased(), fromBlock, toBlock);
  for (const evt of nftaPurchased) {
    add(evt.args.user);
  }

  const nftbPurchased = await nexus.queryFilter(nexus.filters.NftbPurchased(), fromBlock, toBlock);
  for (const evt of nftbPurchased) {
    add(evt.args.user);
  }

  const referrerBound = await nexus.queryFilter(nexus.filters.ReferrerBound(), fromBlock, toBlock);
  for (const evt of referrerBound) {
    add(evt.args.user);
    add(evt.args.referrer);
  }

  const teamCommissionPaid = await nexus.queryFilter(nexus.filters.TeamCommissionPaid(), fromBlock, toBlock);
  for (const evt of teamCommissionPaid) {
    add(evt.args.beneficiary);
    add(evt.args.buyer);
  }

  const withdrawn = await nexus.queryFilter(nexus.filters.TotWithdrawn(), fromBlock, toBlock);
  for (const evt of withdrawn) {
    add(evt.args.user);
  }

  return Array.from(users);
}

async function main() {
  const nexusAddress = process.env.NEXUS_ADDRESS || process.env.PURGE_CONTRACT_ADDRESS;
  const keepUserRaw = process.env.KEEP_USER;

  if (!nexusAddress) {
    throw new Error("Missing NEXUS_ADDRESS (or PURGE_CONTRACT_ADDRESS) in .env");
  }
  if (!keepUserRaw) {
    throw new Error("Missing KEEP_USER in .env");
  }

  const keepUser = normalizeAddress(keepUserRaw);
  const fromBlock = process.env.FROM_BLOCK ? Number(process.env.FROM_BLOCK) : 0;
  const toBlock = process.env.TO_BLOCK ? Number(process.env.TO_BLOCK) : "latest";
  const batchSize = process.env.BATCH_SIZE ? Number(process.env.BATCH_SIZE) : 30;
  const dryRun = process.env.DRY_RUN !== "false";

  if (!Number.isInteger(batchSize) || batchSize <= 0) {
    throw new Error("BATCH_SIZE must be a positive integer");
  }

  const [operator] = await ethers.getSigners();
  const nexus = await ethers.getContractAt("DeFiNodeNexusV2", nexusAddress);

  console.log("Operator:", operator.address);
  console.log("Nexus:", nexusAddress);
  console.log("Keep user:", keepUser);
  console.log("Block range:", fromBlock, "->", toBlock);

  const discoveredUsers = await collectUsers(nexus, fromBlock, toBlock);
  const usersToPurge = discoveredUsers.filter((user) => user !== keepUser);

  console.log("Discovered users:", discoveredUsers.length);
  console.log("Users to purge:", usersToPurge.length);

  if (usersToPurge.length === 0) {
    console.log("No users to purge. Finished.");
    return;
  }

  if (dryRun) {
    console.log("DRY_RUN=true -> no transactions sent.");
    console.log("First users to purge:", usersToPurge.slice(0, 20));
    return;
  }

  if (process.env.CONFIRM_PURGE !== "YES") {
    throw new Error("Set CONFIRM_PURGE=YES to execute purge transactions");
  }

  for (let i = 0; i < usersToPurge.length; i += batchSize) {
    const batch = usersToPurge.slice(i, i + batchSize);
    const tx = await nexus.purgeUsersExcept(keepUser, batch);
    const receipt = await tx.wait();

    console.log(
      `Purged batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(usersToPurge.length / batchSize)} | size=${batch.length} | tx=${receipt.hash}`
    );
  }

  console.log("Purge completed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
