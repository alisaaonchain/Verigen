'use client';

import React from 'react';
import { createNetworkConfig, SuiClientProvider, WalletProvider as SuiWalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@mysten/dapp-kit/dist/index.css';

const { networkConfig } = createNetworkConfig({
  mainnet: { url: 'https://fullnode.mainnet.sui.io:443', network: 'mainnet' },
  testnet: { url: 'https://fullnode.testnet.sui.io:443', network: 'testnet' },
});

const queryClient = new QueryClient();

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="mainnet">
        <SuiWalletProvider autoConnect>
          {children}
        </SuiWalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
