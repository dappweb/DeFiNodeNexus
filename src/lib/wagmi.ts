"use client";

import { getPrimaryCncRpcUrl } from '@/lib/cnc-rpc';
import {
    connectorsForWallets,
} from '@rainbow-me/rainbowkit';
import {
    injectedWallet,
    metaMaskWallet,
    okxWallet,
    tokenPocketWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { QueryClient } from '@tanstack/react-query';
import { defineChain } from 'viem';
import { createConfig, http } from 'wagmi';

const cncRpcUrl = getPrimaryCncRpcUrl(process.env.NEXT_PUBLIC_CNC_RPC_URL);
const cncExplorerUrl = process.env.NEXT_PUBLIC_CNC_EXPLORER_URL || 'https://cncchainpro.com';

// Keep wallet connectors lightweight for faster connect UX and fewer SDK side effects.
// If WalletConnect-based wallets are needed later, add a real NEXT_PUBLIC_WC_PROJECT_ID.
const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'cnc-local';

export const cnc = defineChain({
  id: 50716,
  name: 'CNC Mainnet',
  network: 'cnc',
  nativeCurrency: {
    name: 'CNC',
    symbol: 'CNC',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [cncRpcUrl] },
    public:  { http: [cncRpcUrl] },
  },
  blockExplorers: {
    default: { name: 'CNC Explorer', url: cncExplorerUrl },
  },
  testnet: false,
});

const connectors = connectorsForWallets(
  [
    {
      groupName: '常用钱包',
      wallets: [metaMaskWallet, okxWallet, tokenPocketWallet, injectedWallet],
    },
  ],
  { appName: 'Truth Oracle', projectId: wcProjectId },
);

export const config = createConfig({
  chains: [cnc],
  connectors,
  transports: {
    [cnc.id]: http(cncRpcUrl),
  },
  ssr: false,
});

export const queryClient = new QueryClient();