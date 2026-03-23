const hre = require("hardhat");

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const rpcUrl = process.env.SEPOLIA_RPC_URL;

  if (!privateKey) {
    throw new Error("Missing DEPLOYER_PRIVATE_KEY in .env");
  }
  if (!rpcUrl) {
    throw new Error("Missing SEPOLIA_RPC_URL in .env");
  }

  const name = process.env.TOT_NAME || "TOT Token";
  const symbol = process.env.TOT_SYMBOL || "TOT";
  const maxSupplyRaw = process.env.TOT_MAX_SUPPLY || "1000000000";
  const initialSupplyRaw = process.env.TOT_INITIAL_SUPPLY || maxSupplyRaw;
  const ownerAddressFromEnv = process.env.TOT_OWNER_ADDRESS;

  const [deployer] = await hre.ethers.getSigners();
  const ownerAddress = ownerAddressFromEnv || deployer.address;

  const maxSupply = hre.ethers.parseUnits(maxSupplyRaw, 18);
  const initialSupply = hre.ethers.parseUnits(initialSupplyRaw, 18);

  if (initialSupply > maxSupply) {
    throw new Error("TOT_INITIAL_SUPPLY cannot exceed TOT_MAX_SUPPLY");
  }

  console.log("Deploying TOT with account:", deployer.address);
  console.log("Token:", `${name} (${symbol})`);
  console.log("Owner:", ownerAddress);
  console.log("Max supply:", maxSupplyRaw);
  console.log("Initial supply:", initialSupplyRaw);

  const TOTToken = await hre.ethers.getContractFactory("TOTToken");
  const token = await hre.upgrades.deployProxy(
    TOTToken,
    [name, symbol, maxSupply, initialSupply, ownerAddress],
    { kind: "uups", initializer: "initialize" }
  );
  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log("TOT deployed to:", tokenAddress);
  console.log("\nSet this in .env for app/other deploy scripts:");
  console.log(`TOT_TOKEN_ADDRESS=${tokenAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
