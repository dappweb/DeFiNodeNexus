/**
 * Local deployment test — deploys all core contracts on Hardhat's built-in
 * network to verify compilation + deployment under Solidity 0.8.20 / london.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-local-test.js
 */
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Network:", hre.network.name);
  console.log();

  // ── 1. TOTToken ───────────────────────────────────────────────
  console.log("--- Deploying TOTToken ---");
  const TOTToken = await hre.ethers.getContractFactory("TOTToken");
  const tot = await hre.upgrades.deployProxy(
    TOTToken,
    ["TOT Token", "TOT", hre.ethers.parseUnits("1000000000", 18), hre.ethers.parseUnits("1000000000", 18), deployer.address],
    { kind: "uups", initializer: "initialize" }
  );
  await tot.waitForDeployment();
  const totAddr = await tot.getAddress();
  console.log("TOTToken deployed to:", totAddr);

  // ── 2. TOFToken ───────────────────────────────────────────────
  console.log("\n--- Deploying TOFToken ---");
  const TOFToken = await hre.ethers.getContractFactory("TOFToken");
  const tof = await hre.upgrades.deployProxy(
    TOFToken,
    ["TOF Token", "TOF", hre.ethers.parseUnits("1000000000", 18), hre.ethers.parseUnits("1000000000", 18), deployer.address],
    { kind: "uups", initializer: "initialize" }
  );
  await tof.waitForDeployment();
  const tofAddr = await tof.getAddress();
  console.log("TOFToken deployed to:", tofAddr);

  // ── 3. Mock USDT (reuse TOTToken as ERC20) ────────────────────
  console.log("\n--- Deploying Mock USDT ---");
  const MockUSDT = await hre.ethers.getContractFactory("TOTToken");
  const usdt = await hre.upgrades.deployProxy(
    MockUSDT,
    ["Mock USDT", "USDT", hre.ethers.parseUnits("1000000000", 18), hre.ethers.parseUnits("1000000000", 18), deployer.address],
    { kind: "uups", initializer: "initialize" }
  );
  await usdt.waitForDeployment();
  const usdtAddr = await usdt.getAddress();
  console.log("Mock USDT deployed to:", usdtAddr);

  // ── 4. DeFiNodeNexus ──────────────────────────────────────────
  console.log("\n--- Deploying DeFiNodeNexus ---");
  const DeFiNodeNexus = await hre.ethers.getContractFactory("DeFiNodeNexus");
  const nexus = await hre.upgrades.deployProxy(
    DeFiNodeNexus,
    [totAddr, tofAddr, usdtAddr, deployer.address],
    { kind: "uups", initializer: "initialize" }
  );
  await nexus.waitForDeployment();
  const nexusAddr = await nexus.getAddress();
  console.log("DeFiNodeNexus deployed to:", nexusAddr);

  // ── 5. TOTSwap ────────────────────────────────────────────────
  console.log("\n--- Deploying TOTSwap ---");
  const TOTSwap = await hre.ethers.getContractFactory("TOTSwap");
  const swap = await hre.upgrades.deployProxy(
    TOTSwap,
    [totAddr, usdtAddr, deployer.address],
    { kind: "uups", initializer: "initialize" }
  );
  await swap.waitForDeployment();
  const swapAddr = await swap.getAddress();
  console.log("TOTSwap deployed to:", swapAddr);

  // ── Summary ───────────────────────────────────────────────────
  console.log("\n========== Deployment Summary ==========");
  console.log("TOTToken:       ", totAddr);
  console.log("TOFToken:       ", tofAddr);
  console.log("Mock USDT:      ", usdtAddr);
  console.log("DeFiNodeNexus:  ", nexusAddr);
  console.log("TOTSwap:        ", swapAddr);
  console.log("=========================================");
  console.log("\nAll contracts deployed successfully on", hre.network.name, "with Solidity 0.8.20 + evmVersion london");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
