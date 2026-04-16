const hre = require("hardhat");

async function main() {
  const nexusAddress = process.env.NEXUS_ADDRESS || process.env.UPGRADE_PROXY_ADDRESS;
  const user = process.env.TARGET_USER;
  const newReferrer = process.env.NEW_REFERRER || hre.ethers.ZeroAddress;

  if (!nexusAddress) {
    throw new Error("Missing NEXUS_ADDRESS (or UPGRADE_PROXY_ADDRESS) in env");
  }
  if (!user) {
    throw new Error("Missing TARGET_USER in env");
  }

  const [signer] = await hre.ethers.getSigners();
  const nexus = await hre.ethers.getContractAt("DeFiNodeNexusV2", nexusAddress, signer);

  const owner = await nexus.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`Signer ${signer.address} is not owner ${owner}`);
  }

  const before = await nexus.accounts(user);
  console.log("Nexus:", nexusAddress);
  console.log("Owner signer:", signer.address);
  console.log("Target user:", user);
  console.log("Old referrer:", before.referrer);
  console.log("New referrer:", newReferrer);

  const tx = await nexus.forceSetReferrer(user, newReferrer);
  const receipt = await tx.wait();
  console.log("Tx hash:", receipt.hash);

  const after = await nexus.accounts(user);
  console.log("Updated referrer:", after.referrer);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
