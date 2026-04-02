
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
  providers?: Eip1193Provider[];
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isRabby?: boolean;
  isTrust?: boolean;
  isBraveWallet?: boolean;
  isOkxWallet?: boolean;
  isPhantom?: boolean;
};

type Eip6963ProviderInfo = {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
};

type Eip6963ProviderDetail = {
  info: Eip6963ProviderInfo;
  provider: Eip1193Provider;
};

type WalletCandidate = {
  id: string;
  name: string;
  provider: Eip1193Provider;
  priority: number;
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
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
const PREFERRED_WALLET_KEY = 'preferred_wallet_id';

function getWalletPriority(provider: Eip1193Provider, id: string, name: string) {
  const lowerId = id.toLowerCase();
  const lowerName = name.toLowerCase();

  if (provider.isMetaMask || lowerId.includes('metamask') || lowerName.includes('metamask')) return 100;
  if (provider.isRabby || lowerId.includes('rabby') || lowerName.includes('rabby')) return 95;
  if (provider.isCoinbaseWallet || lowerId.includes('coinbase') || lowerName.includes('coinbase')) return 90;
  if (provider.isOkxWallet || lowerId.includes('okx') || lowerName.includes('okx')) return 85;
  if (provider.isTrust || lowerId.includes('trust') || lowerName.includes('trust')) return 80;
  if (provider.isBraveWallet || lowerId.includes('brave') || lowerName.includes('brave')) return 75;
  if (provider.isPhantom || lowerId.includes('phantom') || lowerName.includes('phantom')) return 70;
  return 60;
}

function pushWalletCandidate(
  map: Map<Eip1193Provider, WalletCandidate>,
  provider: Eip1193Provider | undefined,
  id: string,
  name: string
) {
  if (!provider || map.has(provider)) return;
  map.set(provider, {
    id,
    name,
    provider,
    priority: getWalletPriority(provider, id, name),
  });
}

async function discoverWalletCandidates(timeoutMs = 150): Promise<WalletCandidate[]> {
  if (typeof window === 'undefined') return [];

  const candidates = new Map<Eip1193Provider, WalletCandidate>();

  const injected = window.ethereum;
  if (injected) {
    pushWalletCandidate(candidates, injected, 'legacy:window.ethereum', 'Injected Wallet');
    const providerList = Array.isArray(injected.providers) ? injected.providers : [];
    for (const provider of providerList) {
      pushWalletCandidate(candidates, provider, `legacy:${provider.constructor?.name || 'provider'}`, 'Injected Wallet');
    }
  }

  await new Promise<void>((resolve) => {
    const announced: Array<{ info: Eip6963ProviderInfo; provider: Eip1193Provider }> = [];
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<Eip6963ProviderDetail>).detail;
      if (!detail?.provider || !detail?.info) return;
      announced.push({ info: detail.info, provider: detail.provider });
    };

    window.addEventListener('eip6963:announceProvider', handler as EventListener);
    try {
      window.dispatchEvent(new Event('eip6963:requestProvider'));
    } catch {
      window.removeEventListener('eip6963:announceProvider', handler as EventListener);
      resolve();
      return;
    }

    window.setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', handler as EventListener);
      for (const item of announced) {
        pushWalletCandidate(candidates, item.provider, item.info.rdns || item.info.uuid, item.info.name || 'Wallet');
      }
      resolve();
    }, timeoutMs);
  });

  return Array.from(candidates.values()).sort((a, b) => b.priority - a.priority);
}

async function switchToSepolia(walletProvider: Eip1193Provider) {
  try {
    await walletProvider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_CHAIN_ID }],
    });
  } catch (error) {
    const switchError = error as { code?: number };
    // Chain not added — add it
    if (switchError.code === 4902) {
      await walletProvider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: SEPOLIA_CHAIN_ID,
          chainName: 'Ethereum Sepolia',
          nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
          blockExplorerUrls: ['https://sepolia.etherscan.io'],
        }],
      });
    }
  }
}

