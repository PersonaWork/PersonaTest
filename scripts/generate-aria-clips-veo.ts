/**
 * Generate all Aria animation clips using Google Veo 3 via fal.ai.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/generate-aria-clips-veo.ts
 *
 * Requirements:
 *   - FAL_KEY in .env
 *   - DATABASE_URL in .env
 *   - Portrait image at public/images/aria/portrait.png
 *
 * Cost estimate (Veo 3, 720p, no audio):
 *   $0.20/sec × 8 seconds = $1.60 per clip
 *   21 clips = ~$33.60 total
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fal } from '@fal-ai/client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/* ─── Character ID ─── */
const CHARACTER_ID = 'cmmnr4dyb000013j8ptbvbk36'; // Aria

/* ─── Clip definitions ─── */
// All prompts start from same portrait for seamless crossfading
const ARIA_STYLE =
  'a stylish young woman with glowing neon highlights in her hair, sitting at a desk surrounded by holographic trading screens and monitors in a dark neon-lit penthouse, energy drink cans on desk, moody cinematic lighting, cyberpunk aesthetic';

interface ClipDef {
  type: string;
  prompt: string;
}

const CLIPS: ClipDef[] = [
  // ── Idle (4 clips) ──
  {
    type: 'idle-breathe-1',
    prompt: `${ARIA_STYLE}, breathing gently, very subtle movement, shoulders rising and falling softly, relaxed and calm, ambient neon glow, nearly still with only minimal natural motion`,
  },
  {
    type: 'idle-breathe-2',
    prompt: `${ARIA_STYLE}, sitting calmly breathing, slight shift in posture, barely moving, ambient holographic screens casting soft blue-purple glow on her face, serene`,
  },
  {
    type: 'idle-look-1',
    prompt: `${ARIA_STYLE}, slowly glancing around her monitors, subtle head movement, eyes scanning holographic charts, calm contemplative mood, gentle ambient lighting shifts`,
  },
  {
    type: 'idle-blink-1',
    prompt: `${ARIA_STYLE}, sitting calmly, natural blinking, very slight head tilt, relaxed expression, screens glowing softly behind her, breathing naturally`,
  },

  // ── Talking (5 clips) ──
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
    prompt: `${ARIA_STYLE}, leaning in close to camera conspiratorially, whispering gossip with a sly grin, hand beside mouth, sharing a secret, playful energy`,
  },
  {
    type: 'talk-rant-1',
    prompt: `${ARIA_STYLE}, talking passionately to camera, animated frustrated gestures, shaking her head, ranting about something ridiculous, expressive and dramatic`,
  },
  {
    type: 'talk-chill-1',
    prompt: `${ARIA_STYLE}, talking casually to camera, relaxed posture, slight smile, laid-back vibes, one hand gesturing lazily, easygoing conversation`,
  },

  // ── Excited (2 clips) ──
  {
    type: 'excited-pump-1',
    prompt: `${ARIA_STYLE}, pumping her fist in excitement, eyes wide, huge grin, celebrating a big win, screens flashing green behind her, electric energy`,
  },
  {
    type: 'excited-yes-1',
    prompt: `${ARIA_STYLE}, nodding enthusiastically saying yes, bright smile, clapping hands together once, positive affirmation energy, triumphant`,
  },

  // ── Laughing (2 clips) ──
  {
    type: 'laugh-1',
    prompt: `${ARIA_STYLE}, laughing genuinely, head tilted back slightly, natural joyful expression, eyes crinkling, warm authentic laughter`,
  },
  {
    type: 'laugh-2',
    prompt: `${ARIA_STYLE}, trying to suppress a laugh, hand over mouth, eyes sparkling with amusement, shoulders shaking, barely containing herself`,
  },

  // ── Thinking (1 clip) ──
  {
    type: 'think-1',
    prompt: `${ARIA_STYLE}, hand on chin deep in thought, squinting at a complex chart, analytical expression, screens casting blue light on her face, genius at work`,
  },

  // ── Scheming (1 clip) ──
  {
    type: 'scheme-1',
    prompt: `${ARIA_STYLE}, rubbing hands together with a mischievous grin, eyes narrowing, purple neon lighting, devious plotting energy, about to make a big move`,
  },

  // ── Celebrating (1 clip) ──
  {
    type: 'celebrate-1',
    prompt: `${ARIA_STYLE}, throwing arms up in victory, huge triumphant smile, standing slightly from chair, screens showing green candles, pure celebration energy`,
  },

  // ── Reacting (2 clips) ──
  {
    type: 'react-shock-1',
    prompt: `${ARIA_STYLE}, jaw dropping in shock, eyes going wide, leaning back in surprise, hand to chest, dramatic reaction to something unexpected on screen`,
  },
  {
    type: 'react-eyeroll-1',
    prompt: `${ARIA_STYLE}, rolling her eyes dramatically, slight head shake, amused exasperation, leaning back in chair, over-it energy with a smirk`,
  },

  // ── Vibing (2 clips) ──
  {
    type: 'vibe-1',
    prompt: `${ARIA_STYLE}, vibing and grooving at her desk, head bobbing to music, shoulders moving gently, relaxed happy energy, green candles on screens`,
  },
  {
    type: 'vibe-dance-1',
    prompt: `${ARIA_STYLE}, dancing at her desk with more energy, arms moving rhythmically, feeling the music, joyful and free, neon lights pulsing`,
  },
];

