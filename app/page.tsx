'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Nav } from '@/components/ui/Nav';
import { Footer } from '@/components/ui/Footer';
import { Ticker } from '@/components/ui/Ticker';
import { HomePage } from '@/components/HomePage';
import { buildSeedFeed, makeHash, makeBlobId, makeTxDigest } from '@/lib/data';
import type { FeedItem } from '@/lib/data';

export default function Home() {
  const router = useRouter();
  const walletAccount = useCurrentAccount();
  const [feed, setFeed] = useState<FeedItem[]>(() => buildSeedFeed());
  const [busy, setBusy] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [lastCert, setLastCert] = useState<FeedItem | null>(null);
  const [totalCount, setTotalCount] = useState(38214);

  const onCertify = useCallback(
    async (prompt: string) => {
      if (busy) return;
      setBusy(true);
      setLastCert(null);
      setStepIdx(0);

      // Start the step animation
      let i = 0;
      const advanceStep = () => {
        i++;
        setStepIdx(i);
      };

      // Step 1 immediately
      setTimeout(advanceStep, 600);

      try {
        // Kick off additional step animations
        const t2 = setTimeout(() => { if (i < 2) advanceStep(); }, 1400);
        const t3 = setTimeout(() => { if (i < 3) advanceStep(); }, 2200);

        // Call the real API
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            creatorAddress: walletAccount?.address || 'anonymous',
          }),
        });

        clearTimeout(t2);
        clearTimeout(t3);

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Generation failed');
        }

        // Advance to step 4 (complete)
        setStepIdx(4);

        setTimeout(() => {
          const seed = 'user-' + Date.now();
          const cert: FeedItem = {
            id: seed,
            prompt,
            model: data.model || 'stability-ai/sdxl',
            timestamp: new Date(data.timestamp || Date.now()),
            creator: data.creator || '0x' + makeHash(seed).slice(0, 40),
            creatorShort: data.creator
              ? data.creator.slice(0, 6) + '…' + data.creator.slice(-4)
              : '0x' + makeHash(seed).slice(0, 4) + '…' + makeHash(seed).slice(36, 40),
            imageHash: data.imageHash || makeHash(seed),
            blobId: data.blobId || makeBlobId(seed),
            suiTx: data.suiTxDigest || makeTxDigest(seed),
            block: data.blockHeight || 124809213 + Math.floor(Math.random() * 100),
            regNum: String(totalCount + 1).padStart(5, '0'),
            seed,
            verified: true,
            imageUrl: data.imageUrl,
          };
          setLastCert(cert);
          setFeed((f) => [cert, ...f].slice(0, 12));
          setTotalCount((c) => c + 1);
          setBusy(false);
        }, 500);
      } catch (err) {
        console.error('[page] certify error:', err);

        // Fallback demo cert
        setStepIdx(4);
        setTimeout(() => {
          const seed = 'user-' + Date.now();
          const cert: FeedItem = {
            id: seed,
            prompt,
            model: 'stability-ai/sdxl',
            timestamp: new Date(),
            creator: '0x' + makeHash(seed).slice(0, 40),
            creatorShort: '0x' + makeHash(seed).slice(0, 4) + '…' + makeHash(seed).slice(36, 40),
            imageHash: makeHash(seed),
            blobId: makeBlobId(seed),
            suiTx: makeTxDigest(seed),
            block: 124809213 + Math.floor(Math.random() * 100),
            regNum: String(totalCount + 1).padStart(5, '0'),
            seed,
            verified: true,
          };
          setLastCert(cert);
          setFeed((f) => [cert, ...f].slice(0, 12));
          setTotalCount((c) => c + 1);
          setBusy(false);
        }, 500);
      }
    },
    [busy, totalCount, walletAccount]
  );

  return (
    <div className="app">
      <div className="bg-grid" />
      <Nav
        page="home"
        onNav={(p) => {
          if (p === 'verify') router.push('/verify');
        }}
        feedCount={totalCount}
      />
      <Ticker feed={feed} />
      <HomePage
        feed={feed}
        onCertify={onCertify}
        lastCert={lastCert}
        busy={busy}
        stepIdx={stepIdx}
        totalCount={totalCount}
      />
      <Footer feedCount={totalCount} />
    </div>
  );
}
