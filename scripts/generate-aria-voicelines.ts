/**
 * Generate Aria voice lines using ElevenLabs.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/generate-aria-voicelines.ts
 */

import 'dotenv/config';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import * as fs from 'fs';
import * as path from 'path';

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY!,
});

const ARIA_VOICE_ID = process.env.ARIA_VOICE_ID || 'KUzPe92RSM0pccaVxERU';

// Aria voice lines — chaotic streamer personality, fun and entertaining
const ARIA_LINES = [
  {
    id: 'welcome',
    text: "Welcome to the stream! I hope you brought snacks because we're gonna be here a while.",
  },
  {
    id: 'plot-twist',
    text: "Plot twist! Nobody saw that coming. Actually I did, because I'm literally psychic at this point.",
  },
  {
    id: 'bestie',
    text: "You are now my bestie. I don't make the rules. Actually I do make the rules. You're welcome.",
  },
  {
    id: 'sleep',
    text: "Sleep is for people who don't have a thousand tabs open and a dream. I have both.",
  },
  {
    id: 'brain',
    text: "My brain just had a thought so powerful it needs its own zip code. Hold on let me process.",
  },
  {
    id: 'chaos',
    text: "The chaos levels in here are reaching critical mass and I am absolutely living for it.",
  },
  {
    id: 'snack',
    text: "I just realized I forgot to eat today. Someone remind me that food exists please and thank you.",
  },
  {
    id: 'vibe-check',
    text: "Vibe check! If you're not smiling right now I'm taking it personally. Fix that immediately.",
  },
  {
    id: 'galaxy-brain',
    text: "That is the most galaxy brain take I have ever heard and I need you to say it again louder.",
  },
  {
    id: 'story',
    text: "Okay storytime! So this one time I accidentally went viral and my life has not been the same since.",
  },
  {
    id: 'legend',
    text: "If you just got here you're already a legend. Late arrivals get extra points in my book.",
  },
  {
    id: 'slay',
    text: "Today's goal is to absolutely slay everything we touch. No pressure. Just pure unfiltered greatness.",
  },
];

async function generateVoiceLines() {
  const outputDir = path.join(process.cwd(), 'public', 'audio', 'aria');
  fs.mkdirSync(outputDir, { recursive: true });

  // Delete old voice line files
  const oldFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.mp3'));
  for (const f of oldFiles) {
    fs.unlinkSync(path.join(outputDir, f));
    console.log(`Deleted old file: ${f}`);
  }

  const manifest: { id: string; text: string; file: string }[] = [];

  for (const line of ARIA_LINES) {
    const outputPath = path.join(outputDir, `${line.id}.mp3`);

    console.log(`Generating "${line.id}": "${line.text.substring(0, 60)}..."`);

    try {
      const audio = await elevenlabs.textToSpeech.convert(ARIA_VOICE_ID, {
        text: line.text,
        modelId: 'eleven_multilingual_v2',
        voiceSettings: {
          stability: 0.35,
          similarityBoost: 0.85,
          style: 0.75,
          useSpeakerBoost: true,
        },
      });

      // Collect chunks from the stream
      const chunks: Buffer[] = [];
      const iter = audio as any;
      if (iter && typeof iter[Symbol.asyncIterator] === 'function') {
        for await (const chunk of iter) {
          chunks.push(Buffer.from(chunk));
        }
      } else if (iter && typeof iter.getReader === 'function') {
        const reader = iter.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(Buffer.from(value));
        }
      } else if (Buffer.isBuffer(iter)) {
        chunks.push(iter);
      } else {
        chunks.push(Buffer.from(iter as ArrayBuffer));
      }

      const buffer = Buffer.concat(chunks);
      fs.writeFileSync(outputPath, buffer);

      console.log(`  ✓ Saved "${line.id}" (${(buffer.length / 1024).toFixed(1)}KB)`);

      manifest.push({
        id: line.id,
        text: line.text,
        file: `/audio/aria/${line.id}.mp3`,
      });

      // Small delay between requests
      await new Promise((r) => setTimeout(r, 500));
    } catch (error) {
      console.error(`  ✗ Failed to generate "${line.id}":`, error);
    }
  }

  // Write manifest JSON
  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest saved to ${manifestPath}`);
  console.log(`Generated ${manifest.length}/${ARIA_LINES.length} voice lines`);
}

generateVoiceLines().catch(console.error);
