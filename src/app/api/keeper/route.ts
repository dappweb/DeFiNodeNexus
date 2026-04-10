import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

export const runtime = "edge";

/**
 * POST /api/keeper?token=KEEPER_SECRET
 *
 * Triggers deflation + dividend distribution on TOTSwap.
 * Designed to be called by external cron services:
 *   - Vercel Cron, Cloudflare Workers Cron, cron-job.org, GitHub Actions, etc.
 *
 * Required env: SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, SWAP_ADDRESS, KEEPER_SECRET
 */

const SWAP_ABI = [
  "function deflate() external",
  "function forceDistribute() external",
  "function externalDexEnabled() view returns (bool)",
  "function timeUntilNextDeflation() view returns (uint256)",
  "function nftbDividendPool() view returns (uint256)",
  "function distributionThreshold() view returns (uint256)",
  "function getDexReserves() view returns (uint256 totR, uint256 usdtR)",
];

export async function POST(request: NextRequest) {
  // Auth check
  const secret = process.env.KEEPER_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "KEEPER_SECRET not configured" }, { status: 500 });
  }

  const token =
    request.nextUrl.searchParams.get("token") ||
    request.headers.get("x-keeper-token") ||
    "";

  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Validate env
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const swapAddress = process.env.SWAP_ADDRESS;

  if (!rpcUrl || !privateKey || !swapAddress) {
    return NextResponse.json(
      { error: "Missing SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, or SWAP_ADDRESS" },
      { status: 500 }
    );
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const swap = new ethers.Contract(swapAddress, SWAP_ABI, wallet);

    const results: Record<string, unknown> = {};
    const isExternalDex = Boolean(await swap.externalDexEnabled());

    // 1. Deflation
    const countdown = Number(await swap.timeUntilNextDeflation());
    if (isExternalDex) {
      results.deflation = { executed: false, skipped: true, reason: "external-dex-mode" };
    } else if (countdown <= 0) {
      const tx = await swap.deflate();
      const receipt = await tx.wait();
      results.deflation = { executed: true, hash: receipt.hash };
    } else {
      results.deflation = { executed: false, remainingSeconds: countdown };
    }

    // 2. Distribution
    const pool = await swap.nftbDividendPool();
    const threshold = await swap.distributionThreshold();
    if (pool >= threshold && pool > BigInt(0)) {
      const tx = await swap.forceDistribute();
      const receipt = await tx.wait();
      results.distribution = {
        executed: true,
        hash: receipt.hash,
        amount: ethers.formatUnits(pool, 18),
      };
    } else {
      results.distribution = {
        executed: false,
        pool: ethers.formatUnits(pool, 18),
        threshold: ethers.formatUnits(threshold, 18),
      };
    }

    // Pool state
    const [totR, usdtR] = await swap.getDexReserves();
    results.pool = {
      totReserve: ethers.formatUnits(totR, 18),
      usdtReserve: ethers.formatUnits(usdtR, 18),
    };

    return NextResponse.json({ ok: true, timestamp: new Date().toISOString(), results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message.slice(0, 300) }, { status: 500 });
  }
}

/** GET returns current status (no tx, public or auth-gated as you wish) */
export async function GET(request: NextRequest) {
  const secret = process.env.KEEPER_SECRET;
  const token =
    request.nextUrl.searchParams.get("token") ||
    request.headers.get("x-keeper-token") ||
    "";

  if (secret && token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const swapAddress = process.env.SWAP_ADDRESS;

  if (!rpcUrl || !swapAddress) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const swap = new ethers.Contract(swapAddress, SWAP_ABI, provider);

    const [isExternalDex, countdown, pool, threshold, reserves] = await Promise.all([
      swap.externalDexEnabled(),
      swap.timeUntilNextDeflation(),
      swap.nftbDividendPool(),
      swap.distributionThreshold(),
      swap.getDexReserves(),
    ]);
    const [totR, usdtR] = reserves;

    return NextResponse.json({
      deflation: {
        readyToDeflate: !isExternalDex && Number(countdown) <= 0,
        remainingSeconds: Number(countdown),
        mode: isExternalDex ? "external-dex" : "internal-pool",
      },
      distribution: {
        readyToDistribute: pool >= threshold && pool > BigInt(0),
        pool: ethers.formatUnits(pool, 18),
        threshold: ethers.formatUnits(threshold, 18),
      },
      pool: {
        totReserve: ethers.formatUnits(totR, 18),
        usdtReserve: ethers.formatUnits(usdtR, 18),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message.slice(0, 300) }, { status: 500 });
  }
}
