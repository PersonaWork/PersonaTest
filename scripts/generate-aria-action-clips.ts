import 'dotenv/config';
import Replicate from 'replicate';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });
const prisma = new PrismaClient();

const PORTRAIT_PATH = path.join(process.cwd(), 'public', 'images', 'aria', 'portrait.png');

// All action clips — varied types for maximum liveliness
// All use the portrait as first_frame_image so crossfade works seamlessly
const ACTION_CLIPS = [
  // ── Talking / Catchphrase clips ──
  {
    id: 'talk-hype-1',
    type: 'talking',
    prompt: 'A stylish young woman with neon-highlighted hair in a cyberpunk room, animatedly talking to camera with expressive hand gestures and excited facial expressions, mouth moving naturally as if giving a passionate speech, neon purple and blue ambient lighting, holographic screens behind her, energetic confident body language, cinematic 4k photorealistic',
  },
  {
    id: 'talk-explain-1',
    type: 'talking',
    prompt: 'A stylish young woman with neon-highlighted hair leaning slightly forward toward camera, talking and explaining something with a knowing smirk, one hand gesturing to the side pointing at an invisible chart, neon-lit cyberpunk room, natural mouth and facial movement, confident energy, cinematic 4k photorealistic',
  },
  {
    id: 'talk-gossip-1',
    type: 'talking',
    prompt: 'A stylish young woman with neon-highlighted hair in a dark neon room, leaning in conspiratorially like sharing a secret, whispering to camera with a mischievous grin, hand near mouth, ambient purple lighting, playful energy, natural talking motion, cinematic 4k photorealistic',
  },
  {
    id: 'talk-rant-1',
    type: 'talking',
    prompt: 'A stylish young woman with neon-highlighted hair passionately ranting to camera, animated facial expressions shifting between disbelief and amusement, expressive eyebrow raises, hand gestures, neon cyberpunk room background, natural talking movement, cinematic 4k photorealistic',
  },
  {
    id: 'talk-chill-1',
    type: 'talking',
    prompt: 'A stylish young woman with neon-highlighted hair casually talking to camera in a relaxed manner, slight head tilts, easy smile, calm hand gestures, laid back energy in a neon-lit cyberpunk room, natural conversational movement, cinematic 4k photorealistic',
  },

  // ── Excited / Hyping clips ──
  {
    id: 'excited-pump-1',
    type: 'excited',
    prompt: 'A stylish young woman with neon-highlighted hair getting excited looking at something off screen, eyes widening with surprise and delight, slight gasp expression, leaning forward with growing excitement, neon purple and blue lighting intensifies, holographic screens behind her, cinematic 4k photorealistic',
  },
  {
    id: 'excited-yes-1',
    type: 'excited',
    prompt: 'A stylish young woman with neon-highlighted hair doing a small celebratory fist pump, beaming smile, nodding enthusiastically, radiating joy and confidence, neon cyberpunk room glowing brighter, energetic movement, cinematic 4k photorealistic',
  },

  // ── Laughing clips ──
  {
    id: 'laugh-1',
    type: 'laughing',
    prompt: 'A stylish young woman with neon-highlighted hair breaking into genuine laughter, head tilting back slightly, eyes crinkling with amusement, natural laughing motion, one hand coming up near face, warm genuine expression, neon-lit cyberpunk room, cinematic 4k photorealistic',
  },
  {
    id: 'laugh-2',
    type: 'laughing',
    prompt: 'A stylish young woman with neon-highlighted hair trying to hold back laughter but failing, covering mouth with hand, shoulders shaking with suppressed giggles, amused eyes, neon purple ambient glow, natural laughing movement, cinematic 4k photorealistic',
  },

  // ── Thinking / Scheming clips ──
  {
    id: 'think-1',
    type: 'thinking',
    prompt: 'A stylish young woman with neon-highlighted hair in a thoughtful pose, chin resting on hand, eyes looking up and to the side as if contemplating something deeply, slight squint, ambient neon lights casting moody blue and purple tones, subtle thinking movement, cinematic 4k photorealistic',
  },
  {
    id: 'scheme-1',
    type: 'scheming',
    prompt: 'A stylish young woman with neon-highlighted hair getting a devious idea, slow knowing smile spreading across her face, steepling fingers together, eyebrows raising with an evil genius expression, dramatic neon purple lighting from below, scheming energy, cinematic 4k photorealistic',
  },

  // ── Celebrating clips ──
  {
    id: 'celebrate-1',
    type: 'celebrating',
    prompt: 'A stylish young woman with neon-highlighted hair celebrating a win, both hands raised in triumph, huge victorious smile, slight bounce of excitement, neon room lights pulsing brighter in celebration, holographic confetti-like reflections, cinematic 4k photorealistic',
  },

  // ── Reaction clips ──
  {
    id: 'react-shock-1',
    type: 'reacting',
    prompt: 'A stylish young woman with neon-highlighted hair reacting with dramatic shock to something on her screen, jaw dropping, eyes going wide, hand coming up to face in disbelief, then slowly transitioning to an amused expression, neon cyberpunk room, cinematic 4k photorealistic',
  },
  {
    id: 'react-eyeroll-1',
    type: 'reacting',
    prompt: 'A stylish young woman with neon-highlighted hair doing a dramatic sassy eye roll with a slight smirk, head tilting to side, exasperated but amused expression, classic social media reaction face, neon-lit cyberpunk room, cinematic 4k photorealistic',
  },

  // ── Vibing / Dancing clips ──
  {
    id: 'vibe-1',
    type: 'vibing',
    prompt: 'A stylish young woman with neon-highlighted hair vibing to music, subtle head bob and shoulder sway, eyes slightly closed enjoying the moment, peaceful confident expression, ambient neon lights pulsing rhythmically, cyberpunk room atmosphere, cinematic 4k photorealistic',
  },
  {
    id: 'vibe-dance-1',
    type: 'dancing',
    prompt: 'A stylish young woman with neon-highlighted hair doing a fun seated dance, shoulders swaying, head bobbing rhythmically, playful smile, finger pointing to camera, neon lights pulsing with energy, cyberpunk room glowing, energetic fun movement, cinematic 4k photorealistic',
  },
];

