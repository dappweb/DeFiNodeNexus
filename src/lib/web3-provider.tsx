
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

interface Web3ContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  connect: () => Promise<void>;
  addProjectTokens: () => Promise<void>;
  disconnect: () => void;
  chainId: number | null;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111
const SEPOLIA_CHAIN_ID_DECIMAL = 11155111;

async function switchToSepolia() {
  if (!window.ethereum) return;
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_CHAIN_ID }],
    });
  } catch (error) {
    const switchError = error as { code?: number };
    // Chain not added — add it
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: SEPOLIA_CHAIN_ID,
          chainName: 'Ethereum Sepolia',
          nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: ['https://rpc.sepolia.org'],
          blockExplorerUrls: ['https://sepolia.etherscan.io'],
        }],
      });
    }
  }
}

/** Silently register TOT and TOF tokens so they appear in the user's wallet asset list. */
async function addProjectTokensToWallet() {
  if (!window.ethereum) return;

  const totAddress = process.env.NEXT_PUBLIC_TOT_ADDRESS;
  const tofAddress = process.env.NEXT_PUBLIC_TOF_ADDRESS;

  const tokens: { address: string; symbol: string; decimals: number; name: string }[] = [];
  if (totAddress) tokens.push({ address: totAddress, symbol: 'TOT', decimals: 18, name: 'Truth Oracle Token' });
  if (tofAddress) tokens.push({ address: tofAddress, symbol: 'TOF', decimals: 18, name: 'Truth Oracle Fund' });

  for (const token of tokens) {
    try {
      await window.ethereum.request({
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
      // Non-fatal — user may have dismissed or wallet may not support it
      console.warn(`Failed to add ${token.symbol} to wallet`, err);
    }
  }
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  const disconnect = useCallback(() => {
    setAddress(null);
    setIsConnected(false);
    setProvider(null);
    setSigner(null);
    setChainId(null);
  }, []);

  const ensureSepolia = useCallback(async () => {
    if (!window.ethereum) return;
    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    const network = await browserProvider.getNetwork();
    if (Number(network.chainId) !== SEPOLIA_CHAIN_ID_DECIMAL) {
      await switchToSepolia();
    }
  }, []);

  const hydrateConnection = useCallback(async (accounts: string[]) => {
    if (!window.ethereum || accounts.length === 0) {
      disconnect();
      return;
    }

    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    const network = await browserProvider.getNetwork();
    const browserSigner = await browserProvider.getSigner();

    setAddress(accounts[0]);
    setProvider(browserProvider);
    setSigner(browserSigner);
    setIsConnected(true);
    setChainId(Number(network.chainId));
  }, [disconnect]);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('Please install MetaMask');
      return;
    }

    setIsConnecting(true);
    try {
      // Switch to Sepolia before connecting
      await ensureSepolia();

      const result = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = result as string[];
      await hydrateConnection(accounts);

      // After connecting, register TOT & TOF in the wallet asset list
      await addProjectTokensToWallet();

    } catch (error) {
      console.error("Connection failed", error);
      const walletError = error as { code?: number; message?: string };
      if (walletError.code === 4001) {
        alert('Connection request was rejected in wallet');
      } else if (walletError.code === -32002) {
        alert('Wallet request is already pending. Please open MetaMask and complete it.');
      }
    } finally {
      setIsConnecting(false);
    }
  }, [ensureSepolia, hydrateConnection]);

  const addProjectTokens = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) return;
    await ensureSepolia();
    await addProjectTokensToWallet();
  }, [ensureSepolia]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const handleAccountsChanged = async (...args: unknown[]) => {
      const newAccounts = args[0] as string[];
      if (newAccounts.length === 0) {
        disconnect();
        return;
      }
      try {
        await ensureSepolia();
        await hydrateConnection(newAccounts);
      } catch (error) {
        console.error('Failed to refresh account state', error);
        disconnect();
      }
    };

    const handleChainChanged = async () => {
      try {
        await ensureSepolia();
        const result = await window.ethereum?.request({ method: 'eth_accounts' });
        const accounts = (result as string[] | undefined) ?? [];
        if (accounts.length === 0) {
          disconnect();
          return;
        }
        await hydrateConnection(accounts);
      } catch (error) {
        console.error('Failed to refresh chain state', error);
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, [disconnect, ensureSepolia, hydrateConnection]);

  useEffect(() => {
    // Optional: Silent reconnect if already authorized
    if (typeof window === 'undefined' || !window.ethereum) return;

    window.ethereum.request({ method: 'eth_accounts' })
      .then(async (result: unknown) => {
        const accounts = result as string[];
        if (accounts.length > 0) {
          await ensureSepolia();
          await hydrateConnection(accounts);
        }
      })
      .catch((error) => {
        console.error('Silent reconnect failed', error);
      });
  }, [ensureSepolia, hydrateConnection]);

  return (
    <Web3Context.Provider value={{ address, isConnected, isConnecting, provider, signer, connect, addProjectTokens, disconnect, chainId }}>
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