/* ─── Main ─── */
async function main() {
  console.log('🎬 Generating Aria clips with Google Veo 3 via fal.ai\n');

  // Verify FAL_KEY
  if (!process.env.FAL_KEY) {
    throw new Error('FAL_KEY not found in environment. Set it in .env');
  }

  // Upload portrait to fal.ai storage
  const portraitPath = path.resolve(__dirname, '../public/images/aria/portrait.png');
  if (!fs.existsSync(portraitPath)) {
    throw new Error(`Portrait not found at ${portraitPath}`);
  }

  console.log('📤 Uploading portrait to fal.ai storage...');
  const portraitBuffer = fs.readFileSync(portraitPath);
  const portraitFile = new File([portraitBuffer], 'portrait.png', { type: 'image/png' });
  const portraitUrl = await fal.storage.upload(portraitFile);
  console.log(`✅ Portrait uploaded: ${portraitUrl}\n`);

  // Check for existing clips to skip
  const existing = await prisma.animationClip.findMany({
    where: { characterId: CHARACTER_ID },
    select: { type: true },
  });
  const existingTypes = new Set(existing.map((c) => c.type));

  const toGenerate = CLIPS.filter((c) => !existingTypes.has(c.type));
  console.log(`📊 ${CLIPS.length} total clips, ${existing.length} already exist, ${toGenerate.length} to generate\n`);

  if (toGenerate.length === 0) {
    console.log('✅ All clips already generated!');
    return;
  }

  const costPerClip = 0.20 * 8; // $0.20/sec × 8 seconds (no audio, 720p)
  console.log(`💰 Estimated cost: $${(toGenerate.length * costPerClip).toFixed(2)} (${toGenerate.length} clips × $${costPerClip.toFixed(2)}/clip)\n`);

  let generated = 0;
  let failed = 0;

  for (const clip of toGenerate) {
    const index = CLIPS.indexOf(clip) + 1;
    console.log(`\n[${index}/${CLIPS.length}] Generating ${clip.type}...`);

    try {
      const input = {
        prompt: `Aria: ${clip.prompt}. High quality, smooth natural motion, cinematic lighting, dark moody background. The character should move naturally and fluidly.`,
        image_url: portraitUrl,
        duration: '8s',
        aspect_ratio: '16:9',
        resolution: '720p',
        generate_audio: false,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (fal as any).subscribe('fal-ai/veo3/image-to-video', {
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

      // Save to database
      await prisma.animationClip.create({
        data: {
          characterId: CHARACTER_ID,
          type: clip.type,
          videoUrl,
          duration: 8.0,
        },
      });
      console.log(`  💾 Saved to database`);
      generated++;

      // Small delay between generations to be nice to the API
      if (toGenerate.indexOf(clip) < toGenerate.length - 1) {
        console.log(`  ⏸️  Waiting 3s before next generation...`);
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
