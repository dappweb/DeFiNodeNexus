const hre = require("hardhat");

/**
 * All-in-one local script: Deploy TOT + USDT + DeFiNodeNexus + TOTSwap,
 * then seed initial liquidity.
 *
 * Usage:
 *   npx hardhat run scripts/init-swap-local.js
 */
async function main() {
  const { ethers, upgrades } = hre;
  const [deployer] = await ethers.getSigners();

  console.log("Deployer:", deployer.address);

  // ── 1. Deploy TOT token ──────────────────────────────────────
  const totMaxSupply     = ethers.parseUnits("1000000000", 18); // 1B
  const totInitialSupply = ethers.parseUnits("1000000000", 18); // mint all to deployer

  const TOTToken = await ethers.getContractFactory("TOTToken");
  const tot = await upgrades.deployProxy(
    TOTToken,
    ["TOT Token", "TOT", totMaxSupply, totInitialSupply, deployer.address],
    { kind: "uups", initializer: "initialize" }
  );
  await tot.waitForDeployment();
  const totAddr = await tot.getAddress();
  console.log("TOT deployed:", totAddr);

  // ── 2. Deploy USDT mock token ────────────────────────────────
  const usdtMaxSupply     = ethers.parseUnits("1000000000", 18);
  const usdtInitialSupply = ethers.parseUnits("1000000000", 18);

  const usdt = await upgrades.deployProxy(
    TOTToken,
    ["USDT Test", "USDT", usdtMaxSupply, usdtInitialSupply, deployer.address],
    { kind: "uups", initializer: "initialize" }
  );
  await usdt.waitForDeployment();
  const usdtAddr = await usdt.getAddress();
  console.log("USDT deployed:", usdtAddr);

  // ── 3. Deploy TOF token ──────────────────────────────────────
  const tofMaxSupply     = ethers.parseUnits("1000000000", 18);
  const tofInitialSupply = ethers.parseUnits("1000000000", 18);

  const tof = await upgrades.deployProxy(
    TOTToken,
    ["TOF Token", "TOF", tofMaxSupply, tofInitialSupply, deployer.address],
    { kind: "uups", initializer: "initialize" }
  );
  await tof.waitForDeployment();
  const tofAddr = await tof.getAddress();
  console.log("TOF deployed:", tofAddr);

  // ── 4. Deploy DeFiNodeNexus ──────────────────────────────────
  const NexusFactory = await ethers.getContractFactory("DeFiNodeNexus");
  const nexus = await upgrades.deployProxy(
    NexusFactory,
    [totAddr, tofAddr, usdtAddr, deployer.address],
    { kind: "uups", initializer: "initialize" }
  );
  await nexus.waitForDeployment();
  const nexusAddr = await nexus.getAddress();
  console.log("DeFiNodeNexus deployed:", nexusAddr);

  // ── 5. Deploy TOTSwap ────────────────────────────────────────
  const SwapFactory = await ethers.getContractFactory("TOTSwap");
  const swap = await upgrades.deployProxy(
    SwapFactory,
    [totAddr, usdtAddr, deployer.address],
    { kind: "uups", initializer: "initialize" }
  );
  await swap.waitForDeployment();
  const swapAddr = await swap.getAddress();
  console.log("TOTSwap deployed:", swapAddr);

  // ── 6. Link Swap ↔ Nexus ─────────────────────────────────────
  await (await swap.setNexus(nexusAddr)).wait();
  await (await nexus.setDistributor(swapAddr, true)).wait();
  console.log("Swap ↔ Nexus linked");

  // ── 7. Seed initial liquidity (6% = 60,000,000 TOT : 60,000,000 USDT) ──
  const seedTot  = ethers.parseUnits("60000000", 18);
  const seedUsdt = ethers.parseUnits("60000000", 18);

  await (await tot.approve(swapAddr, seedTot)).wait();
  await (await usdt.approve(swapAddr, seedUsdt)).wait();
  await (await swap.addLiquidity(seedTot, seedUsdt)).wait();
  console.log("Liquidity seeded: 60,000,000 TOT + 60,000,000 USDT");

  // ── 8. Verify ────────────────────────────────────────────────
  const totReserve  = await swap.totReserve();
  const usdtReserve = await swap.usdtReserve();
  const price       = await swap.getCurrentPrice();

  console.log("\n=== SWAP INITIALIZED ===");
  console.log("TOT reserve: ", ethers.formatUnits(totReserve, 18));
  console.log("USDT reserve:", ethers.formatUnits(usdtReserve, 18));
  console.log("Price:       ", ethers.formatUnits(price, 18), "USDT/TOT");
  console.log("");
  console.log("TOT:            ", totAddr);
  console.log("USDT:           ", usdtAddr);
  console.log("TOF:            ", tofAddr);
  console.log("DeFiNodeNexus:  ", nexusAddr);
  console.log("TOTSwap:        ", swapAddr);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
