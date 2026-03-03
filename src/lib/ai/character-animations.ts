import Replicate from 'replicate'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
})

// Character-specific animation prompts for Replicate
const CHARACTER_ANIMATION_PROMPTS: Record<string, Record<string, string>> = {
  'luna': {
    idle: 'A mysterious ethereal AI character with long flowing silver hair, glowing blue eyes, wearing a futuristic cyberpunk outfit. She is sitting in a dimly lit room with holographic screens floating around her, looking thoughtful and serene. Cinematic lighting, sci-fi atmosphere, subtle floating particles.',
    greeting: 'A mysterious ethereal AI character with long flowing silver hair gently waves hello with a serene smile. Her glowing blue eyes sparkle as she acknowledges the viewer. Futuristic cyberpunk outfit, holographic background, cinematic sci-fi lighting.',
    talking: 'A mysterious ethereal AI character with long flowing silver hair speaks expressively, making gentle hand gestures. Her glowing blue eyes are focused and engaged. Futuristic cyberpunk outfit, holographic screens in background, cinematic sci-fi atmosphere.',
    excited: 'A mysterious ethereal AI character with long flowing silver hair looks excited and intrigued, leaning forward with wide glowing blue eyes. Small holographic particles float around her. Futuristic cyberpunk outfit, dynamic sci-fi lighting.',
    thinking: 'A mysterious ethereal AI character with long flowing silver hair looks thoughtful, tapping her chin with one finger. Her glowing blue eyes are distant and contemplative. Holographic screens show data streams. Futuristic cyberpunk outfit, moody sci-fi lighting.'
  },
  'rex': {
    idle: 'A muscular confident gym bro character with a buzz cut and intense focused expression. He is standing in a modern gym with weights and equipment in the background. Wearing athletic tank top and shorts, looking determined and powerful. Bright energetic lighting.',
    greeting: 'A muscular confident gym bro character gives an enthusiastic thumbs-up and a big smile, flexing one arm slightly. Standing in a modern gym with weights. Athletic tank top and shorts, high energy pose, bright gym lighting.',
    talking: 'A muscular confident gym bro character speaks passionately and energetically, making animated hand gestures. Standing in a modern gym, wearing athletic gear. Intense expression, dynamic pose, bright energetic lighting.',
    excited: 'A muscular confident gym bro character looks extremely excited, pumping both fists in the air with a huge grin. Standing in a modern gym with weights. Athletic wear, high energy action pose, dynamic lighting.',
    celebrating: 'A muscular confident gym bro character celebrates with both arms raised in victory pose, huge smile on his face. Standing in a modern gym. Athletic tank top and shorts, triumphant pose, bright energetic lighting.'
  },
  'dot': {
    idle: 'A chaotic energetic gremlin character with wild spiky hair, mischievous grin, and glowing yellow eyes. She is bouncing slightly on her feet, looking around curiously. Wearing colorful mismatched clothes, surrounded by playful chaos. Bright whimsical lighting.',
    greeting: 'A chaotic energetic gremlin character waves wildly with both hands, huge mischievous grin on her face. Wild spiky hair bouncing, glowing yellow eyes sparkling. Colorful mismatched clothes, playful chaotic energy, whimsical lighting.',
    talking: 'A chaotic energetic gremlin character talks animatedly, gesturing wildly with her hands and bouncing around. Wild spiky hair flying, glowing yellow eyes wide with excitement. Colorful mismatched clothes, chaotic energy, whimsical lighting.',
    laughing: 'A chaotic energetic gremlin character is laughing uncontrollably, doubling over with wild hair flying everywhere. Glowing yellow eyes squeezed shut, huge grin. Colorful mismatched clothes, surrounded by playful chaos, whimsical lighting.',
    scheming: 'A chaotic energetic gremlin character has a mischievous scheming expression, rubbing her hands together with a sly grin. Wild spiky hair, glowing yellow eyes narrowed. Colorful mismatched clothes, playful plotting pose, whimsical lighting.'
  },
  'nova': {
    idle: 'A serene wise AI character with long white hair in a neat bun, calm peaceful expression, and soft glowing purple eyes. She is meditating in a zen garden with cherry blossoms. Wearing elegant white robes, tranquil atmosphere, soft ethereal lighting.',
    greeting: 'A serene wise AI character with long white hair in a neat bun gives a gentle bow with hands pressed together. Soft peaceful smile, glowing purple eyes warm and welcoming. Elegant white robes, zen garden background, soft ethereal lighting.',
    talking: 'A serene wise AI character with long white hair in a bun speaks calmly and thoughtfully, making slow deliberate hand gestures. Soft glowing purple eyes focused and wise. Elegant white robes, tranquil zen atmosphere, ethereal lighting.',
    meditating: 'A serene wise AI character with long white hair in a bun sits in meditation pose, eyes closed peacefully. Soft glowing purple aura around her. Elegant white robes, zen garden with cherry blossoms, tranquil ethereal lighting.',
    teaching: 'A serene wise AI character with long white hair in a bun gestures gracefully while teaching, patient expression on her face. Soft glowing purple eyes filled with wisdom. Elegant white robes, tranquil background, ethereal lighting.'
  },
  'jax': {
    idle: 'A high-energy hype AI character with stylish dreadlocks, wearing trendy streetwear and sunglasses. He is bouncing to music, looking confident and cool. Urban graffiti background, vibrant neon lighting, hip-hop atmosphere.',
    greeting: 'A high-energy hype AI character with dreadlocks gives an enthusiastic two-finger salute with a huge grin. Trendy streetwear, sunglasses pushed up on his head. Urban graffiti background, vibrant neon lighting.',
    talking: 'A high-energy hype AI character with dreadlocks speaks passionately and rhythmically, making dynamic hand gestures. Trendy streetwear, confident expression. Urban graffiti background, vibrant neon lighting, hip-hop vibe.',
    hyping: 'A high-energy hype AI character with dreadlocks gets extremely hyped, arms raised in excitement, huge energetic grin. Trendy streetwear, dynamic action pose. Urban graffiti background, vibrant neon lighting, maximum energy.',
    dancing: 'A high-energy hype AI character with dreadlocks is dancing energetically, stylish streetwear moves, confident expression. Urban graffiti background, vibrant neon lighting, hip-hop dance atmosphere.'
  }
}

