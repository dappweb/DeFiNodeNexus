require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

/**
 * Keeper Bot — periodically triggers:
 *   1. TOTSwap.deflate()        — every 4 hours
 *   2. TOTSwap.forceDistribute() — when nftbDividendPool >= distributionThreshold (TOT)
 *   3. TOTSwap.forceDistribute() — when nftbUsdtDividendPool >= usdtDistributionThreshold (USDT)
 *
 * Trigger methods:
 *   A) Standalone daemon:    node scripts/keeper.js
 *   B) One-shot (for cron):  node scripts/keeper.js --once
 *   C) Next.js API route:    POST /api/keeper?token=KEEPER_SECRET
 *
 * Required .env:
 *   CNC_RPC_URL (or SEPOLIA_RPC_URL), DEPLOYER_PRIVATE_KEY, SWAP_ADDRESS
 *
 * Optional .env:
 *   KEEPER_INTERVAL_MS  — loop interval in ms (default: 600000 = 10 min)
 *   KEEPER_LOCK_FILE    — absolute or relative lock file path
 *   KEEPER_STATUS_FILE  — absolute or relative status json path
 *   DISCORD_WEBHOOK_URL — optional webhook for failure alerts
 *   TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID — optional telegram alert channel
 */

const SWAP_ABI = [
  "function deflate() external",
  "function forceDistribute() external",
  "function timeUntilNextDeflation() view returns (uint256)",
  "function nftbDividendPool() view returns (uint256)",
  "function distributionThreshold() view returns (uint256)",
  "function nftbUsdtDividendPool() view returns (uint256)",
  "function usdtDistributionThreshold() view returns (uint256)",
  "function totReserve() view returns (uint256)",
  "function usdtReserve() view returns (uint256)",
  "function lastDeflationTime() view returns (uint256)",
  "function owner() view returns (address)",
];

function getConfig() {
  const rpcUrl = process.env.CNC_RPC_URL || process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const swapAddress = process.env.SWAP_ADDRESS;
  const lockFile = resolveRuntimePath(process.env.KEEPER_LOCK_FILE || "runtime/keeper/keeper.lock");
  const statusFile = resolveRuntimePath(process.env.KEEPER_STATUS_FILE || "runtime/keeper/latest-run.json");

  if (!rpcUrl) throw new Error("Missing CNC_RPC_URL (or SEPOLIA_RPC_URL)");
  if (!privateKey) throw new Error("Missing DEPLOYER_PRIVATE_KEY");
  if (!swapAddress || swapAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("Missing or zero SWAP_ADDRESS");
  }

  return { rpcUrl, privateKey, swapAddress, lockFile, statusFile };
}

