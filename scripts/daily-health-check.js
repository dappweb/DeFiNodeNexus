require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const SWAP_ABI = [
  "function timeUntilNextDeflation() view returns (uint256)",
  "function lastDeflationTime() view returns (uint256)",
  "function nftbDividendPool() view returns (uint256)",
  "function distributionThreshold() view returns (uint256)",
  "function totReserve() view returns (uint256)",
  "function usdtReserve() view returns (uint256)",
  "function owner() view returns (address)",
  "function nexus() view returns (address)",
];

const NEXUS_ABI = [
  "function owner() view returns (address)",
  "function treasury() view returns (address)",
  "function projectWallet() view returns (address)",
  "function tofBurnBps() view returns (uint256)",
  "function tofClaimFeeBps() view returns (uint256)",
];

function resolvePath(input, fallback) {
  const target = input || fallback;
  return path.isAbsolute(target) ? target : path.join(process.cwd(), target);
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

async function sendAlert(message) {
  const discordWebhook = process.env.DISCORD_WEBHOOK_URL;
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;
  const jobs = [];

  if (discordWebhook) {
    jobs.push(fetch(discordWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    }).catch(() => null));
  }

  if (telegramToken && telegramChatId) {
    jobs.push(fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: telegramChatId, text: message }),
    }).catch(() => null));
  }

  if (jobs.length > 0) {
    await Promise.allSettled(jobs);
  }
}

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const swapAddress = process.env.SWAP_ADDRESS || process.env.NEXT_PUBLIC_SWAP_ADDRESS;
  const nexusAddress = process.env.NEXUS_ADDRESS || process.env.NEXT_PUBLIC_NEXUS_ADDRESS;
  const reportPath = resolvePath(process.env.HEALTH_REPORT_FILE, "runtime/health/latest-health-check.json");

  if (!rpcUrl || !swapAddress || !nexusAddress) {
    throw new Error("Missing SEPOLIA_RPC_URL, SWAP_ADDRESS/NEXT_PUBLIC_SWAP_ADDRESS, or NEXUS_ADDRESS/NEXT_PUBLIC_NEXUS_ADDRESS");
  }

  const minTotReserve = Number(process.env.MIN_TOT_RESERVE || "10000");
  const minUsdtReserve = Number(process.env.MIN_USDT_RESERVE || "1000");
  const maxDeflationDelayHours = Number(process.env.MAX_DEFLATION_DELAY_HOURS || "6");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const swap = new ethers.Contract(swapAddress, SWAP_ABI, provider);
  const nexus = new ethers.Contract(nexusAddress, NEXUS_ABI, provider);

  const [
    countdown,
    lastDeflationTime,
    dividendPool,
    distributionThreshold,
    totReserve,
    usdtReserve,
    swapOwner,
    linkedNexus,
    nexusOwner,
    treasury,
    projectWallet,
    tofBurnBps,
    tofClaimFeeBps,
  ] = await Promise.all([
    swap.timeUntilNextDeflation(),
    swap.lastDeflationTime(),
    swap.nftbDividendPool(),
    swap.distributionThreshold(),
    swap.totReserve(),
    swap.usdtReserve(),
    swap.owner(),
    swap.nexus(),
    nexus.owner(),
    nexus.treasury(),
    nexus.projectWallet(),
    nexus.tofBurnBps(),
    nexus.tofClaimFeeBps(),
  ]);

  const keeperStatusFile = resolvePath(process.env.KEEPER_STATUS_FILE, "runtime/keeper/latest-run.json");
  let keeperStatus = null;
  if (fs.existsSync(keeperStatusFile)) {
    try {
      keeperStatus = JSON.parse(fs.readFileSync(keeperStatusFile, "utf8"));
    } catch {
      keeperStatus = null;
    }
  }

  const now = Date.now();
  const lastDeflationTs = Number(lastDeflationTime) * 1000;
  const deflationDelayHours = lastDeflationTs > 0 ? (now - lastDeflationTs) / 3600000 : null;
  const totReserveNum = Number(ethers.formatUnits(totReserve, 18));
  const usdtReserveNum = Number(ethers.formatUnits(usdtReserve, 18));
  const dividendPoolNum = Number(ethers.formatUnits(dividendPool, 18));
  const distributionThresholdNum = Number(ethers.formatUnits(distributionThreshold, 18));

  const warnings = [];
  if (totReserveNum < minTotReserve) warnings.push(`TOT reserve low: ${totReserveNum} < ${minTotReserve}`);
  if (usdtReserveNum < minUsdtReserve) warnings.push(`USDT reserve low: ${usdtReserveNum} < ${minUsdtReserve}`);
  if (deflationDelayHours !== null && deflationDelayHours > maxDeflationDelayHours) {
    warnings.push(`Deflation delayed: ${deflationDelayHours.toFixed(2)}h > ${maxDeflationDelayHours}h`);
  }
  if (dividendPoolNum >= distributionThresholdNum && distributionThresholdNum > 0) {
    warnings.push(`Dividend pool waiting for distribution: ${dividendPoolNum} >= ${distributionThresholdNum}`);
  }
  if (keeperStatus && keeperStatus.status && keeperStatus.status !== "success") {
    warnings.push(`Last keeper run status: ${keeperStatus.status}`);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    status: warnings.length === 0 ? "ok" : "warn",
    warnings,
    swap: {
      address: swapAddress,
      owner: swapOwner,
      linkedNexus,
      totReserve: totReserveNum,
      usdtReserve: usdtReserveNum,
      dividendPool: dividendPoolNum,
      distributionThreshold: distributionThresholdNum,
      deflationCountdownSeconds: Number(countdown),
      lastDeflationTime: new Date(lastDeflationTs).toISOString(),
      deflationDelayHours,
    },
    nexus: {
      address: nexusAddress,
      owner: nexusOwner,
      treasury,
      projectWallet,
      tofBurnBps: Number(tofBurnBps),
      tofClaimFeeBps: Number(tofClaimFeeBps),
    },
    keeper: keeperStatus,
  };

  ensureDir(reportPath);
  fs.writeFileSync(reportPath, JSON.stringify(payload, null, 2));

  console.log(JSON.stringify(payload, null, 2));

  if (warnings.length > 0) {
    await sendAlert(`[DeFiNodeNexus][health-check] warnings detected\n${warnings.join("\n")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});