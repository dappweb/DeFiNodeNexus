import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { metaMaskWallet, walletConnectWallet, injectedWallet } from '@rainbow-me/rainbowkit/wallets';
import { sepolia } from 'wagmi/chains';
import { QueryClient } from '@tanstack/react-query';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'bc141aa72f6dbd2b781dafe6eb5d14cd';

export const config = getDefaultConfig({
  appName: 'Truth Oracle',
  projectId,
  chains: [sepolia],
  wallets: [
    {
      groupName: '已安装',
      wallets: [
        metaMaskWallet,
        injectedWallet,
      ],
    },
    {
      groupName: '其他',
      wallets: [
        walletConnectWallet,
      ],
    },
  ],
  ssr: true,
});

export const queryClient = new QueryClient();