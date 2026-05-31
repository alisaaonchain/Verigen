/**
 * Tatum Sui RPC client — uses raw JSON-RPC calls to Tatum's Sui gateway.
 * This avoids SDK version compatibility issues and works reliably on Vercel.
 */

// Tatum RPC for writes (with API key auth)
const TATUM_RPC = 'https://sui-mainnet.gateway.tatum.io';
const TATUM_TESTNET_RPC = 'https://sui-testnet.gateway.tatum.io';

// Public Sui fullnode for reads (no rate limits)
const SUI_FULLNODE = 'https://fullnode.mainnet.sui.io:443';
const SUI_TESTNET_FULLNODE = 'https://fullnode.testnet.sui.io:443';

function getTatumUrl(): string {
  return process.env.SUI_NETWORK === 'mainnet' ? TATUM_RPC : TATUM_TESTNET_RPC;
}

function getFullnodeUrl(): string {
  return process.env.SUI_NETWORK === 'mainnet' ? SUI_FULLNODE : SUI_TESTNET_FULLNODE;
}

/** RPC call to public Sui fullnode (reads — no rate limits) */
async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(getFullnodeUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Sui RPC HTTP error: ${res.status}`);
    }

    const json = await res.json();
    if (json.error) {
      throw new Error(`Sui RPC error: ${JSON.stringify(json.error)}`);
    }
    return json.result;
  } finally {
    clearTimeout(timeout);
  }
}

/** RPC call to Tatum gateway (writes — uses API key) */
async function tatumRpcCall(method: string, params: unknown[]): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(getTatumUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.TATUM_API_KEY || '',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Tatum RPC HTTP error: ${res.status}`);
    }

    const json = await res.json();
    if (json.error) {
      throw new Error(`Tatum RPC error: ${JSON.stringify(json.error)}`);
    }
    return json.result;
  } finally {
    clearTimeout(timeout);
  }
}

export interface RegistryEntry {
  blobId: string;
  imageHash: string;
  prompt: string;
  timestamp: number;
  creator: string;
  suiTx: string;
}

/**
 * Register a certificate on Sui.
 *
 * Uses @mysten/sui.js v1 SuiClient (public fullnode) to build the tx,
 * signs it with Ed25519, then submits via Tatum's RPC gateway.
 */
export async function registerCertificate(params: {
  blobId: string;
  imageHash: string;
  prompt: string;
  timestamp: number;
}): Promise<{ txDigest: string; blockHeight: number }> {
  // Use @mysten/sui.js (v1) which has a working SuiClient + TransactionBlock
  const { SuiClient } = await import('@mysten/sui.js/client');
  const { TransactionBlock } = await import('@mysten/sui.js/transactions');
  const { Ed25519Keypair } = await import('@mysten/sui.js/keypairs/ed25519');
  const { decodeSuiPrivateKey } = await import('@mysten/sui.js/cryptography');

  const privateKey = process.env.SUI_PRIVATE_KEY || '';
  const registryId = process.env.SUI_REGISTRY_OBJECT_ID || '';
  const packageId = process.env.SUI_PACKAGE_ID || '';

  if (!privateKey || !registryId || !packageId) {
    throw new Error('SUI_PRIVATE_KEY, SUI_REGISTRY_OBJECT_ID, and SUI_PACKAGE_ID are required');
  }

  // Support both bech32 (suiprivkey1...) and base64 private key formats
  let keypair: InstanceType<typeof Ed25519Keypair>;
  if (privateKey.startsWith('suiprivkey')) {
    const decoded = decodeSuiPrivateKey(privateKey);
    keypair = Ed25519Keypair.fromSecretKey(decoded.secretKey);
  } else {
    keypair = Ed25519Keypair.fromSecretKey(Buffer.from(privateKey, 'base64'));
  }
  const senderAddress = keypair.getPublicKey().toSuiAddress();

  console.log('[tatum] building tx for', senderAddress);

  // Use public Sui fullnode for building (no rate limits)
  const suiClient = new SuiClient({ url: getFullnodeUrl() });

  // Build the transaction using v1 TransactionBlock
  const txb = new TransactionBlock();
  txb.setSender(senderAddress);
  txb.setGasBudget(10000000);

  txb.moveCall({
    target: `${packageId}::registry::register`,
    arguments: [
      txb.object(registryId),
      txb.pure(params.blobId),
      txb.pure(params.imageHash),
      txb.pure(params.prompt),
      txb.pure(String(params.timestamp)),
    ],
  });

  // Build the transaction bytes (SuiClient handles all RPC calls)
  const txBytes = await txb.build({ client: suiClient });

  console.log('[tatum] tx built, signing...');

  // Sign the transaction
  const { signature } = await keypair.signTransactionBlock(txBytes);
  const txBase64 = Buffer.from(txBytes).toString('base64');

  console.log('[tatum] submitting to Tatum RPC...');

  // Execute via Tatum RPC (write operation — uses API key)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await tatumRpcCall('sui_executeTransactionBlock', [
    txBase64,
    [signature],
    { showEffects: true },
    'WaitForLocalExecution',
  ]) as any;

  console.log('[tatum] tx result:', result?.digest);

  return {
    txDigest: result?.digest || '',
    blockHeight: result?.checkpoint ? Number(result.checkpoint) : 0,
  };
}

/** Query the Sui registry for a blobId via Tatum RPC */
export async function getRegistryEntry(blobId: string): Promise<RegistryEntry | null> {
  const registryId = process.env.SUI_REGISTRY_OBJECT_ID;
  if (!registryId) return null;

  try {
    // Step 1: Fetch the Registry object to get the Table's object ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const registryObj = await rpcCall('sui_getObject', [
      registryId,
      { showContent: true },
    ]) as any;

    const entriesTableId = registryObj?.data?.content?.fields?.entries?.fields?.id?.id;
    if (!entriesTableId) {
      console.error('[tatum] Could not resolve entries Table ID from Registry object');
      return null;
    }

    // Step 2: Query the dynamic field on the Table object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await rpcCall('suix_getDynamicFieldObject', [
      entriesTableId,
      { type: '0x1::string::String', value: blobId },
    ]) as any;

    if (!result?.data?.content) return null;

    const entry = result.data.content?.fields?.value?.fields;
    if (!entry) return null;

    return {
      blobId: entry.blob_id,
      imageHash: entry.image_hash,
      prompt: entry.prompt,
      timestamp: Number(entry.timestamp),
      creator: entry.creator,
      suiTx: '',
    };
  } catch {
    return null;
  }
}
