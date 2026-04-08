"use client";

import { Link as LinkIcon, AlertCircle, Globe } from 'lucide-react';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { useState, useEffect, useRef } from 'react';

/** 超过此毫秒数仍在等待时显示兜底提示 */
const WALLET_TIMEOUT_MS = 8000;

export function WalletConnectButton() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  if (chain?.id !== 11155111) {
    return (
      <button
        onClick={() => switchChain({ chainId: 11155111 })}
        type="button"
        disabled={isSwitching}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 font-semibold text-xs sm:text-sm"
      >
        切换到 Sepolia
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <button
        type="button"
        className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 font-semibold text-xs sm:text-sm flex items-center"
      >
        Sepolia
      </button>

      <button
        onClick={() => disconnect()}
        type="button"
        className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 font-semibold text-xs sm:text-sm"
      >
        {shortAddress}
      </button>
    </div>
  );
}