"use client";

import { getPrimaryCncRpcUrl } from '@/lib/cnc-rpc';
import { QueryClient } from '@tanstack/react-query';
import { injected } from '@wagmi/core';
import { defineChain } from 'viem';
import { createConfig, http } from 'wagmi';

const cncRpcUrl = getPrimaryCncRpcUrl(process.env.NEXT_PUBLIC_CNC_RPC_URL);
const cncExplorerUrl = process.env.NEXT_PUBLIC_CNC_EXPLORER_URL || 'https://cncchainpro.com';

const cnc = defineChain({
  id: 50716,
  name: 'CNC Mainnet',
  network: 'cnc',
  nativeCurrency: {
    name: 'CNC',
    symbol: 'CNC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [cncRpcUrl],
    },
    public: {
      http: [cncRpcUrl],
    },
  },
  blockExplorers: {
    default: {
      name: 'CNC Explorer',
      url: cncExplorerUrl,
    },
  },
  testnet: false,
});

export const config = createConfig({
  chains: [cnc],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [cnc.id]: http(cncRpcUrl),
  },
  ssr: false,
});

export const queryClient = new QueryClient();