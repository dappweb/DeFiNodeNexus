import { getCncRpcUrls } from "@/lib/cnc-rpc";
import { CONTRACTS, NEXUS_ABI } from "@/lib/contracts";
import {
    createDefaultSerializedNftaTiers,
    createDefaultSerializedNftbTiers,
} from "@/lib/node-tier-config";
import { ethers } from "ethers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SUMMARY_CACHE_TTL_MS = 6_000;
const RPC_RETRY_COUNT = 2;
const EVENT_SCAN_LOOKBACK_BLOCKS = Number(process.env.NODES_EVENT_SCAN_LOOKBACK_BLOCKS || "120000");
const DEFAULT_NFTA_TIERS = createDefaultSerializedNftaTiers();
const DEFAULT_NFTB_TIERS = createDefaultSerializedNftbTiers();

let cachedProvider: ethers.Provider | null = null;
const summaryCache = new Map<string, { expiresAt: number; payload: unknown }>();

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

function toStringValue(value: bigint | number | string) {
  return value.toString();
}

function normalizeAddress(value: string) {
  return value.toLowerCase();
}

function getCacheKey(address: string | null) {
  return address ? `addr:${normalizeAddress(address)}` : "addr:public";
}

function getCachedSummary(key: string) {
  const cached = summaryCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    summaryCache.delete(key);
    return null;
  }
  return cached.payload;
}

