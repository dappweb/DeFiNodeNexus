const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function getEnv(names) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function parseOptionalBool(rawValue, envName) {
  if (rawValue === "") return undefined;

  const normalized = rawValue.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  throw new Error(`Invalid boolean value for ${envName}: ${rawValue}`);
}

function getSwapContractName() {
  return getEnv(["SWAP_CONTRACT_NAME"]) || "TOTSwap";
}

function getSwapProxyAddress(networkName) {
  const scoped = networkName === "cnc"
    ? ["UPGRADE_PROXY_ADDRESS", "SWAP_PROXY_ADDRESS", "SWAP_ADDRESS"]
    : ["UPGRADE_PROXY_ADDRESS", "SWAP_PROXY_ADDRESS", "SWAP_ADDRESS"];
  return getEnv(scoped);
}

function getSwapV3Config(networkName) {
  const isCnc = networkName === "cnc";
  return {
    nexusAddress: getEnv(isCnc
      ? ["SWAP_NEXUS_ADDRESS", "NEXUS_ADDRESS"]
      : ["SWAP_NEXUS_ADDRESS", "NEXUS_ADDRESS"]),
    routerAddress: getEnv(isCnc
      ? ["SWAP_DEX_ROUTER_ADDRESS", "CNC_SWAP_DEX_ROUTER_ADDRESS"]
      : ["SWAP_DEX_ROUTER_ADDRESS", "CNC_SWAP_DEX_ROUTER_ADDRESS"]),
    pairAddress: getEnv(isCnc
      ? ["SWAP_DEX_PAIR_ADDRESS", "CNC_SWAP_DEX_PAIR_ADDRESS"]
      : ["SWAP_DEX_PAIR_ADDRESS", "CNC_SWAP_DEX_PAIR_ADDRESS"]),
    factoryAddress: getEnv(isCnc
      ? ["SWAP_DEX_FACTORY_ADDRESS", "CNC_SWAP_DEX_FACTORY_ADDRESS"]
      : ["SWAP_DEX_FACTORY_ADDRESS", "CNC_SWAP_DEX_FACTORY_ADDRESS"]),
    enableExternalDex: parseOptionalBool(getEnv(["SWAP_ENABLE_EXTERNAL_DEX"]), "SWAP_ENABLE_EXTERNAL_DEX"),
    pauseSwap: parseOptionalBool(getEnv(["SWAP_PAUSE_SWAP"]), "SWAP_PAUSE_SWAP"),
  };
}

async function sendIfChanged(label, currentValue, nextValue, txFactory) {
  if (!nextValue || nextValue === ZERO_ADDRESS) {
    return { changed: false, skipped: true, reason: `${label} not provided` };
  }

  if (typeof currentValue === "string" && currentValue.toLowerCase() === nextValue.toLowerCase()) {
    return { changed: false, skipped: true, reason: `${label} unchanged` };
  }

  const tx = await txFactory();
  const receipt = await tx.wait();
  return { changed: true, hash: receipt.hash };
}

async function maybeConfigureSwapV3(hre, swap, options = {}) {
  const contractName = options.contractName || getSwapContractName();
  if (contractName !== "TOTSwapV3") {
    return { configured: false, externalDexEnabled: false };
  }

  const networkName = options.networkName || hre.network.name;
  const config = getSwapV3Config(networkName);
  const currentNexus = await swap.nexus().catch(() => "");
  const currentRouterConfig = await swap.getRouterConfig().catch(() => [ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, false, false]);
  const [currentRouter, currentPair, currentFactory, currentEnabled, currentPaused] = currentRouterConfig;

  const results = {
    configured: true,
    nexus: null,
    factory: null,
    router: null,
    pair: null,
    externalDexEnabled: currentEnabled,
    swapPaused: currentPaused,
  };

  if (config.nexusAddress) {
    results.nexus = await sendIfChanged(
      "nexus",
      currentNexus,
      config.nexusAddress,
      () => swap.setNexus(config.nexusAddress)
    );
  }

  if (config.factoryAddress) {
    results.factory = await sendIfChanged(
      "dexFactory",
      currentFactory,
      config.factoryAddress,
      () => swap.setDexFactory(config.factoryAddress)
    );
  }

  if (config.routerAddress) {
    results.router = await sendIfChanged(
      "dexRouter",
      currentRouter,
      config.routerAddress,
      () => swap.setDexRouter(config.routerAddress)
    );
  }

  if (config.pairAddress) {
    results.pair = await sendIfChanged(
      "dexPair",
      currentPair,
      config.pairAddress,
      () => swap.setDexPair(config.pairAddress)
    );
  }

  if (typeof config.enableExternalDex === "boolean" && config.enableExternalDex !== currentEnabled) {
    const tx = await swap.setExternalDexEnabled(config.enableExternalDex);
    const receipt = await tx.wait();
    results.externalDexEnabled = config.enableExternalDex;
    results.externalDexHash = receipt.hash;
  }

  if (typeof config.pauseSwap === "boolean" && config.pauseSwap !== currentPaused) {
    const tx = await swap.setSwapPaused(config.pauseSwap);
    const receipt = await tx.wait();
    results.swapPaused = config.pauseSwap;
    results.swapPausedHash = receipt.hash;
  }

  return results;
}

module.exports = {
  ZERO_ADDRESS,
  getSwapContractName,
  getSwapProxyAddress,
  getSwapV3Config,
  maybeConfigureSwapV3,
};