/**
 * Tatum Sui RPC client — uses raw JSON-RPC calls to Tatum's Sui gateway.
 * This avoids SDK version compatibility issues and works reliably on Vercel.
 */

const TATUM_RPC = 'https://sui-mainnet.gateway.tatum.io';
const TATUM_TESTNET_RPC = 'https://sui-testnet.gateway.tatum.io';

function getRpcUrl(): string {
  return process.env.SUI_NETWORK === 'mainnet' ? TATUM_RPC : TATUM_TESTNET_RPC;
}

async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(getRpcUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.TATUM_API_KEY || '',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
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
 * Register a certificate on Sui via Tatum RPC.
 *
 * Builds the transaction locally using @mysten/sui Transaction SDK,
 * signs it with Ed25519, then submits via Tatum's sui_executeTransactionBlock.
 */
export async function registerCertificate(params: {
  blobId: string;
  imageHash: string;
  prompt: string;
  timestamp: number;
}): Promise<{ txDigest: string; blockHeight: number }> {
  const { Ed25519Keypair } = await import('@mysten/sui/keypairs/ed25519');
  const { Transaction } = await import('@mysten/sui/transactions');

  const privateKey = process.env.SUI_PRIVATE_KEY || '';
  const registryId = process.env.SUI_REGISTRY_OBJECT_ID || '';
  const packageId = process.env.SUI_PACKAGE_ID || '';

  if (!privateKey || !registryId || !packageId) {
    throw new Error('SUI_PRIVATE_KEY, SUI_REGISTRY_OBJECT_ID, and SUI_PACKAGE_ID are required');
  }

  // Support both bech32 (suiprivkey1...) and base64 private key formats
  let keypair: InstanceType<typeof Ed25519Keypair>;
  if (privateKey.startsWith('suiprivkey')) {
    const { decodeSuiPrivateKey } = await import('@mysten/sui/cryptography');
    const decoded = decodeSuiPrivateKey(privateKey);
    keypair = Ed25519Keypair.fromSecretKey(decoded.secretKey);
  } else {
    keypair = Ed25519Keypair.fromSecretKey(Buffer.from(privateKey, 'base64'));
  }
  const senderAddress = keypair.getPublicKey().toSuiAddress();

  console.log('[tatum] building tx for', senderAddress);

  // Step 1: Build the transaction locally using the Sui Transaction SDK
  const tx = new Transaction();
  tx.setSender(senderAddress);
  tx.setGasBudget(10000000);

  tx.moveCall({
    target: `${packageId}::registry::register`,
    arguments: [
      tx.object(registryId),
      tx.pure.string(params.blobId),
      tx.pure.string(params.imageHash),
      tx.pure.string(params.prompt),
      tx.pure.string(String(params.timestamp)),
    ],
  });

  // Step 2: Build the transaction bytes (needs reference gas price + coins from RPC)
  // Fetch sender's gas coins and reference gas price
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [gasPrice, coins] = await Promise.all([
    rpcCall('suix_getReferenceGasPrice', []) as Promise<string>,
    rpcCall('suix_getCoins', [senderAddress, '0x2::sui::SUI', null, 1]) as Promise<any>,
  ]);

  tx.setGasPrice(Number(gasPrice));

  const coinId = coins?.data?.[0]?.coinObjectId;
  if (!coinId) {
    throw new Error('No SUI coins found for gas payment');
  }

  // Fetch the gas coin object for setting gas payment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const coinObj = await rpcCall('sui_getObject', [
    coinId,
    { showContent: true, showOwner: true },
  ]) as any;

  tx.setGasPayment([{
    objectId: coinObj.data.objectId,
    version: coinObj.data.version,
    digest: coinObj.data.digest,
  }]);

  // Fetch the registry object for the transaction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const regObj = await rpcCall('sui_getObject', [
    registryId,
    { showContent: true },
  ]) as any;

  // Build transaction bytes (pure offline, no RPC needed for this step)
  const txBytes = await tx.build({
    client: {
      getReferenceGasPrice: async () => BigInt(gasPrice),
      getCoins: async () => coins,
      getObject: async ({ id }: { id: string }) => {
        if (id === registryId) return regObj;
        if (id === coinId) return coinObj;
        // Fetch any other object needed
        return await rpcCall('sui_getObject', [id, { showContent: true, showOwner: true }]);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  });

  console.log('[tatum] tx built, signing...');

  // Step 3: Sign the transaction
  const { signature } = await keypair.signTransaction(txBytes);
  const txBase64 = Buffer.from(txBytes).toString('base64');

  console.log('[tatum] submitting to Tatum RPC...');

  // Step 4: Execute via Tatum RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await rpcCall('sui_executeTransactionBlock', [
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
