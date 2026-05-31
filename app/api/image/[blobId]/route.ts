import { NextRequest, NextResponse } from 'next/server';

const WALRUS_AGGREGATOR = process.env.WALRUS_AGGREGATOR_URL
  || 'https://aggregator.walrus-testnet.walrus.space';

/**
 * GET /api/image/[blobId] — proxy image from Walrus blob storage.
 * Returns the actual image binary (PNG/JPEG) with proper content-type.
 * Caches for 1 hour to avoid repeated Walrus fetches.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ blobId: string }> }
) {
  const { blobId } = await params;

  if (!blobId?.trim()) {
    return NextResponse.json({ error: 'blobId is required' }, { status: 400 });
  }

  try {
    const res = await fetch(`${WALRUS_AGGREGATOR}/v1/blobs/${blobId}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Walrus fetch failed: ${res.status}` },
        { status: 502 }
      );
    }

    const blob = await res.json();

    if (!blob?.imageBase64) {
      return NextResponse.json({ error: 'No image in blob' }, { status: 404 });
    }

    // Decode base64 to binary
    const imageBuffer = Buffer.from(blob.imageBase64, 'base64');

    // Detect format from magic bytes
    let contentType = 'image/png';
    if (imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8) contentType = 'image/jpeg';
    else if (imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49) contentType = 'image/webp';

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (err: unknown) {
    console.error('[image proxy] error:', err);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 });
  }
}
