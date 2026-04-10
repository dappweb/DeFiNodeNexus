const hre = require("hardhat");
const { getSwapProxyAddress, maybeConfigureSwapV3 } = require("./lib/swap-v3");

async function main() {
  const proxyAddress = getSwapProxyAddress(hre.network.name);
  if (!proxyAddress) {
    throw new Error("Missing UPGRADE_PROXY_ADDRESS, SWAP_PROXY_ADDRESS, or SWAP_ADDRESS in .env");
  }

  const network = await hre.ethers.provider.getNetwork();
  console.log("Upgrading TOTSwap proxy to TOTSwapV3");
  console.log("Network:      ", `${network.name} (${network.chainId})`);
  console.log("Proxy address:", proxyAddress);

  const Factory = await hre.ethers.getContractFactory("TOTSwapV3");
  const upgraded = await hre.upgrades.upgradeProxy(proxyAddress, Factory, { kind: "uups" });
  await upgraded.waitForDeployment();

  const implementationAddress = await hre.upgrades.erc1967.getImplementationAddress(proxyAddress);
  const configResult = await maybeConfigureSwapV3(hre, upgraded, {
    contractName: "TOTSwapV3",
    networkName: hre.network.name,
  });

  console.log("Upgrade complete");
  console.log("Proxy:              ", proxyAddress);
  console.log("New implementation: ", implementationAddress);
  console.log("Version:            ", await upgraded.version());
  console.log("External DEX enabled:", Boolean(configResult.externalDexEnabled));
  console.log("Swap paused:         ", Boolean(configResult.swapPaused));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});