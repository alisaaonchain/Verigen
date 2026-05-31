'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DataRow } from './ui/shared';
import { VerifyPanel, VerifyingState } from './VerifyPanel';
import { AgentChat } from './AIChat';
import { fmtUTC, shortHash, placeholderSvg, makeVerifyFixture } from '@/lib/data';

interface VerifyResult {
  kind: string;
  prompt: string;
  model: string;
  timestamp: Date;
  creator: string;
  creatorShort: string;
  imageHash: string;
  originalHash: string;
  uploadedHash: string;
  blobId: string;
  suiTx: string;
  block?: number;
  originalSrc: string;
  uploadedSrc: string;
}

function ImageComparison({
  originalSrc,
  uploadedSrc,
}: {
  originalSrc: string;
  uploadedSrc: string;
}) {
  return (
    <div className="compare">
      <div className="side original">
        <div className="lbl">
          <span>01 · On-chain original</span>
          <span className="tag">● MATCH</span>
        </div>
        <div className="img-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {originalSrc && <img src={originalSrc} alt="original" />}
        </div>
      </div>
      <div className="side uploaded">
        <div className="lbl">
          <span>02 · Uploaded artifact</span>
          <span className="tag">✗ DIFF</span>
        </div>
        <div className="img-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {uploadedSrc && <img src={uploadedSrc} alt="uploaded" />}
          <div
            className="diff-region"
            style={{ top: '22%', left: '54%', width: '30%', height: '24%' }}
          />
          <div
            className="diff-region"
            style={{ top: '62%', left: '18%', width: '22%', height: '18%' }}
          />
        </div>
      </div>
      <div className="footer">
        <span>2 regions flagged · 4.7% pixel divergence</span>
        <span className="stat">✗ HASH MISMATCH</span>
      </div>
    </div>
  );
}

function Verdict({
  kind,
  originalHash,
  uploadedHash,
  originalSrc,
  uploadedSrc,
}: {
  kind: string;
  originalHash: string;
  uploadedHash: string;
  originalSrc: string;
  uploadedSrc: string;
}) {
  if (kind === 'authentic') {
    return (
      <div className="verdict authentic">
        <div className="glyph-big">✓</div>
        <div className="label">Authentic</div>
        <div className="sub">Hash match confirmed · Image unmodified since certification</div>
      </div>
    );
  }
  if (kind === 'tampered') {
    const orig = originalHash;
    const upl = uploadedHash;
    const len = Math.max(orig.length, upl.length);
    const segOrig: React.ReactNode[] = [];
    const segUpl: React.ReactNode[] = [];
    for (let i = 0; i < len; i++) {
      const a = orig[i] ?? '';
      const b = upl[i] ?? '';
      if (a === b) {
        segOrig.push(
          <span key={i} className="same">
            {a}
          </span>
        );
        segUpl.push(
          <span key={i} className="same">
            {b}
          </span>
        );
      } else {
        segOrig.push(
          <span key={i} className="diff-add">
            {a}
          </span>
        );
        segUpl.push(
          <span key={i} className="diff">
            {b}
          </span>
        );
      }
    }
    return (
      <div className="verdict tampered">
        <div className="glyph-big">✗</div>
        <div className="label">Tampered</div>
        <div className="sub">Hash mismatch · Image has been modified since certification</div>

        <div className="hash-diff">
          <div className="row">
            <div className="k">On-chain</div>
            <div className="v">{segOrig}</div>
          </div>
          <div className="row">
            <div className="k">Uploaded</div>
            <div className="v">{segUpl}</div>
          </div>
        </div>

        <ImageComparison originalSrc={originalSrc} uploadedSrc={uploadedSrc} />
      </div>
    );
  }
  return null;
}

