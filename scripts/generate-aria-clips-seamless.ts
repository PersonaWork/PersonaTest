/**
 * Generate seamless-loop Aria animation clips using Kling 2.1 via fal.ai.
 *
 * CRITICAL: Every clip starts and ends in the EXACT same neutral pose
 * (matching the portrait). This enables instant hard-cuts between clips
 * with zero visible transition.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/generate-aria-clips-seamless.ts
 *
 * Cost: Kling 2.1 Standard = $0.056/sec × 10s = $0.56/clip
 *       18 clips = ~$10.08
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fal } from '@fal-ai/client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CHARACTER_ID = 'cmmnr4dyb000013j8ptbvbk36'; // Aria

/* ─── Configure fal.ai ─── */
fal.config({ credentials: process.env.FAL_KEY! });

/* ─── Portrait description for consistent prompts ─── */
// Physical appearance must match portrait.png exactly
const ARIA_LOOK =
  'a young woman with dark wavy hair with purple and neon highlights, green eyes, wearing a black turtleneck with neon trim, dark moody cyberpunk lighting, close-up portrait framing, facing directly at camera';

// Neutral pose that every clip must START and END with
const NEUTRAL_POSE =
  'looking directly at the camera with a relaxed neutral expression, shoulders still, composed';

interface ClipDef {
  type: string;
  prompt: string;
}

const CLIPS: ClipDef[] = [
  // ── Idle (6 clips) — subtle movements, always return to neutral ──
  {
    type: 'idle-neutral-1',
    prompt: `${ARIA_LOOK}, ${NEUTRAL_POSE}, very subtle gentle breathing, minimal chest rise and fall, nearly still, calm ambient mood`,
  },
  {
    type: 'idle-neutral-2',
    prompt: `${ARIA_LOOK}, ${NEUTRAL_POSE}, very slight natural head micro-movement, gentle breathing, barely perceptible motion, serene`,
  },
  {
    type: 'idle-blink-1',
    prompt: `${ARIA_LOOK}, ${NEUTRAL_POSE}, she blinks naturally a few times with subtle eye movement, then returns to ${NEUTRAL_POSE}`,
  },
  {
    type: 'idle-look-1',
    prompt: `${ARIA_LOOK}, ${NEUTRAL_POSE}, her eyes glance very slightly to the left then smoothly return to looking directly at camera, subtle and natural`,
  },
  {
    type: 'idle-look-2',
    prompt: `${ARIA_LOOK}, ${NEUTRAL_POSE}, her eyes glance very slightly to the right then smoothly return to looking directly at camera, subtle and natural`,
  },
  {
    type: 'idle-smile-1',
    prompt: `${ARIA_LOOK}, ${NEUTRAL_POSE}, a gentle smile slowly forms on her face then gradually relaxes back to the same neutral expression, warm and natural`,
  },

  // ── Talk (4 clips) — mouth moves as if speaking, returns to neutral ──
  {
    type: 'talk-excited-1',
    prompt: `${ARIA_LOOK}, ${NEUTRAL_POSE}, she begins talking excitedly with animated facial expressions, eyes bright, slight head movement while speaking, then gradually stops talking and returns to ${NEUTRAL_POSE}`,
  },
  {
    type: 'talk-chill-1',
    prompt: `${ARIA_LOOK}, ${NEUTRAL_POSE}, she speaks in a relaxed casual way, slight head nods while talking, calm expression, then stops speaking and returns to ${NEUTRAL_POSE}`,
  },
  {
    type: 'talk-explain-1',
    prompt: `${ARIA_LOOK}, ${NEUTRAL_POSE}, she speaks thoughtfully as if explaining something interesting, slight eyebrow raises, engaged expression, then finishes and returns to ${NEUTRAL_POSE}`,
  },
  {
    type: 'talk-gossip-1',
    prompt: `${ARIA_LOOK}, ${NEUTRAL_POSE}, she leans very slightly forward as if sharing a secret, speaking conspiratorially with a sly smile, then leans back and returns to ${NEUTRAL_POSE}`,
  },

  // ── React (4 clips) — facial reactions, returns to neutral ──
  {
    type: 'react-surprise-1',
    prompt: `${ARIA_LOOK}, ${NEUTRAL_POSE}, her eyes widen with surprise and her eyebrows raise, mouth opens slightly in a shocked expression, then the surprise fades and she returns to ${NEUTRAL_POSE}`,
  },
  {
    type: 'react-laugh-1',
    prompt: `${ARIA_LOOK}, ${NEUTRAL_POSE}, she breaks into genuine laughter, eyes crinkling, mouth wide with joy, then the laughter subsides and she returns to ${NEUTRAL_POSE}`,
  },
  {
    type: 'react-think-1',
    prompt: `${ARIA_LOOK}, ${NEUTRAL_POSE}, she tilts her head very slightly and looks upward briefly as if thinking about something, then looks back at camera and returns to ${NEUTRAL_POSE}`,
  },
  {
    type: 'react-shook-1',
    prompt: `${ARIA_LOOK}, ${NEUTRAL_POSE}, her jaw drops slightly and eyes go wide in dramatic disbelief, an exaggerated shocked reaction, then she composes herself and returns to ${NEUTRAL_POSE}`,
  },

  // ── Action (4 clips) — bigger expressions, returns to neutral ──
  {
    type: 'celebrate-1',
    prompt: `${ARIA_LOOK}, ${NEUTRAL_POSE}, her face lights up with excitement and she does a small celebratory nod with a big grin, pure joy, then settles down and returns to ${NEUTRAL_POSE}`,
  },
  {
    type: 'wave-1',
    prompt: `${ARIA_LOOK}, ${NEUTRAL_POSE}, she gives a quick friendly wave at the camera with a warm smile, then lowers her hand and returns to ${NEUTRAL_POSE}`,
  },
  {
    type: 'vibe-1',
    prompt: `${ARIA_LOOK}, ${NEUTRAL_POSE}, she begins gently bobbing her head as if vibing to music, relaxed and enjoying herself, then gradually stops and returns to ${NEUTRAL_POSE}`,
  },
  {
    type: 'nod-1',
    prompt: `${ARIA_LOOK}, ${NEUTRAL_POSE}, she nods enthusiastically a few times as if agreeing with something, then stops nodding and returns to ${NEUTRAL_POSE}`,
  },
];

