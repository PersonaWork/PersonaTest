/**
 * Generate Aria clips v3: wider framing + lip-sync.
 *
 * Phase 1: Generate 3 idle clips via Kling 2.1 (image-to-video)
 * Phase 2: Generate 12 lip-sync clips via Kling LipSync (video + audio → lip-synced video)
 *
 * The lip-sync clips use an idle clip as the base video, so transitions
 * between idle and talking are nearly invisible (same body/background).
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/generate-aria-clips-v3.ts
 *
 * Cost estimate:
 *   3 idle clips × $0.56 = $1.68
 *   12 lip-sync clips × ~$0.14 = $1.68
 *   Total: ~$3.36
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fal } from '@fal-ai/client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CHARACTER_ID = 'cmmnr4dyb000013j8ptbvbk36'; // Aria

fal.config({ credentials: process.env.FAL_KEY! });

/* ─── Wider portrait description ─── */
const ARIA_WIDE = `a young woman with dark wavy hair with purple highlights, green eyes, wearing a black turtleneck, sitting at a streaming desk with RGB keyboard and microphone, monitors with colorful screens behind her, LED strip lights on walls casting purple and cyan glow, dark cyberpunk room, medium shot from waist up, facing camera`;

const NEUTRAL = `looking directly at the camera with a relaxed neutral expression, shoulders relaxed, hands resting on keyboard`;

/* ─── Idle clip definitions ─── */
const IDLE_CLIPS = [
  {
    type: 'idle-breathe',
    prompt: `${ARIA_WIDE}, ${NEUTRAL}, very subtle gentle breathing motion, minimal movement, calm and composed, the LED lights on the wall shimmer slightly, ambient room activity`,
  },
  {
    type: 'idle-glance',
    prompt: `${ARIA_WIDE}, ${NEUTRAL}, she glances at one of the monitors briefly then looks back at camera, subtle natural movement, the screen behind her changes color slightly`,
  },
  {
    type: 'idle-smile',
    prompt: `${ARIA_WIDE}, ${NEUTRAL}, a gentle smile slowly forms on her face as if she read something funny, she shifts slightly in her gaming chair, then relaxes back to neutral`,
  },
];

/* ─── Voice line IDs (must match manifest.json) ─── */
const VOICE_LINE_IDS = [
  'welcome', 'plot-twist', 'bestie', 'sleep', 'brain', 'chaos',
  'snack', 'vibe-check', 'galaxy-brain', 'story', 'legend', 'slay',
];

/* ─── Upload file to fal.ai storage ─── */
async function uploadFile(filePath: string, mimeType: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const file = new File([buffer], fileName, { type: mimeType });
  const url = await fal.storage.upload(file);
  return url;
}

/* ─── Generate idle clip via Kling 2.1 ─── */
async function generateIdleClip(
  portraitUrl: string,
  clip: { type: string; prompt: string }
): Promise<string | null> {
  console.log(`\n[${clip.type}] Generating idle clip...`);

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
          if (update.status === 'IN_QUEUE') console.log(`  [${clip.type}] In queue...`);
          else if (update.status === 'IN_PROGRESS') console.log(`  [${clip.type}] Processing...`);
        },
      }
    );

    const videoUrl = result?.data?.video?.url;
    if (!videoUrl) {
      console.error(`  [${clip.type}] No video URL in response`);
      return null;
    }

    console.log(`  ✓ [${clip.type}] Done: ${videoUrl}`);
    return videoUrl;
  } catch (error: any) {
    console.error(`  ✗ [${clip.type}] Failed:`, error?.message || error);
    return null;
  }
}

/* ─── Generate lip-sync clip via Kling LipSync ─── */
async function generateLipSyncClip(
  baseVideoUrl: string,
  audioUrl: string,
  voiceLineId: string
): Promise<string | null> {
  const clipType = `talk-${voiceLineId}`;
  console.log(`\n[${clipType}] Generating lip-sync clip...`);

  try {
    const result = await (fal as any).subscribe(
      'fal-ai/kling-video/lipsync/audio-to-video',
      {
        input: {
          video_url: baseVideoUrl,
          audio_url: audioUrl,
        },
        logs: true,
        onQueueUpdate(update: any) {
          if (update.status === 'IN_QUEUE') console.log(`  [${clipType}] In queue...`);
          else if (update.status === 'IN_PROGRESS') console.log(`  [${clipType}] Processing...`);
        },
      }
    );

    const videoUrl = result?.data?.video?.url;
    if (!videoUrl) {
      console.error(`  [${clipType}] No video URL in response`);
      return null;
    }

    console.log(`  ✓ [${clipType}] Done: ${videoUrl}`);
    return videoUrl;
  } catch (error: any) {
    console.error(`  ✗ [${clipType}] Failed:`, error?.message || error);
    return null;
  }
}