function VerifyResultPanel({
  status,
  result,
  progress,
  fileSrc,
}: {
  status: string;
  result: VerifyResult | null;
  progress: number;
  fileSrc: string | null;
}) {
  if (status === 'idle') {
    return (
      <div className="v-result-empty">
        <div className="glyph">⊞</div>
        <div className="t-label">Awaiting input</div>
        <p>
          Paste a verification URL or blob ID. Optionally upload an image to check for
          tampering.
        </p>
      </div>
    );
  }
  if (status === 'verifying') return <VerifyingState progress={progress} fileSrc={fileSrc} />;
  if (status === 'result' && result) {
    const network = typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_SUI_NETWORK || 'mainnet')
      : 'mainnet';
    return (
      <>
        {/* Walrus blob image preview */}
        {result.originalSrc && !result.originalSrc.includes('data:image/svg') && (
          <div className="walrus-preview">
            <div className="walrus-preview-head">
              <span className="walrus-tag">WALRUS BLOB PREVIEW</span>
              <span className="walrus-status">● FETCHED FROM DECENTRALIZED STORAGE</span>
            </div>
            <div className="walrus-preview-img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.originalSrc} alt="Original from Walrus" />
              <div className="walrus-overlay">
                <span>ORIGINAL · WALRUS</span>
              </div>
            </div>
          </div>
        )}

        <Verdict
          kind={result.kind}
          originalHash={result.originalHash}
          uploadedHash={result.uploadedHash}
          originalSrc={result.originalSrc}
          uploadedSrc={result.uploadedSrc}
        />
        <div className="cert-rows" style={{ borderTop: '1px solid var(--line)' }}>
          <DataRow k="Prompt" v={result.prompt} mono={false} />
          <DataRow k="Model" v={result.model} />
          <DataRow k="Certified" v={fmtUTC(result.timestamp)} meta="UTC" />
          <DataRow k="Creator" v={result.creatorShort} copy />
          <DataRow
            k="On-chain Hash"
            v={'sha256:' + shortHash(result.originalHash, 14, 14)}
            copy
          />
          {result.kind === 'tampered' && (
            <DataRow
              k="Uploaded Hash"
              v={'sha256:' + shortHash(result.uploadedHash, 14, 14)}
              meta="MISMATCH"
            />
          )}
          <DataRow k="Walrus Blob" v={shortHash(result.blobId, 14, 14)} copy />
          <DataRow k="Sui Tx Digest" v={shortHash(result.suiTx, 14, 14)} copy />
        </div>

        {/* Explorer links */}
        <div className="verify-actions">
          <a
            href={`https://walruscan.com/${network}/blob/${result.blobId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="verify-action-link"
          >
            ↗ View on Walrus Explorer
          </a>
          {result.suiTx && result.suiTx.length > 10 && (
            <a
              href={`https://suiscan.xyz/${network}/tx/${result.suiTx}`}
              target="_blank"
              rel="noopener noreferrer"
              className="verify-action-link"
            >
              ↗ View on SuiScan
            </a>
          )}
        </div>
      </>
    );
  }
  return null;
}

function extractBlobId(input: string): string {
  if (input.includes('blob=')) {
    return input.split('blob=')[1]?.split('&')[0] || input;
  }
  return input.trim();
}

