import { NextResponse } from 'next/server';

const SUI_FULLNODE = 'https://fullnode.mainnet.sui.io:443';

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
  const registryId = process.env.SUI_REGISTRY_OBJECT_ID;
  if (!registryId) {
    return NextResponse.json({ certs: [] });
  }

  try {
    // Query recent transactions that used the registry object as input
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txResult = await rpc('suix_queryTransactionBlocks', [
      {
        filter: { InputObject: registryId },
        options: { showInput: true, showEffects: true },
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

        // Extract move call arguments from the transaction
        const txKind = tx.transaction?.data?.transaction;
        if (!txKind) continue;

        // Handle both single and programmable transactions
        const calls = txKind.kind === 'ProgrammableTransaction'
          ? txKind.transactions || []
          : [];

        for (const call of calls) {
          if (call.MoveCall) {
            const mc = call.MoveCall;
            if (mc.function === 'register' && mc.module === 'registry') {
              // Extract pure arguments (blobId, imageHash, prompt, timestamp)
              const inputs = txKind.inputs || [];
              const pureInputs = inputs
                .filter((inp: { type: string }) => inp.type === 'pure')
                .map((inp: { value: unknown }) => inp.value);

              if (pureInputs.length >= 4) {
                certs.push({
                  blobId: pureInputs[0],
                  imageHash: pureInputs[1],
                  prompt: pureInputs[2],
                  timestamp: timestamp || new Date(Number(pureInputs[3])).toISOString(),
                  suiTx: digest,
                  model: 'black-forest-labs/flux-schnell',
                });
              }
            }
          }
        }
      } catch {
        // Skip malformed transactions
        continue;
      }
    }

    return NextResponse.json({ certs });
  } catch (err: unknown) {
    console.error('[recent] error:', err);
    return NextResponse.json({ certs: [] });
  }
}
