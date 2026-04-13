"use client";

import { getPrimaryCncRpcUrl } from '@/lib/cnc-rpc';
import { AlertCircle, Globe, Link as LinkIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';

/** 超过此毫秒数仍在等待时显示兜底提示 */
const WALLET_TIMEOUT_MS = 8000;
const CNC_CHAIN_ID = 50716;
const CNC_CHAIN_ID_HEX = '0xc61c';
const CNC_RPC_URL = getPrimaryCncRpcUrl(process.env.NEXT_PUBLIC_CNC_RPC_URL);
const CNC_EXPLORER_URL = process.env.NEXT_PUBLIC_CNC_EXPLORER_URL || 'https://cncchainpro.com';

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export function WalletConnectButton() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSwitchAttemptedRef = useRef<string | null>(null);
  const ethereumProvider =
    typeof window === 'undefined'
      ? undefined
      : (window as Window & { ethereum?: Eip1193Provider }).ethereum;

  const addAndSwitchToCnc = useCallback(async () => {
    try {
      if (switchChainAsync) {
        await switchChainAsync({ chainId: CNC_CHAIN_ID });
        return;
      }
      switchChain({ chainId: CNC_CHAIN_ID });
      return;
    } catch (err: unknown) {
      const errorCode = (err as { code?: number })?.code;
      const message = (err as { message?: string })?.message || '';
      const isChainMissing = errorCode === 4902 || message.includes('4902');

      if (!isChainMissing || !ethereumProvider) {
        throw err;
      }

      await ethereumProvider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: CNC_CHAIN_ID_HEX,
          chainName: 'CNC Mainnet',
          nativeCurrency: {
            name: 'CNC',
            symbol: 'CNC',
            decimals: 18,
          },
          rpcUrls: [CNC_RPC_URL],
          blockExplorerUrls: [CNC_EXPLORER_URL],
        }],
      });

      if (switchChainAsync) {
        await switchChainAsync({ chainId: CNC_CHAIN_ID });
      } else {
        switchChain({ chainId: CNC_CHAIN_ID });
      }
    }
  }, [switchChain, switchChainAsync]);

  useEffect(() => {
    if (!isConnected || !address) {
      autoSwitchAttemptedRef.current = null;
      return;
    }

    if (chain?.id === CNC_CHAIN_ID) {
      return;
    }

    if (autoSwitchAttemptedRef.current === address) {
      return;
    }

    autoSwitchAttemptedRef.current = address;
    void addAndSwitchToCnc().catch((err) => {
      console.warn('Failed to auto switch to CNC Mainnet after connect', err);
    });
  }, [address, addAndSwitchToCnc, chain?.id, isConnected]);

  // 当连接挂起时启动计时；连接结束（成功或取消）时重置
  useEffect(() => {
    if (isPending) {
      setTimedOut(false);
      timerRef.current = setTimeout(() => setTimedOut(true), WALLET_TIMEOUT_MS);
    } else {
      setTimedOut(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPending]);

  // 寻找浏览器内置 injected 连接器作为兜底
  const injectedConnector = connectors.find(
    (c) => (c.type === 'injected' || c.id === 'injected' || c.id === 'metaMask') && c.ready
  );

  const handleConnect = () => {
    const fallbackConnector = connectors.find((c) => c.ready) || connectors[0];
    if (fallbackConnector) connect({ connector: fallbackConnector });
  };

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  if (!isConnected) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <button
          onClick={handleConnect}
          type="button"
          className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 font-semibold cyan-glow text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5"
          disabled={isPending}
        >
          <LinkIcon size={14} />
          <span className="hidden sm:inline">连接钱包</span>
          <span className="sm:hidden">连接</span>
        </button>

        {isPending && timedOut && (
          <div className="flex items-center gap-1.5 text-xs bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-2 py-1 animate-in fade-in duration-300">
            <AlertCircle size={12} className="text-yellow-500 shrink-0" />
            <span className="text-yellow-600 dark:text-yellow-400 whitespace-nowrap">
              钱包无响应
            </span>
            {injectedConnector && (
              <button
                type="button"
                onClick={() => connect({ connector: injectedConnector })}
                className="flex items-center gap-0.5 text-blue-500 hover:text-blue-400 underline underline-offset-2 font-medium ml-0.5 whitespace-nowrap"
              >
                <Globe size={10} />
                切换浏览器钱包
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (chain?.id !== CNC_CHAIN_ID) {
    return (
      <button
        onClick={() => {
          void addAndSwitchToCnc();
        }}
        type="button"
        disabled={isSwitching}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 font-semibold text-xs sm:text-sm"
      >
        {isSwitching ? '切换中...' : '切换到 CNC 主网'}
      </button>
    );
  }

  return (
    <button
      onClick={() => disconnect()}
      type="button"
      className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 font-semibold text-xs sm:text-sm"
    >
      {shortAddress}
    </button>
  );
}