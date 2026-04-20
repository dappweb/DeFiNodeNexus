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

async function upgradeProxy({ label, proxyAddress, contractName }) {
  if (!proxyAddress) {
    throw new Error(`Missing proxy address for ${label}`);
  }

  const previousImplementation = await hre.upgrades.erc1967.getImplementationAddress(proxyAddress);
  const Factory = await hre.ethers.getContractFactory(contractName);

  console.log(`\n=== Upgrading ${label} ===`);
  console.log("Contract:", contractName);
  console.log("Proxy:   ", proxyAddress);
  console.log("Old impl:", previousImplementation);

  const upgraded = await hre.upgrades.upgradeProxy(proxyAddress, Factory, { kind: "uups" });
  await upgraded.waitForDeployment();

  const implementationAddress = await hre.upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("New impl:", implementationAddress);
  console.log("Changed :", implementationAddress.toLowerCase() !== previousImplementation.toLowerCase() ? "YES" : "NO");

  return {
    proxyAddress,
    implementationAddress,
    previousImplementation,
    contractName,
  };
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

  console.log("Permission upgrade rollout");
  console.log("Network:", `${network.name} (${network.chainId})`);

  const nexus = await upgradeProxy({
    label: "DeFiNodeNexus",
    proxyAddress: nexusProxyAddress,
    contractName: "DeFiNodeNexus",
  });

  const swap = await upgradeProxy({
    label: swapContractName,
    proxyAddress: swapProxyAddress,
    contractName: swapContractName,
  });

  console.log("\n=== Upgrade complete ===");
  console.log(`NEXUS_PROXY_ADDRESS=${nexus.proxyAddress}`);
  console.log(`NEXUS_IMPLEMENTATION=${nexus.implementationAddress}`);
  console.log(`SWAP_PROXY_ADDRESS=${swap.proxyAddress}`);
  console.log(`SWAP_IMPLEMENTATION=${swap.implementationAddress}`);
  console.log("Next: run npm run verify:permissions:2026:cnc to confirm upgraded permission entrypoints.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});