"use client";

import { useMemo } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "@/lib/web3-provider";
import { CONTRACTS, NEXUS_ABI, SWAP_ABI, ERC20_ABI } from "@/lib/contracts";

export function useNexusContract() {
  const { signer, provider } = useWeb3();
  return useMemo(() => {
    if (!CONTRACTS.NEXUS) return null;
    const signerOrProvider = signer || provider;
    if (!signerOrProvider) return null;
    return new ethers.Contract(CONTRACTS.NEXUS, NEXUS_ABI, signerOrProvider);
  }, [signer, provider]);
}

export function useSwapContract() {
  const { signer, provider } = useWeb3();
  return useMemo(() => {
    if (!CONTRACTS.SWAP) return null;
    const signerOrProvider = signer || provider;
    if (!signerOrProvider) return null;
    return new ethers.Contract(CONTRACTS.SWAP, SWAP_ABI, signerOrProvider);
  }, [signer, provider]);
}

export function useERC20Contract(address: string | undefined) {
  const { signer, provider } = useWeb3();
  return useMemo(() => {
    if (!address) return null;
    const signerOrProvider = signer || provider;
    if (!signerOrProvider) return null;
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
