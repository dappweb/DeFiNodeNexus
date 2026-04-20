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

async function safeCall(label, fn) {
  try {
    const value = await fn();
    console.log(`${label}=OK`, value !== undefined ? value : "");
    return value;
  } catch (error) {
    const message = error?.shortMessage || error?.reason || error?.message || String(error);
    console.log(`${label}=ERR ${String(message).replace(/\s+/g, " ").trim()}`);
    return null;
  }
}

async function probe(label, fn) {
  try {
    await fn();
    console.log(`${label}=PASS`);
  } catch (error) {
    const message = error?.shortMessage || error?.reason || error?.message || String(error);
    console.log(`${label}=FAIL ${String(message).replace(/\s+/g, " ").trim()}`);
  }
}

async function main() {
  const nexusProxyAddress = getEnv(["NEXUS_PROXY_ADDRESS", "NEXUS_ADDRESS"]);
  const swapProxyAddress = getEnv(["SWAP_PROXY_ADDRESS", "SWAP_ADDRESS"]);
  const usdtAddress = getEnv(["USDT_ADDRESS", "NEXT_PUBLIC_USDT_ADDRESS"]);

  if (!nexusProxyAddress || !swapProxyAddress) {
    throw new Error("Missing NEXUS/SWAP proxy addresses in env");
  }

  const nexusFactory = await hre.ethers.getContractFactory("DeFiNodeNexus");
  const swapFactory = await hre.ethers.getContractFactory("TOTSwapV3");
  const nexus = new hre.ethers.Contract(nexusProxyAddress, nexusFactory.interface, hre.ethers.provider);
  const swap = new hre.ethers.Contract(swapProxyAddress, swapFactory.interface, hre.ethers.provider);

  console.log("Post-upgrade permission probe");
  console.log("Nexus proxy:", nexusProxyAddress);
  console.log("Swap proxy :", swapProxyAddress);

  const adminCount = await safeCall("NEXUS_ADMIN_COUNT", () => nexus.getAdminCount());
  const managerCount = await safeCall("NEXUS_MANAGER_COUNT", () => nexus.getManagerCount());
  const owner = await safeCall("OWNER", () => nexus.owner());
  const admin = adminCount && BigInt(adminCount) > 0n
    ? await safeCall("NEXUS_ADMIN_0", () => nexus.getAdminAt(0n))
    : null;
  const manager = managerCount && BigInt(managerCount) > 0n
    ? await safeCall("NEXUS_MANAGER_0", () => nexus.getManagerAt(0n))
    : null;

  const candidateAddresses = [admin, manager, owner].filter(Boolean);
  let swapManager = null;
  for (const candidate of candidateAddresses) {
    const isManager = await safeCall(`SWAP_MANAGERS_${candidate}`, () => swap.managers(candidate));
    if (isManager === true) {
      swapManager = candidate;
      console.log(`SWAP_MANAGER_MATCH=OK ${candidate}`);
      break;
    }
  }

  const probeOwner = "0x1111111111111111111111111111111111111111";
  const probeReferrer = "0x2222222222222222222222222222222222222222";
  const probeToken = usdtAddress || "0x0000000000000000000000000000000000000001";

  if (admin) {
    await probe("NEXUS_ADMIN_TRANSFER_OWNERSHIP", () => nexus.transferOwnership.staticCall(probeOwner, { from: admin }));
    await probe("NEXUS_ADMIN_SET_ADMIN", () => nexus.setAdmin.staticCall(probeOwner, true, { from: admin }));
    await probe("SWAP_ADMIN_FORCE_DISTRIBUTE", () => swap.forceDistribute.staticCall({ from: admin }));
    await probe("SWAP_ADMIN_EMERGENCY_WITHDRAW", () => swap.emergencyWithdraw.staticCall(probeToken, 1n, { from: admin }));
    await probe("SWAP_ADMIN_SET_SWAP_PAUSED", () => swap.setSwapPaused.staticCall(false, { from: admin }));
  } else {
    console.log("ADMIN_PROBES=SKIP no nexus admin found");
  }

  if (manager) {
    await probe("NEXUS_MANAGER_FORCE_SET_REFERRER", () => nexus.forceSetReferrer.staticCall(probeOwner, probeReferrer, { from: manager }));
  } else {
    console.log("NEXUS_MANAGER_PROBES=SKIP no nexus manager found");
  }

  if (swapManager) {
    await probe("SWAP_MANAGER_ADD_LIQUIDITY", () => swap.addLiquidity.staticCall(1n, 1n, { from: swapManager }));
  } else {
    console.log("SWAP_MANAGER_PROBES=SKIP no swap manager found");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});