async function generateActionClips() {
  const character = await prisma.character.findUnique({ where: { slug: 'aria' } });
  if (!character) throw new Error('Aria character not found');

  console.log(`Found Aria (ID: ${character.id})`);
  console.log(`Generating ${ACTION_CLIPS.length} action clips...\n`);

  const portraitBuffer = fs.readFileSync(PORTRAIT_PATH);
  const portraitBase64 = `data:image/png;base64,${portraitBuffer.toString('base64')}`;

  // Check existing
  const existing = await prisma.animationClip.findMany({
    where: { characterId: character.id },
    select: { type: true },
  });
  const existingTypes = new Set(existing.map((c) => c.type));

  let generated = 0;
  let failed = 0;
  let skipped = 0;

  for (const clip of ACTION_CLIPS) {
    if (existingTypes.has(clip.id)) {
      console.log(`Skipping "${clip.id}" (exists)`);
      skipped++;
      continue;
    }

    console.log(`[${generated + failed + skipped + 1}/${ACTION_CLIPS.length}] Generating "${clip.id}" (${clip.type})...`);

    try {
      const output = await replicate.run('minimax/video-01', {
        input: {
          prompt: clip.prompt,
          first_frame_image: portraitBase64,
          prompt_optimizer: true,
        },
      });

      // Extract URL
      let videoUrl: string;
      if (typeof output === 'string') {
        videoUrl = output;
      } else if (output && typeof output === 'object') {
        const fo = output as Record<string, unknown>;
        if (typeof fo.url === 'function') {
          videoUrl = ((fo.url as () => URL)()).href;
        } else if (typeof fo.url === 'string') {
          videoUrl = fo.url;
        } else if (typeof fo.href === 'string') {
          videoUrl = fo.href;
        } else if (Array.isArray(output) && output.length > 0) {
          const first = output[0];
          if (typeof first === 'string') videoUrl = first;
          else if (first && typeof first === 'object') {
            const f = first as Record<string, unknown>;
            videoUrl = typeof f.url === 'function' ? ((f.url as () => URL)()).href : String(f.url || f.href || first);
          } else videoUrl = String(first);
        } else {
          throw new Error('Cannot extract URL');
        }
      } else {
        throw new Error(`Unexpected output: ${typeof output}`);
      }

      console.log(`  URL: ${videoUrl.substring(0, 70)}...`);

      await prisma.animationClip.create({
        data: {
          characterId: character.id,
          type: clip.id,
          videoUrl,
          duration: 5.0,
        },
      });

      console.log(`  Saved!`);
      generated++;
    } catch (error) {
      console.error(`  FAILED:`, error instanceof Error ? error.message : error);
      failed++;
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`\nDone! Generated: ${generated}, Failed: ${failed}, Skipped: ${skipped}`);
  console.log(`Total clips in DB: ${existing.length + generated}`);
  await prisma.$disconnect();
}

generateActionClips().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
