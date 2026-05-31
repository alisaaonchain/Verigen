'use client';

import React, { useRef, useEffect } from 'react';

const GEN_STEPS = [
  { num: '01', nm: 'Replicate / SDXL', stat: 'RENDER' },
  { num: '02', nm: 'SHA-256 image', stat: 'HASH' },
  { num: '03', nm: 'Walrus blob', stat: 'STORE' },
  { num: '04', nm: 'Sui registry', stat: 'REGISTER' },
];

export function Generator({
  prompt,
  setPrompt,
  onGenerate,
  busy,
  suggestions,
  onPick,
  stepIdx,
}: {
  prompt: string;
  setPrompt: (s: string) => void;
  onGenerate: () => void;
  busy: boolean;
  suggestions: string[];
  onPick: (s: string) => void;
  stepIdx: number;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(84, el.scrollHeight) + 'px';
  }, [prompt]);
  const onKey = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') onGenerate();
  };
  return (
    <div className="gen">
      <div className="gen-shell">
        <div className="gen-head">
          <span className="idx">[ MODULE · 02 ]</span>
          <span>Prompt → Certified Artifact</span>
          <span className="meta-stat">
            MODEL · <b>FLUX-SCHNELL</b>
          </span>
          <span className="meta-stat">
            CHAIN · <b>SUI MAINNET</b>
          </span>
        </div>
        <div className="gen-body">
          <div className="gen-input-wrap">
            <textarea
              ref={taRef}
              className="gen-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={onKey}
              placeholder="a samurai fox in neon Tokyo, digital art…"
              rows={2}
              disabled={busy}
            />
          </div>
          <div className="gen-action">
            <button onClick={onGenerate} disabled={busy || !prompt.trim()}>
              <span className="sub">{busy ? 'Working' : '⌘ ↵'}</span>
              <span className="label">{busy ? 'Certifying…' : 'Generate & Certify'}</span>
            </button>
          </div>
        </div>
        <div className="gen-suggest">
          <span className="lbl">Try</span>
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => onPick(s)} disabled={busy}>
              {s}
            </button>
          ))}
        </div>
        {busy && (
          <div className="gen-progress">
            <div className="gen-progress-head">
              <span className="blink" /> CERTIFICATION PIPELINE · STREAMING
            </div>
            <div className="gen-steps">
              {GEN_STEPS.map((s, i) => {
                const cls = i < stepIdx ? 'done' : i === stepIdx ? 'active' : '';
                return (
                  <div key={i} className={'gen-step ' + cls}>
                    <span className="num">{s.num}</span>
                    <span className="nm">{s.nm}</span>
                    <span className="stat">
                      {i < stepIdx ? 'COMPLETE' : i === stepIdx ? 'RUNNING' : 'QUEUED'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="gen-foot">
          <div className="cell">
            <span className="swatch" /> WALRUS · ONLINE
          </div>
          <div className="cell">RPC · TATUM GATEWAY</div>
          <div className="cell">REGISTRY · 0x4f…d3a1</div>
          <div className="cell">~ EST. 8.2s · 0.0021 SUI</div>
        </div>
      </div>
    </div>
  );
}
