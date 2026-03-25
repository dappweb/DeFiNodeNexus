const hre = require("hardhat");

const { ethers, upgrades } = hre;

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function deployTokenProxy(contractName, name, symbol, owner, maxSupply, initialSupply) {
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
  const [owner, accountA, accountB, accountC, treasury, zeroLine, community, foundation, institution, project] = await ethers.getSigners();

  console.log("Owner:", owner.address);

  const tot = await deployTokenProxy("TOTToken", "Truth Oracle Token", "TOT", owner, "1000000000", "1000000");
  const usdt = await deployTokenProxy("TOTToken", "Mock USDT", "USDT", owner, "1000000000", "1000000");
  const tof = await deployTokenProxy("TOFToken", "Truth Oracle Fuel", "TOF", owner, "10000000000", "0");

  const nexusFactory = await ethers.getContractFactory("DeFiNodeNexus");
  const nexus = await upgrades.deployProxy(
    nexusFactory,
    [await tot.getAddress(), await tof.getAddress(), await usdt.getAddress(), owner.address],
    { kind: "uups", initializer: "initialize" }
  );
  await nexus.waitForDeployment();

  await (await tof.setPredictionMinter(owner.address)).wait();
  await (await tof.setTransferWhitelist(await nexus.getAddress(), true)).wait();

  await (await nexus.setTreasury(treasury.address)).wait();
  await (await nexus.setWallets(zeroLine.address, community.address, foundation.address, institution.address)).wait();
  await (await nexus.setProjectWallet(project.address)).wait();

  const totGrant = ethers.parseUnits("10000", 18);
  const usdtGrant = ethers.parseUnits("20000", 18);
  const tofGrant = ethers.parseUnits("200000", 18);

  await (await tot.mint(accountA.address, totGrant)).wait();
  await (await tot.mint(accountB.address, totGrant)).wait();
  await (await tot.mint(accountC.address, totGrant)).wait();

  await (await usdt.mint(accountA.address, usdtGrant)).wait();
  await (await usdt.mint(accountB.address, usdtGrant)).wait();
  await (await usdt.mint(accountC.address, usdtGrant)).wait();

  await (await tof.mintFromPrediction(accountA.address, tofGrant)).wait();
  await (await tof.mintFromPrediction(accountB.address, tofGrant)).wait();
  await (await tof.mintFromPrediction(accountC.address, tofGrant)).wait();

  await (await nexus.connect(accountB).bindReferrer(accountA.address)).wait();
  await (await nexus.connect(accountC).bindReferrer(accountB.address)).wait();

  const accountBState = await nexus.accounts(accountB.address);
  const accountCState = await nexus.accounts(accountC.address);

  assertCondition(accountBState.referrer.toLowerCase() === accountA.address.toLowerCase(), "B referrer should be A");
  assertCondition(accountCState.referrer.toLowerCase() === accountB.address.toLowerCase(), "C referrer should be B");

  console.log("\n=== TEST ACCOUNTS ===");
  console.log("A:", accountA.address);
  console.log("B:", accountB.address);
  console.log("C:", accountC.address);

  const aTot = await tot.balanceOf(accountA.address);
  const bTot = await tot.balanceOf(accountB.address);
  const cTot = await tot.balanceOf(accountC.address);

  const aUsdt = await usdt.balanceOf(accountA.address);
  const bUsdt = await usdt.balanceOf(accountB.address);
  const cUsdt = await usdt.balanceOf(accountC.address);

  console.log("\n=== ALLOCATION ===");
  console.log("A TOT:", ethers.formatUnits(aTot, 18), "| USDT:", ethers.formatUnits(aUsdt, 18));
  console.log("B TOT:", ethers.formatUnits(bTot, 18), "| USDT:", ethers.formatUnits(bUsdt, 18));
  console.log("C TOT:", ethers.formatUnits(cTot, 18), "| USDT:", ethers.formatUnits(cUsdt, 18));

  console.log("\n=== REFERRAL CHAIN ===");
  console.log("A -> B: bound");
  console.log("B -> C: bound");

  console.log("\n=== CONTRACT ADDRESSES ===");
  console.log("TOT:", await tot.getAddress());
  console.log("USDT:", await usdt.getAddress());
  console.log("TOF:", await tof.getAddress());
  console.log("Nexus:", await nexus.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
