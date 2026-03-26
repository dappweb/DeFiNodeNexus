require("dotenv").config();
const { ethers } = require("ethers");

const NEXUS_ABI = [
  "function owner() view returns (address)",
  "function nftbTiers(uint256) view returns (uint256 price, uint256 weight, uint256 maxSupply, uint256 usdtMinted, uint256 tofMinted, uint256 dividendBps, bool isActive)",
  "function configureNftbTier(uint256 tierId, uint256 price, uint256 weight, uint256 maxSupply, uint256 dividendBps, bool isActive) external returns (uint256)",
];

const TARGET_NFTB_TIERS = [
  { tierId: 1, price: "500", weight: 1, maxSupply: 2000, dividendBps: 2000, isActive: true },
  { tierId: 2, price: "1000", weight: 2, maxSupply: 2000, dividendBps: 3000, isActive: true },
  { tierId: 3, price: "2000", weight: 3, maxSupply: 2000, dividendBps: 4000, isActive: true },
];

function toUnits(value) {
  return ethers.parseUnits(value, 18);
}

function equalTier(actual, target) {
  return (
    actual.price === toUnits(target.price) &&
    actual.weight === BigInt(target.weight) &&
    actual.maxSupply === BigInt(target.maxSupply) &&
    actual.dividendBps === BigInt(target.dividendBps) &&
    actual.isActive === target.isActive
  );
}

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const nexusAddress = process.env.NEXUS_ADDRESS || process.env.NEXT_PUBLIC_NEXUS_ADDRESS || "0x2cc1Ebf7185F4810C620e0A7D3300B1e381f3b44";

  if (!rpcUrl) throw new Error("Missing SEPOLIA_RPC_URL");
  if (!privateKey) throw new Error("Missing DEPLOYER_PRIVATE_KEY");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const nexus = new ethers.Contract(nexusAddress, NEXUS_ABI, wallet);

  const owner = await nexus.owner();
  if (wallet.address.toLowerCase() !== owner.toLowerCase()) {
    throw new Error(`Signer is not owner. signer=${wallet.address}, owner=${owner}`);
  }

  console.log(`[fix-nftb] nexus=${nexusAddress}`);
  console.log(`[fix-nftb] signer=${wallet.address}`);

  for (const target of TARGET_NFTB_TIERS) {
    const current = await nexus.nftbTiers(BigInt(target.tierId));
    const currentInfo = {
      tierId: target.tierId,
      price: ethers.formatUnits(current.price, 18),
      weight: current.weight.toString(),
      maxSupply: current.maxSupply.toString(),
      dividendBps: current.dividendBps.toString(),
      isActive: current.isActive,
    };

    if (equalTier(current, target)) {
      console.log(`[fix-nftb] tier ${target.tierId} already correct, skip`);
      continue;
    }

    console.log(`[fix-nftb] updating tier ${target.tierId}:`, currentInfo);
    const tx = await nexus.configureNftbTier(
      BigInt(target.tierId),
      toUnits(target.price),
      BigInt(target.weight),
      BigInt(target.maxSupply),
      BigInt(target.dividendBps),
      target.isActive
    );
    const receipt = await tx.wait();
    console.log(`[fix-nftb] tier ${target.tierId} tx mined: ${receipt.hash}`);
  }

  console.log("[fix-nftb] completed");
}

main().catch((error) => {
  console.error(`[fix-nftb] failed: ${error.message}`);
  process.exitCode = 1;
});
