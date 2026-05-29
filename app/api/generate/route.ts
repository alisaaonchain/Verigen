import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/lib/replicate';
import { storeBlob } from '@/lib/walrus';
import { registerCertificate } from '@/lib/tatum';
import { sha256FromBuffer } from '@/lib/hash';
import { isDemoMode, generateDemoCert } from '@/lib/demo';

export async function POST(req: NextRequest) {
  try {
    const { prompt, creatorAddress } = await req.json();

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Demo mode fallback
    if (isDemoMode()) {
      console.log('[generate] demo mode — no credentials set');
      const demo = generateDemoCert(prompt.trim());
      const res = NextResponse.json(demo);
      res.headers.set('x-demo-mode', 'true');
      return res;
    }

    const creator = creatorAddress || 'anonymous';
    const timestamp = Date.now();

    // Step 1 — Generate image via Replicate
    console.log('[generate] step 1: generating image via Replicate');
    const imageBuffer = await generateImage(prompt.trim());
    const imageBase64 = imageBuffer.toString('base64');

    // Detect image format from magic bytes
    let mime = 'image/png';
    if (imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8) mime = 'image/jpeg';
    else if (imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49) mime = 'image/webp';
    const imageUrl = `data:${mime};base64,${imageBase64}`;

    // Step 2 — Hash the raw image bytes
    console.log('[generate] step 2: computing SHA-256');
    const imageHash = sha256FromBuffer(imageBuffer);

    // Step 3 — Store blob on Walrus (image + metadata)
    console.log('[generate] step 3: storing on Walrus');
    const blobId = await storeBlob({
      blobId: '',
      imageBase64,
      metadata: {
        prompt: prompt.trim(),
        model: 'black-forest-labs/flux-schnell',
        timestamp: new Date(timestamp).toISOString(),
        creator,
        imageHash,
      },
    });

    // Step 4 — Register on Sui via Tatum RPC
    console.log('[generate] step 4: registering on Sui via Tatum');
    const { txDigest, blockHeight } = await registerCertificate({
      blobId,
      imageHash,
      prompt: prompt.trim(),
      timestamp,
    });

    console.log('[generate] complete:', { blobId, txDigest });

    return NextResponse.json({
      imageUrl,
      blobId,
      imageHash,
      suiTxDigest: txDigest,
      blockHeight,
      prompt: prompt.trim(),
      model: 'black-forest-labs/flux-schnell',
      timestamp: new Date(timestamp).toISOString(),
      creator,
    });
  } catch (err: unknown) {
    console.error('[generate] error:', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
