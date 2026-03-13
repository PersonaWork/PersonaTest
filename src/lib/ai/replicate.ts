import Replicate from 'replicate';

let replicateClient: Replicate | null = null;

function getReplicateClient(): Replicate {
  if (replicateClient) return replicateClient;

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error('REPLICATE_API_TOKEN is not set');
  }

  replicateClient = new Replicate({ auth: token });
  return replicateClient;
}

/**
 * Animation prompts for each animation type.
 * These describe what Aria should be doing in the generated video.
 * Aria: Young woman, neon-lit penthouse, chaotic trader energy, expressive, stylish.
 */
const ARIA_STYLE = 'a stylish young woman with glowing neon highlights in her hair, sitting at a desk surrounded by holographic trading screens and monitors in a dark neon-lit penthouse, energy drink cans on desk, moody cinematic lighting, cyberpunk aesthetic';

const ANIMATION_PROMPTS: Record<string, string> = {
  idle: `${ARIA_STYLE}, leaning back in her chair casually scrolling through charts, occasionally glancing at camera with a slight smirk, ambient neon glow, relaxed confident energy`,
  greeting: `${ARIA_STYLE}, looking at camera and giving a cool wave with a big confident grin, leaning forward like she's about to drop a secret, welcoming energy`,
  talking: `${ARIA_STYLE}, talking animatedly to camera with expressive hand gestures, pointing at charts behind her, engaged and passionate, like she's explaining the most important thing ever`,
  excited: `${ARIA_STYLE}, eyes going wide as she sees something on screen, jumping up from chair, pumping her fist, pure electric excitement, screens flashing green behind her`,
  celebrating: `${ARIA_STYLE}, standing up throwing her arms in the air victoriously, huge smile, charts showing green candles in background, triumphant energy, confetti-like particles`,
  thinking: `${ARIA_STYLE}, leaning back with hand on chin, squinting at a complex chart, deep in thought, screens casting blue light on her face, contemplative genius energy`,
  laughing: `${ARIA_STYLE}, leaning forward laughing hard at something on screen, genuine amusement, almost falling out of chair, infectious joyful energy`,
  scheming: `${ARIA_STYLE}, rubbing hands together with a mischievous grin, eyes narrowing like she just found an alpha play, devious purple neon lighting, plotting energy`,
  meditating: `${ARIA_STYLE}, eyes closed in mock-meditation pose at her desk, screens dimmed behind her, peaceful but with a slight smirk, zen trader energy, soft ambient glow`,
  teaching: `${ARIA_STYLE}, pointing at a holographic chart while looking at camera, professor-like explaining gesture, confident teacher energy, charts and data floating around her`,
  hyping: `${ARIA_STYLE}, standing up from desk hyping up an imaginary crowd, arms raised high, shouting with pure energy, screens flashing behind her, maximum hype energy`,
  dancing: `${ARIA_STYLE}, vibing and dancing at her desk to music, head bobbing, grooving with green candles on screens behind her, pure positive trading energy`,
};

/**
 * Generate an animation clip for a character using Replicate minimax/video-01.
 * This is a batch operation — called by admins to pre-generate clips,
 * NOT during normal user browsing.
 */
export async function generateAnimationClip(
  characterName: string,
  animationType: string,
  characterDescription?: string
): Promise<string> {
  const replicate = getReplicateClient();

  const basePrompt = ANIMATION_PROMPTS[animationType] || ANIMATION_PROMPTS.idle;
  const prompt = `${characterName}, an AI character${characterDescription ? ` (${characterDescription})` : ''}: ${basePrompt}. High quality, smooth animation, cinematic lighting, dark moody background.`;

  const output = await replicate.run('minimax/video-01', {
    input: {
      prompt,
      prompt_optimizer: true,
    },
  });

  // Replicate returns a URL string for video models
  if (typeof output === 'string') {
    return output;
  }

  // Some models return a FileOutput or array
  if (output && typeof output === 'object' && 'url' in (output as Record<string, unknown>)) {
    return (output as { url: string }).url;
  }

  // If it's an array, take the first element
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && 'url' in first) return first.url;
  }

  throw new Error(`Unexpected output format from Replicate: ${JSON.stringify(output)}`);
}

export const ANIMATION_TYPES = Object.keys(ANIMATION_PROMPTS);
