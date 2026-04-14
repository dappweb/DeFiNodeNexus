const hre = require("hardhat");
const { getSwapContractName } = require("./lib/swap-v3");

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ERC1967_PROXY_FQN = "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy";

function getEnv(name) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function getErrorMessage(error) {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (error.message) return error.message;
  return String(error);
}

function isAlreadyVerifiedError(error) {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes("already verified")
    || message.includes("source code already verified")
    || message.includes("contract source code already verified")
    || message.includes("smart-contract already verified");
}

async function resolveOwnerAddress() {
  const deployerPrivateKey = getEnv("DEPLOYER_PRIVATE_KEY");
  const ownerPrivateKey = getEnv("OWNER_PRIVATE_KEY") || deployerPrivateKey;
  const [deployer] = await hre.ethers.getSigners();

  if (!ownerPrivateKey || ownerPrivateKey === deployerPrivateKey) {
    return deployer.address;
  }

  return new hre.ethers.Wallet(ownerPrivateKey).address;
}

async function resolveImplementationAddress(address) {
  try {
    const implementation = await hre.upgrades.erc1967.getImplementationAddress(address);
    return implementation && implementation !== ZERO_ADDRESS ? implementation : "";
  } catch {
    return "";
  }
}

async function runVerify(taskArgs, label) {
  try {
    await hre.run("verify:verify", taskArgs);
    console.log(`Verified ${label}`);
  } catch (error) {
    if (isAlreadyVerifiedError(error)) {
      console.log(`Already verified ${label}`);
      return;
    }
    throw error;
  }
}

async function encodeInitializer(factoryName, args) {
  const factory = await hre.ethers.getContractFactory(factoryName);
  return factory.interface.encodeFunctionData("initialize", args);
}

async function verifyTarget(target) {
  const configuredAddress = getEnv(target.envVar);
  if (!configuredAddress || configuredAddress === ZERO_ADDRESS) {
    console.log(`Skipping ${target.label}: ${target.envVar} is not set`);
    return;
  }

  const implementationAddress = await resolveImplementationAddress(configuredAddress);
  const sourceAddress = implementationAddress || configuredAddress;

  console.log(`\n=== ${target.label} ===`);
  if (implementationAddress) {
    console.log(`Proxy: ${configuredAddress}`);
    console.log(`Implementation: ${implementationAddress}`);
  } else {
    console.log(`Address: ${configuredAddress}`);
  }

  await runVerify(
    {
      address: sourceAddress,
      contract: target.contract,
      constructorArguments: [],
    },
    `${target.label} implementation`
  );

  if (!implementationAddress || !target.proxyFactoryName || !target.proxyInitializerArgs) {
    return;
  }

  const initializerData = await encodeInitializer(target.proxyFactoryName, target.proxyInitializerArgs);
  await runVerify(
    {
      address: configuredAddress,
      contract: ERC1967_PROXY_FQN,
      constructorArguments: [implementationAddress, initializerData],
    },
    `${target.label} proxy`
  );
}

async function main() {
  if (hre.network.name !== "cnc") {
    throw new Error(`This script must run on the cnc network, received: ${hre.network.name}`);
  }

  const totToken = getEnv("TOT_TOKEN_ADDRESS");
  const tofToken = getEnv("TOF_TOKEN_ADDRESS");
  const usdtToken = getEnv("USDT_TOKEN_ADDRESS");
  const ownerAddress = await resolveOwnerAddress();
  const swapContractName = getSwapContractName();
  const swapContractFqn = `contracts/${swapContractName}.sol:${swapContractName}`;

  const targets = [
    {
      label: "TOTToken",
      envVar: "TOT_TOKEN_ADDRESS",
      contract: "contracts/TOTToken.sol:TOTToken",
    },
    {
      label: "TOFToken",
      envVar: "TOF_TOKEN_ADDRESS",
      contract: "contracts/TOFToken.sol:TOFToken",
    },
    {
      label: "DeFiNodeNexus",
      envVar: "NEXUS_ADDRESS",
      contract: "contracts/DeFiNodeNexus.sol:DeFiNodeNexus",
      proxyFactoryName: "DeFiNodeNexus",
      proxyInitializerArgs: [totToken, tofToken, usdtToken, ownerAddress],
    },
    {
      label: swapContractName,
      envVar: "SWAP_ADDRESS",
      contract: swapContractFqn,
      proxyFactoryName: swapContractName,
      proxyInitializerArgs: [totToken, usdtToken, ownerAddress],
    },
  ];

  console.log("Verifying CNC contracts via Blockscout...");
  console.log(`Explorer: https://cncchainpro.com`);
  console.log(`API:      https://cncchainpro.com/api`);

  for (const target of targets) {
    await verifyTarget(target);
  }

  console.log("\nVerification run finished.");
}

main().catch((error) => {
  console.error(getErrorMessage(error));
  process.exitCode = 1;
});