/** Silently register TOT and TOF tokens so they appear in the user's wallet asset list. */
async function addProjectTokensToWallet(walletProvider: Eip1193Provider) {

  const totAddress = process.env.NEXT_PUBLIC_TOT_ADDRESS;
  const tofAddress = process.env.NEXT_PUBLIC_TOF_ADDRESS;

  const tokens: { address: string; symbol: string; decimals: number; name: string }[] = [];
  if (totAddress) tokens.push({ address: totAddress, symbol: 'TOT', decimals: 18, name: 'Truth Oracle Token' });
  if (tofAddress) tokens.push({ address: tofAddress, symbol: 'TOF', decimals: 18, name: 'Truth Oracle Fund' });

  for (const token of tokens) {
    try {
      await walletProvider.request({
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
  const [activeWalletProvider, setActiveWalletProvider] = useState<Eip1193Provider | null>(null);

  const disconnect = useCallback(() => {
    setAddress(null);
    setIsConnected(false);
    setProvider(null);
    setSigner(null);
    setChainId(null);
    setActiveWalletProvider(null);
  }, []);

  const ensureSepolia = useCallback(async (walletProvider: Eip1193Provider) => {
    const browserProvider = new ethers.BrowserProvider(walletProvider);
    const network = await browserProvider.getNetwork();
    if (Number(network.chainId) !== SEPOLIA_CHAIN_ID_DECIMAL) {
      await switchToSepolia(walletProvider);
    }
  }, []);

  const hydrateConnection = useCallback(async (walletProvider: Eip1193Provider, accounts: string[]) => {
    if (accounts.length === 0) {
      disconnect();
      return;
    }

    const browserProvider = new ethers.BrowserProvider(walletProvider);
    const network = await browserProvider.getNetwork();
    const browserSigner = await browserProvider.getSigner();

    setAddress(accounts[0]);
    setProvider(browserProvider);
    setSigner(browserSigner);
    setIsConnected(true);
    setChainId(Number(network.chainId));
    setActiveWalletProvider(walletProvider);
  }, [disconnect]);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined') {
      return;
    }

    setIsConnecting(true);
    try {
      const candidates = await discoverWalletCandidates();
      if (candidates.length === 0) {
        alert('Please install a wallet extension (MetaMask / Rabby / Coinbase Wallet / OKX / Trust Wallet, etc.)');
        return;
      }

      const preferredWalletId = window.localStorage.getItem(PREFERRED_WALLET_KEY);
      const selected = candidates.find((wallet) => wallet.id === preferredWalletId) ?? candidates[0];
      const walletProvider = selected.provider;

      // Switch to Sepolia before connecting
      await ensureSepolia(walletProvider);

      const result = await walletProvider.request({ method: 'eth_requestAccounts' });
      const accounts = result as string[];
      await hydrateConnection(walletProvider, accounts);
      window.localStorage.setItem(PREFERRED_WALLET_KEY, selected.id);

      // After connecting, register TOT & TOF in the wallet asset list
      await addProjectTokensToWallet(walletProvider);

    } catch (error) {
      console.error("Connection failed", error);
      const walletError = error as { code?: number; message?: string };
      if (walletError.code === 4001) {
        alert('Connection request was rejected in wallet');
      } else if (walletError.code === -32002) {
        alert('Wallet request is already pending. Please open your wallet extension and complete it.');
      }
    } finally {
      setIsConnecting(false);
    }
  }, [ensureSepolia, hydrateConnection]);

  const addProjectTokens = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const walletProvider = activeWalletProvider;
    if (!walletProvider) return;
    await ensureSepolia(walletProvider);
    await addProjectTokensToWallet(walletProvider);
  }, [activeWalletProvider, ensureSepolia]);

  useEffect(() => {
    if (typeof window === 'undefined' || !activeWalletProvider) return;

    const handleAccountsChanged = async (...args: unknown[]) => {
      const newAccounts = args[0] as string[];
      if (newAccounts.length === 0) {
        disconnect();
        return;
      }
      try {
        await ensureSepolia(activeWalletProvider);
        await hydrateConnection(activeWalletProvider, newAccounts);
      } catch (error) {
        console.error('Failed to refresh account state', error);
        disconnect();
      }
    };

    const handleChainChanged = async () => {
      try {
        await ensureSepolia(activeWalletProvider);
        const result = await activeWalletProvider.request({ method: 'eth_accounts' });
        const accounts = (result as string[] | undefined) ?? [];
        if (accounts.length === 0) {
          disconnect();
          return;
        }
        await hydrateConnection(activeWalletProvider, accounts);
      } catch (error) {
        console.error('Failed to refresh chain state', error);
      }
    };

    activeWalletProvider.on('accountsChanged', handleAccountsChanged);
    activeWalletProvider.on('chainChanged', handleChainChanged);

    return () => {
      activeWalletProvider.removeListener('accountsChanged', handleAccountsChanged);
      activeWalletProvider.removeListener('chainChanged', handleChainChanged);
    };
  }, [activeWalletProvider, disconnect, ensureSepolia, hydrateConnection]);

  useEffect(() => {
    // Optional: Silent reconnect if already authorized
    if (typeof window === 'undefined') return;

    (async () => {
      try {
        const candidates = await discoverWalletCandidates();
        if (candidates.length === 0) return;

        const preferredWalletId = window.localStorage.getItem(PREFERRED_WALLET_KEY);
        const ordered = preferredWalletId
          ? [
              ...candidates.filter((wallet) => wallet.id === preferredWalletId),
              ...candidates.filter((wallet) => wallet.id !== preferredWalletId),
            ]
          : candidates;

        for (const wallet of ordered) {
          const result = await wallet.provider.request({ method: 'eth_accounts' });
          const accounts = (result as string[] | undefined) ?? [];
          if (accounts.length === 0) continue;

          await ensureSepolia(wallet.provider);
          await hydrateConnection(wallet.provider, accounts);
          window.localStorage.setItem(PREFERRED_WALLET_KEY, wallet.id);
          break;
        }
      } catch (error) {
        console.error('Silent reconnect failed', error);
      }
    })();
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
