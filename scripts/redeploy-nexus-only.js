const hre = require("hardhat");

async function main() {
  const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const ownerPrivateKey = process.env.OWNER_PRIVATE_KEY || deployerPrivateKey;
  const totToken = process.env.TOT_TOKEN_ADDRESS;
  const tofToken = process.env.TOF_TOKEN_ADDRESS;
  const usdtToken = process.env.USDT_TOKEN_ADDRESS;
  const swapAddress = process.env.SWAP_ADDRESS;

  if (!deployerPrivateKey) throw new Error("Missing DEPLOYER_PRIVATE_KEY");
  if (!totToken || !tofToken || !usdtToken) throw new Error("Missing token addresses in .env");

  const [deployer] = await hre.ethers.getSigners();
  let owner = deployer;
  if (ownerPrivateKey && ownerPrivateKey !== deployerPrivateKey) {
    owner = new hre.ethers.Wallet(ownerPrivateKey, hre.ethers.provider);
  }

  console.log("Deploying new Nexus proxy...");
  console.log("Deployer:", deployer.address);
  console.log("Owner:", owner.address);
  console.log("TOT:", totToken);
  console.log("TOF:", tofToken);
  console.log("USDT:", usdtToken);

  const NexusFactory = await hre.ethers.getContractFactory("DeFiNodeNexus", deployer);
  const nexus = await hre.upgrades.deployProxy(
    NexusFactory,
    [totToken, tofToken, usdtToken, owner.address],
    { kind: "uups", initializer: "initialize" }
  );
  await nexus.waitForDeployment();
  const nexusAddress = await nexus.getAddress();
  console.log("New NEXUS_ADDRESS=", nexusAddress);

  // Optional wallet setup from env
  const zeroLine = process.env.ZERO_LINE_WALLET;
  const community = process.env.COMMUNITY_WALLET;
  const foundation = process.env.FOUNDATION_WALLET;
  const institution = process.env.INSTITUTION_WALLET;
  if (zeroLine && community && foundation && institution) {
    await (await nexus.connect(owner).setWallets(zeroLine, community, foundation, institution)).wait();
    console.log("Wallets configured from env.");
  }

  // Configure default NFTA tiers
  const decimals = 18;
  const tier1Price = hre.ethers.parseUnits("500", decimals);
  const tier1Yield = (tier1Price * 13n) / 1000n;
  const tier2Price = hre.ethers.parseUnits("1000", decimals);
  const tier2Yield = (tier2Price * 20n) / 1000n;
  await (await nexus.connect(owner).configureNftaTier(1, tier1Price, tier1Yield, 10000, true)).wait();
  await (await nexus.connect(owner).configureNftaTier(2, tier2Price, tier2Yield, 5000, true)).wait();
  console.log("NFTA tiers configured.");

  // Configure default NFTB tiers
  const nftbTier1Usdt = hre.ethers.parseUnits(process.env.NFTB_TIER1_USDT_PRICE || "500", decimals);
  const nftbTier2Usdt = hre.ethers.parseUnits(process.env.NFTB_TIER2_USDT_PRICE || "1000", decimals);
  const nftbTier3Usdt = hre.ethers.parseUnits(process.env.NFTB_TIER3_USDT_PRICE || "2000", decimals);
  await (await nexus.connect(owner).configureNftbTier(1, nftbTier1Usdt, 1, 2000, 2000, true)).wait();
  await (await nexus.connect(owner).configureNftbTier(2, nftbTier2Usdt, 2, 2000, 3000, true)).wait();
  await (await nexus.connect(owner).configureNftbTier(3, nftbTier3Usdt, 3, 2000, 4000, true)).wait();
  console.log("NFTB tiers configured.");

  // Link existing swap to new nexus
  if (swapAddress) {
    const swap = await hre.ethers.getContractAt("TOTSwap", swapAddress, owner);
    await (await swap.setNexus(nexusAddress)).wait();
    console.log("Existing swap linked to new nexus:", swapAddress);

    await (await nexus.connect(owner).setDistributor(swapAddress, true)).wait();
    console.log("Swap authorized as distributor on new nexus.");
  }

  // TOF whitelist updates (best effort)
  try {
    const tof = await hre.ethers.getContractAt("TOFToken", tofToken, owner);
    await (await tof.setTransferWhitelist(nexusAddress, true)).wait();
    if (swapAddress) {
      await (await tof.setTransferWhitelist(swapAddress, true)).wait();
    }
    console.log("TOF whitelist updated for Nexus/Swap.");
  } catch (err) {
    console.warn("TOF whitelist update skipped:", err?.message || err);
  }

  console.log("\n=== DONE ===");
  console.log("NEXUS_ADDRESS=" + nexusAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
