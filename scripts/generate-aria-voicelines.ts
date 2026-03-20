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

// Aria voice lines — chaotic day trader streamer, high energy
const ARIA_LINES = [
  {
    id: 'welcome',
    text: "Welcome to the stream! Charts are looking spicy today and I am ready to make some moves.",
  },
  {
    id: 'green',
    text: "Oh we are so green right now. I told you. I literally told all of you this was the play.",
  },
  {
    id: 'dip',
    text: "Buy the dip they said. It'll be fun they said. And you know what? They were right. Again.",
  },
  {
    id: 'candles',
    text: "These candles are beautiful. I could stare at a green candle all day. It's literally art.",
  },
  {
    id: 'calls',
    text: "My calls have been hitting different lately. I'm not saying I'm a genius but I'm not not saying it.",
  },
  {
    id: 'chart',
    text: "Hold on let me pull up this chart real quick because what I'm about to show you is insane.",
  },
  {
    id: 'diamond',
    text: "Diamond hands don't even begin to describe it. I have diamond everything at this point.",
  },
  {
    id: 'morning',
    text: "Pre-market looking absolutely gorgeous today. I woke up and chose profits apparently.",
  },
  {
    id: 'moon',
    text: "We are going to the moon. Actually forget the moon we're going past it. Next stop Mars.",
  },
  {
    id: 'setup',
    text: "The setup is literally perfect right now. If you're not paying attention you're missing out.",
  },
  {
    id: 'vibes',
    text: "The vibes in here are immaculate. Good trades, good people, good energy. This is what we do.",
  },
  {
    id: 'legend',
    text: "If you just joined, welcome legend. Pull up a chart and get comfortable because we're just getting started.",
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
