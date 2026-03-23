require("dotenv").config();
const { ethers } = require("ethers");

/**
 * Keeper Bot — periodically triggers:
 *   1. TOTSwap.deflate()        — every 4 hours
 *   2. TOTSwap.forceDistribute() — when nftbDividendPool >= distributionThreshold
 *
 * Trigger methods:
 *   A) Standalone daemon:    node scripts/keeper.js
 *   B) One-shot (for cron):  node scripts/keeper.js --once
 *   C) Next.js API route:    POST /api/keeper?token=KEEPER_SECRET
 *
 * Required .env:
 *   SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, SWAP_ADDRESS
 *
 * Optional .env:
 *   KEEPER_INTERVAL_MS  — loop interval in ms (default: 600000 = 10 min)
 */

const SWAP_ABI = [
  "function deflate() external",
  "function forceDistribute() external",
  "function timeUntilNextDeflation() view returns (uint256)",
  "function nftbDividendPool() view returns (uint256)",
  "function distributionThreshold() view returns (uint256)",
  "function totReserve() view returns (uint256)",
  "function usdtReserve() view returns (uint256)",
  "function lastDeflationTime() view returns (uint256)",
  "function owner() view returns (address)",
];

function getConfig() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const swapAddress = process.env.SWAP_ADDRESS;

  if (!rpcUrl) throw new Error("Missing SEPOLIA_RPC_URL");
  if (!privateKey) throw new Error("Missing DEPLOYER_PRIVATE_KEY");
  if (!swapAddress || swapAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("Missing or zero SWAP_ADDRESS");
  }

  return { rpcUrl, privateKey, swapAddress };
}

function createSwapContract() {
  const cfg = getConfig();
  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const wallet = new ethers.Wallet(cfg.privateKey, provider);
  const swap = new ethers.Contract(cfg.swapAddress, SWAP_ABI, wallet);
  return { swap, wallet, provider };
}

async function runKeeper() {
  const { swap, wallet } = createSwapContract();
  const results = { deflation: null, distribution: null };

  console.log(`[keeper] ${new Date().toISOString()} | wallet: ${wallet.address}`);

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
  }

  // ── 2. Check & trigger distribution ──
  try {
    const pool = await swap.nftbDividendPool();
    const threshold = await swap.distributionThreshold();

    const poolFmt = ethers.formatUnits(pool, 18);
    const threshFmt = ethers.formatUnits(threshold, 18);

    if (pool >= threshold && pool > 0n) {
      console.log(`[keeper] Dividend pool ${poolFmt} TOT ≥ threshold ${threshFmt} — distributing...`);
      const tx = await swap.forceDistribute();
      const receipt = await tx.wait();
      console.log(`[keeper] ✓ forceDistribute() mined: ${receipt.hash}`);
      results.distribution = { success: true, hash: receipt.hash, amount: poolFmt };
    } else {
      console.log(`[keeper] Dividend pool ${poolFmt} / ${threshFmt} TOT — below threshold`);
      results.distribution = { success: true, skipped: true, pool: poolFmt, threshold: threshFmt };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[keeper] ✗ forceDistribute() failed: ${msg}`);
    results.distribution = { success: false, error: msg.slice(0, 200) };
  }

  // ── Summary ──
  const totReserve = await swap.totReserve().catch(() => 0n);
  const usdtReserve = await swap.usdtReserve().catch(() => 0n);
  console.log(`[keeper] Pool state: TOT=${ethers.formatUnits(totReserve, 18)}, USDT=${ethers.formatUnits(usdtReserve, 18)}`);
  console.log("[keeper] Done.\n");

  return results;
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
