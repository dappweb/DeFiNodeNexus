const hre = require("hardhat");

async function main() {
  const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const ownerPrivateKey = process.env.OWNER_PRIVATE_KEY || deployerPrivateKey;
  const rpcUrl = process.env.CNC_RPC_URL;
  const totToken = process.env.CNC_TOT_TOKEN_ADDRESS;
  const tofToken = process.env.CNC_TOF_TOKEN_ADDRESS;
  const usdtToken = process.env.CNC_USDT_TOKEN_ADDRESS;
  const zeroAddress = "0x0000000000000000000000000000000000000000";

  if (!deployerPrivateKey) {
    throw new Error("Missing DEPLOYER_PRIVATE_KEY in .env");
  }
  if (!rpcUrl) {
    throw new Error("Missing CNC_RPC_URL in .env");
  }
  if (!totToken || !tofToken || !usdtToken) {
    throw new Error("Missing CNC_TOT_TOKEN_ADDRESS, CNC_TOF_TOKEN_ADDRESS or CNC_USDT_TOKEN_ADDRESS in .env");
  }
  if (totToken === zeroAddress || tofToken === zeroAddress || usdtToken === zeroAddress) {
    throw new Error("CNC_TOT_TOKEN_ADDRESS, CNC_TOF_TOKEN_ADDRESS and CNC_USDT_TOKEN_ADDRESS must be real deployed token addresses");
  }

  // Get signer accounts
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0]; // First account (from private key)
  
  // Determine the owner account
  let owner = deployer;
  if (ownerPrivateKey && ownerPrivateKey !== deployerPrivateKey) {
    // If OWNER_PRIVATE_KEY is different, create a new signer
    owner = new hre.ethers.Wallet(ownerPrivateKey, hre.ethers.provider);
  }

  console.log("Deploying to CNC Chain");
  console.log("Network:", await hre.ethers.provider.getNetwork());
  console.log("Deployer account:", deployer.address);
  console.log("Owner account:    ", owner.address);
  console.log("TOT token:", totToken);
  console.log("TOF token:", tofToken);
  console.log("USDT token:", usdtToken);

  // --- Deploy DeFiNodeNexus ---
  console.log("\n--- Deploying DeFiNodeNexus ---");

  const DeFiNodeNexus = await hre.ethers.getContractFactory("DeFiNodeNexus", deployer);
  const contract = await hre.upgrades.deployProxy(
    DeFiNodeNexus,
    [totToken, tofToken, usdtToken, owner.address],
    { kind: "uups", initializer: "initialize" }
  );
  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  console.log("DeFiNodeNexus deployed to:", deployedAddress);

  // Whitelist DeFiNodeNexus in TOF token
  console.log("\n--- Configuring TOF whitelist ---");
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
  console.log("\n--- Configuring NFTA Tiers ---");
  const decimals = 18;

  const tier1Price = hre.ethers.parseUnits("500", decimals);
  const tier1Yield = tier1Price * 13n / 1000n; // 1.3% daily
  const tx1 = await contract.configureNftaTier(0, tier1Price, tier1Yield, 10000, true);
  await tx1.wait();
  console.log("NFTA Tier 1 configured: 500 USDT, 1.3%/day, max 10000");

  const tier2Price = hre.ethers.parseUnits("1000", decimals);
  const tier2Yield = tier2Price * 20n / 1000n; // 2.0% daily
  const tx2 = await contract.configureNftaTier(1, tier2Price, tier2Yield, 5000, true);
  await tx2.wait();
  console.log("NFTA Tier 2 configured: 1000 USDT, 2.0%/day, max 5000");

  // Configure default NFTB tiers (USDT + TOF dual pricing)
  // TOF pricing defaults: 100k / 200k / 400k TOF
  console.log("\n--- Configuring NFTB Tiers ---");
  const nftbTier1Usdt = hre.ethers.parseUnits(process.env.NFTB_TIER1_USDT_PRICE || "500", decimals);
  const nftbTier2Usdt = hre.ethers.parseUnits(process.env.NFTB_TIER2_USDT_PRICE || "1000", decimals);
  const nftbTier3Usdt = hre.ethers.parseUnits(process.env.NFTB_TIER3_USDT_PRICE || "2000", decimals);

  const nftbTier1Tof = hre.ethers.parseUnits(process.env.NFTB_TIER1_TOF_PRICE || "100000", decimals);
  const nftbTier2Tof = hre.ethers.parseUnits(process.env.NFTB_TIER2_TOF_PRICE || "200000", decimals);
  const nftbTier3Tof = hre.ethers.parseUnits(process.env.NFTB_TIER3_TOF_PRICE || "400000", decimals);

  await (await contract.configureNftbTier(0, nftbTier1Usdt, nftbTier1Tof, 1, 2000, 2000, true)).wait();
  await (await contract.configureNftbTier(1, nftbTier2Usdt, nftbTier2Tof, 2, 2000, 3000, true)).wait();
  await (await contract.configureNftbTier(2, nftbTier3Usdt, nftbTier3Tof, 3, 2000, 4000, true)).wait();
  console.log("NFTB Tier 1 configured: 500 USDT / 100k TOF, quotas 50/50");
  console.log("NFTB Tier 2 configured: 1000 USDT / 200k TOF, quotas 50/50");
  console.log("NFTB Tier 3 configured: 2000 USDT / 400k TOF, quotas 50/50");

  // --- Deploy TOTSwap ---
  console.log("\n--- Deploying TOTSwap ---");

  const TOTSwap = await hre.ethers.getContractFactory("TOTSwap", deployer);
  const swap = await hre.upgrades.deployProxy(
    TOTSwap,
    [totToken, usdtToken, owner.address],
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

  // Whitelist protocol contracts in TOF
  const tof = await hre.ethers.getContractAt("TOFToken", tofToken);
  await (await tof.setWhitelisted(deployedAddress, true)).wait();
  await (await tof.setWhitelisted(swapAddress, true)).wait();
  console.log("TOF whitelist updated: Nexus + TOTSwap");

  // --- Summary ---
  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log("Network:       CNC Chain (50716)");
  console.log("DeFiNodeNexus: ", deployedAddress);
  console.log("TOTSwap:       ", swapAddress);
  console.log("TOT token:     ", totToken);
  console.log("TOF token:     ", tofToken);
  console.log("USDT token:    ", usdtToken);
  console.log("\nNOTE: Owner must call swap.addLiquidity() to seed 6% TOT + USDT into pool.");

  // Update .env with deployed addresses
  console.log("\n--- Update .env with deployed addresses ---");
  console.log("CNC_NEXUS_ADDRESS=" + deployedAddress);
  console.log("CNC_SWAP_ADDRESS=" + swapAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
