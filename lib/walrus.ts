// Walrus testnet has free public publisher/aggregator endpoints.
// Mainnet requires running your own publisher or using an upload relay.
// We use testnet for blob storage (independent from Sui mainnet for the contract).
const PUBLISHER = process.env.WALRUS_PUBLISHER_URL
  || 'https://publisher.walrus-testnet.walrus.space';

const AGGREGATOR = process.env.WALRUS_AGGREGATOR_URL
  || 'https://aggregator.walrus-testnet.walrus.space';

export interface WalrusBlob {
  blobId: string;
  imageBase64: string;
  metadata: {
    prompt: string;
    model: string;
    timestamp: string;
    creator: string;
    imageHash: string;
  };
}

/** Store blob on Walrus. Returns blobId. */
export async function storeBlob(data: WalrusBlob): Promise<string> {
  const body = JSON.stringify(data);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const epochs = process.env.WALRUS_EPOCHS || '5';
    const res = await fetch(`${PUBLISHER}/v1/blobs?epochs=${epochs}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Walrus store failed: ${res.status} ${err}`);
    }

    const json = await res.json();
    // Walrus returns { newlyCreated: { blobObject: { blobId } } }
    // or { alreadyCertified: { blobId } }
    const blobId =
      json?.newlyCreated?.blobObject?.blobId ||
      json?.alreadyCertified?.blobId;

    if (!blobId) {
      throw new Error(`Walrus: no blobId in response: ${JSON.stringify(json)}`);
    }

    return blobId;
  } finally {
    clearTimeout(timeout);
  }
}

/** Fetch blob from Walrus by blobId. Returns parsed WalrusBlob. */
export async function fetchBlob(blobId: string): Promise<WalrusBlob> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${AGGREGATOR}/v1/blobs/${blobId}`, {
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Walrus fetch failed: ${res.status}`);
    }

    const json = await res.json();
    return json as WalrusBlob;
  } finally {
    clearTimeout(timeout);
  }
}
