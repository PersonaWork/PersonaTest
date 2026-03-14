import 'dotenv/config';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import * as fs from 'fs';
import * as path from 'path';

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY!,
});

const ARIA_VOICE_ID = process.env.ARIA_VOICE_ID || 'KUzPe92RSM0pccaVxERU';

// Aria's ambient voice lines — short, punchy, personality-packed
const ARIA_LINES = [
  {
    id: 'welcome',
    text: "Oh hey! Welcome to the stream, you're just in time because things are about to get chaotic and I am absolutely here for it.",
  },
  {
    id: 'charts-spicy',
    text: "Okay okay okay, the charts are looking absolutely spicy right now and I need everyone to act accordingly.",
  },
  {
    id: 'alpha-drop',
    text: "Not gonna lie, I just had the craziest alpha download and I literally cannot keep this to myself.",
  },
  {
    id: 'gerald',
    text: "Gerald thinks he can out-trade me. Gerald. Please. That man couldn't trade his way out of a paper bag.",
  },
  {
    id: 'main-character',
    text: "It's giving main character energy today and honestly? We deserve this. We've been through so much.",
  },
  {
    id: 'buy-more',
    text: "Hear me out, hear me out. What if we just... bought more? Revolutionary strategy, I know.",
  },
  {
    id: 'vibes',
    text: "The vibes in here are absolutely immaculate right now. We're so back. We were never gone actually.",
  },
  {
    id: 'staring',
    text: "I've been staring at this chart for like three hours and honestly? I think I've achieved some form of financial enlightenment.",
  },
  {
    id: 'prophecy',
    text: "This is not financial advice. This is financial prophecy. There is a very important difference.",
  },
  {
    id: 'three-am',
    text: "It's giving three AM thoughts right now but like, what if money isn't even real? Anyway, we need more of it.",
  },
  {
    id: 'so-back',
    text: "We are so unbelievably back right now. Like I cannot stress enough how back we are.",
  },
  {
    id: 'cat',
    text: "My cat just walked across my keyboard and somehow made a better trade than half the people in my mentions. I can't even be mad.",
  },
];

async function generateVoiceLines() {
  const outputDir = path.join(process.cwd(), 'public', 'audio', 'aria');
  fs.mkdirSync(outputDir, { recursive: true });

  const manifest: { id: string; text: string; file: string; duration?: number }[] = [];

  for (const line of ARIA_LINES) {
    const outputPath = path.join(outputDir, `${line.id}.mp3`);

    if (fs.existsSync(outputPath)) {
      console.log(`Skipping "${line.id}" (already exists)`);
      const stat = fs.statSync(outputPath);
      manifest.push({
        id: line.id,
        text: line.text,
        file: `/audio/aria/${line.id}.mp3`,
        duration: Math.round(stat.size / 16000), // rough estimate
      });
      continue;
    }

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
      if (audio && typeof (audio as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] === 'function') {
        for await (const chunk of audio as AsyncIterable<Uint8Array>) {
          chunks.push(Buffer.from(chunk));
        }
      } else if (audio instanceof ReadableStream) {
        const reader = (audio as ReadableStream<Uint8Array>).getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(Buffer.from(value));
        }
      } else if (Buffer.isBuffer(audio)) {
        chunks.push(audio);
      } else {
        // Try treating as a buffer-like
        chunks.push(Buffer.from(audio as ArrayBuffer));
      }

      const buffer = Buffer.concat(chunks);
      fs.writeFileSync(outputPath, buffer);

      console.log(`  Saved "${line.id}" (${(buffer.length / 1024).toFixed(1)}KB)`);

      manifest.push({
        id: line.id,
        text: line.text,
        file: `/audio/aria/${line.id}.mp3`,
      });

      // Small delay between requests to be nice to the API
      await new Promise((r) => setTimeout(r, 500));
    } catch (error) {
      console.error(`  Failed to generate "${line.id}":`, error);
    }
  }

  // Write manifest JSON
  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest saved to ${manifestPath}`);
  console.log(`Generated ${manifest.length} voice lines`);
}

generateVoiceLines().catch(console.error);
