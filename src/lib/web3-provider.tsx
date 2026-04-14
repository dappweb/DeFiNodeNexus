
"use client";

import { useConnectModal } from '@rainbow-me/rainbowkit';
import { ethers } from 'ethers';
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { WalletClient } from 'viem';
import { useAccount, useDisconnect, useWalletClient } from 'wagmi';

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

type WalletRequester = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

interface Web3ContextType {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  provider: ethers.Provider | null;
  signer: ethers.Signer | null;
  walletClient: WalletClient | null;
  connect: () => void;
  addProjectTokens: () => Promise<void>;
  disconnect: () => void;
  chainId: number | undefined;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const { address, isConnected, isConnecting, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { data: walletClient } = useWalletClient();

  // Convert viem WalletClient → ethers v6 BrowserProvider + Signer
  const [ethersSigner, setEthersSigner] = useState<ethers.Signer | null>(null);
  const [ethersProvider, setEthersProvider] = useState<ethers.Provider | null>(null);
  const [signerError, setSignerError] = useState<string | null>(null);

  useEffect(() => {
    if (walletClient) {
      // Use walletClient.transport (the actual connected wallet's EIP-1193 provider)
      // instead of window.ethereum, so OKX Wallet, TP Wallet, etc. work correctly.
      // This is critical for cross-device consistency: each device uses its own connected wallet's provider.
      try {
        const browserProvider = new ethers.BrowserProvider(walletClient.transport as ethers.Eip1193Provider);
        setEthersProvider(browserProvider);
        browserProvider.getSigner()
          .then((s) => {
            setEthersSigner(s);
            setSignerError(null);
          })
          .catch((err) => {
            console.error("Failed to get signer from wallet:", err);
            setEthersSigner(null);
            setSignerError(err?.message || "Signer initialization failed");
          });
      } catch (err) {
        console.error("Failed to initialize BrowserProvider from walletClient:", err);
        setEthersSigner(null);
        setEthersProvider(null);
        setSignerError(err instanceof Error ? err.message : "Provider initialization failed");
      }
    } else {
      setEthersSigner(null);
      setEthersProvider(null);
      setSignerError(null);
    }
  }, [walletClient]);

  const handleConnect = () => {
    openConnectModal?.();
  };

  const addProjectTokens = async () => {
    if (!walletClient) return;
    const walletRequester = walletClient as unknown as WalletRequester;

    const totAddress = process.env.NEXT_PUBLIC_TOT_ADDRESS;
    const tofAddress = process.env.NEXT_PUBLIC_TOF_ADDRESS;

    const tokens: { address: string; symbol: string; decimals: number; name: string }[] = [];
    if (totAddress) tokens.push({ address: totAddress, symbol: 'TOT', decimals: 18, name: 'TOT Token' });
    if (tofAddress) tokens.push({ address: tofAddress, symbol: 'TOF', decimals: 18, name: 'TOF Token' });

    for (const token of tokens) {
      try {
        await walletRequester.request({
          method: 'wallet_watchAsset',
          params: [{
            type: 'ERC20',
            options: {
              address: token.address,
              symbol: token.symbol,
              decimals: token.decimals,
              name: token.name,
            },
          }],
        });
      } catch (err) {
        console.warn(`Failed to add ${token.symbol} to wallet`, err);
      }
    }
  };

  // Debug: log signer errors in dev mode to help diagnose cross-device issues
  useEffect(() => {
    if (signerError && typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.warn(
        "[Web3Provider] Signer initialization error (cross-device issue?)",
        signerError,
        { isConnected, hasWalletClient: !!walletClient, address }
      );
    }
  }, [signerError, isConnected, walletClient, address]);

  return (
    <Web3Context.Provider value={{
      address,
      isConnected,
      isConnecting,
      provider: ethersProvider,
      signer: ethersSigner,
      walletClient: walletClient ?? null,
      connect: handleConnect,
      addProjectTokens,
      disconnect,
      chainId
    }}>
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}
