const hre = require("hardhat");

async function main() {
  const proxyAddress =
    process.env.UPGRADE_PROXY_ADDRESS ||
    process.env.NEXUS_ADDRESS;

  if (!proxyAddress) {
    throw new Error("Missing UPGRADE_PROXY_ADDRESS or NEXUS_ADDRESS in .env");
  }

  const network = await hre.ethers.provider.getNetwork();
  console.log("Upgrading DeFiNodeNexus proxy");
  console.log("Network:      ", `${network.name} (${network.chainId})`);
  console.log("Proxy address:", proxyAddress);

  const Factory = await hre.ethers.getContractFactory("DeFiNodeNexus");
  const upgraded = await hre.upgrades.upgradeProxy(proxyAddress, Factory, { kind: "uups" });
  await upgraded.waitForDeployment();

  const implementationAddress = await hre.upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("Upgrade complete");
  console.log("Proxy:              ", proxyAddress);
  console.log("New implementation: ", implementationAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
