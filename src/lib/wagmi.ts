import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';
import { QueryClient } from '@tanstack/react-query';

export const config = getDefaultConfig({
  appName: 'Truth Oracle',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'bc141aa72f6dbd2b781dafe6eb5d14cd',
  chains: [sepolia],
  ssr: true,
});

export const queryClient = new QueryClient();