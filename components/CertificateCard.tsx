'use client';

import React, { useRef, useState, useCallback } from 'react';
import { TickCorners, DataRow, CopyableShare, Fingerprint, QRBlock } from './ui/shared';
import { fmtUTC, shortHash, placeholderSvg } from '@/lib/data';
import type { FeedItem } from '@/lib/data';

function CertLoadingRows() {
  return (
    <div className="cert-loading-rows">
      {[
        'PROMPT',
        'MODEL',
        'TIMESTAMP',
        'CREATOR',
        'IMAGE HASH (SHA-256)',
        'WALRUS BLOB ID',
        'SUI TX DIGEST',
        'BLOCK',
      ].map((k, i) => (
        <div key={i} className="row-skel">
          <div className="k">{k}</div>
          <div className={'v-skel ' + (i % 3 === 0 ? 'short' : i % 3 === 1 ? 'med' : '')} />
        </div>
      ))}
    </div>
  );
}

export function CertificateCard({ cert, busy }: { cert: FeedItem | null; busy: boolean }) {
  const certRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const exportCert = useCallback(async () => {
    if (!certRef.current || exporting) return;
    setExporting(true);
    try {
      const { default: html2canvas } = await import('html2canvas-pro');
      const canvas = await html2canvas(certRef.current, {
        backgroundColor: '#0d0d13',
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `verigen-cert-${cert?.regNum || 'draft'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('[export] failed:', err);
    } finally {
      setExporting(false);
    }
  }, [cert, exporting]);

  if (!cert && !busy) return null;
  const network = process.env.NEXT_PUBLIC_SUI_NETWORK || 'mainnet';
  const verifyUrl = cert
    ? `verigen.app/verify?blob=${cert.blobId.slice(0, 16)}…`
    : 'verigen.app/verify?blob=…';

  const suiScanUrl = cert ? `https://suiscan.xyz/${network}/tx/${cert.suiTx}` : '#';
  const walrusUrl = cert
    ? `https://walruscan.com/${network}/blob/${cert.blobId}`
    : '#';

  return (
    <section className="cert-stage">
      <div className="cert-stage-head">
        <span>[ MODULE · 03 ]</span>
        <span className="rule" />
        <span>
          {busy
            ? 'PENDING STAMP · AWAITING ON-CHAIN CONFIRMATION'
            : 'STAMPED · ON-CHAIN CONFIRMED'}
        </span>
      </div>

      <div className="cert" ref={certRef}>
        <TickCorners />

        <div className={'cert-image' + (busy ? ' loading' : '')}>
          <div className="frame">
            {cert ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cert.imageUrl || placeholderSvg(cert.seed)} alt="" />
            ) : (
              <div className="ph">
                <span>
                  RENDERING
                  <br />
                  FLUX-SCHNELL
                </span>
              </div>
            )}
            <span className="ch-bl" />
            <span className="ch-br" />
          </div>
          {cert && (
            <div className="stamp">
              <div>VERIGEN</div>
              <div className="big">Certified</div>
              <div className="num">№ {cert.regNum || '00001'}</div>
            </div>
          )}
        </div>

        <div className="cert-data">
          <div className="cert-head">
            <div>
              <div className="pre">Certificate of Authenticity</div>
              <h2>
                {cert ? (
                  <span>
                    Registered
                    <br />
                    <em>on-chain</em>
                  </span>
                ) : (
                  <span>
                    Preparing
                    <br />
                    <em>certificate…</em>
                  </span>
                )}
              </h2>
            </div>
            <div className="seal">
              SEAL № {cert ? cert.regNum || '00001' : '—'}
              <span className="net">{cert ? '● SUI MAINNET' : '● PENDING'}</span>
            </div>
          </div>

          {cert && (
            <div className="cert-glyphs">
              <div className="glyph-block">
                <Fingerprint hash={cert.imageHash} />
                <div className="meta">
                  <span className="lbl">Hash Fingerprint</span>
                  <span className="val">SHA-256</span>
                  <span className="sub">Deterministic · 64 bytes</span>
                </div>
              </div>
              <div className="center-rule" />
              <div className="glyph-block">
                <div className="meta" style={{ textAlign: 'right', alignItems: 'flex-end' }}>
                  <span className="lbl">Verify Code</span>
                  <span className="val">SCAN TO VERIFY</span>
                  <span className="sub">verigen.app/verify</span>
                </div>
                <QRBlock hash={cert.imageHash} />
              </div>
            </div>
          )}

          <div className="cert-rows">
            {busy && !cert ? (
              <CertLoadingRows />
            ) : cert ? (
              <>
                <DataRow k="Prompt" v={cert.prompt} mono={false} />
                <DataRow k="Model" v={cert.model} />
                <DataRow k="Timestamp" v={fmtUTC(cert.timestamp)} meta="UTC" />
                <DataRow k="Creator" v={cert.creator} copy />
                <DataRow
                  k="Image Hash"
                  v={'sha256:' + shortHash(cert.imageHash, 14, 14)}
                  copy
                />
                <DataRow k="Walrus Blob" v={shortHash(cert.blobId, 14, 14)} copy />
                <DataRow k="Sui Tx Digest" v={shortHash(cert.suiTx, 14, 14)} copy />
                <DataRow k="Block" v={cert.block.toLocaleString()} meta="EPOCH 421" />
              </>
            ) : null}
          </div>

          {cert && (
            <>
              <div className="cert-issued">
                <div className="col">
                  <div className="k">Issued by</div>
                  <div className="v">VeriGen Registry</div>
                  <div className="sub">REGISTRAR · 0x4f…d3a1</div>
                </div>
                <div className="col">
                  <div className="k">Chain of custody</div>
                  <div className="v">Walrus → Sui Mainnet</div>
                  <div className="sub">EPOCH 421 · NODE 03</div>
                </div>
                <div className="col sig">
                  <div className="k">Authority</div>
                  <div className="signature">verigen.</div>
                  <div className="signature-line" />
                </div>
              </div>

              <div className="cert-actions">
                <a href={suiScanUrl} target="_blank" rel="noopener noreferrer">
                  <span>↗ View on SuiScan</span>
                  <span className="arr">→</span>
                </a>
                <a href={walrusUrl} target="_blank" rel="noopener noreferrer">
                  <span>↗ Walrus Blob Explorer</span>
                  <span className="arr">→</span>
                </a>
              </div>
              <div className="cert-actions">
                <button onClick={exportCert} disabled={exporting} className="export-btn">
                  <span>{exporting ? '⏳ Exporting…' : '↓ Export Certificate as PNG'}</span>
                  <span className="arr">→</span>
                </button>
              </div>
              <CopyableShare url={verifyUrl} />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
