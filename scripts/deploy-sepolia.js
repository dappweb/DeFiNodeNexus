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
  const contract = await hre.upgrades.deployProxy(
    DeFiNodeNexus,
    [totToken, tofToken, usdtToken, deployer.address],
    { kind: "uups", initializer: "initialize" }
  );
  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  console.log("DeFiNodeNexus deployed to:", deployedAddress);

  // --- Post-deploy configuration ---

  // Set 4 project wallets if provided in .env
  const zeroLine    = process.env.ZERO_LINE_WALLET;
  const community   = process.env.COMMUNITY_WALLET;
  const foundation  = process.env.FOUNDATION_WALLET;
  const institution = process.env.INSTITUTION_WALLET;

  if (zeroLine && community && foundation && institution) {
    const tx = await contract.setWallets(zeroLine, community, foundation, institution);
    await tx.wait();
    console.log("Wallets configured:");
    console.log("  0号线:  ", zeroLine);
    console.log("  社区建设:", community);
    console.log("  基金会:  ", foundation);
    console.log("  机构:   ", institution);
  } else {
    console.log("Wallet addresses not set (missing env vars). All default to deployer.");
  }

  // Configure default NFTA tiers:
  // Tier 1: 初级创世荣耀 500 USDT, maxSupply 10000
  // Tier 2: 高级创世王者 1000 USDT, maxSupply 5000
  // dailyYield = price * 1.3% = price * 13 / 1000  (conservative default)
  const decimals = 18; // adjust if USDT uses 6 decimals
  const unit = hre.ethers.parseUnits("1", decimals);

  const tier1Price = hre.ethers.parseUnits("500", decimals);
  const tier1Yield = tier1Price * 13n / 1000n; // 1.3% daily
  const tx1 = await contract.configureNftaTier(0, tier1Price, tier1Yield, 10000, true);
  await tx1.wait();
  console.log("NFTA Tier 1 configured: 500U, 1.3%/day, max 10000");

  const tier2Price = hre.ethers.parseUnits("1000", decimals);
  const tier2Yield = tier2Price * 20n / 1000n; // 2.0% daily
  const tx2 = await contract.configureNftaTier(0, tier2Price, tier2Yield, 5000, true);
  await tx2.wait();
  console.log("NFTA Tier 2 configured: 1000U, 2.0%/day, max 5000");

  // --- Deploy TOTSwap ---

  console.log("\n--- Deploying TOTSwap ---");

  const TOTSwap = await hre.ethers.getContractFactory("TOTSwap");
  const swap = await hre.upgrades.deployProxy(
    TOTSwap,
    [totToken, usdtToken, deployer.address],
    { kind: "uups", initializer: "initialize" }
  );
  await swap.waitForDeployment();

  const swapAddress = await swap.getAddress();
  console.log("TOTSwap deployed to:", swapAddress);

  // Link TOTSwap to DeFiNodeNexus
  const txNexus = await swap.setNexus(deployedAddress);
  await txNexus.wait();
  console.log("TOTSwap → Nexus linked:", deployedAddress);

  // Authorize TOTSwap as a distributor on DeFiNodeNexus
  const txDist = await contract.setDistributor(swapAddress, true);
  await txDist.wait();
  console.log("TOTSwap authorized as distributor on Nexus");

  // Summary
  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log("DeFiNodeNexus:", deployedAddress);
  console.log("TOTSwap:      ", swapAddress);
  console.log("TOT token:    ", totToken);
  console.log("TOF token:    ", tofToken);
  console.log("USDT token:   ", usdtToken);
  console.log("\nNOTE: Owner must call swap.addLiquidity() to seed 6% TOT + USDT into pool.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