/* ─── Upload portrait to fal.ai storage ─── */
async function uploadPortrait(): Promise<string> {
  const portraitPath = path.join(process.cwd(), 'public', 'images', 'aria', 'portrait.png');
  const buffer = fs.readFileSync(portraitPath);
  const file = new File([buffer], 'portrait.png', { type: 'image/png' });
  const url = await fal.storage.upload(file);
  console.log(`Portrait uploaded: ${url}`);
  return url;
}

/* ─── Generate a single clip ─── */
async function generateClip(
  portraitUrl: string,
  clip: ClipDef
): Promise<{ videoUrl: string; duration: number } | null> {
  console.log(`\n[${clip.type}] Generating...`);
  console.log(`  Prompt: ${clip.prompt.substring(0, 100)}...`);

  try {
    const result = await (fal as any).subscribe(
      'fal-ai/kling-video/v2.1/standard/image-to-video',
      {
        input: {
          prompt: clip.prompt,
          image_url: portraitUrl,
          duration: '10',
          aspect_ratio: '1:1',
          cfg_scale: 0.5,
        },
        logs: true,
        onQueueUpdate(update: any) {
          if (update.status === 'IN_QUEUE') {
            console.log(`  [${clip.type}] In queue...`);
          } else if (update.status === 'IN_PROGRESS') {
            console.log(`  [${clip.type}] Processing...`);
          }
        },
      }
    );

    const videoUrl = result?.data?.video?.url;
    if (!videoUrl) {
      console.error(`  [${clip.type}] No video URL in response`);
      return null;
    }

    console.log(`  ✓ [${clip.type}] Done: ${videoUrl}`);
    return { videoUrl, duration: 10 };
  } catch (error: any) {
    console.error(`  ✗ [${clip.type}] Failed:`, error?.message || error);
    return null;
  }
}

/* ─── Main ─── */
async function main() {
  console.log('=== Aria Seamless Clip Generator (Kling 2.1) ===');
  console.log(`Clips to generate: ${CLIPS.length}`);
  console.log(`Estimated cost: $${(CLIPS.length * 0.56).toFixed(2)}`);
  console.log('');

  // Check for existing clips
  const existing = await prisma.animationClip.findMany({
    where: { characterId: CHARACTER_ID },
    select: { type: true },
  });
  const existingTypes = new Set(existing.map((c) => c.type));
  console.log(`Existing clips in DB: ${existingTypes.size}`);

  // Upload portrait
  const portraitUrl = await uploadPortrait();

  let generated = 0;
  let failed = 0;
  let skipped = 0;

  for (const clip of CLIPS) {
    if (existingTypes.has(clip.type)) {
      console.log(`\n[${clip.type}] Already exists, skipping`);
      skipped++;
      continue;
    }

    const result = await generateClip(portraitUrl, clip);

    if (result) {
      // Save to database
      await prisma.animationClip.create({
        data: {
          characterId: CHARACTER_ID,
          type: clip.type,
          videoUrl: result.videoUrl,
          duration: result.duration,
        },
      });
      generated++;
      console.log(`  Saved to DB (${generated} generated, ${failed} failed, ${skipped} skipped)`);
    } else {
      failed++;
    }

    // Small delay between requests
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log('\n=== Summary ===');
  console.log(`Generated: ${generated}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Total in DB: ${generated + skipped}`);
  console.log(`Estimated cost: $${(generated * 0.56).toFixed(2)}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  prisma.$disconnect();
  process.exit(1);
});