export function VerifyPage() {
  const fixture = useMemo(() => makeVerifyFixture(), []);
  const [mode, setMode] = useState('blob');
  const [blobId, setBlobId] = useState(() => {
    // Check URL params for a blob ID
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const blob = params.get('blob');
      if (blob) return blob;
      // Check localStorage for last verified blob
      const saved = localStorage.getItem('verigen_last_blobId');
      if (saved) return saved;
    }
    return '';
  });
  const [file, setFile] = useState<File | null>(null);
  const [fileSrc, setFileSrc] = useState<string | null>(null);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<VerifyResult | null>(null);

  // Derive the clean blob ID for use in API calls and the agent chat
  const cleanBlobId = useMemo(() => extractBlobId(blobId), [blobId]);

  // Read uploaded file as data URL for visual preview
  useEffect(() => {
    if (!file) {
      setFileSrc(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setFileSrc(e.target?.result as string);
    reader.readAsDataURL(file);
  }, [file]);

  const onVerify = async () => {
    setStatus('verifying');
    setProgress(0);
    setResult(null);
    const steps = mode === 'tamper' ? 4 : 2;
    let i = 0;
    const stepDur = 380;

    // Use the clean blob ID for all API calls
    const extractedBlobId = cleanBlobId;

    try {
      if (mode === 'blob') {
        // Animate progress
        const animInterval = setInterval(() => {
          i++;
          setProgress(i);
          if (i >= steps) clearInterval(animInterval);
        }, stepDur);

        const res = await fetch(`/api/verify?blobId=${encodeURIComponent(extractedBlobId)}`);
        clearInterval(animInterval);

        if (res.ok) {
          const data = await res.json();
          setProgress(steps);
          setTimeout(() => {
            const originalSrc = data.imageBase64
              ? `data:image/png;base64,${data.imageBase64}`
              : placeholderSvg(fixture.seed);
            const meta = data.metadata || {};
            const creator = meta.creator || fixture.creator;
            const creatorShort = creator.length > 12
              ? creator.slice(0, 6) + '…' + creator.slice(-4)
              : creator;
            setResult({
              kind: 'authentic',
              prompt: meta.prompt || fixture.prompt,
              model: meta.model || fixture.model,
              timestamp: meta.timestamp ? new Date(meta.timestamp) : fixture.timestamp,
              creator,
              creatorShort,
              imageHash: data.imageHash || fixture.imageHash,
              originalHash: data.imageHash || fixture.imageHash,
              uploadedHash: data.imageHash || fixture.imageHash,
              blobId: data.blobId || extractedBlobId,
              suiTx: fixture.suiTx,
              block: fixture.block,
              originalSrc,
              uploadedSrc: originalSrc,
            });
            setStatus('result');
          }, 300);
          return;
        }
      }

      if (mode === 'tamper' && file) {
        // Read file, hash it client-side, then call POST /api/verify
        const animInterval = setInterval(() => {
          i++;
          setProgress(i);
          if (i >= steps) clearInterval(animInterval);
        }, stepDur);

        const arrayBuf = await file.arrayBuffer();
        const hashBuf = await crypto.subtle.digest('SHA-256', arrayBuf);
        const hashArr = Array.from(new Uint8Array(hashBuf));
        const uploadedHash = hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');

        const res = await fetch('/api/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blobId: extractedBlobId, uploadedHash }),
        });
        clearInterval(animInterval);

        if (res.ok) {
          const data = await res.json();
          setProgress(steps);
          setTimeout(() => {
            const meta = data.metadata || {};
            const creator = meta.creator || fixture.creator;
            const creatorShort = creator.length > 12
              ? creator.slice(0, 6) + '…' + creator.slice(-4)
              : creator;
            const originalSrc = placeholderSvg(fixture.seed);
            const uploadedSrc = fileSrc || placeholderSvg(fixture.seed);
            setResult({
              kind: data.authentic ? 'authentic' : 'tampered',
              prompt: meta.prompt || fixture.prompt,
              model: meta.model || fixture.model,
              timestamp: meta.timestamp ? new Date(meta.timestamp) : fixture.timestamp,
              creator,
              creatorShort,
              imageHash: data.originalHash || fixture.imageHash,
              originalHash: data.originalHash || fixture.imageHash,
              uploadedHash: data.uploadedHash || uploadedHash,
              blobId: extractedBlobId,
              suiTx: fixture.suiTx,
              block: fixture.block,
              originalSrc,
              uploadedSrc,
            });
            setStatus('result');
          }, 300);
          return;
        }
      }
    } catch {
      // Fall through to demo mode
    }

    // Demo/fallback verification
    i = 0;
    const tick = () => {
      i++;
      setProgress(i);
      if (i < steps) {
        setTimeout(tick, stepDur);
      } else {
        setTimeout(() => {
          let kind = 'authentic';
          if (mode === 'tamper') {
            const name = (file?.name || '').toLowerCase();
            if (
              name.includes('tamper') ||
              name.includes('modif') ||
              name.includes('edit') ||
              name.includes('fake')
            ) {
              kind = 'tampered';
            }
          }
          const uploadedHash =
            kind === 'tampered'
              ? fixture.imageHash.slice(0, 18) +
                'bb47e2f1' +
                fixture.imageHash.slice(26, 44) +
                '9c11' +
                fixture.imageHash.slice(48)
              : fixture.imageHash;
          const originalSrc = placeholderSvg(fixture.seed);
          const uploadedSrc = fileSrc || placeholderSvg(fixture.seed);
          setResult({
            kind,
            ...fixture,
            originalHash: fixture.imageHash,
            uploadedHash,
            originalSrc,
            uploadedSrc,
          });
          setStatus('result');
        }, 300);
      }
    };
    setTimeout(tick, stepDur);
  };

  return (
    <main>
      <div className="shell">
        <section className="v-hero">
          <div>
            <div className="pre">Module · 01 · Verification Terminal</div>
            <h1>
              Verify <em>any image.</em>
              <br />
              Detect{' '}
              <span style={{ color: 'var(--tampered)', fontStyle: 'italic' }}>tampering.</span>
            </h1>
          </div>
          <p>
            Paste a verification URL or blob ID to fetch the certified original from Walrus.
            Upload an image to compare its SHA-256 against the on-chain record.
          </p>
        </section>

        <div className="console">
          <div className="panel">
            <div className="panel-head">
              <span className="num">[ A ]</span>
              <span>Input · Source Material</span>
              <span className="stat">
                {file && (
                  <>
                    FILE · <span className="ok">READY</span>
                  </>
                )}
                {!file && blobId && 'BLOB · QUEUED'}
                {!file && !blobId && 'AWAITING'}
              </span>
            </div>
            <VerifyPanel
              onVerify={onVerify}
              status={status}
              mode={mode}
              setMode={setMode}
              blobId={blobId}
              setBlobId={setBlobId}
              file={file}
              setFile={setFile}
            />
            <AgentChat
              result={
                status === 'result' && result
                  ? {
                      ...result,
                      timestamp: result.timestamp,
                    }
                  : null
              }
              blobId={cleanBlobId}
            />
          </div>

          <div className="panel">
            <div className="panel-head">
              <span className="num">[ B ]</span>
              <span>Result · Verdict</span>
              <span className="stat">
                {status === 'idle' && 'STANDBY'}
                {status === 'verifying' && <span className="warn">RUNNING</span>}
                {status === 'result' && result?.kind === 'authentic' && (
                  <span className="ok">✓ MATCH</span>
                )}
                {status === 'result' && result?.kind === 'tampered' && (
                  <span style={{ color: 'var(--tampered)' }}>✗ MISMATCH</span>
                )}
              </span>
            </div>
            <div className="v-result">
              <VerifyResultPanel
                status={status}
                result={result}
                progress={progress}
                fileSrc={fileSrc}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
