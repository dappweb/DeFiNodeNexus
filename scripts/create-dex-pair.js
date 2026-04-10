const hre = require("hardhat");

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const ROUTER_ABI = [
  "function factory() external view returns (address)",
];

const FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address)",
  "function createPair(address tokenA, address tokenB) external returns (address)",
];

function readEnv(name) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function requireAddress(name) {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  if (!hre.ethers.isAddress(value)) {
    throw new Error(`Invalid ${name}: ${value}`);
  }
  return value;
}

async function main() {
  const routerAddress = requireAddress("ROUTER_ADDRESS");
  const tokenA = requireAddress("TOKEN_A_ADDRESS");
  const tokenB = requireAddress("TOKEN_B_ADDRESS");

  if (tokenA.toLowerCase() === tokenB.toLowerCase()) {
    throw new Error("TOKEN_A_ADDRESS and TOKEN_B_ADDRESS must be different");
  }

  const [signer] = await hre.ethers.getSigners();
  if (!signer) {
    throw new Error("No signer found. Check DEPLOYER_PRIVATE_KEY in environment.");
  }

  const network = await hre.ethers.provider.getNetwork();
  console.log("Create DEX Pair");
  console.log("Network: ", `${network.name} (${network.chainId})`);
  console.log("Signer:  ", signer.address);
  console.log("Router:  ", routerAddress);
  console.log("Token A: ", tokenA);
  console.log("Token B: ", tokenB);

  const router = new hre.ethers.Contract(routerAddress, ROUTER_ABI, signer);
  const factoryAddress = await router.factory();
  if (!factoryAddress || factoryAddress === ZERO_ADDRESS) {
    throw new Error("Router returned zero factory address");
  }
  console.log("Factory: ", factoryAddress);

  const factory = new hre.ethers.Contract(factoryAddress, FACTORY_ABI, signer);
  const existingPair = await factory.getPair(tokenA, tokenB);
  if (existingPair && existingPair !== ZERO_ADDRESS) {
    console.log("Pair already exists:", existingPair);
    return;
  }

  const tx = await factory.createPair(tokenA, tokenB);
  console.log("createPair tx:", tx.hash);
  await tx.wait();

  const newPair = await factory.getPair(tokenA, tokenB);
  if (!newPair || newPair === ZERO_ADDRESS) {
    throw new Error("Pair creation transaction mined but pair address is zero");
  }

  console.log("Pair created:", newPair);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});