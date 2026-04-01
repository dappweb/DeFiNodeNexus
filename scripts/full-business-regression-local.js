const hre = require("hardhat");

const { ethers, upgrades, network } = hre;
const DAY = 24 * 60 * 60;
const FOUR_HOURS = 4 * 60 * 60;

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function expectRevert(action, label) {
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

async function increaseTime(seconds) {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
}

async function deployTokenProxy(contractName, name, symbol, owner, maxSupply = "1000000000", initialSupply = "10000000") {
  const TokenFactory = await ethers.getContractFactory(contractName);
  const proxy = await upgrades.deployProxy(
    TokenFactory,
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
  const [
    owner,
    userA,
    userB,
    userC,
    userD,
    userE,
    userF,
    trader,
    treasury,
    zeroLine,
    community,
    foundation,
    institution,
    project,
  ] = await ethers.getSigners();

  console.log("Running FULL local business regression with owner:", owner.address);

  const tot = await deployTokenProxy("TOTToken", "Truth Oracle Token", "TOT", owner, "1000000000", "1000000000");
  const tof = await deployTokenProxy("TOFToken", "Truth Oracle Fuel", "TOF", owner, "10000000000", "0");
  const usdt = await deployTokenProxy("TOTToken", "Mock USDT", "USDT", owner);

  const nexusFactory = await ethers.getContractFactory("DeFiNodeNexus");
  const nexus = await upgrades.deployProxy(
    nexusFactory,
    [await tot.getAddress(), await tof.getAddress(), await usdt.getAddress(), owner.address],
    { kind: "uups", initializer: "initialize" }
  );
  await nexus.waitForDeployment();
  const nexusAddress = await nexus.getAddress();

  const swapFactory = await ethers.getContractFactory("TOTSwap");
  const swap = await upgrades.deployProxy(
    swapFactory,
    [await tot.getAddress(), await usdt.getAddress(), owner.address],
    { kind: "uups", initializer: "initialize" }
  );
  await swap.waitForDeployment();
  const totAddress = await tot.getAddress();

  console.log("✓ Contracts deployed");

  const million = ethers.parseUnits("1000000", 18);
  const large = ethers.parseUnits("100000", 18);

  await (await usdt.mint(userA.address, large)).wait();
  await (await usdt.mint(userB.address, large)).wait();
  await (await usdt.mint(userC.address, large)).wait();
  await (await usdt.mint(userD.address, large)).wait();
  await (await usdt.mint(trader.address, large)).wait();
  await (await tof.setPredictionMinter(owner.address)).wait();
  await expectRevert(() => tof.connect(userA).mintFromPrediction(userA.address, 1n), "only prediction minter can mint");
  await (await tof.mintFromPrediction(userA.address, large)).wait();
  await (await tof.mintFromPrediction(userB.address, large)).wait();
  await (await tof.mintFromPrediction(userC.address, large)).wait();
  await (await tof.mintFromPrediction(userD.address, large)).wait();
  await expectRevert(() => tof.connect(userA).transfer(userB.address, 1n), "TOF user transfer blocked");

  await (await nexus.setTreasury(treasury.address)).wait();
  await (await nexus.setWallets(zeroLine.address, community.address, foundation.address, institution.address)).wait();
  await (await nexus.setProjectWallet(project.address)).wait();
  await (await nexus.setDistributor(await swap.getAddress(), true)).wait();
  await (await swap.setNexus(nexusAddress)).wait();
  await (await tof.setTransferWhitelist(nexusAddress, true)).wait();

  await (await nexus.configureNftaTier(0, ethers.parseUnits("1000", 18), ethers.parseUnits("20", 18), 2, true)).wait();
  await (await nexus.configureNftaTier(0, ethers.parseUnits("1200", 18), ethers.parseUnits("24", 18), 1, false)).wait();
  await (await nexus.configureNftbTier(0, ethers.parseUnits("500", 18), 1, 2, 10000, true)).wait();
  await (await nexus.configureNftbTier(0, ethers.parseUnits("800", 18), 2, 2, 0, false)).wait();
  await (await nexus.setTofPerUsdt(ethers.parseUnits("200", 18))).wait();

  console.log("✓ Initial owner config done");

  await expectRevert(() => tot.connect(userA).mint(userA.address, 1n), "TOT mint onlyOwner");
  await expectRevert(() => tot.airdrop([userA.address], [1n, 2n]), "TOT airdrop mismatch");
  await (await tot.transfer(userA.address, ethers.parseUnits("100", 18))).wait();

  await expectRevert(() => nexus.connect(userA).fundRewardPool(ethers.parseUnits("1", 18)), "fundRewardPool onlyOwner");
  await (await tot.approve(await nexus.getAddress(), ethers.parseUnits("200000", 18))).wait();
  await (await nexus.fundRewardPool(ethers.parseUnits("200000", 18))).wait();

  await expectRevert(() => nexus.connect(userA).bindReferrer(userA.address), "self referral blocked");
  await expectRevert(() => nexus.connect(userA).bindReferrer(ethers.ZeroAddress), "zero referrer blocked");
  await (await nexus.connect(userA).bindReferrer(owner.address)).wait();
  await expectRevert(() => nexus.connect(userA).bindReferrer(owner.address), "bind only once");

  await expectRevert(() => nexus.connect(userA).buyNfta(2, ethers.ZeroAddress), "inactive tier blocked");

  const ownerUsdtBefore = await usdt.balanceOf(owner.address);
  const treasuryBefore = await usdt.balanceOf(treasury.address);

  await (await usdt.connect(userA).approve(await nexus.getAddress(), ethers.parseUnits("1000", 18))).wait();
  await (await nexus.connect(userA).buyNfta(1, ethers.ZeroAddress)).wait();

  await (await usdt.connect(userB).approve(await nexus.getAddress(), ethers.parseUnits("1000", 18))).wait();
  await (await nexus.connect(userB).buyNfta(1, owner.address)).wait();

  await expectRevert(() => nexus.connect(userC).buyNfta(1, owner.address), "sold out tier blocked");
  await expectRevert(() => nexus.connect(userA).buyNfta(1, owner.address), "one nfta per address");

  const remainingNfta = await nexus.getNftaTierRemaining(1);
  assertCondition(remainingNfta === 0n, "NFTA remaining supply should be 0 after sold out");

  assertCondition((await usdt.balanceOf(owner.address)) > ownerUsdtBefore, "Owner referral USDT should increase");
  assertCondition((await usdt.balanceOf(treasury.address)) > treasuryBefore, "Treasury USDT should increase");

  const userANode = (await nexus.getUserNftaNodes(userA.address))[0];
  await expectRevert(() => nexus.connect(userB).claimNftaYield(userANode), "non-owner claim blocked");

  await increaseTime(DAY + 2);
  const pendingBeforeClaim = await nexus.pendingNftaYield(userANode);
  assertCondition(pendingBeforeClaim === ethers.parseUnits("20", 18), "pendingNftaYield should be one day reward");

  await (await tof.connect(userA).approve(await nexus.getAddress(), large)).wait();
  await (await nexus.connect(userA).claimNftaYield(userANode)).wait();
  await expectRevert(() => nexus.connect(userA).claimNftaYield(userANode), "same-day second claim blocked");

  await expectRevert(() => nexus.connect(userA).withdrawTot(0), "zero withdraw blocked");
  await expectRevert(() => nexus.connect(userA).withdrawTot(ethers.parseUnits("100000", 18)), "insufficient pending blocked");

  const userATotBefore = await tot.balanceOf(userA.address);
  const burnAddress = "0x000000000000000000000000000000000000dEaD";
  const tofBurnBefore = await tof.balanceOf(burnAddress);
  await (await nexus.connect(userA).withdrawTot(ethers.parseUnits("5", 18))).wait();
  assertCondition((await tot.balanceOf(userA.address)) - userATotBefore === ethers.parseUnits("5", 18), "withdrawTot transfer incorrect");
  assertCondition((await tof.balanceOf(burnAddress)) > tofBurnBefore, "TOF burn should increase on withdraw");

  await (await usdt.connect(userC).approve(await nexus.getAddress(), ethers.parseUnits("500", 18))).wait();
  await (await nexus.connect(userC).buyNftbWithUsdt(1, owner.address)).wait();
  await expectRevert(() => nexus.connect(userD).buyNftbWithUsdt(1, owner.address), "NFTB USDT quota blocked");

  const requiredTofFor500U = ethers.parseUnits("100000", 18);
  await (await tof.connect(userD).approve(await nexus.getAddress(), requiredTofFor500U)).wait();
  await (await nexus.connect(userD).buyNftbWithTof(1, owner.address)).wait();

  const expectedTofTreasuryIncrease = requiredTofFor500U;
  const treasuryTofBalance = await tof.balanceOf(treasury.address);
  assertCondition(treasuryTofBalance >= expectedTofTreasuryIncrease, "NFTB TOF exchange rate should be 200 TOF per 1U");

  await expectRevert(() => nexus.connect(userE).buyNftbWithTof(1, owner.address), "NFTB TOF quota blocked");

  const [usdtRemain, tofRemain] = await nexus.getNftbTierRemaining(1);
  assertCondition(usdtRemain === 0n && tofRemain === 0n, "NFTB remaining quota should both be 0");

  await expectRevert(() => nexus.connect(userA).distributeNftbDividends(ethers.parseUnits("1", 18)), "nexus distributor permission blocked");

  await (await tot.approve(await nexus.getAddress(), ethers.parseUnits("100", 18))).wait();
  await (await nexus.distributeNftbDividends(ethers.parseUnits("100", 18))).wait();

  const userCNode = (await nexus.getUserNftbNodes(userC.address))[0];
  const userCBeforeDividend = (await nexus.accounts(userC.address)).pendingTot;
  await (await nexus.connect(userC).claimNftbDividend(userCNode)).wait();
  const userCAfterDividend = (await nexus.accounts(userC.address)).pendingTot;
  assertCondition(userCAfterDividend > userCBeforeDividend, "NFTB dividend claim should increase pendingTot");
  await expectRevert(() => nexus.connect(userC).claimNftbDividend(userCNode), "double NFTB claim blocked");

  await expectRevert(() => nexus.setTofBurnBps(10001), "setTofBurnBps upper bound");
  await expectRevert(() => nexus.setTofClaimFeeBps(10001), "setTofClaimFeeBps upper bound");
  await expectRevert(() => nexus.setWithdrawFeeBps(6, 100), "withdraw fee invalid level");
  await expectRevert(() => nexus.setWithdrawFeeBps(1, 10001), "withdraw fee upper bound");
  await (await nexus.setTofBurnBps(800)).wait();
  await (await nexus.setTofClaimFeeBps(6000)).wait();
  await (await nexus.setWithdrawFeeBps(1, 700)).wait();

  await expectRevert(() => nexus.connect(userA).setTreasury(userA.address), "setTreasury onlyOwner");
  await expectRevert(() => nexus.setTreasury(ethers.ZeroAddress), "setTreasury zero blocked");
  await (await nexus.setTreasury(owner.address)).wait();
  await expectRevert(() => nexus.setWallets(ethers.ZeroAddress, community.address, foundation.address, institution.address), "setWallets zero blocked");
  await (await nexus.setWallets(zeroLine.address, community.address, foundation.address, institution.address)).wait();
  await expectRevert(() => nexus.setProjectWallet(ethers.ZeroAddress), "setProjectWallet zero blocked");
  await (await nexus.setProjectWallet(project.address)).wait();

  await (await nexus.configureNftaTier(0, ethers.parseUnits("600", 18), ethers.parseUnits("9", 18), 1, true)).wait();
  await (await nexus.registerNftaPurchase(userF.address, 3, owner.address)).wait();
  await (await nexus.configureNftbTier(0, ethers.parseUnits("700", 18), 1, 10, 5000, true)).wait();
  await (await nexus.registerNftbPurchase(userF.address, 3, owner.address)).wait();

  await expectRevert(() => swap.connect(userA).setNexus(nexusAddress), "setNexus onlyOwner");
  await expectRevert(() => swap.setNexus(ethers.ZeroAddress), "setNexus zero blocked");
  await expectRevert(() => swap.setBuyFeeBps(1001), "setBuyFeeBps bound");
  await expectRevert(() => swap.setSellFeeBps(2001), "setSellFeeBps bound");
  await expectRevert(() => swap.setProfitTaxBps(5001), "setProfitTaxBps bound");
  await expectRevert(() => swap.setDistributionThreshold(0), "setDistributionThreshold zero blocked");
  await expectRevert(() => swap.setDeflationBps(1001), "setDeflationBps bound");

  await (await swap.setBuyFeeBps(120)).wait();
  await (await swap.setSellFeeBps(550)).wait();
  await (await swap.setProfitTaxBps(1200)).wait();
  await (await swap.setDistributionThreshold(ethers.parseUnits("10", 18))).wait();
  await (await swap.setUsdtDistributionThreshold(ethers.parseUnits("0.1", 18))).wait();
  await (await swap.setDeflationBps(80)).wait();
  await (await swap.setMaxSellBps(5000)).wait();

  await expectRevert(() => swap.connect(userA).addLiquidity(ethers.parseUnits("1", 18), ethers.parseUnits("1", 18)), "addLiquidity onlyOwner");
  await (await tot.approve(await swap.getAddress(), million)).wait();
  await (await usdt.approve(await swap.getAddress(), million)).wait();
  await (await swap.addLiquidity(million, million)).wait();

  const quoteBuy = await swap.quoteBuy(ethers.parseUnits("100", 18));
  assertCondition(quoteBuy[0] > 0n, "quoteBuy should return output");

  await (await usdt.connect(trader).approve(await swap.getAddress(), large)).wait();
  await (await swap.setMaxDailyBuy(ethers.parseUnits("1", 18))).wait();
  await (await swap.connect(trader).buyTot(ethers.parseUnits("1", 18), 0)).wait();
  await expectRevert(() => swap.connect(trader).buyTot(ethers.parseUnits("1", 18), 0), "daily buy limit blocked");
  await (await swap.setMaxDailyBuy(ethers.parseUnits("100000", 18))).wait();

  await (await usdt.mint(userE.address, ethers.parseUnits("20000", 18))).wait();
  await (await usdt.connect(userE).approve(await swap.getAddress(), ethers.parseUnits("20000", 18))).wait();
  await (await swap.connect(userE).buyTot(ethers.parseUnits("1000", 18), 0)).wait();

  await (await usdt.mint(userB.address, ethers.parseUnits("20000", 18))).wait();
  await (await usdt.connect(userB).approve(await swap.getAddress(), ethers.parseUnits("12000", 18))).wait();
  await (await swap.connect(userB).buyTot(ethers.parseUnits("12000", 18), 0)).wait();

  const traderTotBal = await tot.balanceOf(trader.address);
  await (await tot.connect(trader).approve(await swap.getAddress(), traderTotBal)).wait();
  await expectRevert(() => swap.connect(trader).sellTot(traderTotBal, 0), "sell over 50% blocked");

  const profitTraderTotBal = await tot.balanceOf(userE.address);
  await (await tot.connect(userE).approve(await swap.getAddress(), profitTraderTotBal)).wait();

  const sellAmount = profitTraderTotBal / 2n;
  const userCUsdtDividendBefore = await nexus.pendingNftbUsdtDividend(userCNode);
  const traderAvgPriceBeforeSell = await swap.getUserAvgPrice(userE.address);
  const currentPriceBeforeSell = await swap.getCurrentPrice();
  const usdtPoolBeforeSell = await swap.nftbUsdtDividendPool();
  const quoteSell = await swap.quoteSell(sellAmount);
  assertCondition(quoteSell[0] > 0n, "quoteSell should return output");
  await (await swap.connect(userE).sellTot(sellAmount, 0)).wait();

  const userCUsdtDividendAfter = await nexus.pendingNftbUsdtDividend(userCNode);
  const usdtPoolAfterSell = await swap.nftbUsdtDividendPool();
  console.log("Trader avg price before sell:", ethers.formatUnits(traderAvgPriceBeforeSell, 18));
  console.log("Current price before sell:", ethers.formatUnits(currentPriceBeforeSell, 18));
  console.log("USDT pool before sell:", ethers.formatUnits(usdtPoolBeforeSell, 18));
  console.log("USDT pool after sell:", ethers.formatUnits(usdtPoolAfterSell, 18));
  console.log("UserC USDT dividend before:", ethers.formatUnits(userCUsdtDividendBefore, 18));
  console.log("UserC USDT dividend after:", ethers.formatUnits(userCUsdtDividendAfter, 18));
  assertCondition(userCUsdtDividendAfter > userCUsdtDividendBefore, "USDT profit-tax dividend should increase pending USDT dividend");

  const userCUsdtBalanceBeforeClaim = await usdt.balanceOf(userC.address);
  await (await nexus.connect(userC).claimNftbUsdtDividend(userCNode)).wait();
  const userCUsdtBalanceAfterClaim = await usdt.balanceOf(userC.address);
  assertCondition(userCUsdtBalanceAfterClaim > userCUsdtBalanceBeforeClaim, "Claiming NFTB USDT dividend should transfer USDT");

  const reserveBeforeDeflate = await swap.totReserve();
  const dividendPoolBeforeDeflate = await swap.nftbDividendPool();
  await increaseTime(FOUR_HOURS + 10);
  await (await swap.deflate()).wait();
  const reserveAfterDeflate = await swap.totReserve();
  const dividendPoolAfterDeflate = await swap.nftbDividendPool();
  assertCondition(reserveAfterDeflate < reserveBeforeDeflate, "deflate should reduce TOT reserve");
  assertCondition(dividendPoolAfterDeflate > dividendPoolBeforeDeflate, "deflate should increase dividend pool");

  await expectRevert(() => swap.connect(userA).forceDistribute(), "forceDistribute onlyOwner");
  await (await swap.forceDistribute()).wait();
  assertCondition((await swap.nftbDividendPool()) === 0n, "forceDistribute should clear pool");

  await expectRevert(() => swap.connect(userA).removeLiquidity(1n, 1n), "removeLiquidity onlyOwner");
  await expectRevert(() => swap.removeLiquidity(ethers.parseUnits("2000000", 18), 1n), "removeLiquidity bounds");
  await (await swap.removeLiquidity(ethers.parseUnits("100", 18), ethers.parseUnits("100", 18))).wait();

  await expectRevert(() => swap.connect(userA).emergencyWithdraw(totAddress, 1n), "emergencyWithdraw onlyOwner");
  await (await swap.emergencyWithdraw(totAddress, 1n)).wait();

  console.log("\n✅ FULL business regression passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
