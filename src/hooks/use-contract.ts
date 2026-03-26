"use client";

import { useMemo } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "@/lib/web3-provider";
import { CONTRACTS, NEXUS_ABI, SWAP_ABI, ERC20_ABI } from "@/lib/contracts";

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
let _fallbackProvider: ethers.JsonRpcProvider | null = null;
function getFallbackProvider(): ethers.JsonRpcProvider {
  if (!_fallbackProvider) {
    const rpcUrl =
      process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
      "https://rpc.sepolia.org";
    _fallbackProvider = new ethers.JsonRpcProvider(rpcUrl);
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

/**
 * Helper to execute a contract transaction with standard error handling.
 * Returns { success, hash, error }.
 */
export async function execTx(
  txPromise: Promise<ethers.ContractTransactionResponse>
): Promise<{ success: boolean; hash?: string; error?: string }> {
  try {
    const tx = await txPromise;
    const receipt = await tx.wait();
    return { success: true, hash: receipt?.hash || tx.hash };
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message.includes("user rejected")
          ? "Transaction rejected by user"
          : err.message.slice(0, 200)
        : "Unknown error";
    return { success: false, error: msg };
  }
}