function setCachedSummary(key: string, payload: unknown) {
  summaryCache.set(key, {
    payload,
    expiresAt: Date.now() + SUMMARY_CACHE_TTL_MS,
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRpcRetry<T>(fn: () => Promise<T>, retries = RPC_RETRY_COUNT): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        const delay = 250 * (attempt + 1);
        await sleep(delay);
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("RPC call failed");
}

function isFulfilled<T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> {
  return result.status === "fulfilled";
}

export async function GET(request: Request) {
  if (!CONTRACTS.NEXUS) {
    return NextResponse.json(
      {
        message: "Contract not configured",
        detail: "NEXT_PUBLIC_NEXUS_ADDRESS is missing",
      },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const addressParam = searchParams.get("address")?.trim();
    const address = addressParam && ethers.isAddress(addressParam) ? addressParam : null;
    const cacheKey = getCacheKey(address);
    const cachedPayload = getCachedSummary(cacheKey);
    if (cachedPayload) {
      return NextResponse.json(cachedPayload);
    }

    const provider = getReadonlyProvider();
    const nexus = new ethers.Contract(CONTRACTS.NEXUS, NEXUS_ABI, provider);

    const [nftaTierResults, nftbTierResults] = await Promise.all([
      Promise.allSettled(
        DEFAULT_NFTA_TIERS.map(async (baseTier) => {
          const id = baseTier.id;
          const tier = await withRpcRetry(() => nexus.nftaTiers(id));
          const remaining = await withRpcRetry(() => nexus.getNftaTierRemaining(id));
          return {
            id,
            currentSupply: toStringValue(tier.currentSupply),
            isActive: tier.isActive,
            remaining: toStringValue(remaining),
          };
        })
      ),
      Promise.allSettled(
        DEFAULT_NFTB_TIERS.map(async (baseTier) => {
          const id = baseTier.id;
          const tier = await withRpcRetry(() => nexus.nftbTiers(id));
          const remaining = await withRpcRetry(() => nexus.getNftbTierRemaining(id));
          return {
            id,
            usdtMinted: toStringValue(tier.usdtMinted),
            tofMinted: toStringValue(tier.tofMinted),
            isActive: tier.isActive,
            usdtRemaining: toStringValue(remaining[0]),
            tofRemaining: toStringValue(remaining[1]),
          };
        })
      ),
    ]);

    const nftaTierOverrides = new Map(
      nftaTierResults.filter(isFulfilled).map((result) => [result.value.id, result.value])
    );

    const nftbTierOverrides = new Map(
      nftbTierResults.filter(isFulfilled).map((result) => [result.value.id, result.value])
    );

    const nftaTierList = DEFAULT_NFTA_TIERS.map((tier) => ({
      ...tier,
      ...(nftaTierOverrides.get(tier.id) ?? {}),
    }));

    const nftbTierList = DEFAULT_NFTB_TIERS.map((tier) => ({
      ...tier,
      ...(nftbTierOverrides.get(tier.id) ?? {}),
    }));

    let nftaNodes: Array<{
      nodeId: string;
      tierId: string;
      dailyYield: string;
      lastClaimDay: string;
      isActive: boolean;
      pending: string;
    }> = [];

    let nftbNodes: Array<{
      nodeId: string;
      tierId: string;
      weight: string;
      isActive: boolean;
      pending: string;
    }> = [];

    if (address) {
      const [nftaIds, nftbIds] = await Promise.all([
        withRpcRetry(() => nexus.getUserNftaNodes(address)),
        withRpcRetry(() => nexus.getUserNftbNodes(address)),
      ]);

      const candidateNodeIdSet = new Set<string>([...nftaIds, ...nftbIds].map((id: bigint) => id.toString()));

      if (candidateNodeIdSet.size === 0) {
        const latestBlock = await withRpcRetry(() => provider.getBlockNumber());
        const fromBlock = Math.max(0, latestBlock - EVENT_SCAN_LOOKBACK_BLOCKS);
        const [nftaPurchasedEvents, nftbPurchasedEvents, nftaIncomingTransfers, nftaOutgoingTransfers] = await Promise.all([
          withRpcRetry(() => nexus.queryFilter(nexus.filters.NftaPurchased(address, null, null), fromBlock, latestBlock)),
          withRpcRetry(() => nexus.queryFilter(nexus.filters.NftbPurchased(address, null, null), fromBlock, latestBlock)),
          withRpcRetry(() => nexus.queryFilter(nexus.filters.NftaCardTransferred(null, address, null), fromBlock, latestBlock)),
          withRpcRetry(() => nexus.queryFilter(nexus.filters.NftaCardTransferred(address, null, null), fromBlock, latestBlock)),
        ]);

        for (const event of nftaPurchasedEvents as any[]) {
          candidateNodeIdSet.add(BigInt(event.args.nodeId).toString());
        }
        for (const event of nftbPurchasedEvents as any[]) {
          candidateNodeIdSet.add(BigInt(event.args.nodeId).toString());
        }
        for (const event of nftaIncomingTransfers as any[]) {
          candidateNodeIdSet.add(BigInt(event.args.nodeId).toString());
        }
        for (const event of nftaOutgoingTransfers as any[]) {
          candidateNodeIdSet.add(BigInt(event.args.nodeId).toString());
        }
      }

      const candidateNodeIds = Array.from(candidateNodeIdSet).map((id) => BigInt(id));
      const userAddr = normalizeAddress(address);

      const nodeCandidateResults = await Promise.allSettled(
        candidateNodeIds.map(async (id) => {
          const [nodeA, nodeB] = await Promise.all([
            withRpcRetry(() => nexus.nftaNodes(id)),
            withRpcRetry(() => nexus.nftbNodes(id)),
          ]);

          const nftaOwner = normalizeAddress(String(nodeA.owner));
          const nftbOwner = normalizeAddress(String(nodeB.owner));

          const isNftaOwnedByUser = nftaOwner === userAddr;
          const isNftbOwnedByUser = nftbOwner === userAddr;

          return {
            nodeId: id,
            nfta: isNftaOwnedByUser
              ? {
                  tierId: nodeA.tierId,
                  dailyYield: nodeA.dailyYield,
                  lastClaimDay: nodeA.lastClaimDay,
                  isActive: nodeA.isActive,
                }
              : null,
            nftb: isNftbOwnedByUser
              ? {
                  tierId: nodeB.tierId,
                  weight: nodeB.weight,
                  isActive: nodeB.isActive,
                }
              : null,
          };
        })
      );

      const nodeCandidates = nodeCandidateResults
        .filter((result): result is PromiseFulfilledResult<{ nodeId: bigint; nfta: { tierId: bigint; dailyYield: bigint; lastClaimDay: bigint; isActive: boolean; } | null; nftb: { tierId: bigint; weight: bigint; isActive: boolean; } | null; }> => result.status === "fulfilled")
        .map((result) => result.value);

      const [rawNftaNodes, rawNftbNodes] = await Promise.all([
        Promise.allSettled(
          nodeCandidates
            .filter((item) => item.nfta !== null)
            .map(async (item) => {
              const pending = await withRpcRetry(() => nexus.pendingNftaYield(item.nodeId));
              return {
                nodeId: item.nodeId,
                tierId: item.nfta!.tierId,
                dailyYield: item.nfta!.dailyYield,
                lastClaimDay: item.nfta!.lastClaimDay,
                isActive: item.nfta!.isActive,
                pending,
              };
            })
        ).then((results) => results.filter((result): result is PromiseFulfilledResult<{ nodeId: bigint; tierId: bigint; dailyYield: bigint; lastClaimDay: bigint; isActive: boolean; pending: bigint; }> => result.status === "fulfilled").map((result) => result.value)),
        Promise.allSettled(
          nodeCandidates
            .filter((item) => item.nftb !== null)
            .map(async (item) => {
              const pending = await withRpcRetry(() => nexus.pendingNftbDividend(item.nodeId));
              return {
                nodeId: item.nodeId,
                tierId: item.nftb!.tierId,
                weight: item.nftb!.weight,
                isActive: item.nftb!.isActive,
                pending,
              };
            })
        ).then((results) => results.filter((result): result is PromiseFulfilledResult<{ nodeId: bigint; tierId: bigint; weight: bigint; isActive: boolean; pending: bigint; }> => result.status === "fulfilled").map((result) => result.value)),
      ]);

      let highestPendingNodeId: bigint | null = null;
      let highestDailyYield = 0n;
      for (const node of rawNftaNodes) {
        if (!node.isActive) continue;
        if (node.dailyYield > highestDailyYield) {
          highestDailyYield = node.dailyYield;
          highestPendingNodeId = node.nodeId;
        }
      }

      nftaNodes = rawNftaNodes.map((node) => ({
        nodeId: toStringValue(node.nodeId),
        tierId: toStringValue(node.tierId),
        dailyYield: toStringValue(node.dailyYield),
        lastClaimDay: toStringValue(node.lastClaimDay),
        isActive: node.isActive,
        pending: toStringValue(highestPendingNodeId !== null && node.nodeId === highestPendingNodeId ? node.pending : 0n),
      }));

      nftbNodes = rawNftbNodes.map((node) => ({
        nodeId: toStringValue(node.nodeId),
        tierId: toStringValue(node.tierId),
        weight: toStringValue(node.weight),
        isActive: node.isActive,
        pending: toStringValue(node.pending),
      }));
    }

    const responsePayload = {
      nftaTiers: nftaTierList,
      nftbTiers: nftbTierList,
      nftaNodes,
      nftbNodes,
    };

    setCachedSummary(cacheKey, responsePayload);

    return NextResponse.json(responsePayload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown on-chain error";
    return NextResponse.json(
      {
        message: "Failed to load node summary",
        detail: message,
      },
      { status: 500 }
    );
  }
}
