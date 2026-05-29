'use client';

import React from 'react';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';

export function ConnectWallet() {
  const account = useCurrentAccount();

  return (
    <div className="wallet-connect">
      {account ? (
        <div className="wallet-connected">
          <span className="wallet-dot" />
          <span className="wallet-addr">
            {account.address.slice(0, 6)}…{account.address.slice(-4)}
          </span>
        </div>
      ) : (
        <ConnectButton className="wallet-btn" />
      )}
    </div>
  );
}

export function useWalletAddress(): string | null {
  const account = useCurrentAccount();
  return account?.address || null;
}
