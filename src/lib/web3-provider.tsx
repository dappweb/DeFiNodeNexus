
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useWalletClient } from 'wagmi';
import { ethers } from 'ethers';

interface Web3ContextType {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  provider: ethers.Provider | null;
  signer: ethers.Signer | null;
  connect: () => void;
  addProjectTokens: () => Promise<void>;
  disconnect: () => void;
  chainId: number | undefined;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111
const SEPOLIA_CHAIN_ID_DECIMAL = 11155111;

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const { address, isConnected, isConnecting, chainId } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();

  // Convert viem WalletClient → ethers v6 BrowserProvider + Signer
  const [ethersSigner, setEthersSigner] = useState<ethers.Signer | null>(null);
  const [ethersProvider, setEthersProvider] = useState<ethers.Provider | null>(null);

  useEffect(() => {
    if (walletClient && typeof window !== 'undefined' && window.ethereum) {
      const browserProvider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
      setEthersProvider(browserProvider);
      browserProvider.getSigner()
        .then((s) => setEthersSigner(s))
        .catch(() => setEthersSigner(null));
    } else {
      setEthersSigner(null);
      setEthersProvider(null);
    }
  }, [walletClient]);

  const handleConnect = () => {
    // RainbowKit will handle connector selection via its modal
    // This function is kept for compatibility with existing code
  };

  const addProjectTokens = async () => {
    if (!walletClient) return;

    const totAddress = process.env.NEXT_PUBLIC_TOT_ADDRESS;
    const tofAddress = process.env.NEXT_PUBLIC_TOF_ADDRESS;

    const tokens: { address: string; symbol: string; decimals: number; name: string }[] = [];
    if (totAddress) tokens.push({ address: totAddress, symbol: 'TOT', decimals: 18, name: 'TOT Token' });
    if (tofAddress) tokens.push({ address: tofAddress, symbol: 'TOF', decimals: 18, name: 'TOF Token' });

    for (const token of tokens) {
      try {
        await walletClient.request({
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

  return (
    <Web3Context.Provider value={{
      address,
      isConnected,
      isConnecting,
      provider: ethersProvider,
      signer: ethersSigner,
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
