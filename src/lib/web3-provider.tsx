
"use client";

import React, { createContext, useContext } from 'react';
import { useAccount, useConnect, useDisconnect, useWalletClient } from 'wagmi';

interface Web3ContextType {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  provider: any;
  signer: any;
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
      provider: walletClient,
      signer: walletClient,
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
