const hre = require("hardhat");

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function deployTokenProxy(name, symbol, owner, maxSupply = "1000000000", initialSupply = "1000000") {
  const Factory = await hre.ethers.getContractFactory("TOTToken");
  const proxy = await hre.upgrades.deployProxy(
    Factory,
    [
      name,
      symbol,
      hre.ethers.parseUnits(maxSupply, 18),
      hre.ethers.parseUnits(initialSupply, 18),
      owner,
    ],
    { kind: "uups", initializer: "initialize" }
  );
  await proxy.waitForDeployment();
  return proxy;
}

async function verifyTotTokenUpgrade(owner, user) {
  console.log("\n[1/3] Verifying TOTToken upgrade...");

  const token = await deployTokenProxy("TOT", "TOT", owner.address);
  const proxyAddress = await token.getAddress();
  const implBefore = await hre.upgrades.erc1967.getImplementationAddress(proxyAddress);

  const mintAmount = hre.ethers.parseUnits("1234", 18);
  await (await token.mint(user.address, mintAmount)).wait();

  const ownerBefore = await token.owner();
  const totalSupplyBefore = await token.totalSupply();
  const maxSupplyBefore = await token.maxSupply();
  const userBalanceBefore = await token.balanceOf(user.address);

  const TokenV2 = await hre.ethers.getContractFactory("TOTTokenV2");
  const upgraded = await hre.upgrades.upgradeProxy(proxyAddress, TokenV2, { kind: "uups" });
  await upgraded.waitForDeployment();

  const proxyAddressAfter = await upgraded.getAddress();
  const implAfter = await hre.upgrades.erc1967.getImplementationAddress(proxyAddressAfter);

  assertCondition(proxyAddressAfter.toLowerCase() === proxyAddress.toLowerCase(), "TOTToken proxy address changed");
  assertCondition(implAfter.toLowerCase() !== implBefore.toLowerCase(), "TOTToken implementation did not change");
  assertCondition((await upgraded.owner()).toLowerCase() === ownerBefore.toLowerCase(), "TOTToken owner not preserved");
  assertCondition((await upgraded.totalSupply()) === totalSupplyBefore, "TOTToken totalSupply not preserved");
  assertCondition((await upgraded.maxSupply()) === maxSupplyBefore, "TOTToken maxSupply not preserved");
  assertCondition((await upgraded.balanceOf(user.address)) === userBalanceBefore, "TOTToken user balance not preserved");
  assertCondition((await upgraded.version()) === "2", "TOTTokenV2 new function unavailable");

  console.log("✓ TOTToken upgrade regression passed");
}

async function verifyTotSwapUpgrade(owner) {
  console.log("\n[2/3] Verifying TOTSwap upgrade...");

  const tot = await deployTokenProxy("Pool TOT", "PTOT", owner.address);
  const usdt = await deployTokenProxy("Pool USDT", "PUSDT", owner.address);

  const swapFactory = await hre.ethers.getContractFactory("TOTSwap");
  const swap = await hre.upgrades.deployProxy(
    swapFactory,
    [await tot.getAddress(), await usdt.getAddress(), owner.address],
    { kind: "uups", initializer: "initialize" }
  );
  await swap.waitForDeployment();

  const proxyAddress = await swap.getAddress();
  const implBefore = await hre.upgrades.erc1967.getImplementationAddress(proxyAddress);

  await (await swap.setBuyFeeBps(150)).wait();
  await (await swap.setSellFeeBps(550)).wait();
  await (await swap.setDistributionThreshold(hre.ethers.parseUnits("5000", 18))).wait();

  const buyFeeBefore = await swap.buyFeeBps();
  const sellFeeBefore = await swap.sellFeeBps();
  const thresholdBefore = await swap.distributionThreshold();

  const SwapV2 = await hre.ethers.getContractFactory("TOTSwapV2");
  const upgraded = await hre.upgrades.upgradeProxy(proxyAddress, SwapV2, { kind: "uups" });
  await upgraded.waitForDeployment();

  const proxyAddressAfter = await upgraded.getAddress();
  const implAfter = await hre.upgrades.erc1967.getImplementationAddress(proxyAddressAfter);

  assertCondition(proxyAddressAfter.toLowerCase() === proxyAddress.toLowerCase(), "TOTSwap proxy address changed");
  assertCondition(implAfter.toLowerCase() !== implBefore.toLowerCase(), "TOTSwap implementation did not change");
  assertCondition((await upgraded.buyFeeBps()) === buyFeeBefore, "TOTSwap buyFeeBps not preserved");
  assertCondition((await upgraded.sellFeeBps()) === sellFeeBefore, "TOTSwap sellFeeBps not preserved");
  assertCondition((await upgraded.distributionThreshold()) === thresholdBefore, "TOTSwap threshold not preserved");
  assertCondition((await upgraded.version()) === "2", "TOTSwapV2 new function unavailable");

  console.log("✓ TOTSwap upgrade regression passed");
}

