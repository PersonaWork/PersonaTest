/**
 * Generate Aria clips v4: PERFECT seamless loop system.
 *
 * Architecture:
 *   - 3 idle clips play in FIXED order: A → B → C → A → B → C ...
 *   - ALL clips start & end at the EXACT same neutral pose (facing camera, hands on keyboard)
 *   - Talk (lip-sync) clips ONLY replace idle-C in the cycle
 *   - Lip-sync clips are generated FROM idle-C as the base video
 *     so the transition from idle-B → talk is invisible (same starting frame as idle-C)
 *   - After talk finishes, cycle resumes at idle-A (same end frame = seamless)
 *
 * This guarantees:
 *   - Zero visible transitions between ANY clips
 *   - Talk only happens at a predictable point in the cycle
 *   - No glitching, no duplicate audio, no jarring cuts
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/generate-aria-clips-v4.ts
 *
 * Optional: pass --skip-idle to only regenerate lip-sync clips (reusing existing idle-c)
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/generate-aria-clips-v4.ts --skip-idle
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fal } from '@fal-ai/client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const CHARACTER_ID = 'cmmnr4dyb000013j8ptbvbk36';
const SKIP_IDLE = process.argv.includes('--skip-idle');

fal.config({ credentials: process.env.FAL_KEY! });

/* ─── Consistent appearance description ─── */
const ARIA_LOOK = `close-up portrait shot of a young woman with dark wavy hair with subtle purple highlights, green eyes, wearing a black turtleneck, sitting at a streaming desk with an RGB keyboard and a professional microphone, multiple monitors behind her showing trading charts, LED strip lights casting a soft purple and cyan glow, dark cyberpunk room, shot from chest-up, camera locked perfectly still, no camera movement whatsoever`;

const NEUTRAL_POSE = `she is facing directly at the camera with a relaxed neutral expression, her hands resting on the keyboard, shoulders relaxed and still`;

const CLIP_BOOKEND = `CRITICAL: The very first frame and very last frame of this video MUST show the EXACT same pose — facing camera, neutral expression, hands on keyboard, shoulders still. The video must begin and end identically so it can loop seamlessly with zero visible transition.`;

/* ─── Idle clip definitions (A → B → C fixed cycle) ─── */
const IDLE_CLIPS = [
  {
    type: 'idle-a',
    prompt: `${ARIA_LOOK}. ${NEUTRAL_POSE}. She breathes very gently with subtle chest movement, blinks naturally twice, the LED ambient lights on the wall shift slowly from purple to cyan. Absolutely minimal movement — like a real person sitting still on a livestream. ${CLIP_BOOKEND}`,
  },
  {
    type: 'idle-b',
    prompt: `${ARIA_LOOK}. ${NEUTRAL_POSE}. She tilts her head ever so slightly to one side then slowly returns to center, a brief gentle smile crosses her face then settles back to neutral, she blinks naturally. The monitor behind her subtly changes brightness. Very calm, very minimal. ${CLIP_BOOKEND}`,
  },
  {
    type: 'idle-c',
    prompt: `${ARIA_LOOK}. ${NEUTRAL_POSE}. Her eyes glance down briefly at the keyboard then back up to camera, she shifts very slightly in her seat then settles. The RGB lights pulse gently once. Natural, minimal, calm. ${CLIP_BOOKEND}`,
  },
];

/* ─── Voice line IDs for lip-sync generation ─── */
const VOICE_LINE_IDS = [
  'welcome', 'green', 'dip', 'candles', 'calls', 'chart',
  'diamond', 'morning', 'moon', 'setup', 'vibes', 'legend',
];

/* ─── Helpers ─── */
async function uploadFile(filePath: string, mimeType: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const file = new File([buffer], path.basename(filePath), { type: mimeType });
  return fal.storage.upload(file);
}

async function generateIdleClip(
  portraitUrl: string,
  clip: { type: string; prompt: string }
): Promise<string | null> {
  console.log(`\n🎬 [${clip.type}] Generating idle clip...`);
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (fal as any).subscribe(
      'fal-ai/kling-video/v2.1/standard/image-to-video',
      {
        input: {
          prompt: clip.prompt,
          image_url: portraitUrl,
          duration: '10',
          aspect_ratio: '1:1',
          cfg_scale: 0.5,
          negative_prompt:
            'camera shake, camera movement, zoom, pan, blur, distortion, deformed, ugly, low quality, text, watermark',
        },
        logs: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onQueueUpdate(update: any) {
          if (update.status === 'IN_QUEUE')
            console.log(`  ⏳ [${clip.type}] Queued (pos: ${update.queue_position ?? '?'})`);
          else if (update.status === 'IN_PROGRESS') process.stdout.write('.');
        },
      }
    );
    const url = result?.data?.video?.url;
    if (!url) {
      console.error(`  ✗ [${clip.type}] No video URL in response`);
      return null;
    }
    console.log(`\n  ✓ [${clip.type}] Done: ${url.slice(0, 80)}...`);
    return url;
  } catch (e: any) {
    console.error(`\n  ✗ [${clip.type}] Failed:`, e?.message);
    return null;
  }
}

