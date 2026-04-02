const hre = require("hardhat");

const { ethers } = hre;

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function getBpsByGeneration(generation) {
  if (generation === 1) return 1000n;
  if (generation === 2) return 500n;
  return 100n;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureUsdtBalance(usdt, deployer, requiredAmount) {
  const deployerBalance = await usdt.balanceOf(deployer.address);
  assertCondition(
    deployerBalance >= requiredAmount,
    `Deployer USDT balance insufficient. Need ${ethers.formatUnits(requiredAmount, 18)} USDT`
  );
}

async function findUsableNftaTier(nexus, requiredBuys, canConfigure) {
  const nextNftaTierId = Number(await nexus.nextNftaTierId());

  for (let id = 1; id < nextNftaTierId; id++) {
    const tier = await nexus.nftaTiers(id);
    if (!tier.isActive || tier.price === 0n) continue;
    const remaining = await nexus.getNftaTierRemaining(id);
    if (remaining >= BigInt(requiredBuys)) {
      return { tierId: BigInt(id), price: tier.price, configured: false };
    }
  }

  if (!canConfigure) {
    throw new Error("No active NFTA tier with enough remaining supply, and caller is not owner");
  }

  const fallbackPrice = ethers.parseUnits("500", 18);
  const fallbackDaily = ethers.parseUnits("6.5", 18);
  const tx = await nexus.configureNftaTier(0, fallbackPrice, fallbackDaily, 100000, true);
  await tx.wait();

  const createdTierId = BigInt(nextNftaTierId);
  return { tierId: createdTierId, price: fallbackPrice, configured: true };
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const provider = ethers.provider;

  const usdtAddress = process.env.USDT_TOKEN_ADDRESS;
  const nexusAddress = process.env.NEXUS_ADDRESS;
  if (!usdtAddress || !nexusAddress) {
    throw new Error("Missing USDT_TOKEN_ADDRESS or NEXUS_ADDRESS in env");
  }

  const requestedUsers = Number(process.env.REF_TEST_USERS || "8");
  const userCount = Math.min(Math.max(3, requestedUsers), 12);
  const gasFundPerUser = ethers.parseEther(process.env.REF_TEST_GAS_ETH || "0.003");

  const usdt = await ethers.getContractAt("IERC20", usdtAddress);
  const nexus = await ethers.getContractAt("DeFiNodeNexus", nexusAddress);

  const ownerOnChain = await nexus.owner();
  const canConfigureTier = ownerOnChain.toLowerCase() === deployer.address.toLowerCase();

  const root = ethers.Wallet.createRandom().connect(provider);
  const users = Array.from({ length: userCount }, () => ethers.Wallet.createRandom().connect(provider));

  const buyers = [root, ...users];
  const requiredBuys = buyers.length;

  const { tierId, price: nftaPrice, configured } = await findUsableNftaTier(nexus, requiredBuys, canConfigureTier);
  const perBuyerUsdt = (nftaPrice * 12n) / 10n;

  const totalGasFund = gasFundPerUser * BigInt(buyers.length);
  const totalUsdtFund = perBuyerUsdt * BigInt(buyers.length);

  const deployerEth = await provider.getBalance(deployer.address);
  assertCondition(deployerEth > totalGasFund, "Deployer ETH balance insufficient for gas funding");
  await ensureUsdtBalance(usdt, deployer, totalUsdtFund);

  console.log("Running Sepolia batch referral reward test");
  console.log(`- Deployer: ${deployer.address}`);
  console.log(`- On-chain owner: ${ownerOnChain}`);
  console.log(`- Users: ${userCount}, chain depth: ${buyers.length}`);
  console.log(`- Tier: ${tierId.toString()} ${configured ? "(newly configured)" : "(existing)"}`);

  for (const wallet of buyers) {
    await (await deployer.sendTransaction({ to: wallet.address, value: gasFundPerUser })).wait();
    await (await usdt.transfer(wallet.address, perBuyerUsdt)).wait();
    await sleep(200);
  }

  const referrals = new Map();
  referrals.set(root.address, deployer.address);
  for (let i = 0; i < users.length; i++) {
    const referrer = i === 0 ? root.address : users[i - 1].address;
    referrals.set(users[i].address, referrer);
  }

  const trackAccounts = [deployer, root, ...users];

  const beforeStates = new Map();
  for (const account of trackAccounts) {
    beforeStates.set(account.address, await nexus.accounts(account.address));
  }

  const treasuryAddress = await nexus.treasury();
  const treasuryUsdtBefore = await usdt.balanceOf(treasuryAddress);

  await (await nexus.connect(root).bindReferrer(deployer.address)).wait();
  for (let i = 0; i < users.length; i++) {
    const referrer = i === 0 ? root.address : users[i - 1].address;
    await (await nexus.connect(users[i]).bindReferrer(referrer)).wait();
  }

  const expectedDirectDelta = new Map();
  const expectedTeamNodesDelta = new Map();
  const expectedCommissionDelta = new Map();
  for (const account of trackAccounts) {
    expectedDirectDelta.set(account.address, 0n);
    expectedTeamNodesDelta.set(account.address, 0n);
    expectedCommissionDelta.set(account.address, 0n);
  }

  expectedDirectDelta.set(deployer.address, (expectedDirectDelta.get(deployer.address) || 0n) + 1n);
  expectedDirectDelta.set(root.address, (expectedDirectDelta.get(root.address) || 0n) + 1n);
  for (let i = 1; i < users.length; i++) {
    const prev = users[i - 1].address;
    expectedDirectDelta.set(prev, (expectedDirectDelta.get(prev) || 0n) + 1n);
  }

  let expectedTreasuryFallback = 0n;
  const startBlock = await provider.getBlockNumber();

  const applyExpectedDistribution = (buyerAddress) => {
    let current = referrals.get(buyerAddress);

    for (let gen = 1; gen <= 17; gen++) {
      const share = (nftaPrice * getBpsByGeneration(gen)) / 10000n;
      if (share === 0n) continue;

      if (current) {
        expectedCommissionDelta.set(current, (expectedCommissionDelta.get(current) || 0n) + share);
        current = referrals.get(current);
      } else {
        expectedTreasuryFallback += share;
      }
    }
  };

  const applyExpectedTeamNodes = (buyerAddress) => {
    let current = referrals.get(buyerAddress);
    let depth = 0;
    while (current && depth < 17) {
      expectedTeamNodesDelta.set(current, (expectedTeamNodesDelta.get(current) || 0n) + 1n);
      current = referrals.get(current);
      depth += 1;
    }
  };

  for (const buyer of buyers) {
    await (await usdt.connect(buyer).approve(nexusAddress, nftaPrice)).wait();
    await (await nexus.connect(buyer).buyNfta(tierId, ethers.ZeroAddress)).wait();

    applyExpectedDistribution(buyer.address);
    applyExpectedTeamNodes(buyer.address);
  }

  const latestBlock = await provider.getBlockNumber();
  const events = await nexus.queryFilter(nexus.filters.TeamCommissionPaid(), startBlock, latestBlock);
  assertCondition(events.length > 0, "No TeamCommissionPaid events detected on Sepolia run");

  for (const account of trackAccounts) {
    const before = beforeStates.get(account.address);
    const after = await nexus.accounts(account.address);

    const directDelta = after.directReferrals - before.directReferrals;
    const teamNodesDelta = after.teamNodes - before.teamNodes;
    const earnedDelta = after.teamCommissionEarned - before.teamCommissionEarned;

    const expectedDirect = expectedDirectDelta.get(account.address) || 0n;
    const expectedTeamNodes = expectedTeamNodesDelta.get(account.address) || 0n;
    const expectedEarned = expectedCommissionDelta.get(account.address) || 0n;

    assertCondition(directDelta === expectedDirect, `directReferrals delta mismatch: ${account.address}`);
    assertCondition(teamNodesDelta === expectedTeamNodes, `teamNodes delta mismatch: ${account.address}`);
    assertCondition(earnedDelta === expectedEarned, `teamCommissionEarned delta mismatch: ${account.address}`);
  }

  const treasuryUsdtAfter = await usdt.balanceOf(treasuryAddress);
  const treasuryDelta = treasuryUsdtAfter - treasuryUsdtBefore;
  assertCondition(
    treasuryDelta >= expectedTreasuryFallback,
    "Treasury fallback commission delta is lower than expected"
  );

  console.log("\n✅ Sepolia team referral reward test passed");
  console.log(`- TeamCommissionPaid events: ${events.length}`);
  console.log(`- Expected treasury fallback: ${ethers.formatUnits(expectedTreasuryFallback, 18)} USDT`);
  console.log(`- Treasury delta: ${ethers.formatUnits(treasuryDelta, 18)} USDT`);
  console.log(`- Root: ${root.address}`);
  console.log(`- Sample user1: ${users[0].address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
