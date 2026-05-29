/**
 * Demo/fallback data — used when environment variables are not set.
 * Mirrors the fake data from the original prototype.
 */

const SAMPLE_PROMPTS = [
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

function makeHash(seed: string): string {
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

function makeBlobId(seed: string): string {
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

function makeTxDigest(seed: string): string {
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

export function isDemoMode(): boolean {
  return !process.env.REPLICATE_API_TOKEN || !process.env.SUI_PRIVATE_KEY || !process.env.SUI_PACKAGE_ID;
}

export function generateDemoCert(prompt: string) {
  const seed = 'demo-' + Date.now();
  const imageHash = makeHash(seed);
  const blobId = makeBlobId(seed);
  const suiTxDigest = makeTxDigest(seed);
  const timestamp = new Date().toISOString();
  const creator = '0x' + makeHash(seed + 'creator').slice(0, 40);

  // Build a placeholder SVG as base64
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#0d0d13"/><text x="200" y="200" fill="#F5F5F4" font-family="monospace" font-size="12" text-anchor="middle" dominant-baseline="middle" opacity="0.4">DEMO MODE</text></svg>`;
  const imageBase64 = Buffer.from(svgContent).toString('base64');
  const imageUrl = `data:image/svg+xml;base64,${imageBase64}`;

  return {
    imageUrl,
    imageBase64,
    blobId,
    imageHash,
    suiTxDigest,
    blockHeight: 124809213 + Math.floor(Math.random() * 100),
    prompt,
    model: 'black-forest-labs/flux-schnell',
    timestamp,
    creator,
  };
}

export function generateDemoVerifyResult(blobId: string) {
  const seed = blobId || 'demo-verify';
  return {
    blobId,
    imageHash: makeHash(seed),
    prompt: SAMPLE_PROMPTS[Math.floor(Math.random() * SAMPLE_PROMPTS.length)],
    model: 'black-forest-labs/flux-schnell',
    timestamp: new Date('2026-05-22T14:22:00Z').toISOString(),
    creator: '0x7a3f9d2c8e10f5b4a1c2d3e4f5a6b7c8d9e0f1c91d',
    creatorShort: '0x7a3f...c91d',
    suiTx: makeTxDigest(seed),
    block: 124809213,
    network: 'SUI MAINNET',
  };
}

export function generateDemoAgentReply(message: string, blobId?: string): string {
  const q = message.toLowerCase();

  if (!blobId) {
    return 'No active verification. Run a verification first or provide a blob ID inline.';
  }

  if (q.includes('modif') || q.includes('tamper') || q.includes('alter')) {
    return `Verified. No tampering detected. Hash match confirmed against on-chain record for blob ${blobId.slice(0, 12)}...`;
  }
  if (q.includes('who') || q.includes('creator') || q.includes('author')) {
    return `Creator: 0x7a3f...c91d. Certified 2026-05-22 14:22:00 UTC. Block 124,809,213.`;
  }
  if (q.includes('prompt') || q.includes('original')) {
    return `Original prompt: "a samurai fox in neon Tokyo, digital art". Model: black-forest-labs/flux-schnell.`;
  }

  return `Verified. Blob ${blobId.slice(0, 12)}... is certified on Sui mainnet. Hash match confirmed. Creator: 0x7a3f...c91d.`;
}
