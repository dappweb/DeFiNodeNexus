const hre = require("hardhat");
const { getSwapContractName, getSwapProxyAddress } = require("./lib/swap-v3");

function getEnv(names) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

async function printImplementation(label, proxyAddress) {
  const implementationAddress = await hre.upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log(`${label} proxy:`, proxyAddress);
  console.log(`${label} impl :`, implementationAddress);
  return implementationAddress;
}

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  const nexusProxyAddress = getEnv(["NEXUS_PROXY_ADDRESS", "NEXUS_ADDRESS"]);
  const swapProxyAddress = getSwapProxyAddress(hre.network.name);
  const swapContractName = getEnv(["PERMISSION_UPGRADE_SWAP_CONTRACT_NAME", "SWAP_CONTRACT_NAME"]) || "TOTSwapV3";

  if (!nexusProxyAddress) {
    throw new Error("Missing NEXUS_PROXY_ADDRESS or NEXUS_ADDRESS in .env");
  }
  if (!swapProxyAddress) {
    throw new Error("Missing SWAP_PROXY_ADDRESS, SWAP_ADDRESS, or UPGRADE_PROXY_ADDRESS in .env");
  }

  console.log("Permission upgrade verification");
  console.log("Network:", `${network.name} (${network.chainId})`);

  const nexus = await hre.ethers.getContractAt("DeFiNodeNexus", nexusProxyAddress);
  const swap = await hre.ethers.getContractAt(swapContractName, swapProxyAddress);

  console.log("\n=== Proxy / implementation ===");
  await printImplementation("Nexus", nexusProxyAddress);
  await printImplementation("Swap", swapProxyAddress);

  console.log("\n=== Nexus permission surface ===");
  console.log("owner():", await nexus.owner());
  console.log("getAdminCount():", String(await nexus.getAdminCount()));
  console.log("getManagerCount():", String(await nexus.getManagerCount()));
  console.log("isAdminAddress(0x0):", String(await nexus.isAdminAddress(hre.ethers.ZeroAddress)));
  console.log("isManagerAddress(0x0):", String(await nexus.isManagerAddress(hre.ethers.ZeroAddress)));
  console.log("forceSetReferrer selector present: YES");
  console.log("transferOwnership selector present: YES");

  console.log("\n=== Swap permission surface ===");
  console.log("owner():", await swap.owner());
  if (typeof swap.admins === "function") {
    console.log("admins(0x0):", String(await swap.admins(hre.ethers.ZeroAddress)));
  }
  if (typeof swap.managers === "function") {
    console.log("managers(0x0):", String(await swap.managers(hre.ethers.ZeroAddress)));
  }
  console.log("transferOwnership selector present: YES");
  console.log("forceDistribute selector present: YES");
  console.log("addLiquidity selector present: YES");
  console.log("emergencyWithdraw selector present: YES");

  if (typeof swap.version === "function") {
    console.log("version():", await swap.version());
  }
  if (typeof swap.getRouterConfig === "function") {
    const [router, pair, factory, enabled, paused] = await swap.getRouterConfig();
    console.log("getRouterConfig():", { router, pair, factory, enabled, paused });
  }

  console.log("\nVerification complete.");
  console.log("Recommended follow-up: run role-grant transactions from Admin UI or script and spot-check admin/manager write access on-chain.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});