const hre = require("hardhat");
const { getSwapProxyAddress, maybeConfigureSwapV3 } = require("./lib/swap-v3");

async function main() {
  const proxyAddress = getSwapProxyAddress(hre.network.name);
  if (!proxyAddress) {
    throw new Error("Missing UPGRADE_PROXY_ADDRESS, SWAP_PROXY_ADDRESS, SWAP_ADDRESS, or CNC_SWAP_ADDRESS in .env");
  }

  const network = await hre.ethers.provider.getNetwork();
  console.log("Replacing Swap implementation with TOTSwapV3");
  console.log("Network:      ", `${network.name} (${network.chainId})`);
  console.log("Proxy address:", proxyAddress);

  const oldImplementation = await hre.upgrades.erc1967
    .getImplementationAddress(proxyAddress)
    .catch(() => "");

  const Factory = await hre.ethers.getContractFactory("TOTSwapV3");
  const upgraded = await hre.upgrades.upgradeProxy(proxyAddress, Factory, { kind: "uups" });
  await upgraded.waitForDeployment();

  const newImplementation = await hre.upgrades.erc1967.getImplementationAddress(proxyAddress);
  const configResult = await maybeConfigureSwapV3(hre, upgraded, {
    contractName: "TOTSwapV3",
    networkName: hre.network.name,
  });

  const [router, pair, factory, enabled, paused] = await upgraded
    .getRouterConfig()
    .catch(() => ["0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000", false, false]);

  const owner = await upgraded.owner().catch(() => "");
  const version = await upgraded.version().catch(() => "TOTSwapV3");

  console.log("Replacement complete");
  console.log("Proxy:                ", proxyAddress);
  console.log("Old implementation:   ", oldImplementation || "(unknown)");
  console.log("New implementation:   ", newImplementation);
  console.log("Version:              ", version);
  console.log("Owner:                ", owner || "(read failed)");
  console.log("Router:               ", router);
  console.log("Pair:                 ", pair);
  console.log("Factory:              ", factory);
  console.log("External DEX enabled: ", Boolean(enabled));
  console.log("Swap paused:          ", Boolean(paused));

  if (configResult.router) {
    console.log("Router update:", configResult.router);
  }
  if (configResult.pair) {
    console.log("Pair update:", configResult.pair);
  }
  if (configResult.factory) {
    console.log("Factory update:", configResult.factory);
  }

  console.log("\nSuggested env sync:");
  if (hre.network.name === "cnc") {
    console.log(`CNC_SWAP_ADDRESS=${proxyAddress}`);
  }
  console.log(`SWAP_ADDRESS=${proxyAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
