const hre = require("hardhat");

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const totToken = process.env.TOT_TOKEN_ADDRESS;
  const tofToken = process.env.TOF_TOKEN_ADDRESS;

  if (!privateKey) {
    throw new Error("Missing DEPLOYER_PRIVATE_KEY in .env");
  }
  if (!rpcUrl) {
    throw new Error("Missing SEPOLIA_RPC_URL in .env");
  }
  if (!totToken || !tofToken) {
    throw new Error("Missing TOT_TOKEN_ADDRESS or TOF_TOKEN_ADDRESS in .env");
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const DeFiNodeNexus = await hre.ethers.getContractFactory("DeFiNodeNexus");
  const contract = await DeFiNodeNexus.deploy(totToken, tofToken);
  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  console.log("DeFiNodeNexus deployed to:", deployedAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