function resolveRuntimePath(targetPath) {
  return path.isAbsolute(targetPath)
    ? targetPath
    : path.join(process.cwd(), targetPath);
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function acquireLock(lockFile) {
  ensureParentDir(lockFile);
  try {
    const fd = fs.openSync(lockFile, "wx");
    fs.writeFileSync(fd, String(process.pid));
    return () => {
      try {
        fs.closeSync(fd);
      } catch {}
      try {
        fs.unlinkSync(lockFile);
      } catch {}
    };
  } catch (error) {
    if (error && error.code === "EEXIST") {
      throw new Error(`Keeper already running: ${lockFile}`);
    }
    throw error;
  }
}

function writeStatus(statusFile, payload) {
  ensureParentDir(statusFile);
  fs.writeFileSync(statusFile, JSON.stringify(payload, null, 2));
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

function createSwapContract() {
  const cfg = getConfig();
  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const wallet = new ethers.Wallet(cfg.privateKey, provider);
  const swap = new ethers.Contract(cfg.swapAddress, SWAP_ABI, wallet);
  return { swap, wallet, provider };
}

async function runKeeper() {
  const cfg = getConfig();
  const releaseLock = acquireLock(cfg.lockFile);
  const { swap, wallet } = createSwapContract();
  const startedAt = new Date().toISOString();
  const results = { deflation: null, distribution: null, usdtDistribution: null };
  let statusCode = "success";

  console.log(`[keeper] ${startedAt} | wallet: ${wallet.address}`);

  try {
    // ── 1. Check & trigger deflation ──
    try {
      const countdown = await swap.timeUntilNextDeflation();
      const cdSec = Number(countdown);

      if (cdSec <= 0) {
        console.log("[keeper] Deflation ready — sending tx...");
        const tx = await swap.deflate();
        const receipt = await tx.wait();
        console.log(`[keeper] ✓ deflate() mined: ${receipt.hash}`);
        results.deflation = { success: true, hash: receipt.hash };
      } else {
        const h = Math.floor(cdSec / 3600);
        const m = Math.floor((cdSec % 3600) / 60);
        console.log(`[keeper] Deflation not due yet — ${h}h ${m}m remaining`);
        results.deflation = { success: true, skipped: true, remaining: cdSec };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[keeper] ✗ deflate() failed: ${msg}`);
      results.deflation = { success: false, error: msg.slice(0, 200) };
      statusCode = "error";
    }

    // ── 2. Check & trigger TOT distribution ──
    try {
      const pool = await swap.nftbDividendPool();
      const threshold = await swap.distributionThreshold();

      const poolFmt = ethers.formatUnits(pool, 18);
      const threshFmt = ethers.formatUnits(threshold, 18);

      if (pool >= threshold && pool > 0n) {
        console.log(`[keeper] TOT dividend pool ${poolFmt} TOT ≥ threshold ${threshFmt} — distributing...`);
        const tx = await swap.forceDistribute();
        const receipt = await tx.wait();
        console.log(`[keeper] ✓ forceDistribute() (TOT) mined: ${receipt.hash}`);
        results.distribution = { success: true, hash: receipt.hash, amount: poolFmt };
      } else {
        console.log(`[keeper] TOT dividend pool ${poolFmt} / ${threshFmt} — below threshold`);
        results.distribution = { success: true, skipped: true, pool: poolFmt, threshold: threshFmt };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[keeper] ✗ forceDistribute() (TOT) failed: ${msg}`);
      results.distribution = { success: false, error: msg.slice(0, 200) };
      statusCode = "error";
    }

    // ── 3. Check & trigger USDT distribution ──
    try {
      const usdtPool = await swap.nftbUsdtDividendPool();
      const usdtThreshold = await swap.usdtDistributionThreshold();

      const usdtPoolFmt = ethers.formatUnits(usdtPool, 18);
      const usdtThreshFmt = ethers.formatUnits(usdtThreshold, 18);

      if (usdtPool >= usdtThreshold && usdtPool > 0n) {
        console.log(`[keeper] USDT dividend pool ${usdtPoolFmt} USDT ≥ threshold ${usdtThreshFmt} — distributing...`);
        const tx = await swap.forceDistribute();
        const receipt = await tx.wait();
        console.log(`[keeper] ✓ forceDistribute() (USDT) mined: ${receipt.hash}`);
        results.usdtDistribution = { success: true, hash: receipt.hash, amount: usdtPoolFmt };
      } else {
        console.log(`[keeper] USDT dividend pool ${usdtPoolFmt} / ${usdtThreshFmt} USDT — below threshold`);
        results.usdtDistribution = { success: true, skipped: true, pool: usdtPoolFmt, threshold: usdtThreshFmt };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[keeper] ✗ forceDistribute() (USDT) failed: ${msg}`);
      results.usdtDistribution = { success: false, error: msg.slice(0, 200) };
      statusCode = "error";
    }

    // ── Summary ──
    const totReserve = await swap.totReserve().catch(() => 0n);
    const usdtReserve = await swap.usdtReserve().catch(() => 0n);
    console.log(`[keeper] Pool state: TOT=${ethers.formatUnits(totReserve, 18)}, USDT=${ethers.formatUnits(usdtReserve, 18)}`);
    console.log("[keeper] Done.\n");

    const payload = {
      startedAt,
      finishedAt: new Date().toISOString(),
      status: statusCode,
      wallet: wallet.address,
      results,
      pool: {
        totReserve: ethers.formatUnits(totReserve, 18),
        usdtReserve: ethers.formatUnits(usdtReserve, 18),
      },
    };
    writeStatus(cfg.statusFile, payload);

    if (statusCode === "error") {
      await sendAlert(`[DeFiNodeNexus][keeper] execution finished with errors\n${JSON.stringify(results)}`);
    }

    return payload;
  } finally {
    releaseLock();
  }
}

// ── Daemon mode vs one-shot ──
async function main() {
  const isOnce = process.argv.includes("--once");
  const intervalMs = Number(process.env.KEEPER_INTERVAL_MS) || 10 * 60 * 1000; // default 10 min

  if (isOnce) {
    console.log("[keeper] One-shot mode");
    await runKeeper();
    return;
  }

  console.log(`[keeper] Daemon mode — running every ${intervalMs / 1000}s`);
  console.log("[keeper] Press Ctrl+C to stop\n");

  // Run immediately, then on interval
  await runKeeper();

  setInterval(async () => {
    try {
      await runKeeper();
    } catch (err) {
      console.error("[keeper] Unhandled error:", err);
    }
  }, intervalMs);
}

// Allow importing runKeeper for API route usage
module.exports = { runKeeper, createSwapContract, getConfig };

// Direct execution
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
