import { NextResponse } from 'next/server';

const SUI_FULLNODE = 'https://fullnode.mainnet.sui.io:443';
const WALRUS_AGGREGATOR = process.env.WALRUS_AGGREGATOR_URL
  || 'https://aggregator.walrus-testnet.walrus.space';

async function rpc(method: string, params: unknown[]) {
  const res = await fetch(SUI_FULLNODE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.result;
}

/**
 * GET /api/recent — fetch recent certifications from the on-chain registry.
 *
 * Queries recent transactions that touched the registry object,
 * then extracts blob metadata from each transaction's events/inputs.
 */
export async function GET() {
  const packageId = process.env.SUI_PACKAGE_ID;
  if (!packageId) {
    return NextResponse.json({ certs: [] });
  }

  try {
    // Query recent register() calls on the VeriGen registry contract
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txResult = await rpc('suix_queryTransactionBlocks', [
      {
        filter: {
          MoveFunction: {
            package: packageId,
            module: 'registry',
            function: 'register',
          },
        },
        options: { showInput: true },
      },
      null, // cursor
      10,   // limit
      true,  // descending (newest first)
    ]) as any;

    const txs = txResult?.data || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const certs: any[] = [];

    for (const tx of txs) {
      try {
        const digest = tx.digest;
        const timestamp = tx.timestampMs
          ? new Date(Number(tx.timestampMs)).toISOString()
          : null;

        // Extract pure inputs (blobId, imageHash, prompt, timestamp)
        const txKind = tx.transaction?.data?.transaction;
        if (!txKind) continue;

        const inputs = txKind.inputs || [];
        const pureInputs = inputs
          .filter((inp: { type: string }) => inp.type === 'pure')
          .map((inp: { value: unknown }) => inp.value);

        if (pureInputs.length >= 3) {
          certs.push({
            blobId: pureInputs[0],
            imageHash: pureInputs[1],
            prompt: pureInputs[2],
            timestamp: timestamp || new Date().toISOString(),
            suiTx: digest,
            model: 'black-forest-labs/flux-schnell',
          });
        }
      } catch {
        continue;
      }
    }

    // Set imageUrl to proxy endpoint — images load lazily per-card
    const withImages = certs.map((cert) => ({
      ...cert,
      imageUrl: `/api/image/${encodeURIComponent(cert.blobId)}`,
    }));

    return NextResponse.json({ certs: withImages });
  } catch (err: unknown) {
    console.error('[recent] error:', err);
    return NextResponse.json({ certs: [] });
  }
}
