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
 * These describe what the character should be doing in the generated video.
 */
const ANIMATION_PROMPTS: Record<string, string> = {
  idle: 'A character sitting calmly, slightly swaying, blinking naturally, relaxed ambient mood, soft lighting',
  greeting: 'A character waving hello enthusiastically, warm smile, welcoming gesture',
  talking: 'A character talking animatedly, hand gestures while speaking, engaged expression',
  excited: 'A character jumping with excitement, wide eyes, pumping fists, energetic movement',
  celebrating: 'A character celebrating a victory, throwing confetti, dancing joyfully',
  thinking: 'A character in deep thought, hand on chin, looking up, contemplative expression',
  laughing: 'A character laughing heartily, head tilted back, genuine amusement',
  scheming: 'A character rubbing hands together with a mischievous grin, plotting something',
  meditating: 'A character sitting in meditation pose, eyes closed, peaceful aura, floating particles',
  teaching: 'A character pointing at an invisible board, explaining something, professor-like gestures',
  hyping: 'A character hyping up a crowd, arms raised high, shouting with energy',
  dancing: 'A character doing a fun dance, rhythmic movement, grooving to music',
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
