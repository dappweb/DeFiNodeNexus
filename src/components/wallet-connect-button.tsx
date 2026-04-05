"use client";

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Link as LinkIcon } from 'lucide-react';

export function WalletConnectButton() {
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
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 font-semibold cyan-glow text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5"
                  >
                    <LinkIcon size={14} />
                    <span className="hidden sm:inline">连接钱包</span>
                    <span className="sm:hidden">连接</span>
                  </button>
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