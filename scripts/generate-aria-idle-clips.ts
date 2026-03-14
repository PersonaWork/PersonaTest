import 'dotenv/config';
import Replicate from 'replicate';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });
const prisma = new PrismaClient();

// Path to the portrait image
const PORTRAIT_PATH = path.join(process.cwd(), 'public', 'images', 'aria', 'portrait.png');

// Subtle idle motion prompts — all starting from the same portrait
// Minimal motion is key so crossfades between clips are invisible
const IDLE_CLIPS = [
  {
    id: 'idle-breathe-1',
    prompt: 'A stylish young woman with neon-highlighted hair in a dark neon-lit room, very subtle natural breathing movement, gentle chest rise and fall, occasional slow eye blink, ambient purple and blue neon lights softly shifting, holographic screens glow faintly in background, ultra minimal motion, cinematic 4k, photorealistic',
  },
  {
    id: 'idle-breathe-2',
    prompt: 'A stylish young woman with neon-highlighted hair sitting confidently, very gentle natural idle movement, soft breathing, ambient neon lighting slowly pulses between purple and blue, faint screen reflections, barely perceptible micro-movements, cinematic lighting, photorealistic 4k',
  },
  {
    id: 'idle-look-1',
    prompt: 'A stylish young woman with neon-highlighted hair in a cyberpunk room, very subtle slow head micro-tilt to the side, gentle breathing, ambient neon glow shifts softly, holographic screens flicker faintly behind her, minimal natural movement, cinematic 4k photorealistic',
  },
  {
    id: 'idle-look-2',
    prompt: 'A stylish young woman with neon-highlighted hair, very gentle subtle glance slightly to the side then back to camera, natural idle breathing, ambient neon lights gently pulsing, faint holographic reflections, ultra smooth minimal motion, cinematic photorealistic 4k',
  },
  {
    id: 'idle-ambient-1',
    prompt: 'A stylish young woman with neon-highlighted hair in a dark room with neon screens, holding very still with subtle natural breathing, ambient background neon lights slowly shifting colors from purple to blue, gentle hair strand movement from ambient air, cinematic 4k photorealistic',
  },
  {
    id: 'idle-ambient-2',
    prompt: 'A stylish young woman with neon-highlighted hair, calm confident expression, very subtle idle breathing, holographic trading screens behind her gently flicker and update, neon ambient lighting softly changes intensity, minimal natural body sway, cinematic 4k photorealistic',
  },
  {
    id: 'idle-blink-1',
    prompt: 'A stylish young woman with neon-highlighted hair in a cyberpunk setting, natural slow eye blink, very subtle breathing movement, ambient purple and blue neon glow, faint screen reflections on face, extremely minimal motion, cinematic 4k photorealistic',
  },
  {
    id: 'idle-blink-2',
    prompt: 'A stylish young woman with neon-highlighted hair, confident slight smirk, very gentle natural idle movement with subtle breathing and slow blink, ambient neon lighting softly pulses, holographic screens glow in background, ultra smooth cinematic 4k photorealistic',
  },
];

async function generateIdleClips() {
  // Find Aria
  const character = await prisma.character.findUnique({ where: { slug: 'aria' } });
  if (!character) throw new Error('Aria character not found in database');

  console.log(`Found Aria (ID: ${character.id})`);
  console.log(`Portrait: ${PORTRAIT_PATH}`);
  console.log(`Generating ${IDLE_CLIPS.length} idle clips via minimax/video-01...\n`);

  // Read portrait as a File for Replicate
  const portraitBuffer = fs.readFileSync(PORTRAIT_PATH);

  // Check existing clips to avoid regenerating
  const existingClips = await prisma.animationClip.findMany({
    where: { characterId: character.id, type: { startsWith: 'idle-' } },
    select: { type: true },
  });
  const existingTypes = new Set(existingClips.map((c) => c.type));
  console.log(`Existing idle clips: ${existingTypes.size}`);

  let generated = 0;
  let failed = 0;

  for (const clip of IDLE_CLIPS) {
    if (existingTypes.has(clip.id)) {
      console.log(`Skipping "${clip.id}" (already exists)`);
      continue;
    }

    console.log(`Generating "${clip.id}"...`);
    console.log(`  Prompt: "${clip.prompt.substring(0, 80)}..."`);

    try {
      const output = await replicate.run('minimax/video-01', {
        input: {
          prompt: clip.prompt,
          first_frame_image: `data:image/png;base64,${portraitBuffer.toString('base64')}`,
          prompt_optimizer: true,
        },
      });

      // Extract video URL from output
      let videoUrl: string;
      if (typeof output === 'string') {
        videoUrl = output;
      } else if (output && typeof output === 'object') {
        const fo = output as Record<string, unknown>;
        if (typeof fo.url === 'function') {
          const urlObj = (fo.url as () => URL)();
          videoUrl = urlObj.href;
        } else if (typeof fo.url === 'string') {
          videoUrl = fo.url;
        } else if (typeof fo.href === 'string') {
          videoUrl = fo.href;
        } else if (Array.isArray(output) && output.length > 0) {
          const first = output[0];
          if (typeof first === 'string') {
            videoUrl = first;
          } else if (first && typeof first === 'object') {
            const f = first as Record<string, unknown>;
            if (typeof f.url === 'function') {
              videoUrl = ((f.url as () => URL)()).href;
            } else {
              videoUrl = String(f.url || f.href || first);
            }
          } else {
            videoUrl = String(first);
          }
        } else {
          console.log('  Output keys:', Object.keys(fo));
          throw new Error('Cannot extract URL from output');
        }
      } else {
        throw new Error(`Unexpected output type: ${typeof output}`);
      }

      console.log(`  Video URL: ${videoUrl.substring(0, 80)}...`);

      // Save to database
      await prisma.animationClip.create({
        data: {
          characterId: character.id,
          type: clip.id,
          videoUrl,
          duration: 5.0,
        },
      });

      console.log(`  Saved to database!`);
      generated++;
    } catch (error) {
      console.error(`  FAILED:`, error instanceof Error ? error.message : error);
      failed++;
    }

    // Brief pause between generations
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`\nDone! Generated: ${generated}, Failed: ${failed}, Skipped: ${existingTypes.size}`);
  await prisma.$disconnect();
}

generateIdleClips().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
