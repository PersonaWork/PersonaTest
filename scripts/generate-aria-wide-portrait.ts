/**
 * Generate a wider reference image for Aria using FLUX on fal.ai.
 * Shows her at a streaming desk from waist up with background details.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/generate-aria-wide-portrait.ts
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fal } from '@fal-ai/client';

fal.config({ credentials: process.env.FAL_KEY! });

const PROMPT = `Medium shot photograph from waist up of a young woman sitting at a streaming desk, she has dark wavy hair with purple and neon highlights, green eyes, wearing a black turtleneck with neon trim on it. She is looking directly at the camera with a relaxed neutral expression. On the desk in front of her is a gaming keyboard with RGB lighting, and a silver microphone on a boom arm to her right side. Behind her are two widescreen monitors showing colorful content, and LED strip lights on the walls casting purple and cyan ambient glow. Dark moody cyberpunk room aesthetic, professional streamer setup, photorealistic, high quality photography, square 1:1 composition, upper body visible with desk and setup clearly shown`;

async function main() {
  console.log('Generating wider Aria portrait via FLUX text-to-image...');

  const result = await (fal as any).subscribe('fal-ai/flux-pro/v1.1', {
    input: {
      prompt: PROMPT,
      num_images: 1,
      image_size: 'square_hd',
      num_inference_steps: 28,
      guidance_scale: 3.5,
      safety_tolerance: '5',
    },
    logs: true,
    onQueueUpdate(update: any) {
      if (update.status === 'IN_QUEUE') console.log('In queue...');
      else if (update.status === 'IN_PROGRESS') console.log('Processing...');
    },
  });

  const imageUrl = result?.data?.images?.[0]?.url;
  if (!imageUrl) {
    console.error('No image URL in response:', JSON.stringify(result?.data, null, 2));
    return;
  }

  console.log(`Image URL: ${imageUrl}`);

  // Download and save
  const response = await fetch(imageUrl);
  const buffer = Buffer.from(await response.arrayBuffer());
  const outputPath = path.join(process.cwd(), 'public', 'images', 'aria', 'portrait-wide.png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Saved to ${outputPath} (${(buffer.length / 1024).toFixed(1)}KB)`);
}

async function uploadCurrentPortrait(): Promise<string> {
  const portraitPath = path.join(process.cwd(), 'public', 'images', 'aria', 'portrait.png');
  const buffer = fs.readFileSync(portraitPath);
  const file = new File([buffer], 'portrait.png', { type: 'image/png' });
  const url = await fal.storage.upload(file);
  console.log(`Current portrait uploaded: ${url}`);
  return url;
}

main().catch(console.error);