/* ─── Main ─── */
async function main() {
  console.log('=== Aria Clip Generator v3 (Wide + LipSync) ===\n');

  // Check existing clips
  const existing = await prisma.animationClip.findMany({
    where: { characterId: CHARACTER_ID },
    select: { type: true },
  });
  const existingTypes = new Set(existing.map((c) => c.type));
  console.log(`Existing clips in DB: ${existingTypes.size}`);

  // Upload wide portrait
  const portraitPath = path.join(process.cwd(), 'public', 'images', 'aria', 'portrait-wide.png');
  console.log('Uploading wide portrait...');
  const portraitUrl = await uploadFile(portraitPath, 'image/png');
  console.log(`Portrait URL: ${portraitUrl}`);

  let generated = 0;
  let failed = 0;
  let skipped = 0;

  // ── Phase 1: Generate idle clips ──
  console.log('\n=== Phase 1: Idle Clips ===');
  let firstIdleVideoUrl: string | null = null;

  for (const clip of IDLE_CLIPS) {
    if (existingTypes.has(clip.type)) {
      console.log(`\n[${clip.type}] Already exists, skipping`);
      skipped++;
      // Still need the first idle URL for lip-sync base
      if (!firstIdleVideoUrl) {
        const existing = await prisma.animationClip.findFirst({
          where: { characterId: CHARACTER_ID, type: clip.type },
        });
        firstIdleVideoUrl = existing?.videoUrl || null;
      }
      continue;
    }

    const videoUrl = await generateIdleClip(portraitUrl, clip);
    if (videoUrl) {
      await prisma.animationClip.create({
        data: {
          characterId: CHARACTER_ID,
          type: clip.type,
          videoUrl,
          duration: 10,
        },
      });
      generated++;
      if (!firstIdleVideoUrl) firstIdleVideoUrl = videoUrl;
      console.log(`  Saved to DB`);
    } else {
      failed++;
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  if (!firstIdleVideoUrl) {
    console.error('\nFATAL: No idle clip generated — cannot create lip-sync clips');
    await prisma.$disconnect();
    process.exit(1);
  }

  // ── Phase 2: Generate lip-sync clips ──
  console.log('\n=== Phase 2: Lip-Sync Clips ===');
  console.log(`Base video: ${firstIdleVideoUrl}`);

  // Upload all voice line audio files
  const audioDir = path.join(process.cwd(), 'public', 'audio', 'aria');

  for (const voiceLineId of VOICE_LINE_IDS) {
    const clipType = `talk-${voiceLineId}`;

    if (existingTypes.has(clipType)) {
      console.log(`\n[${clipType}] Already exists, skipping`);
      skipped++;
      continue;
    }

    const audioPath = path.join(audioDir, `${voiceLineId}.mp3`);
    if (!fs.existsSync(audioPath)) {
      console.error(`\n[${clipType}] Audio file not found: ${audioPath}`);
      failed++;
      continue;
    }

    console.log(`\nUploading audio for ${voiceLineId}...`);
    const audioUrl = await uploadFile(audioPath, 'audio/mpeg');
    console.log(`  Audio URL: ${audioUrl}`);

    const videoUrl = await generateLipSyncClip(firstIdleVideoUrl, audioUrl, voiceLineId);
    if (videoUrl) {
      await prisma.animationClip.create({
        data: {
          characterId: CHARACTER_ID,
          type: clipType,
          videoUrl,
          duration: 10,
        },
      });
      generated++;
      console.log(`  Saved to DB`);
    } else {
      failed++;
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log('\n=== Summary ===');
  console.log(`Generated: ${generated}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Total in DB: ${generated + skipped}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  prisma.$disconnect();
  process.exit(1);
});
