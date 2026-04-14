"use client";

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { AlertCircle, Link as LinkIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';

const CNC_CHAIN_ID = 50716;
const WALLET_TIMEOUT_MS = 8000;

export function WalletConnectButton() {
  const { isConnecting, isConnected } = useAccount();
  const [manualPending, setManualPending] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isConnecting || manualPending) {
      setTimedOut(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setTimedOut(true), WALLET_TIMEOUT_MS);
    } else {
      setTimedOut(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isConnecting, manualPending]);

  useEffect(() => {
    if (isConnected || !isConnecting) {
      setManualPending(false);
    }
  }, [isConnected, isConnecting]);

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
          (!authenticationStatus || authenticationStatus === 'authenticated');

        if (!ready) {
          // 防止服务端渲染错位，占位保持布局稳定
          return (
            <div
              aria-hidden
              className="bg-accent rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm opacity-0 pointer-events-none"
            >
              连接钱包
            </div>
          );
        }

        if (!connected) {
          const connectingNow = isConnecting || manualPending;

          return (
            <div className="flex flex-col items-end gap-1.5">
              <button
                onClick={() => {
                  setManualPending(true);
                  openConnectModal?.();
                }}
                onBlur={() => {
                  // 用户点开钱包弹窗后通常会离开页面焦点，保留 pending 提示
                  // 一段时间，避免“点了没反应”的感知。
                }}
                type="button"
                disabled={connectingNow}
                className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 font-semibold cyan-glow text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 disabled:opacity-80"
              >
                <LinkIcon size={14} />
                <span className="hidden sm:inline">{connectingNow ? '连接中...' : '连接钱包'}</span>
                <span className="sm:hidden">{connectingNow ? '连接中' : '连接'}</span>
              </button>

              {timedOut && !account && (
                <div className="flex items-center gap-1.5 text-xs bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-2 py-1 animate-in fade-in duration-300">
                  <AlertCircle size={12} className="text-yellow-500 shrink-0" />
                  <span className="text-yellow-600 dark:text-yellow-400 whitespace-nowrap">
                    钱包暂未响应
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTimedOut(false);
                      setManualPending(true);
                      openConnectModal?.();
                    }}
                    className="text-blue-500 hover:text-blue-400 underline underline-offset-2 font-medium whitespace-nowrap"
                  >
                    重试
                  </button>
                </div>
              )}
            </div>
          );
        }

        // 非 CNC 主网：点击弹出切链弹窗
        if (chain.unsupported || chain.id !== CNC_CHAIN_ID) {
          return (
            <button
              onClick={openChainModal}
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 font-semibold text-xs sm:text-sm"
            >
              切换到 CNC 主网
            </button>
          );
        }

        // 已连接 CNC：点击弹出账户弹窗（断开/复制地址等）
        return (
          <button
            onClick={openAccountModal}
            type="button"
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 font-semibold text-xs sm:text-sm"
          >
            {account.displayName}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}