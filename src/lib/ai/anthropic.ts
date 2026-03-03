import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
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

    // Build system prompt
    const systemPrompt = `You are ${characterName}. ${backstory}
    
Your personality traits: ${traits.join(', ')}
Your catchphrases (use naturally): ${catchphrases.join(', ')}
Your voice style: ${voiceStyle}

Stay in character at all times. Never break character. Respond naturally as ${characterName} would.`

    // Format message history for Claude
    const messages: { role: 'user' | 'assistant'; content: string }[] = [
      { role: 'user', content: userMessage }
    ]

    // Add some context from recent messages
    if (messageHistory.length > 0) {
      const recentMessages = messageHistory.slice(-4).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
      messages.unshift(...recentMessages)
    }

    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 500,
      temperature: 0.7,
      system: systemPrompt,
      messages: messages
    })

    return response.content[0].type === 'text' ? response.content[0].text : ''
  } catch (error) {
    console.error('Failed to generate AI response:', error)
    
    // Fallback to simple response
    const fallbackResponses = [
      `That's interesting! As someone who is ${personality?.traits?.[0] || 'unique'}, I see things differently.`,
      `Hmm, let me think about that...`,
      `You know, that reminds me of something...`,
      `Fascinating perspective! Tell me more.`
    ]
    
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]
  }
}
