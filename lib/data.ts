/** Client-side data helpers — ported from data.jsx */

export const SAMPLE_PROMPTS = [
  'a samurai fox in neon Tokyo, digital art',
  'abandoned lighthouse at dawn, oil painting',
  'macro photograph of a beetle on volcanic rock',
  'isometric desert observatory, blueprint style',
  'monastery library carved into a glacier',
  'cyberpunk noodle bar, anamorphic film still',
  'iceberg cathedral, long exposure',
  'porcelain robot tending bonsai, studio light',
  'vintage spacesuit on a Martian dune',
  'underwater forest of bioluminescent kelp',
  'an octopus playing a vintage Roland synth',
  'Brutalist library in a redwood forest',
];

const SAMPLE_CREATORS = [
  '0x7a3f...c91d',
  '0x2bd1...4e02',
  '0x9c4a...01f7',
  '0xa10e...88b3',
  '0x6f2c...3dd9',
  '0x4e87...7a52',
  'anonymous',
  '0xb35d...e94c',
];

export function makeHash(seed: string): string {
  const chars = '0123456789abcdef';
  let x = 0;
  for (let i = 0; i < seed.length; i++) x = (x * 31 + seed.charCodeAt(i)) >>> 0;
  let out = '';
  for (let i = 0; i < 64; i++) {
    x = (x * 1103515245 + 12345 + i * 7) >>> 0;
    out += chars[x % 16];
  }
  return out;
}

export function makeBlobId(seed: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789_-';
  const s = seed + 'blob';
  let x = 0;
  for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0;
  let out = '';
  for (let i = 0; i < 43; i++) {
    x = (x * 1103515245 + 12345 + i * 13) >>> 0;
    out += chars[x % chars.length];
  }
  return out;
}

export function makeTxDigest(seed: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789';
  const s = seed + 'tx';
  let x = 0;
  for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0;
  let out = '';
  for (let i = 0; i < 44; i++) {
    x = (x * 1103515245 + 12345 + i * 11) >>> 0;
    out += chars[x % chars.length];
  }
  return out;
}

export function fmtRelTime(d: Date): string {
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return Math.floor(diff) + 's ago';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

export function fmtUTC(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
}

export function shortHash(h: string, head = 8, tail = 8): string {
  if (!h) return '';
  if (h.length <= head + tail + 1) return h;
  return h.slice(0, head) + '…' + h.slice(-tail);
}

export interface FeedItem {
  id: string;
  prompt: string;
  creator: string;
  creatorShort?: string;
  timestamp: Date;
  model: string;
  imageHash: string;
  blobId: string;
  suiTx: string;
  block: number;
  verified: boolean;
  seed: string | number;
  regNum?: string;
  imageUrl?: string;
  onChain?: boolean;
}

export function buildSeedFeed(): FeedItem[] {
  const now = Date.now();
  return SAMPLE_PROMPTS.map((p, i) => {
    const t = new Date(now - i * 1000 * 60 * (3 + ((i * 7) % 11)) - 1000 * 30);
    return {
      id: `seed-${i}`,
      prompt: p,
      creator: SAMPLE_CREATORS[i % SAMPLE_CREATORS.length],
      timestamp: t,
      model: 'black-forest-labs/flux-schnell',
      imageHash: makeHash('img' + i),
      blobId: makeBlobId(String(i)),
      suiTx: makeTxDigest(String(i)),
      block: 124809213 - i * 17,
      verified: true,
      seed: i,
    };
  });
}

export function placeholderSvg(seed: string | number): string {
  let x = 0;
  const s = seed.toString();
  for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0;
  const r = () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return (x % 1000) / 1000;
  };
  const hue1 = Math.floor(r() * 360);
  const hue2 = (hue1 + 30 + Math.floor(r() * 90)) % 360;
  const lum = 30 + Math.floor(r() * 25);
  const c1 = `oklch(${lum}% 0.12 ${hue1})`;
  const c2 = `oklch(${lum - 10}% 0.10 ${hue2})`;
  const c3 = `oklch(${lum + 8}% 0.14 ${(hue1 + 180) % 360})`;
  const shapes: string[] = [];
  for (let i = 0; i < 6; i++) {
    const cx = Math.floor(r() * 400);
    const cy = Math.floor(r() * 400);
    const rx = 80 + Math.floor(r() * 160);
    const ry = 80 + Math.floor(r() * 160);
    const op = 0.5 + r() * 0.4;
    const col = i % 2 === 0 ? c2 : c3;
    shapes.push(
      `<ellipse cx='${cx}' cy='${cy}' rx='${rx}' ry='${ry}' fill='${col}' opacity='${op.toFixed(2)}' />`
    );
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'>
    <defs>
      <filter id='b'><feGaussianBlur stdDeviation='40'/></filter>
      <filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.12 0'/></filter>
    </defs>
    <rect width='400' height='400' fill='${c1}'/>
    <g filter='url(#b)'>${shapes.join('')}</g>
    <rect width='400' height='400' filter='url(#n)' opacity='0.6'/>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

export function makeVerifyFixture() {
  const t = new Date('2026-05-22T14:22:00Z');
  return {
    prompt: 'a samurai fox in neon Tokyo, digital art',
    model: 'black-forest-labs/flux-schnell',
    timestamp: t,
    creator: '0x7a3f9d2c8e10f5b4a1c2d3e4f5a6b7c8d9e0f1c91d',
    creatorShort: '0x7a3f…c91d',
    imageHash: 'a3f9d2c8e10f5b4a1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b',
    blobId: '0xA9bFEzKpL3mN7QrT2WyXc4DfV8H6jKpQsRtUvWxYzA',
    suiTx: '8h2J1KpLmN4qRsT5vWxYzA9bCdEfGhJkMnPqRsTuVwXyZ',
    block: 124809213,
    network: 'SUI MAINNET',
    seed: 'fixture-1',
  };
}

export function hashFingerprint(hash: string, size = 8) {
  const cells: { x: number; y: number; color: string }[] = [];
  const half = Math.ceil(size / 2);
  const sample = (i: number) =>
    parseInt(hash.slice((i * 2) % hash.length, ((i * 2) % hash.length) + 2) || '00', 16);
  const h1 = (sample(0) * 360) / 255;
  const h2 = (h1 + 30 + (sample(1) % 90)) % 360;
  const lum = 38 + (sample(2) % 18);
  const cFg = `oklch(${lum + 18}% 0.18 ${h1})`;
  const cMid = `oklch(${lum + 8}% 0.14 ${h2})`;
  const cBg = `oklch(${Math.max(12, lum - 22)}% 0.04 ${h1})`;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < half; x++) {
      const idx = y * half + x;
      const v = sample(idx + 3);
      let color = cBg;
      if (v > 200) color = cFg;
      else if (v > 130) color = cMid;
      else if (v > 80) color = cBg;
      else color = 'transparent';
      cells.push({ x, y, color });
      if (x !== size - 1 - x) {
        cells.push({ x: size - 1 - x, y, color });
      }
    }
  }
  return cells;
}

