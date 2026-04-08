"use client";

import { createConfig, http } from 'wagmi';
import { injected } from '@wagmi/core';
import { sepolia } from 'wagmi/chains';
import { QueryClient } from '@tanstack/react-query';

export const config = createConfig({
  chains: [sepolia],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || undefined),
  },
  ssr: false,
});

export const queryClient = new QueryClient();