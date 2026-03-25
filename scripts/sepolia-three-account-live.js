const hre = require("hardhat");

const { ethers } = hre;

async function ensureNftbTier(nexus) {
  const currentNext = await nexus.nextNftbTierId();
  let tierId = 1n;

  if (currentNext > 1n) {
    const tier1 = await nexus.nftbTiers(1);
    if (tier1.isActive && tier1.price > 0n) {
      return 1n;
    }
  }

  const tx = await nexus.configureNftbTier(
    0,
    ethers.parseUnits("500", 18),
    1,
    2000,
    2000,
    true
  );
  await tx.wait();

  tierId = currentNext;
  return tierId;
}

async function main() {
  const [deployer] = await ethers.getSigners();

  const totAddress = process.env.TOT_TOKEN_ADDRESS;
  const tofAddress = process.env.TOF_TOKEN_ADDRESS;
  const usdtAddress = process.env.USDT_TOKEN_ADDRESS;
  const nexusAddress = process.env.NEXUS_ADDRESS;
  const swapAddress = process.env.SWAP_ADDRESS;

  if (!totAddress || !tofAddress || !usdtAddress || !nexusAddress || !swapAddress) {
    throw new Error("Missing token/nexus/swap addresses in .env");
  }

  console.log("Deployer:", deployer.address);

  const provider = ethers.provider;
  const walletA = ethers.Wallet.createRandom().connect(provider);
  const walletB = ethers.Wallet.createRandom().connect(provider);
  const walletC = ethers.Wallet.createRandom().connect(provider);

  const tot = await ethers.getContractAt("IERC20", totAddress);
  const tof = await ethers.getContractAt("IERC20", tofAddress);
  const usdt = await ethers.getContractAt("IERC20", usdtAddress);
  const nexus = await ethers.getContractAt("DeFiNodeNexus", nexusAddress);
  const swap = await ethers.getContractAt("TOTSwap", swapAddress);

  const gasFund = ethers.parseEther("0.001");
  const totFund = ethers.parseUnits("5000", 18);
  const usdtFund = ethers.parseUnits("10000", 18);
  const tofFund = ethers.parseUnits("200000", 18);

  console.log("\nFunding gas...");
  await (await deployer.sendTransaction({ to: walletA.address, value: gasFund })).wait();
  await (await deployer.sendTransaction({ to: walletB.address, value: gasFund })).wait();
  await (await deployer.sendTransaction({ to: walletC.address, value: gasFund })).wait();

  console.log("Funding tokens...");
  await (await tot.transfer(walletA.address, totFund)).wait();
  await (await tot.transfer(walletB.address, totFund)).wait();
  await (await tot.transfer(walletC.address, totFund)).wait();

  await (await usdt.transfer(walletA.address, usdtFund)).wait();
  await (await usdt.transfer(walletB.address, usdtFund)).wait();
  await (await usdt.transfer(walletC.address, usdtFund)).wait();

  await (await tof.transfer(walletA.address, tofFund)).wait();
  await (await tof.transfer(walletB.address, tofFund)).wait();
  await (await tof.transfer(walletC.address, tofFund)).wait();

  console.log("\nBinding referrals...");
  await (await nexus.connect(walletB).bindReferrer(walletA.address)).wait();
  await (await nexus.connect(walletC).bindReferrer(walletB.address)).wait();

  console.log("Configuring/ensuring NFTB tier...");
  const nftbTierId = await ensureNftbTier(nexus);

  console.log("\nFirst-round trades...");
  const nftaPrice = ethers.parseUnits("500", 18);

  await (await usdt.connect(walletB).approve(nexusAddress, ethers.parseUnits("5000", 18))).wait();
  await (await usdt.connect(walletC).approve(nexusAddress, ethers.parseUnits("5000", 18))).wait();
  await (await tof.connect(walletC).approve(nexusAddress, ethers.parseUnits("200000", 18))).wait();

  await (await nexus.connect(walletB).buyNfta(1, ethers.ZeroAddress)).wait();
  await (await nexus.connect(walletC).buyNfta(1, ethers.ZeroAddress)).wait();
  await (await nexus.connect(walletB).buyNftbWithUsdt(nftbTierId, ethers.ZeroAddress)).wait();
  await (await nexus.connect(walletC).buyNftbWithTof(nftbTierId, ethers.ZeroAddress)).wait();

  await (await usdt.connect(walletB).approve(swapAddress, ethers.parseUnits("100", 18))).wait();
  await (await swap.connect(walletB).buyTot(ethers.parseUnits("100", 18), 0)).wait();

  const bTotBal = await tot.balanceOf(walletB.address);
  const sellAmount = bTotBal / 10n;
  await (await tot.connect(walletB).approve(swapAddress, sellAmount)).wait();
  await (await swap.connect(walletB).sellTot(sellAmount, 0)).wait();

  const stateB = await nexus.accounts(walletB.address);
  const stateC = await nexus.accounts(walletC.address);

  console.log("\n=== SEPOLIA TEST ACCOUNTS ===");
  console.log("A:", walletA.address);
  console.log("A_PRIVATE_KEY:", walletA.privateKey);
  console.log("B:", walletB.address);
  console.log("B_PRIVATE_KEY:", walletB.privateKey);
  console.log("C:", walletC.address);
  console.log("C_PRIVATE_KEY:", walletC.privateKey);

  console.log("\n=== REFERRAL STATUS ===");
  console.log("B.referrer:", stateB.referrer);
  console.log("C.referrer:", stateC.referrer);

  console.log("\n=== CORE ADDRESSES ===");
  console.log("TOT:", totAddress);
  console.log("TOF:", tofAddress);
  console.log("USDT:", usdtAddress);
  console.log("NEXUS:", nexusAddress);
  console.log("SWAP:", swapAddress);

  console.log("\nSepolia A/B/C funding + binding + first-round trades completed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