export function hashQR(hash: string): boolean[] {
  const grid: boolean[] = [];
  const sample = (i: number) =>
    parseInt(hash.slice((i * 2) % hash.length, ((i * 2) % hash.length) + 2) || '00', 16);
  for (let y = 0; y < 11; y++) {
    for (let x = 0; x < 11; x++) {
      const inFinder = (cx: number, cy: number): boolean | null => {
        const dx = Math.abs(x - cx);
        const dy = Math.abs(y - cy);
        if (dx <= 1 && dy <= 1) return true;
        if ((dx === 2 && dy <= 2) || (dy === 2 && dx <= 2)) return false;
        if (dx <= 3 && dy <= 3) return true;
        return null;
      };
      let v: boolean | null = null;
      const fa = inFinder(1, 1);
      if (fa !== null) v = fa;
      const fb = inFinder(9, 1);
      if (fb !== null && v === null) v = fb;
      const fc = inFinder(1, 9);
      if (fc !== null && v === null) v = fc;
      if (v === null) {
        const sv = sample(y * 11 + x);
        v = sv > 128;
      }
      grid.push(v);
    }
  }
  return grid;
}

export interface AuditLogEntry {
  id: string;
  time: Date;
  op: string;
  blobId: string;
  prompt: string;
  gas: string;
  block: number;
}

export function buildAuditLog(feed: FeedItem[]): AuditLogEntry[] {
  const ops = [
    'CERTIFY', 'VERIFY', 'VERIFY', 'CERTIFY', 'VERIFY', 'RESOLVE',
    'CERTIFY', 'VERIFY', 'CERTIFY', 'VERIFY', 'RESOLVE', 'CERTIFY',
  ];
  const tamperIdx = new Set([3, 9]);
  return feed.slice(0, 12).map((it, i) => {
    const op = tamperIdx.has(i) ? 'TAMPER' : ops[i % ops.length];
    return {
      id: it.id + '-log-' + i,
      time: it.timestamp,
      op,
      blobId: it.blobId,
      prompt: it.prompt,
      gas: (0.001 + (i % 7) * 0.0003).toFixed(4) + ' SUI',
      block: 124809213 - i * 7,
    };
  });
}