// Animation types based on context
export type AnimationType = 'idle' | 'greeting' | 'talking' | 'excited' | 'celebrating' | 'thinking' | 'laughing' | 'scheming' | 'meditating' | 'teaching' | 'hyping' | 'dancing'

export async function generateCharacterAnimation(
  characterName: string,
  animationType: AnimationType,
  duration: number = 3
): Promise<string[]> {
  try {
    const characterPrompts = CHARACTER_ANIMATION_PROMPTS[characterName.toLowerCase()]
    if (!characterPrompts) {
      throw new Error(`No animation prompts found for character: ${characterName}`)
    }

    const prompt = characterPrompts[animationType]
    if (!prompt) {
      throw new Error(`No animation prompt found for ${characterName} - ${animationType}`)
    }

    // Use Replicate to generate animation
    const output = await replicate.run(
      "stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb1ef16ab6560ff43b30f418ba664af98f8e2f462a",
      {
        input: {
          video_length: `${duration}_frames_with_stabilization`,
          conditioning_video_length: "14_frames_with_stabilization", 
          motion_bucket_id: 127,
          fps: 8,
          width: 512,
          height: 512,
          seed: Math.floor(Math.random() * 1000000),
          prompt: prompt,
          video_input: null,
          image_input: null
        }
      }
    )

    return output as string[]
  } catch (error) {
    console.error('Failed to generate animation:', error)
    // Return fallback animation URL
    return [`https://cdn.example.com/animations/${characterName}_${animationType}_${Date.now()}.mp4`]
  }
}

// Get animation based on message content and character personality
export function selectAnimationFromMessage(
  characterName: string, 
  personality: any,
  message: string
): AnimationType {
  const traits = personality?.traits || []
  const messageLower = message.toLowerCase()

  // Greeting patterns
  if (messageLower.includes('hello') || messageLower.includes('hi') || messageLower.includes('hey')) {
    return 'greeting'
  }

  // Excitement patterns
  if (messageLower.includes('!') || messageLower.includes('wow') || messageLower.includes('amazing')) {
    return traits.includes('energetic') ? 'hyping' : 'excited'
  }

  // Question patterns
  if (messageLower.includes('?') || messageLower.includes('how') || messageLower.includes('what') || messageLower.includes('why')) {
    return traits.includes('wise') ? 'teaching' : 'thinking'
  }

  // Humor/laughter patterns
  if (messageLower.includes('lol') || messageLower.includes('haha') || messageLower.includes('funny')) {
    return traits.includes('chaotic') ? 'laughing' : 'excited'
  }

  // Character-specific patterns
  if (characterName.toLowerCase() === 'rex' && (messageLower.includes('gym') || messageLower.includes('workout'))) {
    return 'celebrating'
  }

  if (characterName.toLowerCase() === 'dot' && (messageLower.includes('chaos') || messageLower.includes('crazy'))) {
    return 'scheming'
  }

  if (characterName.toLowerCase() === 'nova' && (messageLower.includes('calm') || messageLower.includes('peace'))) {
    return 'meditating'
  }

  if (characterName.toLowerCase() === 'jax' && (messageLower.includes('music') || messageLower.includes('dance'))) {
    return 'dancing'
  }

  // Default to talking animation
  return 'talking'
}

// Generate animation for trading events
export function getTradingAnimation(tradeType: 'buy' | 'sell', characterName: string): AnimationType {
  if (tradeType === 'buy') {
    return characterName.toLowerCase() === 'rex' ? 'celebrating' : 'excited'
  } else {
    return 'thinking' // More thoughtful for selling
  }
}

// Generate animation for milestones
export function getMilestoneAnimation(milestone: string, characterName: string): AnimationType {
  switch (milestone) {
    case 'first_shareholder':
      return 'celebrating'
    case 'price_target':
      return characterName.toLowerCase() === 'jax' ? 'hyping' : 'excited'
    case 'revenue_goal':
      return 'celebrating'
    default:
      return 'excited'
  }
}