async function generateLipSyncClip(
  baseVideoUrl: string,
  audioUrl: string,
  id: string
): Promise<string | null> {
  const t = `talk-${id}`;
  console.log(`\n🗣️  [${t}] Generating lip-sync clip...`);
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (fal as any).subscribe(
      'fal-ai/kling-video/lipsync/audio-to-video',
      {
        input: {
          video_url: baseVideoUrl,
          audio_url: audioUrl,
        },
        logs: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onQueueUpdate(update: any) {
          if (update.status === 'IN_QUEUE')
            console.log(`  ⏳ [${t}] Queued (pos: ${update.queue_position ?? '?'})`);
          else if (update.status === 'IN_PROGRESS') process.stdout.write('.');
        },
      }
    );
    const url = result?.data?.video?.url;
    if (!url) {
      console.error(`  ✗ [${t}] No video URL in response`);
      return null;
    }
    console.log(`\n  ✓ [${t}] Done: ${url.slice(0, 80)}...`);
    return url;
  } catch (e: any) {
    console.error(`\n  ✗ [${t}] Failed:`, e?.message);
    return null;
  }
}

/* ─── Main ─── */
async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   Aria Clip Generator v4 — PERFECT   ║');
  console.log('╚══════════════════════════════════════╝\n');

  if (SKIP_IDLE) {
    console.log('⚡ --skip-idle flag: skipping idle generation, reusing existing idle-c\n');
  }

  // Delete ALL existing clips for a fresh start (unless skipping idle)
  if (!SKIP_IDLE) {
    const deleted = await prisma.animationClip.deleteMany({
      where: { characterId: CHARACTER_ID },
    });
    console.log(`🗑️  Deleted ${deleted.count} existing clips\n`);
  } else {
    // Only delete talk clips
    const deleted = await prisma.animationClip.deleteMany({
      where: { characterId: CHARACTER_ID, type: { startsWith: 'talk-' } },
    });
    console.log(`🗑️  Deleted ${deleted.count} existing talk clips\n`);
  }

  // Upload portrait
  const portraitPath = path.join(process.cwd(), 'public', 'images', 'aria', 'portrait-wide.png');
  if (!fs.existsSync(portraitPath)) {
    console.error(`FATAL: Portrait not found at ${portraitPath}`);
    process.exit(1);
  }
  console.log('📸 Uploading portrait...');
  const portraitUrl = await uploadFile(portraitPath, 'image/png');
  console.log(`   Portrait: ${portraitUrl.slice(0, 80)}...\n`);

  let idleCVideoUrl: string | null = null;
  let generated = 0;
  let failed = 0;

  // ═══ Phase 1: Idle Clips ═══
  if (!SKIP_IDLE) {
    console.log('━━━ Phase 1: Generating 3 Idle Clips ━━━');
    for (const clip of IDLE_CLIPS) {
      const url = await generateIdleClip(portraitUrl, clip);
      if (url) {
        await prisma.animationClip.create({
          data: {
            characterId: CHARACTER_ID,
            type: clip.type,
            videoUrl: url,
            duration: 10,
          },
        });
        generated++;
        if (clip.type === 'idle-c') idleCVideoUrl = url;
      } else {
        failed++;
      }
      // Rate limit buffer
      await new Promise((r) => setTimeout(r, 2000));
    }
  } else {
    // Find existing idle-c
    const existing = await prisma.animationClip.findFirst({
      where: { characterId: CHARACTER_ID, type: 'idle-c' },
    });
    if (!existing) {
      console.error('FATAL: No idle-c clip found. Run without --skip-idle first.');
      process.exit(1);
    }
    idleCVideoUrl = existing.videoUrl;
    console.log(`Found existing idle-c: ${idleCVideoUrl.slice(0, 80)}...\n`);
  }

  if (!idleCVideoUrl) {
    console.error('FATAL: idle-c clip was not generated. Cannot proceed with lip-sync.');
    process.exit(1);
  }

  // ═══ Phase 2: Lip-Sync Clips ═══
  console.log('\n━━━ Phase 2: Generating 12 Lip-Sync Clips ━━━');
  console.log(`Base video (idle-c): ${idleCVideoUrl.slice(0, 80)}...\n`);

  const audioDir = path.join(process.cwd(), 'public', 'audio', 'aria');

  for (const id of VOICE_LINE_IDS) {
    const audioPath = path.join(audioDir, `${id}.mp3`);
    if (!fs.existsSync(audioPath)) {
      console.error(`  ✗ [talk-${id}] Audio file not found: ${audioPath}`);
      failed++;
      continue;
    }

    console.log(`  📤 Uploading audio: ${id}.mp3`);
    const audioUrl = await uploadFile(audioPath, 'audio/mpeg');

    const url = await generateLipSyncClip(idleCVideoUrl, audioUrl, id);
    if (url) {
      await prisma.animationClip.create({
        data: {
          characterId: CHARACTER_ID,
          type: `talk-${id}`,
          videoUrl: url,
          duration: 10,
        },
      });
      generated++;
    } else {
      failed++;
    }

    // Rate limit buffer
    await new Promise((r) => setTimeout(r, 2000));
  }

  // ═══ Summary ═══
  console.log('\n╔══════════════════════════════════════╗');
  console.log(`║  ✅ Generated: ${String(generated).padStart(2)} clips              ║`);
  if (failed > 0) {
    console.log(`║  ❌ Failed:    ${String(failed).padStart(2)} clips              ║`);
  }
  console.log('╚══════════════════════════════════════╝');

  const total = await prisma.animationClip.count({
    where: { characterId: CHARACTER_ID },
  });
  console.log(`\nTotal clips in DB for Aria: ${total}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
