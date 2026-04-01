const hre = require("hardhat");

const { ethers, upgrades } = hre;

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function main() {
  const [owner, ecoWallet, nftaWallet, liquidityWallet, marketWallet, techWallet] = await ethers.getSigners();

  const TOTAL_SUPPLY = ethers.parseUnits("1000000000", 18); // 10亿 TOT
  const ALLOC_ECO = (TOTAL_SUPPLY * 5000n) / 10000n; // 50%
  const ALLOC_NFTA = (TOTAL_SUPPLY * 4000n) / 10000n; // 40%
  const ALLOC_LIQUIDITY = (TOTAL_SUPPLY * 600n) / 10000n; // 6%
  const ALLOC_MARKET = (TOTAL_SUPPLY * 300n) / 10000n; // 3%
  const ALLOC_TECH = (TOTAL_SUPPLY * 100n) / 10000n; // 1%

  const totalAllocation = ALLOC_ECO + ALLOC_NFTA + ALLOC_LIQUIDITY + ALLOC_MARKET + ALLOC_TECH;
  assertCondition(totalAllocation === TOTAL_SUPPLY, "50/40/6/3/1 allocation total must equal 100%");

  const monthlyTechUnlock = (ALLOC_TECH * 200n) / 10000n; // 每月释放 2%
  const yearlyTechUnlock = monthlyTechUnlock * 12n;

  const TOTToken = await ethers.getContractFactory("TOTToken");
  const tot = await upgrades.deployProxy(
    TOTToken,
    ["Truth Oracle Token", "TOT", TOTAL_SUPPLY, TOTAL_SUPPLY, owner.address],
    { kind: "uups", initializer: "initialize" }
  );
  await tot.waitForDeployment();

  const usdt = await upgrades.deployProxy(
    TOTToken,
    ["Mock USDT", "USDT", TOTAL_SUPPLY, TOTAL_SUPPLY, owner.address],
    { kind: "uups", initializer: "initialize" }
  );
  await usdt.waitForDeployment();

  const swapFactory = await ethers.getContractFactory("TOTSwap");
  const swap = await upgrades.deployProxy(
    swapFactory,
    [await tot.getAddress(), await usdt.getAddress(), owner.address],
    { kind: "uups", initializer: "initialize" }
  );
  await swap.waitForDeployment();

  // 按图中章1分配进行转账验证
  await (await tot.transfer(ecoWallet.address, ALLOC_ECO)).wait();
  await (await tot.transfer(nftaWallet.address, ALLOC_NFTA)).wait();
  await (await tot.transfer(liquidityWallet.address, ALLOC_LIQUIDITY)).wait();
  await (await tot.transfer(marketWallet.address, ALLOC_MARKET)).wait();
  await (await tot.transfer(techWallet.address, ALLOC_TECH)).wait();

  assertCondition((await tot.balanceOf(ecoWallet.address)) === ALLOC_ECO, "50% eco allocation mismatch");
  assertCondition((await tot.balanceOf(nftaWallet.address)) === ALLOC_NFTA, "40% node incentive allocation mismatch");
  assertCondition((await tot.balanceOf(liquidityWallet.address)) === ALLOC_LIQUIDITY, "6% liquidity allocation mismatch");
  assertCondition((await tot.balanceOf(marketWallet.address)) === ALLOC_MARKET, "3% market allocation mismatch");
  assertCondition((await tot.balanceOf(techWallet.address)) === ALLOC_TECH, "1% tech allocation mismatch");

  // 用 6% 流动池资金注入初始 6000万 TOT / 6000万 USDT
  await (await tot.connect(liquidityWallet).transfer(owner.address, ALLOC_LIQUIDITY)).wait();
  await (await usdt.transfer(owner.address, ALLOC_LIQUIDITY)).wait();

  const swapAddress = await swap.getAddress();
  await (await tot.approve(swapAddress, ALLOC_LIQUIDITY)).wait();
  await (await usdt.approve(swapAddress, ALLOC_LIQUIDITY)).wait();
  await (await swap.addLiquidity(ALLOC_LIQUIDITY, ALLOC_LIQUIDITY)).wait();

  const totReserve = await swap.totReserve();
  const usdtReserve = await swap.usdtReserve();
  assertCondition(totReserve === ALLOC_LIQUIDITY, "TOT reserve should equal 60,000,000 TOT");
  assertCondition(usdtReserve === ALLOC_LIQUIDITY, "USDT reserve should equal 60,000,000 USDT");

  console.log("✓ Chapter 1 tokenomics alignment passed");
  console.log("- Total supply:", ethers.formatUnits(TOTAL_SUPPLY, 18), "TOT");
  console.log("- 50% eco:", ethers.formatUnits(ALLOC_ECO, 18), "TOT");
  console.log("- 40% node incentive:", ethers.formatUnits(ALLOC_NFTA, 18), "TOT");
  console.log("- 6% liquidity:", ethers.formatUnits(ALLOC_LIQUIDITY, 18), "TOT");
  console.log("- 3% market management:", ethers.formatUnits(ALLOC_MARKET, 18), "TOT");
  console.log("- 1% tech:", ethers.formatUnits(ALLOC_TECH, 18), "TOT");
  console.log("- Tech monthly unlock at 2% of tech pool:", ethers.formatUnits(monthlyTechUnlock, 18), "TOT/month");
  console.log("- Tech yearly unlock (12 months):", ethers.formatUnits(yearlyTechUnlock, 18), "TOT/year");
  console.log("- Initial pool:", ethers.formatUnits(totReserve, 18), "TOT /", ethers.formatUnits(usdtReserve, 18), "USDT");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
