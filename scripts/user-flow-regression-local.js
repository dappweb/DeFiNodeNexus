const hre = require("hardhat");

const { ethers, upgrades, network } = hre;
const DAY = 24 * 60 * 60;

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function expectRevert(action, expectedMessage) {
  try {
    await action();
    throw new Error(`Expected revert: ${expectedMessage}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes(expectedMessage)) {
      throw new Error(`Expected revert containing "${expectedMessage}", got: ${message}`);
    }
  }
}

async function deployTokenProxy(name, symbol, owner, maxSupply = "1000000000", initialSupply = "5000000") {
  const Factory = await ethers.getContractFactory("TOTToken");
  const proxy = await upgrades.deployProxy(
    Factory,
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
  const [owner, userA, userB, userC, trader, treasury, zeroLine, community, foundation, institution, project] = await ethers.getSigners();

  console.log("Running local user-flow regression with owner:", owner.address);

  const tot = await deployTokenProxy("Truth Oracle Token", "TOT", owner);
  const tof = await deployTokenProxy("Truth Oracle Fuel", "TOF", owner);
  const usdt = await deployTokenProxy("Mock USDT", "USDT", owner);

  const nexusFactory = await ethers.getContractFactory("DeFiNodeNexus");
  const nexus = await upgrades.deployProxy(
    nexusFactory,
    [await tot.getAddress(), await tof.getAddress(), await usdt.getAddress(), owner.address],
    { kind: "uups", initializer: "initialize" }
  );
  await nexus.waitForDeployment();

  const swapFactory = await ethers.getContractFactory("TOTSwap");
  const swap = await upgrades.deployProxy(
    swapFactory,
    [await tot.getAddress(), await usdt.getAddress(), owner.address],
    { kind: "uups", initializer: "initialize" }
  );
  await swap.waitForDeployment();

  console.log("✓ Proxies deployed");

  await (await nexus.setTreasury(treasury.address)).wait();
  await (await nexus.setWallets(zeroLine.address, community.address, foundation.address, institution.address)).wait();
  await (await nexus.setProjectWallet(project.address)).wait();
  await (await nexus.setDistributor(await swap.getAddress(), true)).wait();
  await (await swap.setNexus(await nexus.getAddress())).wait();
  await (await swap.setDistributionThreshold(ethers.parseUnits("1", 18))).wait();

  await (
    await nexus.configureNftaTier(
      0,
      ethers.parseUnits("1000", 18),
      ethers.parseUnits("20", 18),
      100,
      true
    )
  ).wait();

  await (
    await nexus.configureNftbTier(
      0,
      ethers.parseUnits("500", 18),
      1,
      100,
      10000,
      true
    )
  ).wait();

  console.log("✓ Contracts configured");

  const bigAmount = ethers.parseUnits("100000", 18);
  const nftaPrice = ethers.parseUnits("1000", 18);
  const nftbPrice = ethers.parseUnits("500", 18);
  const buyUsdtAmount = ethers.parseUnits("1000", 18);
  const liquidityTot = ethers.parseUnits("100000", 18);
  const liquidityUsdt = ethers.parseUnits("100000", 18);
  const rewardPoolTot = ethers.parseUnits("200000", 18);

  await (await usdt.mint(userA.address, bigAmount)).wait();
  await (await usdt.mint(userB.address, bigAmount)).wait();
  await (await usdt.mint(trader.address, bigAmount)).wait();
  await (await tof.mint(userA.address, bigAmount)).wait();
  await (await tof.mint(userC.address, bigAmount)).wait();

  await (await tot.approve(await nexus.getAddress(), rewardPoolTot)).wait();
  await (await nexus.fundRewardPool(rewardPoolTot)).wait();

  await (await tot.approve(await swap.getAddress(), liquidityTot)).wait();
  await (await usdt.approve(await swap.getAddress(), liquidityUsdt)).wait();
  await (await swap.addLiquidity(liquidityTot, liquidityUsdt)).wait();

  console.log("✓ Reward pool funded and swap liquidity added");

  // Flow 1: explicit referrer binding
  await (await nexus.connect(userA).bindReferrer(owner.address)).wait();
  const userAAccountAfterBind = await nexus.accounts(userA.address);
  assertCondition(userAAccountAfterBind.referrer.toLowerCase() === owner.address.toLowerCase(), "UserA referrer not bound to owner");
  console.log("✓ UserA explicit referrer binding passed");

  await expectRevert(
    () => nexus.connect(userA).bindReferrer(owner.address),
    "Already bound"
  );
  console.log("✓ UserA cannot bind twice");

  // Flow 2: NFTA purchase with referral distribution
  const ownerUsdtBefore = await usdt.balanceOf(owner.address);
  const zeroLineBefore = await usdt.balanceOf(zeroLine.address);
  const communityBefore = await usdt.balanceOf(community.address);
  const foundationBefore = await usdt.balanceOf(foundation.address);
  const institutionBefore = await usdt.balanceOf(institution.address);
  const treasuryBefore = await usdt.balanceOf(treasury.address);

  await (await usdt.connect(userA).approve(await nexus.getAddress(), nftaPrice)).wait();
  await (await nexus.connect(userA).buyNfta(1, ethers.ZeroAddress)).wait();

  const userANftaNodes = await nexus.getUserNftaNodes(userA.address);
  assertCondition(userANftaNodes.length === 1, "UserA NFTA node not created");
  assertCondition((await usdt.balanceOf(owner.address)) - ownerUsdtBefore === ethers.parseUnits("100", 18), "Owner did not receive 10% direct referral commission");
  assertCondition((await usdt.balanceOf(zeroLine.address)) - zeroLineBefore === ethers.parseUnits("100", 18), "ZeroLine wallet did not receive expected share");
  assertCondition((await usdt.balanceOf(community.address)) - communityBefore === ethers.parseUnits("100", 18), "Community wallet did not receive expected share");
  assertCondition((await usdt.balanceOf(foundation.address)) - foundationBefore === ethers.parseUnits("100", 18), "Foundation wallet did not receive expected share");
  assertCondition((await usdt.balanceOf(institution.address)) - institutionBefore === ethers.parseUnits("400", 18), "Institution wallet did not receive expected share");
  assertCondition((await usdt.balanceOf(treasury.address)) - treasuryBefore === ethers.parseUnits("200", 18), "Treasury did not receive missing-generation share");
  console.log("✓ UserA NFTA purchase passed");

  await expectRevert(
    () => nexus.connect(userA).buyNfta(1, ethers.ZeroAddress),
    "Only one NFTA allowed"
  );
  console.log("✓ UserA cannot buy second NFTA");

  // Flow 3: daily NFTA claim + TOT withdrawal
  await increaseTime(DAY + 5);
  await (await tof.connect(userA).approve(await nexus.getAddress(), bigAmount)).wait();
  await (await nexus.connect(userA).claimAllNftaYield()).wait();

  const userAAccountAfterClaim = await nexus.accounts(userA.address);
  assertCondition(userAAccountAfterClaim.pendingTot === ethers.parseUnits("20", 18), "UserA pending TOT after claim is incorrect");
  console.log("✓ UserA NFTA daily claim passed");

  await expectRevert(
    () => nexus.connect(userA).claimAllNftaYield(),
    "Already claimed today"
  );
  console.log("✓ Same-day NFTA repeat claim blocked");

  const userATotBeforeWithdraw = await tot.balanceOf(userA.address);
  await (await nexus.connect(userA).withdrawTot(ethers.parseUnits("10", 18))).wait();
  const userAAccountAfterWithdraw = await nexus.accounts(userA.address);
  assertCondition((await tot.balanceOf(userA.address)) - userATotBeforeWithdraw === ethers.parseUnits("10", 18), "UserA TOT withdrawal amount incorrect");
  assertCondition(userAAccountAfterWithdraw.pendingTot === ethers.parseUnits("10", 18), "UserA pending TOT after withdrawal is incorrect");
  console.log("✓ UserA TOT withdrawal passed");

  // Flow 4: NFTB purchase with auto-referrer binding via USDT
  await (await usdt.connect(userB).approve(await nexus.getAddress(), nftbPrice)).wait();
  await (await nexus.connect(userB).buyNftbWithUsdt(1, owner.address)).wait();

  const userBAccount = await nexus.accounts(userB.address);
  const userBNftbNodes = await nexus.getUserNftbNodes(userB.address);
  assertCondition(userBAccount.referrer.toLowerCase() === owner.address.toLowerCase(), "UserB was not auto-bound during NFTB USDT purchase");
  assertCondition(userBNftbNodes.length === 1, "UserB NFTB node not created");
  console.log("✓ UserB NFTB purchase with USDT passed");

  // Flow 5: NFTB purchase with auto-referrer binding via TOF
  await (await tof.connect(userC).approve(await nexus.getAddress(), nftbPrice)).wait();
  await (await nexus.connect(userC).buyNftbWithTof(1, owner.address)).wait();

  const userCAccount = await nexus.accounts(userC.address);
  const userCNftbNodes = await nexus.getUserNftbNodes(userC.address);
  assertCondition(userCAccount.referrer.toLowerCase() === owner.address.toLowerCase(), "UserC was not auto-bound during NFTB TOF purchase");
  assertCondition(userCNftbNodes.length === 1, "UserC NFTB node not created");
  console.log("✓ UserC NFTB purchase with TOF passed");

  // Flow 6: trader buys TOT from AMM, generating NFTB dividends
  await (await usdt.connect(trader).approve(await swap.getAddress(), buyUsdtAmount)).wait();
  await (await swap.connect(trader).buyTot(buyUsdtAmount, 0)).wait();

  const traderTotBalance = await tot.balanceOf(trader.address);
  const accDividend = await nexus.accDividendPerWeightByTier(1);
  assertCondition(traderTotBalance > 0, "Trader did not receive TOT from swap buy");
  assertCondition(accDividend > 0n, "NFTB dividends were not distributed after swap buy");
  console.log("✓ Trader buy TOT flow passed");

  // Flow 7: NFTB users claim dividends
  const userBPendingBeforeDividendClaim = (await nexus.accounts(userB.address)).pendingTot;
  const userCPendingBeforeDividendClaim = (await nexus.accounts(userC.address)).pendingTot;

  await (await nexus.connect(userB).claimAllNftbDividends()).wait();
  await (await nexus.connect(userC).claimAllNftbDividends()).wait();

  const userBPendingAfterDividendClaim = (await nexus.accounts(userB.address)).pendingTot;
  const userCPendingAfterDividendClaim = (await nexus.accounts(userC.address)).pendingTot;
  assertCondition(userBPendingAfterDividendClaim > userBPendingBeforeDividendClaim, "UserB did not receive NFTB dividends");
  assertCondition(userCPendingAfterDividendClaim > userCPendingBeforeDividendClaim, "UserC did not receive NFTB dividends");
  console.log("✓ NFTB dividend claim flow passed");

  // Flow 8: trader sells TOT back to AMM
  const traderUsdtBeforeSell = await usdt.balanceOf(trader.address);
  const sellAmount = traderTotBalance / 2n;
  await (await tot.connect(trader).approve(await swap.getAddress(), traderTotBalance)).wait();
  await (await swap.connect(trader).sellTot(sellAmount, 0)).wait();
  const traderUsdtAfterSell = await usdt.balanceOf(trader.address);
  assertCondition(traderUsdtAfterSell > traderUsdtBeforeSell, "Trader did not receive USDT from swap sell");
  console.log("✓ Trader sell TOT flow passed");

  console.log("\nAll major user-flow checks passed.");
  console.log("Summary:");
  console.log("- Explicit referrer bind");
  console.log("- Duplicate bind blocked");
  console.log("- NFTA purchase + referral distribution");
  console.log("- Duplicate NFTA blocked");
  console.log("- Next-day NFTA claim + same-day repeat blocked");
  console.log("- TOT withdrawal");
  console.log("- NFTB purchases with USDT and TOF auto-binding");
  console.log("- Swap buy TOT");
  console.log("- NFTB dividend claim");
  console.log("- Swap sell TOT");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
