import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { CONTRACTS, NEXUS_ABI } from "@/lib/contracts";

export const runtime = "nodejs";

const MAX_TIER_SCAN = 4;

let cachedProvider: ethers.Provider | null = null;

function isUsableRpcUrl(value: string | undefined): value is string {
  if (!value?.trim()) return false;
  return !/infura\.io/i.test(value);
}

function getReadonlyProvider(): ethers.Provider {
  if (!cachedProvider) {
    const sepoliaNetwork = ethers.Network.from("sepolia");
    const rpcUrls = Array.from(
      new Set(
        [
          "https://ethereum-sepolia-rpc.publicnode.com",
          "https://rpc.sepolia.org",
          "https://1rpc.io/sepolia",
          process.env.SEPOLIA_RPC_URL,
          process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL,
        ].filter(isUsableRpcUrl)
      )
    );

    const providers = rpcUrls.map(
      (url) => new ethers.JsonRpcProvider(url, sepoliaNetwork, { staticNetwork: sepoliaNetwork })
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
            sepoliaNetwork,
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

    const provider = getReadonlyProvider();
    const nexus = new ethers.Contract(CONTRACTS.NEXUS, NEXUS_ABI, provider);

    const nextNftaTierId = Number(await nexus.nextNftaTierId());
    const nextNftbTierId = Number(await nexus.nextNftbTierId());

    const nftaScanCount = Math.max(MAX_TIER_SCAN, nextNftaTierId > 1 ? nextNftaTierId - 1 : 0);
    const nftbScanCount = Math.max(MAX_TIER_SCAN, nextNftbTierId > 1 ? nextNftbTierId - 1 : 0);

    const nftaCandidateIds = Array.from({ length: nftaScanCount }, (_, i) => i + 1);
    const nftbCandidateIds = Array.from({ length: nftbScanCount }, (_, i) => i + 1);

    const [nftaTierList, nftbTierList] = await Promise.all([
      Promise.all(
        nftaCandidateIds.map(async (id) => {
          const tier = await nexus.nftaTiers(id);
          if (!tier.isActive && tier.price === 0n && tier.maxSupply === 0n && tier.currentSupply === 0n) {
            return null;
          }
          const remaining = await nexus.getNftaTierRemaining(id);
          return {
            id,
            price: toStringValue(tier.price),
            dailyYield: toStringValue(tier.dailyYield),
            maxSupply: toStringValue(tier.maxSupply),
            currentSupply: toStringValue(tier.currentSupply),
            isActive: tier.isActive,
            remaining: toStringValue(remaining),
          };
        })
      ),
      Promise.all(
        nftbCandidateIds.map(async (id) => {
          const tier = await nexus.nftbTiers(id);
          if (!tier.isActive && tier.price === 0n && tier.maxSupply === 0n && tier.usdtMinted === 0n && tier.tofMinted === 0n) {
            return null;
          }
          const remaining = await nexus.getNftbTierRemaining(id);
          return {
            id,
            price: toStringValue(tier.price),
            weight: toStringValue(tier.weight),
            maxSupply: toStringValue(tier.maxSupply),
            usdtMinted: toStringValue(tier.usdtMinted),
            tofMinted: toStringValue(tier.tofMinted),
            dividendBps: toStringValue(tier.dividendBps),
            isActive: tier.isActive,
            usdtRemaining: toStringValue(remaining[0]),
            tofRemaining: toStringValue(remaining[1]),
          };
        })
      ),
    ]);

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
        nexus.getUserNftaNodes(address),
        nexus.getUserNftbNodes(address),
      ]);

      const candidateNodeIdSet = new Set<string>([...nftaIds, ...nftbIds].map((id: bigint) => id.toString()));

      if (candidateNodeIdSet.size === 0) {
        const latestBlock = await provider.getBlockNumber();
        const [nftaPurchasedEvents, nftbPurchasedEvents, nftaIncomingTransfers, nftaOutgoingTransfers] = await Promise.all([
          nexus.queryFilter(nexus.filters.NftaPurchased(address, null, null), 0, latestBlock),
          nexus.queryFilter(nexus.filters.NftbPurchased(address, null, null), 0, latestBlock),
          nexus.queryFilter(nexus.filters.NftaCardTransferred(null, address, null), 0, latestBlock),
          nexus.queryFilter(nexus.filters.NftaCardTransferred(address, null, null), 0, latestBlock),
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

      const nodeCandidates = await Promise.all(
        candidateNodeIds.map(async (id) => {
          const [nodeA, nodeB] = await Promise.all([
            nexus.nftaNodes(id),
            nexus.nftbNodes(id),
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

      const [rawNftaNodes, rawNftbNodes] = await Promise.all([
        Promise.all(
          nodeCandidates
            .filter((item) => item.nfta !== null)
            .map(async (item) => {
              const pending = await nexus.pendingNftaYield(item.nodeId);
              return {
                nodeId: item.nodeId,
                tierId: item.nfta!.tierId,
                dailyYield: item.nfta!.dailyYield,
                lastClaimDay: item.nfta!.lastClaimDay,
                isActive: item.nfta!.isActive,
                pending,
              };
            })
        ),
        Promise.all(
          nodeCandidates
            .filter((item) => item.nftb !== null)
            .map(async (item) => {
              const pending = await nexus.pendingNftbDividend(item.nodeId);
              return {
                nodeId: item.nodeId,
                tierId: item.nftb!.tierId,
                weight: item.nftb!.weight,
                isActive: item.nftb!.isActive,
                pending,
              };
            })
        ),
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

    return NextResponse.json({
      nftaTiers: nftaTierList.filter((tier) => tier !== null),
      nftbTiers: nftbTierList.filter((tier) => tier !== null),
      nftaNodes,
      nftbNodes,
    });
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
