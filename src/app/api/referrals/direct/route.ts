import { getCncRpcUrls } from "@/lib/cnc-rpc";
import { CONTRACTS, NEXUS_ABI } from "@/lib/contracts";
import { ethers } from "ethers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DIRECT_REFERRALS_CACHE_TTL_MS = 60_000;
const VERIFY_BATCH_SIZE = 20;

let cachedProvider: ethers.Provider | null = null;
const directReferralsCache = new Map<string, { expiresAt: number; members: string[] }>();

function getReadonlyProvider(): ethers.Provider {
  if (!cachedProvider) {
    const cncNetwork = ethers.Network.from(50716);
    const rpcUrls = getCncRpcUrls(
      "https://rpc.cncchainpro.com",
      process.env.CNC_RPC_URL,
      process.env.NEXT_PUBLIC_CNC_RPC_URL
    );

    const providers = rpcUrls.map(
      (url) => new ethers.JsonRpcProvider(url, cncNetwork, { staticNetwork: cncNetwork })
    );

    cachedProvider =
      providers.length === 1
        ? providers[0]
        : new ethers.FallbackProvider(
            providers.map((provider, index) => ({
              provider,
              priority: index + 1,
              weight: 1,
              stallTimeout: 1000,
            })),
            cncNetwork,
            { quorum: 1 }
          );
  }

  return cachedProvider;
}

function normalizeAddress(value: string): string {
  return ethers.getAddress(value);
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function fallbackScanDirectChildren(nexus: ethers.Contract, userAddress: string): Promise<string[]> {
  const events = await nexus.queryFilter(nexus.filters.ReferrerBound(null, userAddress));
  const candidates = Array.from(new Set((events as any[]).map((ev) => String(ev.args.user).toLowerCase())));

  const verified: string[] = [];
  for (const batch of chunkArray(candidates, VERIFY_BATCH_SIZE)) {
    const settled = await Promise.allSettled(
      batch.map(async (candidate) => {
        const memberAccount = await nexus.accounts(candidate);
        const currentReferrer = String(memberAccount.referrer);
        if (currentReferrer.toLowerCase() !== userAddress.toLowerCase()) return null;
        return ethers.getAddress(candidate);
      })
    );

    for (const result of settled) {
      if (result.status === "fulfilled" && result.value) {
        verified.push(result.value);
      }
    }
  }

  return verified;
}

function getCachedMembers(address: string): string[] | null {
  const key = address.toLowerCase();
  const cached = directReferralsCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    directReferralsCache.delete(key);
    return null;
  }
  return cached.members;
}

function setCachedMembers(address: string, members: string[]) {
  directReferralsCache.set(address.toLowerCase(), {
    members,
    expiresAt: Date.now() + DIRECT_REFERRALS_CACHE_TTL_MS,
  });
}

export async function GET(request: Request) {
  if (!CONTRACTS.NEXUS) {
    return NextResponse.json({ message: "Contract not configured" }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const addressParam = searchParams.get("address")?.trim();
    if (!addressParam || !ethers.isAddress(addressParam)) {
      return NextResponse.json({ message: "Invalid address" }, { status: 400 });
    }

    const userAddress = normalizeAddress(addressParam);
    const cachedMembers = getCachedMembers(userAddress);
    if (cachedMembers) {
      return NextResponse.json({ members: cachedMembers, cached: true });
    }

    const provider = getReadonlyProvider();
    const nexus = new ethers.Contract(CONTRACTS.NEXUS, NEXUS_ABI, provider);

    let members: string[] = [];
    let source: "contract" | "event-fallback" = "contract";

    try {
      const direct = (await nexus.getDirectChildren(userAddress)) as string[];
      members = direct.map((item) => ethers.getAddress(String(item)));
    } catch {
      source = "event-fallback";
      members = await fallbackScanDirectChildren(nexus, userAddress);
    }

    setCachedMembers(userAddress, members);
    return NextResponse.json({ members, cached: false, source });
  } catch (error: any) {
    const message = error?.shortMessage || error?.message || "Failed to query direct referrals";
    return NextResponse.json({ message }, { status: 500 });
  }
}
