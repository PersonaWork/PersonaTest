import { fal } from '@fal-ai/client';

/* ─── Configure fal client ─── */
// Reads FAL_KEY from environment automatically

/**
 * Aria style prompt prefix.
 * Describes the character's appearance for consistent clip generation.
 */
const ARIA_STYLE =
  'a stylish young woman with glowing neon highlights in her hair, sitting at a desk surrounded by holographic trading screens and monitors in a dark neon-lit penthouse, energy drink cans on desk, moody cinematic lighting, cyberpunk aesthetic';

/**
 * Animation prompts for each animation type.
 * Describes what Aria should be doing in the generated video.
 */
export const ANIMATION_PROMPTS: Record<string, string> = {
  // Idle / breathing clips
  'idle-breathe': `${ARIA_STYLE}, breathing gently, very subtle movement, shoulders rising and falling softly, relaxed and calm, ambient neon glow illuminating her face, nearly still with only minimal natural motion`,
  'idle-look': `${ARIA_STYLE}, slowly glancing around her monitors, subtle head movement, eyes scanning holographic charts, calm contemplative mood, gentle ambient lighting shifts`,
  'idle-ambient': `${ARIA_STYLE}, sitting still at her desk, ambient neon lights slowly pulsing, holographic screens casting soft light on her face, very minimal movement, peaceful trader in her element`,
  'idle-blink': `${ARIA_STYLE}, sitting calmly, natural blinking, very slight head tilt, relaxed expression, screens glowing softly behind her, breathing naturally`,

  // Talking clips
  'talk-hype': `${ARIA_STYLE}, talking excitedly to camera with wide eyes and energetic hand gestures, hyping up the audience, passionate and animated, leaning forward with intensity`,
  'talk-explain': `${ARIA_STYLE}, explaining something calmly to camera, thoughtful hand gestures, pointing at charts behind her, teacher-like energy, articulate and engaging`,
  'talk-gossip': `${ARIA_STYLE}, leaning in close to camera conspiratorially, whispering with a sly grin, hand beside mouth, sharing a secret, playful energy`,
  'talk-rant': `${ARIA_STYLE}, talking passionately to camera, animated gestures, shaking her head, expressive and dramatic`,
  'talk-chill': `${ARIA_STYLE}, talking casually to camera, relaxed posture, slight smile, laid-back vibes, one hand gesturing lazily, easygoing conversation`,

  // Reaction clips
  'excited-pump': `${ARIA_STYLE}, pumping her fist in excitement, eyes wide, huge grin, celebrating a big win, screens flashing green behind her, electric energy`,
  'excited-yes': `${ARIA_STYLE}, nodding enthusiastically, bright smile, clapping hands together once, positive affirmation energy, triumphant`,
  'laugh-natural': `${ARIA_STYLE}, laughing genuinely, head tilted back slightly, natural joyful expression, eyes crinkling, warm authentic laughter`,
  'laugh-suppressed': `${ARIA_STYLE}, trying to suppress a laugh, hand over mouth, eyes sparkling with amusement, shoulders shaking, barely containing herself`,
  'think-deep': `${ARIA_STYLE}, hand on chin deep in thought, squinting at a complex chart, analytical expression, screens casting blue light on her face, genius at work`,
  'scheme-plot': `${ARIA_STYLE}, rubbing hands together with a mischievous grin, eyes narrowing, purple neon lighting, devious plotting energy, about to make a big move`,
  'celebrate-win': `${ARIA_STYLE}, throwing arms up in victory, huge triumphant smile, standing from chair, screens showing green candles, pure celebration energy`,
  'react-shock': `${ARIA_STYLE}, jaw dropping in shock, eyes going wide, leaning back in surprise, hand to chest, dramatic reaction to something unexpected`,
  'react-eyeroll': `${ARIA_STYLE}, rolling her eyes dramatically, slight head shake, amused exasperation, leaning back in chair, dismissive but playful`,
  'vibe-groove': `${ARIA_STYLE}, vibing and grooving at her desk, head bobbing to music, shoulders moving, relaxed happy energy, green candles on screens`,
  'vibe-dance': `${ARIA_STYLE}, dancing at her desk with more energy, arms moving, feeling the music, joyful and free, neon lights pulsing with the rhythm`,
};

export const ANIMATION_TYPES = Object.keys(ANIMATION_PROMPTS);

type VideoModel = 'veo3' | 'kling';

/**
 * Generate an animation clip using fal.ai.
 * Supports Veo 3 and Kling 2.1 models.
 *
 * @param imageUrl - Public URL of the portrait image (first frame)
 * @param animationType - Key from ANIMATION_PROMPTS
 * @param characterName - Character name for prompt context
 * @param model - Which model to use ('veo3' or 'kling')
 * @returns URL of the generated video and its duration
 */
export async function generateAnimationClip(
  imageUrl: string,
  animationType: string,
  characterName: string = 'Aria',
  model: VideoModel = 'kling'
): Promise<{ videoUrl: string; duration: number }> {
  const basePrompt = ANIMATION_PROMPTS[animationType] || ANIMATION_PROMPTS['idle-breathe'];
  const prompt = `${characterName}: ${basePrompt}. High quality, smooth natural motion, cinematic lighting, dark moody background.`;

  if (model === 'veo3') {
    return generateWithVeo3(imageUrl, prompt);
  }
  return generateWithKling(imageUrl, prompt);
}

async function generateWithVeo3(imageUrl: string, prompt: string): Promise<{ videoUrl: string; duration: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (fal as any).subscribe('fal-ai/veo3/image-to-video', {
    input: {
      prompt,
      image_url: imageUrl,
      duration: '8s',
      aspect_ratio: '16:9',
      resolution: '720p',
      generate_audio: false,
    },
    logs: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onQueueUpdate(update: any) {
      if (update.status === 'IN_QUEUE') console.log(`  ⏳ Queue position: ${update.queue_position ?? '...'}`);
      else if (update.status === 'IN_PROGRESS') console.log(`  🔄 Generating (Veo 3)...`);
    },
  });

  const data = result.data as { video?: { url: string } };
  if (!data?.video?.url) throw new Error(`Unexpected Veo 3 output: ${JSON.stringify(data)}`);

  return { videoUrl: data.video.url, duration: 8.0 };
}

async function generateWithKling(imageUrl: string, prompt: string): Promise<{ videoUrl: string; duration: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (fal as any).subscribe('fal-ai/kling-video/v2.1/standard/image-to-video', {
    input: {
      prompt,
      image_url: imageUrl,
      duration: '10',
      negative_prompt: 'blur, distort, low quality, deformed, ugly',
      cfg_scale: 0.5,
    },
    logs: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onQueueUpdate(update: any) {
      if (update.status === 'IN_QUEUE') console.log(`  ⏳ Queue position: ${update.queue_position ?? '...'}`);
      else if (update.status === 'IN_PROGRESS') console.log(`  🔄 Generating (Kling)...`);
    },
  });

  const data = result.data as { video?: { url: string } };
  if (!data?.video?.url) throw new Error(`Unexpected Kling output: ${JSON.stringify(data)}`);

  return { videoUrl: data.video.url, duration: 10.0 };
}

/**
 * Upload a local file to fal.ai storage.
 * Returns a public URL that can be used as input for generation.
 */
export async function uploadToFalStorage(filePath: string): Promise<string> {
  const fs = await import('fs');
  const path = await import('path');

  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const mimeType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const file = new File([fileBuffer], fileName, { type: mimeType });
  const url = await fal.storage.upload(file);
  return url;
}
