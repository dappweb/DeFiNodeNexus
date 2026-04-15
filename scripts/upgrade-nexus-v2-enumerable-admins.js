const hre = require("hardhat");

async function main() {
  const proxyAddress =
    process.env.UPGRADE_PROXY_ADDRESS ||
    process.env.NEXUS_ADDRESS;

  if (!proxyAddress) {
    throw new Error("Missing UPGRADE_PROXY_ADDRESS or NEXUS_ADDRESS in .env");
  }

  const network = await hre.ethers.provider.getNetwork();
  console.log("Upgrading DeFiNodeNexus to v2 with enumerable admins");
  console.log("Network:      ", `${network.name} (${network.chainId})`);
  console.log("Proxy address:", proxyAddress);

  // Deploy new implementation
  const Factory = await hre.ethers.getContractFactory("DeFiNodeNexus");
  console.log("Deploying new DeFiNodeNexus implementation...");
  
  const upgraded = await hre.upgrades.upgradeProxy(proxyAddress, Factory, { kind: "uups" });
  await upgraded.waitForDeployment();

  const implementationAddress = await hre.upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("✅ Upgrade complete");
  console.log("Proxy address       :", proxyAddress);
  console.log("New implementation  :", implementationAddress);
  console.log("\nNew admin functions available:");
  console.log("  - getAdminCount() → returns total admin count");
  console.log("  - getAdminAt(index) → returns admin at index");
  console.log("  - getAdmins(offset, limit) → returns paginated admin list");
  console.log("  - isAdminAddress(account) → checks if address is admin");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
