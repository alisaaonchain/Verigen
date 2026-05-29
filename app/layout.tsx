import type { Metadata } from 'next';
import { WalletProvider } from '@/components/WalletProvider';
import '@/styles/globals.css';
import '@/styles/home.css';
import '@/styles/verify.css';
import '@/styles/polish.css';

export const metadata: Metadata = {
  title: 'VeriGen — AI Image Provenance & Tamper Detection',
  description:
    'Certify AI-generated images on-chain. SHA-256 fingerprints stored on Walrus, registered on Sui via Tatum. Tamper-proof, immutable, verifiable.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=JetBrains+Mono:wght@300;400;500;600&family=Space+Grotesk:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
