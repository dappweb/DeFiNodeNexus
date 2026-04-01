const hre = require("hardhat");

const { ethers, upgrades, network } = hre;
const DAY = 24 * 60 * 60;

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function expectAnyRevert(action, label) {
  try {
    await action();
    throw new Error(`Expected revert: ${label}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes(`Expected revert: ${label}`)) {
      throw error;
    }
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

async function increaseTime(seconds) {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
}

async function main() {
  const [owner, userA, userB] = await ethers.getSigners();

  console.log("Running Chapter-3 NFTA alignment checks with owner:", owner.address);

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

  // 章节3.1：NFTA 两档
  // 初级：500U，总量10000，日收益 1.3% => 6.5 TOT
  // 高级：1000U，总量5000，日收益 2.0% => 20 TOT
  const juniorPrice = ethers.parseUnits("500", 18);
  const seniorPrice = ethers.parseUnits("1000", 18);
  const juniorDailyYield = ethers.parseUnits("6.5", 18);
  const seniorDailyYield = ethers.parseUnits("20", 18);

  await (await nexus.configureNftaTier(1, juniorPrice, juniorDailyYield, 10_000, true)).wait();
  await (await nexus.configureNftaTier(2, seniorPrice, seniorDailyYield, 5_000, true)).wait();

  const tier1 = await nexus.nftaTiers(1);
  const tier2 = await nexus.nftaTiers(2);
  assertCondition(tier1.price === juniorPrice && tier1.maxSupply === 10_000n, "Tier1 (500U/10000) mismatch");
  assertCondition(tier2.price === seniorPrice && tier2.maxSupply === 5_000n, "Tier2 (1000U/5000) mismatch");

  const tier1YieldBps = (tier1.dailyYield * 10_000n) / tier1.price;
  const tier2YieldBps = (tier2.dailyYield * 10_000n) / tier2.price;
  assertCondition(tier1YieldBps >= 130n && tier1YieldBps <= 200n, "Tier1 daily yield should be within 1.3%-2.0%");
  assertCondition(tier2YieldBps >= 130n && tier2YieldBps <= 200n, "Tier2 daily yield should be within 1.3%-2.0%");

  // 章节3.3：领取手续费默认约70%，可调
  const defaultClaimFeeBps = await nexus.tofClaimFeeBps();
  assertCondition(defaultClaimFeeBps === 7000n, "Default TOF claim fee should be 70%");
  await (await nexus.setTofClaimFeeBps(6500)).wait();
  assertCondition((await nexus.tofClaimFeeBps()) === 6500n, "TOF claim fee should be adjustable");
  await (await nexus.setTofClaimFeeBps(7000)).wait();

  // 购卡准备（userA 买两张，userB 先不买）
  await (await usdt.transfer(userA.address, ethers.parseUnits("2000", 18))).wait();
  await (await usdt.transfer(userB.address, ethers.parseUnits("1000", 18))).wait();

  await (await usdt.connect(userA).approve(await nexus.getAddress(), juniorPrice)).wait();
  await (await nexus.connect(userA).buyNfta(1, ethers.ZeroAddress)).wait();
  await (await usdt.connect(userA).approve(await nexus.getAddress(), seniorPrice)).wait();
  await (await nexus.connect(userA).buyNfta(2, ethers.ZeroAddress)).wait();

  const userANodes = await nexus.getUserNftaNodes(userA.address);
  assertCondition(userANodes.length === 2, "UserA should be able to hold multiple NFTA cards");

  const nodeA0 = await nexus.nftaNodes(userANodes[0]);
  const nodeA1 = await nexus.nftaNodes(userANodes[1]);
  const seniorNodeId = nodeA0.tierId === 2n ? userANodes[0] : userANodes[1];
  const juniorNodeId = nodeA0.tierId === 1n ? userANodes[0] : userANodes[1];

  const pendingBeforeClaim = await nexus.pendingNftaYield(seniorNodeId);
  assertCondition(pendingBeforeClaim === 0n, "Same-day pending should be zero");

  // 次日可领取；若 TOF 不足/未授权则无法领取
  await increaseTime(DAY + 5);
  await expectAnyRevert(
    () => nexus.connect(userA).claimNftaYield(seniorNodeId),
    "claim requires enough TOF"
  );

  // 补足 TOF 后可领取
  await (await tof.setPredictionMinter(owner.address)).wait();
  await (await tof.mintFromPrediction(userA.address, ethers.parseUnits("1000", 18))).wait();
  await (await tof.connect(userA).approve(await nexus.getAddress(), ethers.parseUnits("1000", 18))).wait();

  const pendingBefore = (await nexus.accounts(userA.address)).pendingTot;
  await (await nexus.connect(userA).claimNftaYield(juniorNodeId)).wait();
  const pendingAfter = (await nexus.accounts(userA.address)).pendingTot;
  assertCondition(pendingAfter - pendingBefore === seniorDailyYield, "Multi-card claim should use highest single-card yield");

  // 章节3.4：同日只能领取一次
  await expectAnyRevert(
    () => nexus.connect(userA).claimNftaYield(seniorNodeId),
    "claim once per day"
  );

  // 章节3.5：过期不累计（隔两天后仍仅1天收益）
  await increaseTime(DAY * 2 + 5);
  const pendingAfterSkip = await nexus.pendingNftaYield(seniorNodeId);
  assertCondition(pendingAfterSkip === seniorDailyYield, "Missed days should not accumulate NFTA yield");

  // 新增：可转卡牌，且收益跟随当前最高级持仓变化
  await (await nexus.connect(userA).transferNftaCard(userB.address, seniorNodeId)).wait();

  const userANodesAfterTransfer = await nexus.getUserNftaNodes(userA.address);
  const userBNodesAfterTransfer = await nexus.getUserNftaNodes(userB.address);
  assertCondition(userANodesAfterTransfer.length === 1, "UserA should have one NFTA after transfer");
  assertCondition(userBNodesAfterTransfer.length === 1, "UserB should receive transferred NFTA");

  await increaseTime(DAY + 5);

  await (await tof.mintFromPrediction(userB.address, ethers.parseUnits("1000", 18))).wait();
  await (await tof.connect(userB).approve(await nexus.getAddress(), ethers.parseUnits("1000", 18))).wait();

  const userAPendingBefore2 = (await nexus.accounts(userA.address)).pendingTot;
  await (await nexus.connect(userA).claimAllNftaYield()).wait();
  const userAPendingAfter2 = (await nexus.accounts(userA.address)).pendingTot;
  assertCondition(userAPendingAfter2 - userAPendingBefore2 === juniorDailyYield, "After transfer, userA should claim junior yield only");

  const userBPendingBefore2 = (await nexus.accounts(userB.address)).pendingTot;
  await (await nexus.connect(userB).claimAllNftaYield()).wait();
  const userBPendingAfter2 = (await nexus.accounts(userB.address)).pendingTot;
  assertCondition(userBPendingAfter2 - userBPendingBefore2 === seniorDailyYield, "Transferred owner should claim senior yield");

  console.log("✓ Chapter-3 NFTA business alignment passed");
  console.log("- Tier1:", ethers.formatUnits(tier1.price, 18), "U, supply", tier1.maxSupply.toString(), "daily", ethers.formatUnits(tier1.dailyYield, 18), "TOT");
  console.log("- Tier2:", ethers.formatUnits(tier2.price, 18), "U, supply", tier2.maxSupply.toString(), "daily", ethers.formatUnits(tier2.dailyYield, 18), "TOT");
  console.log("- Multi-card holding: enabled");
  console.log("- Transferable NFTA card: enabled");
  console.log("- Multi-card payout: highest single-card daily yield");
  console.log("- TOF claim fee default/adjustable: enforced");
  console.log("- Claim once/day + missed-day no accumulation: enforced");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
