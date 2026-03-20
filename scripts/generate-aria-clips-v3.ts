/**
 * Generate Aria clips v3: wider framing + perfect loops + lip-sync.
 *
 * Strategy for seamless looping:
 *   - All idle clips start AND end at the SAME neutral pose
 *   - Prompt explicitly describes: "begins and ends looking directly at camera
 *     with hands on keyboard, relaxed neutral expression"
 *   - This means any idle clip can follow any other idle clip with zero visible cut
 *   - The FIRST idle clip is also used as the base for ALL lip-sync clips
 *   - So idle→talk and talk→idle transitions are also invisible
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/generate-aria-clips-v3.ts
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fal } from '@fal-ai/client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const CHARACTER_ID = 'cmmnr4dyb000013j8ptbvbk36';

fal.config({ credentials: process.env.FAL_KEY! });

/* ─── Shared look + pose descriptions ─── */
const ARIA_LOOK = `a young woman with dark wavy hair with purple highlights, green eyes, wearing a black turtleneck, sitting at a streaming desk with RGB keyboard and microphone, monitors behind her, LED strip lights casting purple and cyan glow, dark cyberpunk room, medium shot from waist up`;

const NEUTRAL_POSE = `facing directly at camera, relaxed neutral expression, hands resting on keyboard, shoulders still`;

/* ─── Idle clip definitions ───
 *  Each clip MUST start and end at NEUTRAL_POSE for seamless looping */
const IDLE_CLIPS = [
  {
    type: 'idle-a',
    prompt: `${ARIA_LOOK}, ${NEUTRAL_POSE}. She breathes gently with very subtle chest movement, blinks naturally, the LED lights on the wall slowly shift color. The video begins and ends with her in the exact same relaxed pose looking at camera. Minimal movement, calm, photorealistic.`,
  },
  {
    type: 'idle-b',
    prompt: `${ARIA_LOOK}, ${NEUTRAL_POSE}. She tilts her head very slightly to one side then back to center, blinks, a gentle smile briefly crosses her face then returns to neutral. The monitor behind her changes brightness subtly. The video begins and ends in the exact same neutral pose looking at camera.`,
  },
  {
    type: 'idle-c',
    prompt: `${ARIA_LOOK}, ${NEUTRAL_POSE}. Her eyes glance down at the keyboard briefly then back up to camera, she shifts very slightly in her chair then settles back. The ambient lights pulse gently. The video begins and ends in the exact same neutral pose looking at camera.`,
  },
];

/* ─── Voice line IDs (must match manifest.json) ─── */
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

async function generateIdleClip(portraitUrl: string, clip: { type: string; prompt: string }): Promise<string | null> {
  console.log(`\n[${clip.type}] Generating idle clip...`);
  try {
    const result = await (fal as any).subscribe('fal-ai/kling-video/v2.1/standard/image-to-video', {
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
        else if (update.status === 'IN_PROGRESS') process.stdout.write('.');
      },
    });
    const url = result?.data?.video?.url;
    if (!url) { console.error(`  [${clip.type}] No URL`); return null; }
    console.log(`\n  ✓ [${clip.type}] Done`);
    return url;
  } catch (e: any) {
    console.error(`\n  ✗ [${clip.type}] Failed:`, e?.message);
    return null;
  }
}

async function generateLipSyncClip(baseVideoUrl: string, audioUrl: string, id: string): Promise<string | null> {
  const t = `talk-${id}`;
  console.log(`\n[${t}] Generating lip-sync clip...`);
  try {
    const result = await (fal as any).subscribe('fal-ai/kling-video/lipsync/audio-to-video', {
      input: { video_url: baseVideoUrl, audio_url: audioUrl },
      logs: true,
      onQueueUpdate(update: any) {
        if (update.status === 'IN_QUEUE') console.log(`  [${t}] In queue...`);
        else if (update.status === 'IN_PROGRESS') process.stdout.write('.');
      },
    });
    const url = result?.data?.video?.url;
    if (!url) { console.error(`  [${t}] No URL`); return null; }
    console.log(`\n  ✓ [${t}] Done`);
    return url;
  } catch (e: any) {
    console.error(`\n  ✗ [${t}] Failed:`, e?.message);
    return null;
  }
}

/* ─── Main ─── */
async function main() {
  console.log('=== Aria Clip Generator v3 ===\n');

  const existing = await prisma.animationClip.findMany({
    where: { characterId: CHARACTER_ID },
    select: { type: true, videoUrl: true },
  });
  const existingMap = new Map(existing.map(c => [c.type, c.videoUrl]));
  console.log(`Existing clips: ${existingMap.size}`);

  // Upload portrait
  const portraitPath = path.join(process.cwd(), 'public', 'images', 'aria', 'portrait-wide.png');
  console.log('Uploading portrait...');
  const portraitUrl = await uploadFile(portraitPath, 'image/png');

  let gen = 0, fail = 0, skip = 0;
  let primaryIdleUrl: string | null = null;

  // ── Phase 1: Idle clips ──
  console.log('\n=== Phase 1: Idle Clips ===');
  for (const clip of IDLE_CLIPS) {
    if (existingMap.has(clip.type)) {
      console.log(`[${clip.type}] Exists, skipping`);
      if (!primaryIdleUrl) primaryIdleUrl = existingMap.get(clip.type)!;
      skip++;
      continue;
    }
    const url = await generateIdleClip(portraitUrl, clip);
    if (url) {
      await prisma.animationClip.create({
        data: { characterId: CHARACTER_ID, type: clip.type, videoUrl: url, duration: 10 },
      });
      gen++;
      if (!primaryIdleUrl) primaryIdleUrl = url;
    } else { fail++; }
    await new Promise(r => setTimeout(r, 1000));
  }

  if (!primaryIdleUrl) {
    console.error('FATAL: No idle clip');
    process.exit(1);
  }

  // ── Phase 2: Lip-sync clips ──
  console.log('\n=== Phase 2: Lip-Sync Clips ===');
  console.log(`Base video: ${primaryIdleUrl}`);
  const audioDir = path.join(process.cwd(), 'public', 'audio', 'aria');

  for (const id of VOICE_LINE_IDS) {
    const clipType = `talk-${id}`;
    if (existingMap.has(clipType)) {
      console.log(`[${clipType}] Exists, skipping`);
      skip++;
      continue;
    }
    const audioPath = path.join(audioDir, `${id}.mp3`);
    if (!fs.existsSync(audioPath)) {
      console.error(`[${clipType}] Audio not found`);
      fail++;
      continue;
    }
    const audioUrl = await uploadFile(audioPath, 'audio/mpeg');
    const url = await generateLipSyncClip(primaryIdleUrl, audioUrl, id);
    if (url) {
      await prisma.animationClip.create({
        data: { characterId: CHARACTER_ID, type: clipType, videoUrl: url, duration: 10 },
      });
      gen++;
    } else { fail++; }
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n=== Done: ${gen} generated, ${fail} failed, ${skip} skipped ===`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
