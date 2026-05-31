'use client';

import React, { useMemo } from 'react';
import { shortHash, fmtRelTime, placeholderSvg, buildAuditLog } from '@/lib/data';
import type { FeedItem } from '@/lib/data';

function FeedCard({
  item,
  variant,
  idx,
  total,
  newId,
}: {
  item: FeedItem;
  variant: string;
  idx: number;
  total: number;
  newId: string | null;
}) {
  return (
    <div className={'feed-card ' + variant + (item.id === newId ? ' fade-in' : '')}>
      <div className="thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.imageUrl || placeholderSvg(item.seed ?? item.id)} alt="" />
        <span className="badge">{item.onChain ? '● On-chain' : 'Certified'}</span>
        <span className="idx-tag">#{String(total - idx).padStart(4, '0')}</span>
        <div className="overlay">
          <div className="kv">
            <span className="k">Creator</span>
            <span className="v">{item.creator}</span>
            <span className="k">Blob</span>
            <span className="v">{shortHash(item.blobId, 10, 6)}</span>
            <span className="k">Tx</span>
            <span className="v">{shortHash(item.suiTx, 10, 6)}</span>
            <span className="k">Block</span>
            <span className="v">{item.block.toLocaleString()}</span>
          </div>
        </div>
      </div>
      <div className="body">
        <div className="prompt">{item.prompt}</div>
        {variant === 'hero-card' ? (
          <div className="extra">
            <div className="row-kv">
              <span className="k">Creator</span>
              <span>{item.creator}</span>
            </div>
            <div className="row-kv">
              <span className="k">Model</span>
              <span>SDXL</span>
            </div>
            <div className="row-kv">
              <span className="k">Blob</span>
              <span>{shortHash(item.blobId, 6, 4)}</span>
            </div>
            <div className="row-kv">
              <span className="k">Certified</span>
              <span>{fmtRelTime(item.timestamp)}</span>
            </div>
          </div>
        ) : (
          <div className="meta">
            <span className="blob">{shortHash(item.blobId, 6, 4)}</span>
            <span>{fmtRelTime(item.timestamp)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function Feed({ items, newId }: { items: FeedItem[]; newId: string | null }) {
  const showItems = items.slice(0, 10);
  const hero = showItems[0];
  const stdRow = showItems.slice(1, 7);
  const wideRow = showItems.slice(7, 10);

  return (
    <section className="feed">
      <div className="feed-head">
        <div>
          <div className="t-label" style={{ marginBottom: 14 }}>
            [ MODULE · 04 ] · PROVENANCE FEED
          </div>
          <h2>
            Recent{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--fg-2)' }}>certifications.</em>
          </h2>
        </div>
        <div className="meta">
          <span className="live">LIVE · STREAMING</span>
          <span>LAST 10 · SUI MAINNET</span>
          <span>UPDATED {items[0] ? fmtRelTime(items[0].timestamp) : '—'}</span>
        </div>
      </div>

      <div className="feed-grid">
        {hero && (
          <FeedCard
            item={hero}
            variant="hero-card"
            idx={0}
            total={showItems.length}
            newId={newId}
          />
        )}
        {stdRow.map((it, i) => (
          <FeedCard
            key={it.id}
            item={it}
            variant="standard"
            idx={i + 1}
            total={showItems.length}
            newId={newId}
          />
        ))}
        {wideRow.map((it, i) => (
          <FeedCard
            key={it.id}
            item={it}
            variant="wide"
            idx={i + 7}
            total={showItems.length}
            newId={newId}
          />
        ))}
      </div>
    </section>
  );
}

export function AuditLog({ feed }: { feed: FeedItem[] }) {
  const lines = useMemo(() => buildAuditLog(feed), [feed]);
  return (
    <section className="audit-log">
      <div className="audit-log-head">
        <span>[ MODULE · 05 ] · IMMUTABLE AUDIT TRAIL</span>
        <span />
        <span className="live">LIVE TAIL</span>
      </div>
      <div className="audit-stream">
        {lines.map((l) => {
          const t = l.time.toISOString().slice(11, 19);
          const opCls =
            l.op === 'TAMPER'
              ? 'op-tamper'
              : l.op === 'VERIFY' || l.op === 'RESOLVE'
                ? 'op-verify'
                : '';
          return (
            <div key={l.id} className={'audit-line ' + opCls}>
              <span className="t">{t}</span>
              <span className="op">{l.op}</span>
              <span className="blob">{shortHash(l.blobId, 8, 6)}</span>
              <span className="pmt">{l.prompt}</span>
              <span className="gas">{l.gas}</span>
              <span className="blk">#{l.block.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
