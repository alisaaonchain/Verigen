import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function generateImage(prompt: string): Promise<Buffer> {
  console.log('[replicate] starting image generation with flux-schnell');

  let output;
  try {
    output = await replicate.run('black-forest-labs/flux-schnell', {
      input: {
        prompt,
        num_outputs: 1,
        aspect_ratio: '1:1',
        output_format: 'png',
        output_quality: 90,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[replicate] API error:', msg);
    throw new Error(`Replicate API failed: ${msg}`);
  }

  console.log('[replicate] output type:', typeof output, Array.isArray(output) ? `array[${output.length}]` : '');

  // output is an array of URLs or ReadableStream
  const imageUrl = Array.isArray(output) ? output[0] : output;
  if (!imageUrl) throw new Error('Replicate returned no image');

  // If it's a ReadableStream, read it directly
  if (imageUrl instanceof ReadableStream) {
    console.log('[replicate] reading stream output');
    const reader = imageUrl.getReader();
    const chunks: Uint8Array[] = [];
    let done = false;
    while (!done) {
      const result = await reader.read();
      done = result.done;
      if (result.value) chunks.push(result.value);
    }
    return Buffer.concat(chunks);
  }

  // If it's a FileOutput or URL string, fetch the image
  const url = typeof imageUrl === 'string' ? imageUrl : String(imageUrl);
  console.log('[replicate] fetching image from URL:', url.slice(0, 80) + '...');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Failed to fetch generated image: ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    console.log('[replicate] image fetched, size:', arrayBuffer.byteLength);
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeout);
  }
}
