import 'dotenv/config';
import Replicate from 'replicate';
import * as fs from 'fs';
import * as path from 'path';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

async function generatePortrait() {
  console.log('Generating Aria portrait via Replicate Flux...');

  const output = await replicate.run('black-forest-labs/flux-1.1-pro', {
    input: {
      prompt: 'Close-up portrait of a beautiful stylish young woman in her early 20s, confident charismatic expression with a slight knowing smirk, dark wavy hair with subtle neon purple and electric blue highlights, wearing a sleek black high-tech outfit with subtle glowing LED seams, cyberpunk aesthetic, dramatic moody lighting with neon purple and blue rim light, dark shadowy background with faint holographic screen reflections, ultra sharp focus, high detail skin texture, cinematic color grading, digital art portrait, artstation trending, 8k resolution',
      aspect_ratio: '1:1',
      output_format: 'png',
      output_quality: 95,
      safety_tolerance: 2,
    },
  });

  // Handle Replicate FileOutput - it's an object with a url() method
  let imageUrl: string;

  if (typeof output === 'string') {
    imageUrl = output;
  } else if (output && typeof output === 'object') {
    // FileOutput: try reading body stream, or use href/toString
    const fileOutput = output as Record<string, unknown>;

    if (typeof fileOutput.url === 'function') {
      // FileOutput has url() method that returns a URL object
      const urlObj = (fileOutput.url as () => URL)();
      imageUrl = urlObj.href || urlObj.toString();
    } else if (typeof fileOutput.url === 'string') {
      imageUrl = fileOutput.url;
    } else if (typeof fileOutput.href === 'string') {
      imageUrl = fileOutput.href;
    } else if (Array.isArray(output) && output.length > 0) {
      const first = output[0];
      if (typeof first === 'string') {
        imageUrl = first;
      } else if (first && typeof first === 'object') {
        const fo = first as Record<string, unknown>;
        if (typeof fo.url === 'function') {
          const urlObj = (fo.url as () => URL)();
          imageUrl = urlObj.href || urlObj.toString();
        } else {
          imageUrl = String(fo.url || fo.href || first);
        }
      } else {
        imageUrl = String(first);
      }
    } else {
      // Last resort: try to iterate JSON keys
      console.log('Output type:', typeof output, 'Keys:', Object.keys(fileOutput));
      console.log('Output value:', JSON.stringify(output, null, 2).substring(0, 500));
      throw new Error('Cannot extract URL from Replicate output');
    }
  } else {
    throw new Error(`Unexpected output type: ${typeof output}`);
  }

  console.log('Image URL:', imageUrl);

  // Download the image
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Failed to download image: ${response.status}`);

  const buffer = Buffer.from(await response.arrayBuffer());

  const outputDir = path.join(process.cwd(), 'public', 'images', 'aria');
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, 'portrait.png');
  fs.writeFileSync(outputPath, buffer);

  console.log(`Portrait saved to ${outputPath} (${(buffer.length / 1024).toFixed(1)}KB)`);
  console.log('Use /images/aria/portrait.png as the thumbnailUrl');
}

generatePortrait().catch(console.error);
