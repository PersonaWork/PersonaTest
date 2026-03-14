/**
 * Generate remaining Aria clips using Kling 2.1 via fal.ai.
 * (For clips that failed Veo 3's safety filters)
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/generate-aria-clips-kling.ts
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fal } from '@fal-ai/client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const CHARACTER_ID = 'cmmnr4dyb000013j8ptbvbk36'; // Aria

const ARIA_STYLE =
  'a stylish young woman with glowing neon highlights in her hair, sitting at a desk surrounded by holographic trading screens and monitors in a dark neon-lit penthouse, energy drink cans on desk, moody cinematic lighting, cyberpunk aesthetic';

interface ClipDef {
  type: string;
  prompt: string;
}

// Only the clips that Veo 3 failed on
const CLIPS: ClipDef[] = [
  // ── Idle ──
  {
    type: 'idle-look-1',
    prompt: `${ARIA_STYLE}, slowly glancing around her monitors, subtle head movement, eyes scanning holographic charts, calm contemplative mood, gentle ambient lighting shifts`,
  },
  {
    type: 'idle-blink-1',
    prompt: `${ARIA_STYLE}, sitting calmly, natural blinking, very slight head tilt, relaxed expression, screens glowing softly behind her, breathing naturally`,
  },

  // ── Talking ──
  {
    type: 'talk-hype-1',
    prompt: `${ARIA_STYLE}, talking excitedly to camera with wide eyes and energetic hand gestures, hyping up the audience, passionate and animated, leaning forward with intensity`,
  },
  {
    type: 'talk-explain-1',
    prompt: `${ARIA_STYLE}, explaining something calmly to camera, thoughtful hand gestures, pointing at charts behind her, teacher-like energy, articulate and engaging`,
  },
  {
    type: 'talk-gossip-1',
    prompt: `${ARIA_STYLE}, leaning in close to camera conspiratorially, whispering with a sly grin, hand beside mouth, sharing a secret, playful energy`,
  },
  {
    type: 'talk-rant-1',
    prompt: `${ARIA_STYLE}, talking passionately to camera, animated gestures, shaking her head, expressive and dramatic, lots of energy`,
  },

  // ── Excited ──
  {
    type: 'excited-pump-1',
    prompt: `${ARIA_STYLE}, pumping her fist in excitement, eyes wide, huge grin, celebrating a big win, screens flashing green behind her, electric energy`,
  },
  {
    type: 'excited-yes-1',
    prompt: `${ARIA_STYLE}, nodding enthusiastically, bright smile, clapping hands together once, positive affirmation energy, triumphant`,
  },

  // ── Laughing ──
  {
    type: 'laugh-1',
    prompt: `${ARIA_STYLE}, laughing genuinely, head tilted back slightly, natural joyful expression, eyes crinkling, warm authentic laughter`,
  },
  {
    type: 'laugh-2',
    prompt: `${ARIA_STYLE}, trying to suppress a laugh, hand over mouth, eyes sparkling with amusement, shoulders shaking, barely containing herself`,
  },

  // ── Scheming ──
  {
    type: 'scheme-1',
    prompt: `${ARIA_STYLE}, rubbing hands together with a mischievous grin, eyes narrowing, purple neon lighting, devious plotting energy, about to make a big move`,
  },

  // ── Reacting ──
  {
    type: 'react-eyeroll-1',
    prompt: `${ARIA_STYLE}, rolling her eyes dramatically, slight head shake, amused exasperation, leaning back in chair, dismissive but playful`,
  },

  // ── Vibing ──
  {
    type: 'vibe-1',
    prompt: `${ARIA_STYLE}, vibing and grooving at her desk, head bobbing to music, shoulders moving gently, relaxed happy energy, green candles on screens`,
  },
  {
    type: 'vibe-dance-1',
    prompt: `${ARIA_STYLE}, dancing at her desk with more energy, arms moving rhythmically, feeling the music, joyful and free, neon lights pulsing`,
  },
];

async function main() {
  console.log('🎬 Generating remaining Aria clips with Kling 2.1 via fal.ai\n');

  if (!process.env.FAL_KEY) {
    throw new Error('FAL_KEY not found in environment');
  }

  // Upload portrait
  const portraitPath = path.resolve(__dirname, '../public/images/aria/portrait.png');
  if (!fs.existsSync(portraitPath)) {
    throw new Error(`Portrait not found at ${portraitPath}`);
  }

  console.log('📤 Uploading portrait to fal.ai storage...');
  const portraitBuffer = fs.readFileSync(portraitPath);
  const portraitFile = new File([portraitBuffer], 'portrait.png', { type: 'image/png' });
  const portraitUrl = await fal.storage.upload(portraitFile);
  console.log(`✅ Portrait uploaded: ${portraitUrl}\n`);

  // Check which clips already exist
  const existing = await prisma.animationClip.findMany({
    where: { characterId: CHARACTER_ID },
    select: { type: true },
  });
  const existingTypes = new Set(existing.map((c) => c.type));

  const toGenerate = CLIPS.filter((c) => !existingTypes.has(c.type));
  console.log(`📊 ${CLIPS.length} clips needed, ${existingTypes.size} already exist, ${toGenerate.length} to generate\n`);

  if (toGenerate.length === 0) {
    console.log('✅ All clips already generated!');
    return;
  }

  // Kling 2.1 Standard: $0.28 for 5s, $0.56 for 10s
  const costPerClip = 0.56; // 10 seconds
  console.log(`💰 Estimated cost: $${(toGenerate.length * costPerClip).toFixed(2)} (${toGenerate.length} clips × $${costPerClip.toFixed(2)}/clip)\n`);

  let generated = 0;
  let failed = 0;

  for (const clip of toGenerate) {
    const index = toGenerate.indexOf(clip) + 1;
    console.log(`\n[${index}/${toGenerate.length}] Generating ${clip.type}...`);

    try {
      const input = {
        prompt: `Aria: ${clip.prompt}. High quality, smooth natural motion, cinematic lighting, dark moody background.`,
        image_url: portraitUrl,
        duration: '10',
        negative_prompt: 'blur, distort, low quality, deformed, ugly',
        cfg_scale: 0.5,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (fal as any).subscribe('fal-ai/kling-video/v2.1/standard/image-to-video', {
        input,
        logs: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onQueueUpdate(update: any) {
          if (update.status === 'IN_QUEUE') {
            console.log(`  ⏳ In queue (position: ${update.queue_position ?? '...'})`);
          } else if (update.status === 'IN_PROGRESS') {
            console.log(`  🔄 Generating...`);
          }
        },
      });

      const data = result.data as { video?: { url: string } };
      if (!data?.video?.url) {
        throw new Error(`Unexpected output: ${JSON.stringify(data)}`);
      }

      const videoUrl = data.video.url;
      console.log(`  ✅ Generated: ${videoUrl.substring(0, 80)}...`);

      await prisma.animationClip.create({
        data: {
          characterId: CHARACTER_ID,
          type: clip.type,
          videoUrl,
          duration: 10.0,
        },
      });
      console.log(`  💾 Saved to database`);
      generated++;

      if (index < toGenerate.length) {
        console.log(`  ⏸️  Waiting 3s...`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (err) {
      console.error(`  ❌ Failed: ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✅ Generated: ${generated}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`💰 Estimated spend: ~$${(generated * costPerClip).toFixed(2)}`);
  console.log(`${'═'.repeat(50)}\n`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
