const hre = require("hardhat");

/**
 * Seed TOTSwap with initial liquidity (6% TOT + matching USDT).
 * Reads addresses from .env or uses defaults from previous local deployment.
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const swapAddr = process.env.SWAP_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const totAddr  = process.env.TOT_TOKEN_ADDRESS || "0x7091Fe8Aaf5b5Bb327F903fF3488fc0D82c44a4b";
  const usdtAddr = process.env.USDT_TOKEN_ADDRESS || "0x3E12B98Fc5b469f06939883d782bD894cc02240C";

  // 6% of 1B = 60,000,000 TOT; match with 60,000,000 USDT (1:1 initial price)
  const seedTotRaw  = process.env.SWAP_SEED_TOT  || "60000000";
  const seedUsdtRaw = process.env.SWAP_SEED_USDT || "60000000";

  const seedTot  = hre.ethers.parseUnits(seedTotRaw, 18);
  const seedUsdt = hre.ethers.parseUnits(seedUsdtRaw, 18);

  console.log("Deployer:", deployer.address);
  console.log("TOTSwap: ", swapAddr);
  console.log("TOT:     ", totAddr);
  console.log("USDT:    ", usdtAddr);
  console.log("Seed TOT:", seedTotRaw);
  console.log("Seed USDT:", seedUsdtRaw);

  const tot  = await hre.ethers.getContractAt("IERC20", totAddr);
  const usdt = await hre.ethers.getContractAt("IERC20", usdtAddr);
  const swap = await hre.ethers.getContractAt("TOTSwap", swapAddr);

  // Check balances
  const totBal  = await tot.balanceOf(deployer.address);
  const usdtBal = await usdt.balanceOf(deployer.address);
  console.log("\nDeployer TOT balance: ", hre.ethers.formatUnits(totBal, 18));
  console.log("Deployer USDT balance:", hre.ethers.formatUnits(usdtBal, 18));

  if (totBal < seedTot) throw new Error(`Insufficient TOT: have ${hre.ethers.formatUnits(totBal, 18)}, need ${seedTotRaw}`);
  if (usdtBal < seedUsdt) throw new Error(`Insufficient USDT: have ${hre.ethers.formatUnits(usdtBal, 18)}, need ${seedUsdtRaw}`);

  // Approve
  console.log("\nApproving TOT...");
  await (await tot.approve(swapAddr, seedTot)).wait();

  console.log("Approving USDT...");
  await (await usdt.approve(swapAddr, seedUsdt)).wait();

  // Add liquidity
  console.log("Adding liquidity...");
  await (await swap.addLiquidity(seedTot, seedUsdt)).wait();

  // Verify
  const totReserve  = await swap.totReserve();
  const usdtReserve = await swap.usdtReserve();
  console.log("\n=== Liquidity Seeded ===");
  console.log("TOT reserve: ", hre.ethers.formatUnits(totReserve, 18));
  console.log("USDT reserve:", hre.ethers.formatUnits(usdtReserve, 18));
  console.log("Initial price:", hre.ethers.formatUnits(await swap.getCurrentPrice(), 18), "USDT/TOT");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
