"use client";

import { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider } from '@tanstack/react-query';
import { config, queryClient } from '@/lib/wagmi';
import { Web3Provider } from '@/lib/web3-provider';

interface Web3ProvidersProps {
  children: ReactNode;
}

export function Web3Providers({ children }: Web3ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <Web3Provider>
          {children}
        </Web3Provider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}