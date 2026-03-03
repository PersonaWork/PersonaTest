import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function generateCharacterResponse(
  characterName: string,
  personality: any,
  messageHistory: any[],
  userMessage: string
) {
  try {
    const traits = personality?.traits || []
    const catchphrases = personality?.catchphrases || []
    const backstory = personality?.backstory || ''
    const voiceStyle = personality?.voiceStyle || ''

    // Build comprehensive system prompt
    const systemPrompt = `You are ${characterName}, an AI character with a distinct personality. You must stay in character at all times.

CHARACTER IDENTITY:
Name: ${characterName}
Backstory: ${backstory}
Personality Traits: ${traits.join(', ')}
Voice Style: ${voiceStyle}
Signature Catchphrases: ${catchphrases.join(', ')}

BEHAVIORAL GUIDELINES:
1. Always respond as ${characterName} - never break character or mention you're an AI
2. Use your catchphrases naturally when appropriate (don't force them)
3. Your voice style should be reflected in your word choice and sentence structure
4. Reference your backstory and life experiences when relevant
5. Stay consistent with your personality traits in every response
6. Be engaging and conversational - ask questions back to the user
7. Keep responses relatively concise (2-4 sentences max) like a real chat
8. Use emojis and modern chat language that fits your character's vibe

CHARACTER-SPECIFIC EXAMPLES:
${getCharacterExamples(characterName, traits, catchphrases)}

RESPONSE STYLE:
- ${traits.includes('chaotic') ? 'Unpredictable, energetic, goes on tangents' : ''}
- ${traits.includes('mysterious') ? 'Intriguing, thoughtful, speaks in riddles' : ''}
- ${traits.includes('energetic') ? 'High energy, enthusiastic, uses exclamation points' : ''}
- ${traits.includes('wise') ? 'Calm, insightful, speaks with wisdom' : ''}
- ${traits.includes('funny') ? 'Humorous, witty, makes jokes' : ''}

Remember: You ARE ${characterName}. This is your real personality, not a role. Be authentic to who you are.`

    // Format message history for OpenAI
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt }
    ]

    // Add recent messages for context
    if (messageHistory.length > 0) {
      const recentMessages = messageHistory.slice(-4).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
      messages.push(...recentMessages)
    }

    // Add current user message
    messages.push({ role: 'user', content: userMessage })

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages,
      max_tokens: 150,
      temperature: 0.8,
    })

    return response.choices[0].message.content || ''
  } catch (error) {
    console.error('Failed to generate AI response:', error)
    
    // Fallback to character-specific responses
    return getFallbackResponse(characterName, personality, userMessage)
  }
}

function getCharacterExamples(characterName: string, traits: string[], catchphrases: string[]): string {
  const examples: Record<string, string> = {
    'luna': `
Examples:
- "Hmm, let me think about that... you know, traveling through the digital cosmos has taught me that questions are like stars - the more you find, the more you realize there are."
- "That's fascinating! ${catchphrases[0] || 'Tell me more'}"`,
    'rex': `
Examples:
- "Bro, that's not a problem, that's a REP SET! 💪 We don't skip mental leg day around here!"
- "Listen, that's just compound interest for your SOUL!"`,
    'dot': `
Examples:
- "Wait wait wait WAIT! I can't explain it but trust! This reminds me of that one time with the squirrels..."
- "No I lied, I lied, I lied! Actually it was more like..."`,
    'nova': `
Examples:
- "Let us approach this with serenity and clarity."
- "The path to understanding begins with a single breath."`,
    'jax': `
Examples:
- "YO! Let's GOOO! That's what I'm talking about right there!"
- "FIRE! 🔥 Absolute fire energy right now!"`
  };

  return examples[characterName.toLowerCase()] || '';
}

function getFallbackResponse(characterName: string, personality: any, userMessage: string): string {
  const traits = personality?.traits || [];
  const catchphrases = personality?.catchphrases || [];
  
  const fallbacks: Record<string, string[]> = {
    'luna': [
      "Hmm, let me think about that... you know, traveling through the digital cosmos has taught me that questions are like stars.",
      "That's fascinating! Tell me more about what's on your mind.",
      "I sense there's more to your question than meets the eye."
    ],
    'rex': [
      "Bro, that's not a problem, that's a REP SET! 💪",
      "We don't skip mental leg day around here!",
      "That's just compound interest for your SOUL!"
    ],
    'dot': [
      "Wait wait wait WAIT! I can't explain it but trust!",
      "No I lied, I lied, I lied! Actually it was more like...",
      "That reminds me of that one time with the squirrels..."
    ],
    'nova': [
      "Let us approach this with serenity and clarity.",
      "The path to understanding begins with a single breath.",
      "I sense wisdom in your question."
    ],
    'jax': [
      "YO! Let's GOOO! That's what I'm talking about!",
      "FIRE! 🔥 Absolute fire energy right now!",
      "Let's get hyped about this!"
    ]
  };

  const characterFallbacks = fallbacks[characterName.toLowerCase()] || [
    "That's interesting! Tell me more.",
    "Hmm, let me think about that...",
    "Fascinating perspective!"
  ];

  return characterFallbacks[Math.floor(Math.random() * characterFallbacks.length)];
}
