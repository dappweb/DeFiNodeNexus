const hre = require("hardhat");

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const totToken = process.env.TOT_TOKEN_ADDRESS;
  const tofToken = process.env.TOF_TOKEN_ADDRESS;
  const usdtToken = process.env.USDT_TOKEN_ADDRESS;
  const zeroAddress = "0x0000000000000000000000000000000000000000";

  if (!privateKey) {
    throw new Error("Missing DEPLOYER_PRIVATE_KEY in .env");
  }
  if (!rpcUrl) {
    throw new Error("Missing SEPOLIA_RPC_URL in .env");
  }
  if (!totToken || !tofToken || !usdtToken) {
    throw new Error("Missing TOT_TOKEN_ADDRESS, TOF_TOKEN_ADDRESS or USDT_TOKEN_ADDRESS in .env");
  }
  if (totToken === zeroAddress || tofToken === zeroAddress || usdtToken === zeroAddress) {
    throw new Error("TOT_TOKEN_ADDRESS, TOF_TOKEN_ADDRESS and USDT_TOKEN_ADDRESS must be real deployed token addresses");
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("TOT token:", totToken);
  console.log("TOF token:", tofToken);
  console.log("USDT token:", usdtToken);

  const DeFiNodeNexus = await hre.ethers.getContractFactory("DeFiNodeNexus");
  const contract = await DeFiNodeNexus.deploy(totToken, tofToken, usdtToken);
  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  console.log("DeFiNodeNexus deployed to:", deployedAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
