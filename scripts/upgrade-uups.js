const hre = require("hardhat");

async function main() {
  const contractName = process.env.UPGRADE_CONTRACT_NAME;
  const proxyAddress = process.env.UPGRADE_PROXY_ADDRESS;

  if (!contractName) {
    throw new Error("Missing UPGRADE_CONTRACT_NAME in .env");
  }
  if (!proxyAddress) {
    throw new Error("Missing UPGRADE_PROXY_ADDRESS in .env");
  }

  console.log("Upgrading contract:", contractName);
  console.log("Proxy address:", proxyAddress);

  const Factory = await hre.ethers.getContractFactory(contractName);
  const upgraded = await hre.upgrades.upgradeProxy(proxyAddress, Factory, { kind: "uups" });
  await upgraded.waitForDeployment();

  const implementationAddress = await hre.upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("Upgrade complete");
  console.log("Proxy:", proxyAddress);
  console.log("New implementation:", implementationAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
