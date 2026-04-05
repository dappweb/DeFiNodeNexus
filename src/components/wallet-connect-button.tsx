"use client";

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Link as LinkIcon, AlertCircle, Globe } from 'lucide-react';
import { useConnect } from 'wagmi';
import { useState, useEffect, useRef } from 'react';

/** 超过此毫秒数仍在等待时显示兜底提示 */
const WALLET_TIMEOUT_MS = 8000;

export function WalletConnectButton() {
  const { connect, connectors, isPending } = useConnect();
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
    (c) => c.type === 'injected' || c.id === 'injected' || c.id === 'browserWallet'
  );

  const handleFallback = () => {
    if (injectedConnector) connect({ connector: injectedConnector });
  };

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              'style': {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <div className="flex flex-col items-end gap-1.5">
                    <button
                      onClick={openConnectModal}
                      type="button"
                      className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 font-semibold cyan-glow text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5"
                    >
                      <LinkIcon size={14} />
                      <span className="hidden sm:inline">连接钱包</span>
                      <span className="sm:hidden">连接</span>
                    </button>

                    {/* 超时兜底提示：8 秒后仍在等待时出现 */}
                    {isPending && timedOut && (
                      <div className="flex items-center gap-1.5 text-xs bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-2 py-1 animate-in fade-in duration-300">
                        <AlertCircle size={12} className="text-yellow-500 shrink-0" />
                        <span className="text-yellow-600 dark:text-yellow-400 whitespace-nowrap">
                          钱包无响应
                        </span>
                        {injectedConnector && (
                          <button
                            type="button"
                            onClick={handleFallback}
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

              if (chain.unsupported) {
                return (
                  <button onClick={openChainModal} type="button" className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 font-semibold text-xs sm:text-sm">
                    Wrong network
                  </button>
                );
              }

              return (
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={openChainModal}
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 font-semibold text-xs sm:text-sm flex items-center"
                    type="button"
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 12,
                          height: 12,
                          borderRadius: 999,
                          overflow: 'hidden',
                          marginRight: 4,
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            style={{ width: 12, height: 12 }}
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                  </button>

                  <button onClick={openAccountModal} type="button" className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 font-semibold text-xs sm:text-sm">
                    {account.displayName}
                    {account.displayBalance
                      ? ` (${account.displayBalance})`
                      : ''}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}