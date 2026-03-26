require("dotenv").config();
const { ethers } = require("ethers");

const NEXUS_ABI = [
  "function nftaTiers(uint256) view returns (uint256 price, uint256 dailyYield, uint256 maxSupply, uint256 currentSupply, bool isActive)",
  "function nftbTiers(uint256) view returns (uint256 price, uint256 weight, uint256 maxSupply, uint256 usdtMinted, uint256 tofMinted, uint256 dividendBps, bool isActive)",
];

const expectedNfta = {
  1: { price: "500", dailyYield: "6.5", maxSupply: "10000", isActive: true },
  2: { price: "1000", dailyYield: "20", maxSupply: "5000", isActive: true },
};

const expectedNftb = {
  1: { price: "500", weight: "1", maxSupply: "2000", dividendBps: "2000", isActive: true },
  2: { price: "1000", weight: "2", maxSupply: "2000", dividendBps: "3000", isActive: true },
  3: { price: "2000", weight: "3", maxSupply: "2000", dividendBps: "4000", isActive: true },
};

function toUnits(value) {
  return ethers.parseUnits(value, 18);
}

function ensureEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} mismatch: expected=${expected}, actual=${actual}`);
  }
}

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const nexusAddress = process.env.NEXUS_ADDRESS || process.env.NEXT_PUBLIC_NEXUS_ADDRESS || "0x2cc1Ebf7185F4810C620e0A7D3300B1e381f3b44";

  if (!rpcUrl) {
    throw new Error("Missing SEPOLIA_RPC_URL");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const nexus = new ethers.Contract(nexusAddress, NEXUS_ABI, provider);

  console.log(`[check-fixed-tiers] nexus=${nexusAddress}`);

  for (const [tierId, spec] of Object.entries(expectedNfta)) {
    const tier = await nexus.nftaTiers(BigInt(tierId));
    ensureEqual(tier.price.toString(), toUnits(spec.price).toString(), `NFTA#${tierId}.price`);
    ensureEqual(tier.dailyYield.toString(), toUnits(spec.dailyYield).toString(), `NFTA#${tierId}.dailyYield`);
    ensureEqual(tier.maxSupply.toString(), spec.maxSupply, `NFTA#${tierId}.maxSupply`);
    ensureEqual(tier.isActive, spec.isActive, `NFTA#${tierId}.isActive`);
  }

  for (const [tierId, spec] of Object.entries(expectedNftb)) {
    const tier = await nexus.nftbTiers(BigInt(tierId));
    ensureEqual(tier.price.toString(), toUnits(spec.price).toString(), `NFTB#${tierId}.price`);
    ensureEqual(tier.weight.toString(), spec.weight, `NFTB#${tierId}.weight`);
    ensureEqual(tier.maxSupply.toString(), spec.maxSupply, `NFTB#${tierId}.maxSupply`);
    ensureEqual(tier.dividendBps.toString(), spec.dividendBps, `NFTB#${tierId}.dividendBps`);
    ensureEqual(tier.isActive, spec.isActive, `NFTB#${tierId}.isActive`);
  }

  console.log("[check-fixed-tiers] PASS: fixed NFTA/NFTB tiers are consistent with spec");
}

main().catch((error) => {
  console.error(`[check-fixed-tiers] FAIL: ${error.message}`);
  process.exitCode = 1;
});