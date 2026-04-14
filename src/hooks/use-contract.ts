"use client";

import { getCncRpcUrls, getPrimaryCncRpcUrl } from "@/lib/cnc-rpc";
import { CONTRACTS, ERC20_ABI, NEXUS_ABI, SWAP_ABI, TOF_ABI } from "@/lib/contracts";
import { useWeb3 } from "@/lib/web3-provider";
import { ethers } from "ethers";
import { useMemo } from "react";
export { execTx } from "@/lib/tx";

declare global {
  interface Window {
    __E2E_CONTRACT_MOCK__?: {
      getContract: (address: string) => unknown | null;
    };
  }
}

function getE2EContractMock(address: string) {
  if (typeof window === "undefined") return null;
  return window.__E2E_CONTRACT_MOCK__?.getContract(address) ?? null;
}

/**
 * A read-only fallback provider for CNC so that public contract data
 * (e.g. tier info) can be fetched even before the user connects a wallet.
 * Lazily initialised to avoid SSR issues.
 */
let _fallbackProvider: ethers.Provider | null = null;
function getFallbackProvider(): ethers.Provider {
  if (!_fallbackProvider) {
    const cncNetwork = ethers.Network.from(50716);
    // Use the same RPC resolution as wagmi.ts to ensure consistency across all providers
    const primaryRpc = getPrimaryCncRpcUrl(process.env.NEXT_PUBLIC_CNC_RPC_URL);
    const rpcUrls = getCncRpcUrls(primaryRpc, process.env.CNC_RPC_URL);

    const providers = rpcUrls.map(
      (url) => new ethers.JsonRpcProvider(url, cncNetwork, { staticNetwork: cncNetwork })
    );

    _fallbackProvider =
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
  return _fallbackProvider;
}

export function useNexusContract() {
  const { signer, provider } = useWeb3();
  return useMemo(() => {
    if (!CONTRACTS.NEXUS) return null;
    const mock = getE2EContractMock(CONTRACTS.NEXUS);
    if (mock) return mock as ethers.Contract;
    const signerOrProvider = signer || provider || getFallbackProvider();
    return new ethers.Contract(CONTRACTS.NEXUS, NEXUS_ABI, signerOrProvider);
  }, [signer, provider]);
}

export function useReadonlyNexusContract() {
  return useMemo(() => {
    if (!CONTRACTS.NEXUS) return null;
    const mock = getE2EContractMock(CONTRACTS.NEXUS);
    if (mock) return mock as ethers.Contract;
    return new ethers.Contract(CONTRACTS.NEXUS, NEXUS_ABI, getFallbackProvider());
  }, []);
}

export function useSwapContract() {
  const { signer, provider } = useWeb3();
  return useMemo(() => {
    if (!CONTRACTS.SWAP) return null;
    const mock = getE2EContractMock(CONTRACTS.SWAP);
    if (mock) return mock as ethers.Contract;
    // Prioritize signer for write operations, fallback to provider/fallback for reads
    // This ensures cross-device consistency: write ops will fail clearly if signer not ready
    const signerOrProvider = signer || provider || getFallbackProvider();
    return new ethers.Contract(CONTRACTS.SWAP, SWAP_ABI, signerOrProvider);
  }, [signer, provider]);
}

export function useERC20Contract(address: string | undefined) {
  const { signer, provider } = useWeb3();
  return useMemo(() => {
    if (!address) return null;
    const mock = getE2EContractMock(address);
    if (mock) return mock as ethers.Contract;
    const signerOrProvider = signer || provider || getFallbackProvider();
    return new ethers.Contract(address, ERC20_ABI, signerOrProvider);
  }, [address, signer, provider]);
}

export function useTofTokenContract() {
  const { signer, provider } = useWeb3();
  return useMemo(() => {
    if (!CONTRACTS.TOF) return null;
    const mock = getE2EContractMock(CONTRACTS.TOF);
    if (mock) return mock as ethers.Contract;
    const signerOrProvider = signer || provider || getFallbackProvider();
    return new ethers.Contract(CONTRACTS.TOF, TOF_ABI, signerOrProvider);
  }, [signer, provider]);
}

