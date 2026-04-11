require("dotenv").config();
const { ethers } = require("ethers");

const NEXUS_ABI = [
  "function nftaTiers(uint256) view returns (uint256 price, uint256 dailyYield, uint256 maxSupply, uint256 currentSupply, bool isActive)",
  "function nftbTiers(uint256) view returns (uint256 price, uint256 weight, uint256 maxSupply, uint256 usdtMinted, uint256 tofMinted, uint256 dividendBps, bool isActive)",
  "function owner() view returns (address)",
  "function nextNftaTierId() view returns (uint256)",
  "function nextNftbTierId() view returns (uint256)",
];

const formatWAD = (value, decimals = 18) => {
  return Number(ethers.formatUnits(value, decimals)).toFixed(2);
};

async function main() {
  const rpcUrl = process.env.CNC_RPC_URL || process.env.NEXT_PUBLIC_CNC_RPC_URL;
  const nexusAddress = process.env.NEXUS_ADDRESS || process.env.NEXT_PUBLIC_NEXUS_ADDRESS;

  if (!rpcUrl || !nexusAddress) {
    console.error("Missing required environment variables:");
    console.error(`  CNC_RPC_URL: ${rpcUrl ? "✓" : "✗"}`);
    console.error(`  NEXUS_ADDRESS: ${nexusAddress ? "✓" : "✗"}`);
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const nexus = new ethers.Contract(nexusAddress, NEXUS_ABI, provider);

  console.log(`\n[check-tiers] Nexus Contract Status\n`);
  console.log(`Contract: ${nexusAddress}`);
  console.log(`RPC: ${rpcUrl}\n`);

  try {
    const owner = await nexus.owner();
    const nextNftaTierId = await nexus.nextNftaTierId();
    const nextNftbTierId = await nexus.nextNftbTierId();

    const nftaTierCount = Number(nextNftaTierId) - 1;
    const nftbTierCount = Number(nextNftbTierId) - 1;

    console.log(`Owner: ${owner}`);
    console.log(`NFTA Tier Count: ${nftaTierCount}`);
    console.log(`NFTB Tier Count: ${nftbTierCount}\n`);

    // Display NFTA tiers if any
    if (nftaTierCount > 0) {
      console.log(`📋 NFTA Tiers:\n`);
      for (let i = 1; i <= nftaTierCount; i++) {
        try {
          const tier = await nexus.nftaTiers(i);
          console.log(
            `   Tier ${i}: ${formatWAD(tier.price)} USDT | ${formatWAD(tier.dailyYield)} TOT/day | ` +
            `Max: ${tier.maxSupply} | Current: ${tier.currentSupply} | Status: ${tier.isActive ? "🟢" : "🔴"}`
          );
        } catch (e) {
          console.log(`   Tier ${i}: Error reading - ${e.message}`);
        }
      }
      console.log();
    }

    // Display NFTB tiers if any
    if (nftbTierCount > 0) {
      console.log(`📋 NFTB Tiers:\n`);
      for (let i = 1; i <= nftbTierCount; i++) {
        try {
          const tier = await nexus.nftbTiers(i);
          const dividendBps = Number(tier.dividendBps);
          console.log(
            `   Tier ${i}: ${formatWAD(tier.price)} USDT | Weight: ${tier.weight} | ` +
            `Dividend: ${(dividendBps / 100).toFixed(0)}% | Max: ${tier.maxSupply} | Status: ${tier.isActive ? "🟢" : "🔴"}`
          );
        } catch (e) {
          console.log(`   Tier ${i}: Error reading - ${e.message}`);
        }
      }
      console.log();
    }

    // Display expected vs actual
    console.log(`\n📊 Initialization Status:\n`);
    console.log(`Expected:  2 NFTA + 3 NFTB`);
    console.log(`Actual:    ${nftaTierCount} NFTA + ${nftbTierCount} NFTB`);

    if (nftaTierCount === 2 && nftbTierCount === 3) {
      console.log(`\n✅ Tiers are properly initialized!\n`);
    } else {
      console.log(`\n⚠️  Tiers need initialization. Run: OWNER_PRIVATE_KEY=<key> node scripts/init-tiers.js\n`);
    }
  } catch (error) {
    console.error(`\n❌ Error reading contract state:`, error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
