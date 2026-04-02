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

function getBpsByGeneration(generation) {
  if (generation === 1) return 1000n;
  if (generation === 2) return 500n;
  return 100n;
}

async function main() {
  const signers = await ethers.getSigners();
  const owner = signers[0];

  const requestedUsers = Number(process.env.REF_TEST_USERS || "12");
  const usableUsers = Math.min(Math.max(3, requestedUsers), signers.length - 6);
  assertCondition(usableUsers >= 3, "Need at least 3 user accounts for referral chain test");

  const root = signers[1];
  const users = signers.slice(2, 2 + usableUsers);

  const treasury = signers[2 + usableUsers];
  const zeroLine = signers[3 + usableUsers];
  const community = signers[4 + usableUsers];
  const foundation = signers[5 + usableUsers];
  const institution = signers[6 + usableUsers];

  console.log("Running team referral reward batch test");
  console.log(`- Owner: ${owner.address}`);
  console.log(`- Root: ${root.address}`);
  console.log(`- User count: ${usableUsers}`);

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
  await (await nexus.setWallets(zeroLine.address, community.address, foundation.address, institution.address)).wait();

  const nftaPrice = ethers.parseUnits("1000", 18);
  const nftaDaily = ethers.parseUnits("20", 18);
  await (await nexus.configureNftaTier(1, nftaPrice, nftaDaily, 100000, true)).wait();

  const perUserUsdt = ethers.parseUnits("2000", 18);
  await (await usdt.transfer(root.address, perUserUsdt)).wait();
  for (const user of users) {
    await (await usdt.transfer(user.address, perUserUsdt)).wait();
  }

  const referrals = new Map();
  const expectedDirect = new Map();
  const expectedCommission = new Map();
  const expectedTeamNodes = new Map();

  const allAccounts = [owner, root, ...users, treasury];
  for (const s of allAccounts) {
    expectedDirect.set(s.address, 0n);
    expectedCommission.set(s.address, 0n);
    expectedTeamNodes.set(s.address, 0n);
  }

  referrals.set(root.address, owner.address);
  expectedDirect.set(owner.address, expectedDirect.get(owner.address) + 1n);
  await (await nexus.connect(root).bindReferrer(owner.address)).wait();

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const referrer = i === 0 ? root.address : users[i - 1].address;
    referrals.set(user.address, referrer);
    expectedDirect.set(referrer, expectedDirect.get(referrer) + 1n);
    await (await nexus.connect(user).bindReferrer(referrer)).wait();
  }

  const buyers = [root, ...users];

  const expectedTreasuryCommission = { value: 0n };

  const applyExpectedDistribution = (buyerAddress, price) => {
    let current = referrals.get(buyerAddress);

    for (let gen = 1; gen <= 17; gen++) {
      const share = (price * getBpsByGeneration(gen)) / 10000n;
      if (share === 0n) continue;

      if (current) {
        expectedCommission.set(current, expectedCommission.get(current) + share);
        current = referrals.get(current);
      } else {
        expectedTreasuryCommission.value += share;
      }
    }
  };

  const applyExpectedTeamNodes = (buyerAddress) => {
    let current = referrals.get(buyerAddress);
    let depth = 0;
    while (current && depth < 17) {
      expectedTeamNodes.set(current, expectedTeamNodes.get(current) + 1n);
      current = referrals.get(current);
      depth += 1;
    }
  };

  for (const buyer of buyers) {
    await (await usdt.connect(buyer).approve(await nexus.getAddress(), nftaPrice)).wait();
    await (await nexus.connect(buyer).buyNfta(1, ethers.ZeroAddress)).wait();

    applyExpectedDistribution(buyer.address, nftaPrice);
    applyExpectedTeamNodes(buyer.address);
  }

  const teamCommissionEvents = await nexus.queryFilter(
    nexus.filters.TeamCommissionPaid(),
    0,
    "latest"
  );

  assertCondition(teamCommissionEvents.length > 0, "TeamCommissionPaid events should be emitted");

  for (const account of [owner, root, ...users]) {
    const info = await nexus.accounts(account.address);
    const expectedDirectReferrals = expectedDirect.get(account.address) || 0n;
    const expectedEarned = expectedCommission.get(account.address) || 0n;
    const expectedNodes = expectedTeamNodes.get(account.address) || 0n;

    assertCondition(info.directReferrals === expectedDirectReferrals, `directReferrals mismatch for ${account.address}`);
    assertCondition(info.teamCommissionEarned === expectedEarned, `teamCommissionEarned mismatch for ${account.address}`);
    assertCondition(info.teamNodes === expectedNodes, `teamNodes mismatch for ${account.address}`);
  }

  const treasuryUsdt = await usdt.balanceOf(treasury.address);
  assertCondition(treasuryUsdt >= expectedTreasuryCommission.value, "Treasury should receive missing-generation commissions");

  console.log("\n✅ Batch referral reward test passed");
  console.log(`- Referral chain depth tested: ${buyers.length}`);
  console.log(`- Team commission events: ${teamCommissionEvents.length}`);
  console.log(`- Expected treasury fallback commission: ${ethers.formatUnits(expectedTreasuryCommission.value, 18)} USDT`);
  console.log(`- Treasury balance: ${ethers.formatUnits(treasuryUsdt, 18)} USDT`);

  console.log("\nSample accounts:");
  console.log(`- Owner: ${owner.address}`);
  console.log(`- Root:  ${root.address}`);
  for (let i = 0; i < Math.min(5, users.length); i++) {
    console.log(`- User${i + 1}: ${users[i].address}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
