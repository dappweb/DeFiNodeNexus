"use client";
"use client";

import '@rainbow-me/rainbowkit/styles.css';

import { config, queryClient } from '@/lib/wagmi';
import { Web3Provider } from '@/lib/web3-provider';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';

interface Web3ProvidersProps {
  children: ReactNode;
}

export function Web3Providers({ children }: Web3ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#00d4ff',
            accentColorForeground: '#000',
            borderRadius: 'large',
          })}
          locale="zh-CN"
        >
          <Web3Provider>
            {children}
          </Web3Provider>
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}