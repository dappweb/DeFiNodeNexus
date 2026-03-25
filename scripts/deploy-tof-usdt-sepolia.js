const hre = require("hardhat");

async function deployToken(contractName, name, symbol, maxSupplyRaw, initialSupplyRaw, ownerAddress) {
  const maxSupply = hre.ethers.parseUnits(maxSupplyRaw, 18);
  const initialSupply = hre.ethers.parseUnits(initialSupplyRaw, 18);

  if (initialSupply > maxSupply) {
    throw new Error(`${symbol}: initial supply cannot exceed max supply`);
  }

  const Token = await hre.ethers.getContractFactory(contractName);
  const token = await hre.upgrades.deployProxy(
    Token,
    [name, symbol, maxSupply, initialSupply, ownerAddress],
    { kind: "uups", initializer: "initialize" }
  );
  await token.waitForDeployment();
  return token.getAddress();
}

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const rpcUrl = process.env.SEPOLIA_RPC_URL;

  if (!privateKey) {
    throw new Error("Missing DEPLOYER_PRIVATE_KEY in .env");
  }
  if (!rpcUrl) {
    throw new Error("Missing SEPOLIA_RPC_URL in .env");
  }

  const [deployer] = await hre.ethers.getSigners();
  const ownerAddress = process.env.TOKEN_OWNER_ADDRESS || deployer.address;

  const tofName = process.env.TOF_NAME || "TOF Token";
  const tofSymbol = process.env.TOF_SYMBOL || "TOF";
  const tofMaxSupply = process.env.TOF_MAX_SUPPLY || "10000000000";
  const tofInitialSupply = process.env.TOF_INITIAL_SUPPLY || "0";

  const usdtName = process.env.USDT_NAME || "USDT Test";
  const usdtSymbol = process.env.USDT_SYMBOL || "USDT";
  const usdtMaxSupply = process.env.USDT_MAX_SUPPLY || "1000000000";
  const usdtInitialSupply = process.env.USDT_INITIAL_SUPPLY || usdtMaxSupply;

  console.log("Deploying TOF/USDT with account:", deployer.address);
  console.log("Token owner:", ownerAddress);

  const tofAddress = await deployToken("TOFToken", tofName, tofSymbol, tofMaxSupply, tofInitialSupply, ownerAddress);
  console.log("TOF deployed to:", tofAddress);

  const predictionMinter = process.env.TOF_PREDICTION_MINTER || ownerAddress;
  const tofContract = await hre.ethers.getContractAt("TOFToken", tofAddress);
  const setMinterTx = await tofContract.setPredictionMinter(predictionMinter);
  await setMinterTx.wait();
  console.log("TOF prediction minter:", predictionMinter);

  const usdtAddress = await deployToken("TOTToken", usdtName, usdtSymbol, usdtMaxSupply, usdtInitialSupply, ownerAddress);
  console.log("USDT deployed to:", usdtAddress);

  console.log("\nSet these in .env:");
  console.log(`TOF_TOKEN_ADDRESS=${tofAddress}`);
  console.log(`USDT_TOKEN_ADDRESS=${usdtAddress}`);
  console.log(`TOF_PREDICTION_MINTER=${predictionMinter}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
