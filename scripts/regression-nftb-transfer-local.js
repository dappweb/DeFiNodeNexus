const hre = require("hardhat");

const { ethers, upgrades } = hre;

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
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
  const [owner, userA, userB] = await ethers.getSigners();

  console.log("Running targeted regression with owner:", owner.address);

  const tot = await deployTokenProxy("TOTToken", "Truth Oracle Token", "TOT", owner, "1000000000", "1000000000");
  const tof = await deployTokenProxy("TOFToken", "Truth Oracle Fuel", "TOF", owner, "10000000000", "0");
  const usdt = await deployTokenProxy("TOTToken", "Mock USDT", "USDT", owner, "1000000000", "1000000000");

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

  const maxDailyBuy = await swap.maxDailyBuy();
  assertCondition(maxDailyBuy === ethers.parseUnits("10000", 18), "maxDailyBuy default should be 10000 TOT");
  console.log("✓ maxDailyBuy default is 10000 TOT");

  await (await nexus.configureNftbTier(0, ethers.parseUnits("500", 18), 1, 10, 9000, true)).wait();

  await (await usdt.transfer(userA.address, ethers.parseUnits("1000", 18))).wait();
  await (await usdt.connect(userA).approve(await nexus.getAddress(), ethers.parseUnits("500", 18))).wait();
  await (await nexus.connect(userA).buyNftbWithUsdt(1, owner.address)).wait();

  const userANode = (await nexus.getUserNftbNodes(userA.address))[0];
  const nodeBefore = await nexus.nftbNodes(userANode);
  assertCondition(nodeBefore.owner.toLowerCase() === userA.address.toLowerCase(), "NFTB node owner should be userA before transfer");

  const totDividendAmount = ethers.parseUnits("100", 18);
  const usdtDividendAmount = ethers.parseUnits("50", 18);

  await (await tot.approve(await nexus.getAddress(), totDividendAmount)).wait();
  await (await nexus.distributeNftbDividends(totDividendAmount)).wait();

  await (await usdt.approve(await nexus.getAddress(), usdtDividendAmount)).wait();
  await (await nexus.distributeNftbUsdtDividends(usdtDividendAmount)).wait();

  const pendingTotBeforeTransfer = await nexus.pendingNftbDividend(userANode);
  const pendingUsdtBeforeTransfer = await nexus.pendingNftbUsdtDividend(userANode);
  assertCondition(pendingTotBeforeTransfer > 0n, "pending TOT dividend should be > 0 before transfer");
  assertCondition(pendingUsdtBeforeTransfer > 0n, "pending USDT dividend should be > 0 before transfer");

  const userAAccountBefore = await nexus.accounts(userA.address);
  const userAUsdtBefore = await usdt.balanceOf(userA.address);

  await (await nexus.connect(userA).transferNftbCard(userB.address, userANode)).wait();

  const nodeAfter = await nexus.nftbNodes(userANode);
  assertCondition(nodeAfter.owner.toLowerCase() === userB.address.toLowerCase(), "NFTB node owner should be userB after transfer");

  const userANodesAfter = await nexus.getUserNftbNodes(userA.address);
  const userBNodesAfter = await nexus.getUserNftbNodes(userB.address);
  assertCondition(userANodesAfter.length === 0, "userA should have no NFTB node after transfer");
  assertCondition(userBNodesAfter.some((id) => id === userANode), "userB should receive transferred NFTB node");

  const userAAccountAfter = await nexus.accounts(userA.address);
  const userAUsdtAfter = await usdt.balanceOf(userA.address);

  assertCondition(
    userAAccountAfter.pendingTot - userAAccountBefore.pendingTot === pendingTotBeforeTransfer,
    "transfer should settle pending TOT dividend to previous owner"
  );
  assertCondition(
    userAUsdtAfter - userAUsdtBefore === pendingUsdtBeforeTransfer,
    "transfer should settle pending USDT dividend to previous owner"
  );

  const pendingTotAfterTransfer = await nexus.pendingNftbDividend(userANode);
  const pendingUsdtAfterTransfer = await nexus.pendingNftbUsdtDividend(userANode);
  assertCondition(pendingTotAfterTransfer === 0n, "pending TOT should reset to 0 after transfer");
  assertCondition(pendingUsdtAfterTransfer === 0n, "pending USDT should reset to 0 after transfer");

  await (await tot.approve(await nexus.getAddress(), totDividendAmount)).wait();
  await (await nexus.distributeNftbDividends(totDividendAmount)).wait();

  await (await usdt.approve(await nexus.getAddress(), usdtDividendAmount)).wait();
  await (await nexus.distributeNftbUsdtDividends(usdtDividendAmount)).wait();

  const userBPendingTotBeforeClaim = (await nexus.accounts(userB.address)).pendingTot;
  const userBUsdtBeforeClaim = await usdt.balanceOf(userB.address);

  await (await nexus.connect(userB).claimNftbDividend(userANode)).wait();
  await (await nexus.connect(userB).claimNftbUsdtDividend(userANode)).wait();

  const userBPendingTotAfterClaim = (await nexus.accounts(userB.address)).pendingTot;
  const userBUsdtAfterClaim = await usdt.balanceOf(userB.address);

  assertCondition(userBPendingTotAfterClaim > userBPendingTotBeforeClaim, "new TOT dividend should belong to new owner");
  assertCondition(userBUsdtAfterClaim > userBUsdtBeforeClaim, "new USDT dividend should belong to new owner");

  console.log("✅ Targeted NFTB transfer regression passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
