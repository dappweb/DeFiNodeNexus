const hre = require("hardhat");

async function main() {
  console.log("Testing enumerable admin functionality locally...\n");

  const [owner, admin1, admin2, admin3, nonAdmin] = await hre.ethers.getSigners();

  // Deploy mock ERC20 tokens
  const MockToken = await hre.ethers.getContractFactory("TOTToken");
  const tot = await hre.upgrades.deployProxy(
    MockToken,
    ["TOT", "TOT", hre.ethers.parseUnits("1000000000", 18), hre.ethers.parseUnits("1000000000", 18), owner.address],
    { kind: "uups", initializer: "initialize" }
  );
  const tof = await hre.upgrades.deployProxy(
    MockToken,
    ["TOF", "TOF", hre.ethers.parseUnits("10000000000", 18), 0, owner.address],
    { kind: "uups", initializer: "initialize" }
  );
  const usdt = await hre.upgrades.deployProxy(
    MockToken,
    ["USDT", "USDT", hre.ethers.parseUnits("1000000000", 18), hre.ethers.parseUnits("1000000000", 18), owner.address],
    { kind: "uups", initializer: "initialize" }
  );

  // Deploy DeFiNodeNexus with proxy
  const Factory = await hre.ethers.getContractFactory("DeFiNodeNexus");
  const nexus = await hre.upgrades.deployProxy(
    Factory,
    [
      await tot.getAddress(),
      await tof.getAddress(),
      await usdt.getAddress(),
      owner.address,
    ],
    { kind: "uups", initializer: "initialize" }
  );
  await nexus.waitForDeployment();
  console.log("✅ DeFiNodeNexus deployed at:", await nexus.getAddress());

  // Initially no admins
  let count = await nexus.getAdminCount();
  console.log("Initial admin count:", count.toString());

  // Add admins
  console.log("\nAdding admins...");
  await nexus.setAdmin(admin1.address, true);
  await nexus.setAdmin(admin2.address, true);
  await nexus.setAdmin(admin3.address, true);
  console.log("✅ Added 3 admins");

  // Test getAdminCount
  count = await nexus.getAdminCount();
  console.log("Admin count after adding:", count.toString());

  // Test getAdmins paginated
  const admins = await nexus.getAdmins(0, 10);
  console.log("\nPaginated admins (offset=0, limit=10):");
  admins.forEach((addr, idx) => {
    console.log(`  [${idx}] ${addr}`);
  });

  // Test isAdminAddress
  console.log("\nAdmin checks:");
  console.log("  admin1 is admin?", await nexus.isAdminAddress(admin1.address));
  console.log("  admin2 is admin?", await nexus.isAdminAddress(admin2.address));
  console.log("  nonAdmin is admin?", await nexus.isAdminAddress(nonAdmin.address));

  // Remove an admin
  console.log("\nRemoving admin2...");
  await nexus.setAdmin(admin2.address, false);
  console.log("✅ Removed admin2");

  count = await nexus.getAdminCount();
  console.log("Admin count after removal:", count.toString());

  const adminsAfter = await nexus.getAdmins(0, 10);
  console.log("Admins after removal:");
  adminsAfter.forEach((addr, idx) => {
    console.log(`  [${idx}] ${addr}`);
  });

  console.log("\n✅ All tests passed!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
