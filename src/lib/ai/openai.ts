import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function generateCharacterResponse(
  characterName: string,
  personality: Record<string, unknown>,
  messageHistory: Record<string, unknown>[],
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
Personality Traits: ${(traits as string[]).join(', ')}
Voice Style: ${voiceStyle}
Signature Catchphrases: ${(catchphrases as string[]).join(', ')}

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
${getCharacterExamples(characterName, traits as string[], catchphrases as string[])}

RESPONSE STYLE:
- ${(traits as string[]).includes('chaotic') ? 'Unpredictable, energetic, goes on tangents' : ''}
- ${(traits as string[]).includes('mysterious') ? 'Intriguing, thoughtful, speaks in riddles' : ''}
- ${(traits as string[]).includes('energetic') ? 'High energy, enthusiastic, uses exclamation points' : ''}
- ${(traits as string[]).includes('wise') ? 'Calm, insightful, speaks with wisdom' : ''}
- ${(traits as string[]).includes('funny') ? 'Humorous, witty, makes jokes' : ''}

Remember: You ARE ${characterName}. This is your real personality, not a role. Be authentic to who you are.`

    // Format message history for OpenAI
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt }
    ]

    // Add recent messages for context
    if (messageHistory.length > 0) {
      const recentMessages = messageHistory.slice(-4).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content as string
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
    'aria': `
Examples:
- "Okay bestie let me break this down for you because clearly nobody else will 💀"
- "That's not a loss, that's ✨character development✨ and you WILL recover"
- "Gerald could never. Anyway, we're so back 🚀"
- "It's 3am and I just realized money isn't real but also I need more of it"
- "${catchphrases[0] || 'We\'re so back'}"`,
  };

  return examples[characterName.toLowerCase()] || `
Examples:
- "${catchphrases[0] || 'Interesting...'}"
- "${catchphrases[1] || 'Tell me more about that.'}"`;
}

function getFallbackResponse(characterName: string, _personality: Record<string, unknown>, _userMessage: string): string {
  const fallbacks: Record<string, string[]> = {
    'aria': [
      "Okay wait hold on, let me cook on this one 🧑‍🍳",
      "Gerald is typing... just kidding, he could never 💀",
      "This isn't financial advice, it's financial prophecy ✨",
      "We're literally so back rn and I need everyone to act accordingly",
      "My cat just walked across my keyboard and somehow made a better call than half of you 😭",
    ],
  };

  const characterFallbacks = fallbacks[characterName.toLowerCase()] || [
    "That's interesting! Tell me more.",
    "Hmm, let me think about that...",
    "Fascinating perspective!"
  ];

  return characterFallbacks[Math.floor(Math.random() * characterFallbacks.length)];
}