async function verifyNexusUpgrade(owner, user) {
  console.log("\n[3/3] Verifying DeFiNodeNexus upgrade...");

  const tot = await deployTokenProxy("Nexus TOT", "NTOT", owner.address);
  const tof = await deployTokenProxy("Nexus TOF", "NTOF", owner.address);
  const usdt = await deployTokenProxy("Nexus USDT", "NUSDT", owner.address);

  const nexusFactory = await hre.ethers.getContractFactory("DeFiNodeNexus");
  const nexus = await hre.upgrades.deployProxy(
    nexusFactory,
    [await tot.getAddress(), await tof.getAddress(), await usdt.getAddress(), owner.address],
    { kind: "uups", initializer: "initialize" }
  );
  await nexus.waitForDeployment();

  const proxyAddress = await nexus.getAddress();
  const implBefore = await hre.upgrades.erc1967.getImplementationAddress(proxyAddress);

  await (await nexus.setTreasury(user.address)).wait();
  await (
    await nexus.configureNftaTier(
      0,
      hre.ethers.parseUnits("500", 18),
      hre.ethers.parseUnits("6.5", 18),
      10000,
      true
    )
  ).wait();

  const treasuryBefore = await nexus.treasury();
  const nextTierBefore = await nexus.nextNftaTierId();
  const tier1Before = await nexus.nftaTiers(1);

  const NexusV2 = await hre.ethers.getContractFactory("DeFiNodeNexusV2");
  const upgraded = await hre.upgrades.upgradeProxy(proxyAddress, NexusV2, { kind: "uups" });
  await upgraded.waitForDeployment();

  const proxyAddressAfter = await upgraded.getAddress();
  const implAfter = await hre.upgrades.erc1967.getImplementationAddress(proxyAddressAfter);

  assertCondition(proxyAddressAfter.toLowerCase() === proxyAddress.toLowerCase(), "DeFiNodeNexus proxy address changed");
  assertCondition(implAfter.toLowerCase() !== implBefore.toLowerCase(), "DeFiNodeNexus implementation did not change");
  assertCondition((await upgraded.treasury()).toLowerCase() === treasuryBefore.toLowerCase(), "DeFiNodeNexus treasury not preserved");
  assertCondition((await upgraded.nextNftaTierId()) === nextTierBefore, "DeFiNodeNexus nextNftaTierId not preserved");

  const tier1After = await upgraded.nftaTiers(1);
  assertCondition(tier1After.price === tier1Before.price, "DeFiNodeNexus tier price not preserved");
  assertCondition(tier1After.dailyYield === tier1Before.dailyYield, "DeFiNodeNexus tier dailyYield not preserved");
  assertCondition(tier1After.maxSupply === tier1Before.maxSupply, "DeFiNodeNexus tier maxSupply not preserved");
  assertCondition(tier1After.isActive === tier1Before.isActive, "DeFiNodeNexus tier active flag not preserved");
  assertCondition((await upgraded.version()) === "2", "DeFiNodeNexusV2 new function unavailable");

  console.log("✓ DeFiNodeNexus upgrade regression passed");
}

async function main() {
  const [owner, user] = await hre.ethers.getSigners();
  console.log("Running local upgrade regression with owner:", owner.address);

  await verifyTotTokenUpgrade(owner, user);
  await verifyTotSwapUpgrade(owner);
  await verifyNexusUpgrade(owner, user);

  console.log("\nAll upgrade regression checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
