import Replicate from 'replicate';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });

const ARIA_STYLE =
  'a stylish young woman with glowing neon highlights in her hair, sitting at a desk surrounded by holographic trading screens and monitors in a dark neon-lit penthouse, energy drink cans on desk, moody cinematic lighting, cyberpunk aesthetic';

// Only generate the most important clips to stay budget-friendly (~$0.07-0.14 each)
const CLIPS_TO_GENERATE: { type: string; prompt: string }[] = [
  {
    type: 'idle',
    prompt: `${ARIA_STYLE}, leaning back in her chair casually scrolling through charts, occasionally glancing at camera with a slight smirk, ambient neon glow, relaxed confident energy. High quality, smooth animation, cinematic lighting.`,
  },
  {
    type: 'talking',
    prompt: `${ARIA_STYLE}, talking animatedly to camera with expressive hand gestures, pointing at charts behind her, engaged and passionate, like she's explaining something important. High quality, smooth animation, cinematic lighting.`,
  },
  {
    type: 'excited',
    prompt: `${ARIA_STYLE}, eyes going wide as she sees something on screen, jumping up from chair, pumping her fist, pure electric excitement, screens flashing green behind her. High quality, smooth animation, cinematic lighting.`,
  },
  {
    type: 'laughing',
    prompt: `${ARIA_STYLE}, leaning forward laughing hard at something on screen, genuine amusement, almost falling out of chair, infectious joyful energy. High quality, smooth animation, cinematic lighting.`,
  },
  {
    type: 'celebrating',
    prompt: `${ARIA_STYLE}, standing up throwing her arms in the air victoriously, huge smile, charts showing green candles in background, triumphant energy. High quality, smooth animation, cinematic lighting.`,
  },
  {
    type: 'thinking',
    prompt: `${ARIA_STYLE}, leaning back with hand on chin, squinting at a complex chart, deep in thought, screens casting blue light on her face, contemplative genius energy. High quality, smooth animation, cinematic lighting.`,
  },
];

async function generateClip(type: string, prompt: string): Promise<string> {
  console.log(`  🎬 Generating "${type}" clip...`);
  const startTime = Date.now();

  const output = await replicate.run('minimax/video-01', {
    input: {
      prompt,
      prompt_optimizer: true,
    },
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Handle various output formats
  if (typeof output === 'string') {
    console.log(`  ✅ "${type}" done in ${elapsed}s`);
    return output;
  }
  if (output && typeof output === 'object' && 'url' in (output as Record<string, unknown>)) {
    console.log(`  ✅ "${type}" done in ${elapsed}s`);
    return (output as { url: () => string }).url();
  }
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    if (typeof first === 'string') {
      console.log(`  ✅ "${type}" done in ${elapsed}s`);
      return first;
    }
    if (first && typeof first === 'object' && 'url' in first) {
      const url = typeof first.url === 'function' ? first.url() : first.url;
      console.log(`  ✅ "${type}" done in ${elapsed}s`);
      return url;
    }
  }

  throw new Error(`Unexpected output format: ${JSON.stringify(output)}`);
}

async function main() {
  console.log('🚀 Generating Aria animation clips via Replicate minimax/video-01\n');

  // Find Aria in the database
  const aria = await prisma.character.findUnique({ where: { slug: 'aria' } });
  if (!aria) {
    console.error('❌ Aria character not found in database! Run seed first.');
    process.exit(1);
  }
  console.log(`Found character: ${aria.name} (${aria.id})\n`);

  // Check for existing clips
  const existingClips = await prisma.animationClip.findMany({
    where: { characterId: aria.id },
  });
  console.log(`Existing clips: ${existingClips.length}`);

  const existingTypes = new Set(existingClips.map((c) => c.type));
  const clipsToGenerate = CLIPS_TO_GENERATE.filter(
    (c) => !existingTypes.has(c.type)
  );

  if (clipsToGenerate.length === 0) {
    console.log('✅ All clip types already exist! Nothing to generate.');
    return;
  }

  console.log(
    `Generating ${clipsToGenerate.length} clips: ${clipsToGenerate.map((c) => c.type).join(', ')}`
  );
  console.log(
    `Estimated cost: ~$${(clipsToGenerate.length * 0.1).toFixed(2)} (at ~$0.10/clip)\n`
  );

  const results: { type: string; videoUrl: string; id: string }[] = [];
  const errors: { type: string; error: string }[] = [];

  // Generate sequentially to avoid rate limits
  for (const clip of clipsToGenerate) {
    try {
      const videoUrl = await generateClip(clip.type, clip.prompt);

      const saved = await prisma.animationClip.create({
        data: {
          characterId: aria.id,
          type: clip.type,
          videoUrl,
          duration: 5.0,
        },
      });

      results.push({ type: clip.type, videoUrl, id: saved.id });
      console.log(`  💾 Saved to database (${saved.id})\n`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`  ❌ Failed to generate "${clip.type}": ${message}\n`);
      errors.push({ type: clip.type, error: message });
    }
  }

  console.log('\n📊 Generation Summary:');
  console.log(`  ✅ Success: ${results.length}`);
  console.log(`  ❌ Failed: ${errors.length}`);
  if (results.length > 0) {
    console.log('\nGenerated clips:');
    for (const r of results) {
      console.log(`  - ${r.type}: ${r.videoUrl.substring(0, 80)}...`);
    }
  }
  if (errors.length > 0) {
    console.log('\nFailed clips:');
    for (const e of errors) {
      console.log(`  - ${e.type}: ${e.error}`);
    }
  }
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
