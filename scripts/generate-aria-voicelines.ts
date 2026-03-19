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

// New Aria voice lines — chaotic internet personality, NO trading/money references
const ARIA_LINES = [
  {
    id: 'welcome',
    text: "Oh hey! You just walked into the most chaotic stream on the internet and honestly? You're welcome.",
  },
  {
    id: 'iconic',
    text: "I literally cannot stop being iconic. It's actually becoming a problem at this point.",
  },
  {
    id: 'vibes',
    text: "The vibes in here are absolutely immaculate right now and I need everyone to match my energy.",
  },
  {
    id: 'unhinged-idea',
    text: "Okay I just had the most unhinged idea and I need everyone to hear me out before they judge me.",
  },
  {
    id: 'main-character',
    text: "It's giving main character energy today and honestly? We deserve this. We've been through so much.",
  },
  {
    id: 'so-back',
    text: "We are so unbelievably back right now. Like I cannot stress enough how back we are.",
  },
  {
    id: 'chaos',
    text: "I need everyone to calm down. Actually no, never calm down. Chaos is literally our brand.",
  },
  {
    id: 'takes',
    text: "My takes are always correct. This is not up for debate. I will not be taking questions at this time.",
  },
  {
    id: 'chat-wild',
    text: "Someone in chat just said something absolutely unhinged and I need a moment to process this.",
  },
  {
    id: 'energy',
    text: "The energy in here right now is absolutely unmatched. This is what the internet was made for.",
  },
  {
    id: 'nonstop',
    text: "I've been going nonstop for hours and honestly? I have never felt more alive in my entire existence.",
  },
  {
    id: 'fun',
    text: "If you're not having fun right now that's a you problem because I am having the time of my life.",
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
