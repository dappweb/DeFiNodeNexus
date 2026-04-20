const hre = require("hardhat");

function getEnv(names) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

async function main() {
  const nexusAddress = getEnv(["NEXUS_PROXY_ADDRESS", "NEXUS_ADDRESS"]);
  const swapAddress = getEnv(["SWAP_PROXY_ADDRESS", "SWAP_ADDRESS"]);

  if (!nexusAddress || !swapAddress) {
    throw new Error("Missing NEXUS/SWAP addresses in env");
  }

  const nexus = await hre.ethers.getContractAt("DeFiNodeNexus", nexusAddress);
  const swap = await hre.ethers.getContractAt("TOTSwapV3", swapAddress);

  const adminCount = Number(await nexus.getAdminCount());
  const managerCount = Number(await nexus.getManagerCount());
  const admins = [];
  const managers = [];

  for (let i = 0; i < adminCount; i++) {
    admins.push(await nexus.getAdminAt(BigInt(i)));
  }
  for (let i = 0; i < managerCount; i++) {
    managers.push(await nexus.getManagerAt(BigInt(i)));
  }

  console.log("Syncing roles from Nexus to Swap");
  console.log("Nexus:", nexusAddress);
  console.log("Swap :", swapAddress);
  console.log("Admins  :", admins);
  console.log("Managers:", managers);

  for (const admin of admins) {
    const exists = await swap.admins(admin).catch(() => false);
    if (exists) {
      console.log(`Skip admin ${admin} (already granted)`);
      continue;
    }
    const tx = await swap.setAdmin(admin, true);
    const receipt = await tx.wait();
    console.log(`Granted swap admin ${admin}: ${receipt.hash}`);
  }

  for (const manager of managers) {
    const exists = await swap.managers(manager).catch(() => false);
    if (exists) {
      console.log(`Skip manager ${manager} (already granted)`);
      continue;
    }
    const tx = await swap.setManager(manager, true);
    const receipt = await tx.wait();
    console.log(`Granted swap manager ${manager}: ${receipt.hash}`);
  }

  console.log("Role sync complete");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});