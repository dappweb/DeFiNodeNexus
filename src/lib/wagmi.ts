import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';
import { QueryClient } from '@tanstack/react-query';

export const config = getDefaultConfig({
  appName: 'Truth Oracle',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
  chains: [sepolia],
  ssr: true,
});

export const queryClient = new QueryClient();