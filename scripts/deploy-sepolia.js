const hre = require("hardhat");
const { getSwapContractName, maybeConfigureSwapV3 } = require("./lib/swap-v3");

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

  const tofContract = await hre.ethers.getContractAt("TOFToken", tofToken);
  const whitelistTx = await tofContract.setTransferWhitelist(deployedAddress, true);
  await whitelistTx.wait();
  console.log("TOF whitelist added for Nexus:", deployedAddress);

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

  // Configure default NFTB tiers (USDT + TOF dual pricing)
  // TOF pricing defaults follow business requirement: 100k / 200k / 400k TOF
  const nftbTier1Usdt = hre.ethers.parseUnits(process.env.NFTB_TIER1_USDT_PRICE || "500", decimals);
  const nftbTier2Usdt = hre.ethers.parseUnits(process.env.NFTB_TIER2_USDT_PRICE || "1000", decimals);
  const nftbTier3Usdt = hre.ethers.parseUnits(process.env.NFTB_TIER3_USDT_PRICE || "2000", decimals);

  const nftbTier1Tof = hre.ethers.parseUnits(process.env.NFTB_TIER1_TOF_PRICE || "100000", decimals);
  const nftbTier2Tof = hre.ethers.parseUnits(process.env.NFTB_TIER2_TOF_PRICE || "200000", decimals);
  const nftbTier3Tof = hre.ethers.parseUnits(process.env.NFTB_TIER3_TOF_PRICE || "400000", decimals);

  await (await contract.configureNftbTier(0, nftbTier1Usdt, nftbTier1Tof, 1, 2000, 2000, true)).wait();
  await (await contract.configureNftbTier(0, nftbTier2Usdt, nftbTier2Tof, 2, 2000, 3000, true)).wait();
  await (await contract.configureNftbTier(0, nftbTier3Usdt, nftbTier3Tof, 3, 2000, 4000, true)).wait();
  console.log("NFTB tiers configured (TOF: 100k/200k/400k, quotas 50/50 USDT-TOF)");

  // --- Deploy TOTSwap ---

  const swapContractName = getSwapContractName();
  console.log(`\n--- Deploying ${swapContractName} ---`);

  const TOTSwap = await hre.ethers.getContractFactory(swapContractName);
  const swap = await hre.upgrades.deployProxy(
    TOTSwap,
    [totToken, usdtToken, deployer.address],
    { kind: "uups", initializer: "initialize" }
  );
  await swap.waitForDeployment();

  const swapAddress = await swap.getAddress();
  console.log(`${swapContractName} deployed to:`, swapAddress);

  // Link TOTSwap to DeFiNodeNexus
  const txNexus = await swap.setNexus(deployedAddress);
  await txNexus.wait();
  console.log("TOTSwap → Nexus linked:", deployedAddress);

  // Authorize TOTSwap as a distributor on DeFiNodeNexus
  const txDist = await contract.setDistributor(swapAddress, true);
  await txDist.wait();
  console.log("TOTSwap authorized as distributor on Nexus");

  // Whitelist protocol contracts in TOF (required by non-transferable TOFToken)
  const tof = await hre.ethers.getContractAt("TOFToken", tofToken);
  await (await tof.setWhitelisted(deployedAddress, true)).wait();
  await (await tof.setWhitelisted(swapAddress, true)).wait();
  console.log("TOF whitelist updated: Nexus + TOTSwap");

  const swapV3Config = await maybeConfigureSwapV3(hre, swap, {
    contractName: swapContractName,
    networkName: hre.network.name,
  });
  if (swapContractName === "TOTSwapV3") {
    console.log("\n--- TOTSwapV3 configuration ---");
    console.log("External DEX enabled:", Boolean(swapV3Config.externalDexEnabled));
    console.log("Swap paused:         ", Boolean(swapV3Config.swapPaused));
  }

  // Summary
  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log("DeFiNodeNexus:", deployedAddress);
  console.log(`${swapContractName}:`, swapAddress);
  console.log("TOT token:    ", totToken);
  console.log("TOF token:    ", tofToken);
  console.log("USDT token:   ", usdtToken);
  if (swapV3Config.externalDexEnabled) {
    console.log("\nNOTE: External DEX mode is enabled, so internal pool seeding is skipped.");
  } else {
    console.log("\nNOTE: Owner must call swap.addLiquidity() to seed 6% TOT + USDT into pool.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
