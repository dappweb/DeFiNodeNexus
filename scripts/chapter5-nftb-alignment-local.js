const hre = require("hardhat");

const { ethers, upgrades } = hre;

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function deployTokenProxy(contractName, name, symbol, owner, maxSupply = "1000000000", initialSupply = "1000000000") {
  const factory = await ethers.getContractFactory(contractName);
  const proxy = await upgrades.deployProxy(
    factory,
    [
      name,
      symbol,
      ethers.parseUnits(maxSupply, 18),
      ethers.parseUnits(initialSupply, 18),
      owner.address,
    ],
    { kind: "uups", initializer: "initialize" }
  );
  await proxy.waitForDeployment();
  return proxy;
}

async function main() {
  const [owner, userA, userB, userC, treasury, project] = await ethers.getSigners();

  console.log("Running Chapter-5 NFTB alignment checks with owner:", owner.address);

  const tot = await deployTokenProxy("TOTToken", "Truth Oracle Token", "TOT", owner);
  const tof = await deployTokenProxy("TOFToken", "Truth Oracle Fuel", "TOF", owner, "10000000000", "0");
  const usdt = await deployTokenProxy("TOTToken", "Mock USDT", "USDT", owner);

  const nexusFactory = await ethers.getContractFactory("DeFiNodeNexus");
  const nexus = await upgrades.deployProxy(
    nexusFactory,
    [await tot.getAddress(), await tof.getAddress(), await usdt.getAddress(), owner.address],
    { kind: "uups", initializer: "initialize" }
  );
  await nexus.waitForDeployment();

  await (await tof.setTransferWhitelist(await nexus.getAddress(), true)).wait();
  await (await nexus.setTreasury(treasury.address)).wait();
  await (await nexus.setProjectWallet(project.address)).wait();

  // Chapter 5.1: NFTB fixed tiers (500U/1000U/2000U, each max 2000)
  await (await nexus.configureNftbTier(0, ethers.parseUnits("500", 18), ethers.parseUnits("500", 18), 2000, 2000, true)).wait();
  await (await nexus.configureNftbTier(0, ethers.parseUnits("1000", 18), ethers.parseUnits("1000", 18), 2000, 3000, true)).wait();
  await (await nexus.configureNftbTier(0, ethers.parseUnits("2000", 18), ethers.parseUnits("2000", 18), 2000, 4000, true)).wait();

  const tier1 = await nexus.nftbTiers(1);
  const tier2 = await nexus.nftbTiers(2);
  const tier3 = await nexus.nftbTiers(3);

  assertCondition(tier1.price === ethers.parseUnits("500", 18) && tier1.maxSupply === 2000n, "Tier1 mismatch");
  assertCondition(tier2.price === ethers.parseUnits("1000", 18) && tier2.maxSupply === 2000n, "Tier2 mismatch");
  assertCondition(tier3.price === ethers.parseUnits("2000", 18) && tier3.maxSupply === 2000n, "Tier3 mismatch");

  // Chapter 5.2: 50%/50% (USDT/TOF quota)
  const [tier1UsdtRemain, tier1TofRemain] = await nexus.getNftbTierRemaining(1);
  assertCondition(tier1UsdtRemain === 1000n && tier1TofRemain === 1000n, "Tier1 should start with 1000/1000 quota");

  // Mint test funds
  await (await usdt.transfer(userA.address, ethers.parseUnits("1000", 18))).wait();
  await (await usdt.transfer(userB.address, ethers.parseUnits("2000", 18))).wait();

  await (await tof.setPredictionMinter(owner.address)).wait();
  await (await tof.mintFromPrediction(userC.address, ethers.parseUnits("500000", 18))).wait();

  await (await usdt.connect(userA).approve(await nexus.getAddress(), ethers.parseUnits("500", 18))).wait();
  await (await nexus.connect(userA).buyNftbWithUsdt(1, owner.address)).wait();

  await (await usdt.connect(userB).approve(await nexus.getAddress(), ethers.parseUnits("1000", 18))).wait();
  await (await nexus.connect(userB).buyNftbWithUsdt(2, owner.address)).wait();

  const tier3TofCost = await nexus.tofPerUsdt();
  const tofNeedForTier3 = (ethers.parseUnits("2000", 18) * tier3TofCost) / ethers.parseUnits("1", 18);
  await (await tof.connect(userC).approve(await nexus.getAddress(), tofNeedForTier3)).wait();
  await (await nexus.connect(userC).buyNftbWithTof(3, owner.address)).wait();

  const [tier1UsdtAfter, tier1TofAfter] = await nexus.getNftbTierRemaining(1);
  assertCondition(tier1UsdtAfter === 999n && tier1TofAfter === 1000n, "Tier1 quota decrease mismatch after USDT buy");

  // Chapter 5.3: weighted dividends 20/30/40 + 10% project wallet
  const nodeA = (await nexus.getUserNftbNodes(userA.address))[0];
  const nodeB = (await nexus.getUserNftbNodes(userB.address))[0];
  const nodeC = (await nexus.getUserNftbNodes(userC.address))[0];

  const projectTotBefore = await tot.balanceOf(project.address);
  await (await tot.approve(await nexus.getAddress(), ethers.parseUnits("10000", 18))).wait();
  await (await nexus.distributeNftbDividends(ethers.parseUnits("10000", 18))).wait();

  const projectTotAfter = await tot.balanceOf(project.address);
  assertCondition(projectTotAfter - projectTotBefore === ethers.parseUnits("1000", 18), "Project wallet should receive 10% TOT");

  const pendingTotA = await nexus.pendingNftbDividend(nodeA);
  const pendingTotB = await nexus.pendingNftbDividend(nodeB);
  const pendingTotC = await nexus.pendingNftbDividend(nodeC);
  assertCondition(pendingTotA === ethers.parseUnits("2000", 18), "Tier1 should receive 20% TOT");
  assertCondition(pendingTotB === ethers.parseUnits("3000", 18), "Tier2 should receive 30% TOT");
  assertCondition(pendingTotC === ethers.parseUnits("4000", 18), "Tier3 should receive 40% TOT");

  // Profit-tax USDT dividends 20/30/40 + 10% project wallet
  const projectUsdtBefore = await usdt.balanceOf(project.address);
  await (await usdt.approve(await nexus.getAddress(), ethers.parseUnits("10000", 18))).wait();
  await (await nexus.distributeNftbUsdtDividends(ethers.parseUnits("10000", 18))).wait();

  const projectUsdtAfter = await usdt.balanceOf(project.address);
  assertCondition(projectUsdtAfter - projectUsdtBefore === ethers.parseUnits("1000", 18), "Project wallet should receive 10% USDT");

  const pendingUsdtA = await nexus.pendingNftbUsdtDividend(nodeA);
  const pendingUsdtB = await nexus.pendingNftbUsdtDividend(nodeB);
  const pendingUsdtC = await nexus.pendingNftbUsdtDividend(nodeC);
  assertCondition(pendingUsdtA === ethers.parseUnits("2000", 18), "Tier1 should receive 20% USDT");
  assertCondition(pendingUsdtB === ethers.parseUnits("3000", 18), "Tier2 should receive 30% USDT");
  assertCondition(pendingUsdtC === ethers.parseUnits("4000", 18), "Tier3 should receive 40% USDT");

  // Prediction-flow channel: default 0.4%/0.5%/0.6%
  const flowAmount = ethers.parseUnits("1000000", 18);
  await (await usdt.approve(await nexus.getAddress(), flowAmount)).wait();
  await (await nexus.distributePredictionFlowUsdt(flowAmount)).wait();

  const pendingUsdtA2 = await nexus.pendingNftbUsdtDividend(nodeA);
  const pendingUsdtB2 = await nexus.pendingNftbUsdtDividend(nodeB);
  const pendingUsdtC2 = await nexus.pendingNftbUsdtDividend(nodeC);

  assertCondition(pendingUsdtA2 - pendingUsdtA === ethers.parseUnits("4000", 18), "Tier1 prediction flow share should be 0.4%");
  assertCondition(pendingUsdtB2 - pendingUsdtB === ethers.parseUnits("5000", 18), "Tier2 prediction flow share should be 0.5%");
  assertCondition(pendingUsdtC2 - pendingUsdtC === ethers.parseUnits("6000", 18), "Tier3 prediction flow share should be 0.6%");

  console.log("✓ Chapter-5 NFTB business alignment passed");
  console.log("- Tier setup: 500U/1000U/2000U, each 2000 supply");
  console.log("- 50/50 channel quota: USDT 1000 + TOF 1000 (per tier at start)");
  console.log("- Dividend split: Project 10% + Tier 20/30/40");
  console.log("- Prediction flow split: 0.4% / 0.5% / 0.6% (USDT)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
