const hre = require("hardhat");
const { getSwapContractName, maybeConfigureSwapV3 } = require("./lib/swap-v3");

/**
 * Deploy & initialise TOTSwap on Sepolia.
 *
 * Prerequisites:
 *   - TOT_TOKEN_ADDRESS  : deployed TOT proxy
 *   - USDT_TOKEN_ADDRESS : deployed USDT proxy
 *
 * Optional (post-deploy configuration):
 *   - NEXUS_ADDRESS      : link swap ↔ DeFiNodeNexus & authorize distributor
 *   - SWAP_SEED_TOT      : TOT liquidity to seed (default: 60,000,000 = 6%)
 *   - SWAP_SEED_USDT     : USDT liquidity to seed (default: 60,000,000)
 *
 * Usage:
 *   npx hardhat run scripts/deploy-swap-sepolia.js --network sepolia
 */
async function main() {
  // ── validate env ──────────────────────────────────────────────
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const totToken = process.env.TOT_TOKEN_ADDRESS;
  const usdtToken = process.env.USDT_TOKEN_ADDRESS;
  const nexusAddress = process.env.NEXUS_ADDRESS || "";
  const zeroAddress = "0x0000000000000000000000000000000000000000";

  if (!privateKey) throw new Error("Missing DEPLOYER_PRIVATE_KEY in .env");
  if (!rpcUrl) throw new Error("Missing SEPOLIA_RPC_URL in .env");
  if (!totToken || totToken === zeroAddress) throw new Error("Missing or zero TOT_TOKEN_ADDRESS in .env");
  if (!usdtToken || usdtToken === zeroAddress) throw new Error("Missing or zero USDT_TOKEN_ADDRESS in .env");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("TOT token:", totToken);
  console.log("USDT token:", usdtToken);

  // ── 1. Deploy TOTSwap proxy ───────────────────────────────────
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

  // ── 2. Link to DeFiNodeNexus (optional) ───────────────────────
  if (nexusAddress && nexusAddress !== zeroAddress) {
    console.log("\n--- Linking TOTSwap ↔ DeFiNodeNexus ---");

    // swap.setNexus
    const txNexus = await swap.setNexus(nexusAddress);
    await txNexus.wait();
    console.log("TOTSwap → Nexus linked:", nexusAddress);

    // nexus.setDistributor(swapAddress, true)
    const nexusContract = await hre.ethers.getContractAt("DeFiNodeNexus", nexusAddress);
    const txDist = await nexusContract.setDistributor(swapAddress, true);
    await txDist.wait();
    console.log("TOTSwap authorized as distributor on Nexus");
  } else {
    console.log("\nNEXUS_ADDRESS not set – skipping Nexus link. Set it later:");
    console.log("  swap.setNexus(<nexus>)");
    console.log("  nexus.setDistributor(<swap>, true)");
  }

  const swapV3Config = await maybeConfigureSwapV3(hre, swap, {
    contractName: swapContractName,
    networkName: hre.network.name,
  });
  if (swapContractName === "TOTSwapV3") {
    console.log("\n--- TOTSwapV3 configuration ---");
    console.log("External DEX enabled:", Boolean(swapV3Config.externalDexEnabled));
    console.log("Swap paused:         ", Boolean(swapV3Config.swapPaused));
  }

  // ── 3. Seed initial liquidity (optional) ──────────────────────
  const seedTotRaw = process.env.SWAP_SEED_TOT || "";
  const seedUsdtRaw = process.env.SWAP_SEED_USDT || "";

  if (seedTotRaw && seedUsdtRaw && !swapV3Config.externalDexEnabled) {
    const seedTot = hre.ethers.parseUnits(seedTotRaw, 18);
    const seedUsdt = hre.ethers.parseUnits(seedUsdtRaw, 18);

    console.log("\n--- Seeding liquidity ---");
    console.log("TOT:", seedTotRaw);
    console.log("USDT:", seedUsdtRaw);

    const totContract = await hre.ethers.getContractAt("IERC20", totToken);
    const usdtContract = await hre.ethers.getContractAt("IERC20", usdtToken);

    // approve
    const txApproveTot = await totContract.approve(swapAddress, seedTot);
    await txApproveTot.wait();
    console.log("TOT approved");

    const txApproveUsdt = await usdtContract.approve(swapAddress, seedUsdt);
    await txApproveUsdt.wait();
    console.log("USDT approved");

    // addLiquidity
    const txLiq = await swap.addLiquidity(seedTot, seedUsdt);
    await txLiq.wait();
    console.log("Liquidity added ✓");
  } else if (swapV3Config.externalDexEnabled) {
    console.log("\nExternal DEX mode enabled – skipping internal liquidity seeding.");
  } else {
    console.log("\nSWAP_SEED_TOT / SWAP_SEED_USDT not set – skipping liquidity seeding.");
    console.log("Seed manually later:");
    console.log("  tot.approve(<swap>, amount)");
    console.log("  usdt.approve(<swap>, amount)");
    console.log("  swap.addLiquidity(totAmount, usdtAmount)");
  }

  // ── Summary ───────────────────────────────────────────────────
  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log(`${swapContractName}:`, swapAddress);
  console.log("TOT token:    ", totToken);
  console.log("USDT token:   ", usdtToken);
  if (nexusAddress && nexusAddress !== zeroAddress) {
    console.log("Nexus linked: ", nexusAddress);
  }
  console.log("\nAdd to .env:");
  console.log(`SWAP_ADDRESS=${swapAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
