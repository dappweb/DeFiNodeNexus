"use client";

import { useMemo } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "@/lib/web3-provider";
import { CONTRACTS, NEXUS_ABI, SWAP_ABI, ERC20_ABI } from "@/lib/contracts";
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
 * A read-only fallback provider for Sepolia so that public contract data
 * (e.g. tier info) can be fetched even before the user connects a wallet.
 * Lazily initialised to avoid SSR issues.
 */
let _fallbackProvider: ethers.Provider | null = null;
function getFallbackProvider(): ethers.Provider {
  if (!_fallbackProvider) {
    const sepoliaNetwork = ethers.Network.from("sepolia");
    const rpcUrls = Array.from(
      new Set(
        [
          "https://ethereum-sepolia-rpc.publicnode.com",
          "https://rpc.sepolia.org",
          "https://1rpc.io/sepolia",
          process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL,
        ].filter((value): value is string => Boolean(value && value.trim()))
      )
    );

    const providers = rpcUrls.map(
      (url) => new ethers.JsonRpcProvider(url, sepoliaNetwork, { staticNetwork: sepoliaNetwork })
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
            sepoliaNetwork,
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

