'use client';

import React, { useState, useMemo } from 'react';
import { hashFingerprint, hashQR } from '@/lib/data';

export function TickCorners() {
  return (
    <>
      <span className="tick-tl" />
      <span className="tick-tr" />
      <span className="tick-bl" />
      <span className="tick-br" />
    </>
  );
}

export function DataRow({
  k,
  v,
  meta,
  mono = true,
  copy = false,
  copyValue,
}: {
  k: string;
  v: string;
  meta?: string;
  mono?: boolean;
  copy?: boolean;
  copyValue?: string;
}) {
  const [copied, setCopied] = useState(false);
  const onCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const text = copyValue || (typeof v === 'string' ? v : String(v || ''));
      navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="data-row">
      <div className="k">{k}</div>
      <div
        className="v"
        style={mono ? {} : { fontFamily: 'var(--sans)', whiteSpace: 'normal' }}
        title={typeof v === 'string' ? v : undefined}
      >
        {v}
      </div>
      <div className="meta">
        {copy ? (
          <button
            className="t-mono"
            style={{
              color: copied ? 'var(--verified)' : 'var(--fg-3)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              fontSize: 9,
            }}
            onClick={onCopy}
          >
            {copied ? '✓ COPIED' : 'COPY'}
          </button>
        ) : meta ? (
          <span>{meta}</span>
        ) : null}
      </div>
    </div>
  );
}

export function Fingerprint({ hash, size = 'md' }: { hash: string; size?: 'sm' | 'md' | 'lg' }) {
  const cells = useMemo(() => hashFingerprint(hash || '0'.repeat(64), 8), [hash]);
  const cls =
    'fingerprint' +
    (size === 'lg' ? ' fingerprint-lg' : size === 'sm' ? ' fingerprint-sm' : '');
  return (
    <div className={cls} aria-label="hash fingerprint">
      {cells.map((c, i) => (
        <div
          key={i}
          className="px"
          style={{ background: c.color, gridColumn: c.x + 1, gridRow: c.y + 1 }}
        />
      ))}
    </div>
  );
}

export function QRBlock({ hash }: { hash: string }) {
  const grid = useMemo(() => hashQR(hash || '0'.repeat(64)), [hash]);
  return (
    <div className="qrish" aria-label="verification code">
      {grid.map((on, i) => (
        <div key={i} className={'qp' + (on ? '' : ' off')} />
      ))}
    </div>
  );
}

export function CopyableShare({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = () => {
    try {
      navigator.clipboard.writeText(url);
    } catch {
      // ignore
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="share">
      <div className="lbl">Share · Verify URL</div>
      <div className="url">{url}</div>
      <button className={'copy' + (copied ? ' copied' : '')} onClick={onCopy}>
        {copied ? '✓ Copied' : 'Copy URL'}
      </button>
    </div>
  );
}
