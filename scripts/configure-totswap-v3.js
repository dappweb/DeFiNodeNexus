const hre = require("hardhat");
const { getSwapProxyAddress, maybeConfigureSwapV3 } = require("./lib/swap-v3");

async function main() {
  const proxyAddress = getSwapProxyAddress(hre.network.name);
  if (!proxyAddress) {
    throw new Error("Missing UPGRADE_PROXY_ADDRESS, SWAP_PROXY_ADDRESS, SWAP_ADDRESS, or CNC_SWAP_ADDRESS in .env");
  }

  const network = await hre.ethers.provider.getNetwork();
  console.log("Configuring TOTSwapV3");
  console.log("Network:      ", `${network.name} (${network.chainId})`);
  console.log("Proxy address:", proxyAddress);

  const swap = await hre.ethers.getContractAt("TOTSwapV3", proxyAddress);
  const configResult = await maybeConfigureSwapV3(hre, swap, {
    contractName: "TOTSwapV3",
    networkName: hre.network.name,
  });

  console.log("Configuration complete");
  console.log("External DEX enabled:", Boolean(configResult.externalDexEnabled));
  console.log("Swap paused:         ", Boolean(configResult.swapPaused));
  if (configResult.router) {
    console.log("Router update:", configResult.router);
  }
  if (configResult.pair) {
    console.log("Pair update:", configResult.pair);
  }
  if (configResult.factory) {
    console.log("Factory update:", configResult.factory);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});