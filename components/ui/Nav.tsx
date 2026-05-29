'use client';

import React, { useState, useEffect } from 'react';
import { ConnectWallet } from '@/components/ConnectWallet';

export function Nav({
  page,
  onNav,
  feedCount,
}: {
  page: string;
  onNav: (p: string) => void;
  feedCount: number;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const t = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  return (
    <nav className="nav">
      <div className="shell">
        <div className="nav-inner">
          <div className="brand">
            <div className="brand-mark" />
            <div className="brand-text">
              VERIGEN<span className="dot">●</span>PROVENANCE
            </div>
          </div>
          <div className="nav-center">
            <button
              className={'nav-link' + (page === 'home' ? ' active' : '')}
              onClick={() => onNav('home')}
            >
              Certify
            </button>
            <button
              className={'nav-link' + (page === 'verify' ? ' active' : '')}
              onClick={() => onNav('verify')}
            >
              Verify
            </button>
            <button
              className="nav-link"
              onClick={() => onNav('home')}
              style={{ pointerEvents: 'none', opacity: 0.5 }}
            >
              Registry
            </button>
          </div>
          <div className="nav-meta">
            <span>
              <span className="status-dot" />
              SUI · MAINNET
            </span>
            <span>{t}</span>
            <span>REG · {feedCount.toLocaleString()}</span>
            <ConnectWallet />
          </div>
        </div>
      </div>
    </nav>
  );
}
