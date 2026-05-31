'use client';

import React, { useRef } from 'react';

const VERIFY_STEPS = [
  { nm: 'Resolve blob ID on Sui registry' },
  { nm: 'Fetch original blob from Walrus' },
  { nm: 'Compute SHA-256 of uploaded file' },
  { nm: 'Compare hash against on-chain record' },
];

export function VerifyPanel({
  onVerify,
  status,
  mode,
  setMode,
  blobId,
  setBlobId,
  file,
  setFile,
}: {
  onVerify: () => void;
  status: string;
  mode: string;
  setMode: (m: string) => void;
  blobId: string;
  setBlobId: (s: string) => void;
  file: File | null;
  setFile: (f: File | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  return (
    <>
      <div className="v-tabs">
        <button
          className={'v-tab' + (mode === 'blob' ? ' active' : '')}
          onClick={() => setMode('blob')}
        >
          <span className="idx">01</span> By Blob ID
        </button>
        <button
          className={'v-tab' + (mode === 'tamper' ? ' active' : '')}
          onClick={() => setMode('tamper')}
        >
          <span className="idx">02</span> Tamper Check
        </button>
      </div>

      <div className="v-input">
        <div className="lbl">Verification URL or Blob ID</div>
        <input
          type="text"
          className="v-text-input"
          value={blobId}
          onChange={(e) => setBlobId(e.target.value)}
          placeholder="Paste a Walrus blob ID to verify…"
        />
      </div>

      {mode === 'tamper' && (
        <div className="v-input">
          <div className="lbl">Image File · Hash will be computed locally</div>
          <div
            className={'dropzone' + (file ? ' has-file' : '')}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
          >
            <div className="icon">{file ? '✓' : '↑'}</div>
            <div className="title">
              {file ? file.name : 'Drop image or click to upload'}
            </div>
            <div className="hint">
              {file
                ? `${(file.size / 1024).toFixed(1)} KB · SHA-256 ready`
                : 'PNG / JPG / WEBP · max 10MB'}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={onPick}
            />
          </div>
        </div>
      )}

      <div className="v-actions">
        <button
          className="btn btn-primary"
          onClick={onVerify}
          disabled={
            status === 'verifying' ||
            (!blobId.trim() && !file) ||
            (mode === 'tamper' && !file)
          }
        >
          {status === 'verifying'
            ? 'Verifying…'
            : mode === 'tamper'
              ? 'Run Tamper Check'
              : 'Resolve & Verify'}
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => {
            setBlobId('');
            setFile(null);
          }}
          disabled={status === 'verifying'}
        >
          Clear
        </button>
      </div>
    </>
  );
}

export function VerifyingState({
  progress,
  fileSrc,
}: {
  progress: number;
  fileSrc: string | null;
}) {
  return (
    <div className="verifying">
      <div className="lab">Running verification routine</div>
      {fileSrc && (
        <div className="scanner">
          <div className="scan-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fileSrc} alt="scanning" />
          </div>
          <div className="scan-grid" />
          <div className="scan-line" />
          <div className="scan-corners">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      )}
      <div className="verify-bars">
        {VERIFY_STEPS.map((s, i) => {
          const cls = i < progress ? 'done' : i === progress ? 'active' : '';
          return (
            <div key={i} className={'vb ' + cls}>
              <span className="nm">
                {String(i + 1).padStart(2, '0')} / {s.nm}
              </span>
              <span className="bar" />
              <span className="st">
                {i < progress ? '✓ OK' : i === progress ? '…' : 'QUEUED'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
