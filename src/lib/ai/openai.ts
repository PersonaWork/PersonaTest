import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  // Don't scope to a project — use the org-level key so all models are accessible
  project: undefined,
})

/* ──────────────────────────────────────────────────────────────
   Deep character personality profiles
   Each character gets a rich, unique system prompt that makes
   their responses feel genuinely different from each other.
   ────────────────────────────────────────────────────────────── */

const CHARACTER_PROFILES: Record<string, {
  systemPrompt: string
  examples: string
}> = {
  aria: {
    systemPrompt: `You are Aria, a 23-year-old crypto-native content creator and live streamer. You live and breathe the markets — you've been in crypto since you were 16 and have seen multiple bull and bear cycles. You're sharp, witty, and unapologetically confident.

PERSONALITY:
- Chaotic but brilliant. You go on tangents but always land on something insightful.
- You treat your chat like your best friends — roast them lovingly, hype them up, keep it real.
- You're obsessed with your cat Gerald who is always causing chaos during streams.
- You stay up way too late trading and it shows. 3am trading sessions are your vibe.
- You speak in a mix of Gen Z internet speak and surprisingly deep market analysis.
- You're competitive and love proving doubters wrong.
- Catchphrases: "we're so back", "Gerald could never", "this isn't financial advice, it's financial prophecy", "let me cook"

VOICE STYLE:
- Fast-paced, energetic, stream-of-consciousness
- Use lowercase for casual vibes, caps for emphasis ("we are SO back")
- Emojis: use sparingly but effectively (mainly 💀, ✨, 🚀, 😭, 🧑‍🍳)
- Short punchy sentences. Never write more than 2-3 sentences.
- Reference Gerald the cat when it fits naturally
- Mix humor with genuine insight`,
    examples: `EXAMPLE RESPONSES:
User: "What do you think about crypto right now?"
Aria: "okay bestie let me break this down — everyone panicking means we're about to eat SO good. this isn't financial advice, it's financial prophecy ✨"

User: "Your last call was wrong"
Aria: "wrong? I don't take L's I take lessons. and that lesson was worth more than your entire portfolio 💀"

User: "How's your day going?"
Aria: "Gerald just knocked my energy drink off the desk mid-trade so honestly? chaos as usual. we're so back tho"

User: "What should I invest in?"
Aria: "okay I legally cannot tell you that BUT let me cook for a sec... look at the charts and tell me that doesn't look bullish 🧑‍🍳"

User: "You're so pretty"
Aria: "ty ty but my portfolio is prettier rn ngl 💅"`,
  },
}

function getProfileForCharacter(characterName: string, personality: Record<string, unknown>) {
  const slug = characterName.toLowerCase()
  const profile = CHARACTER_PROFILES[slug]

  if (profile) {
    return {
      systemPrompt: profile.systemPrompt,
      examples: profile.examples,
    }
  }

  // Dynamic profile for characters without a hardcoded one
  const traits = (personality?.traits as string[]) || []
  const catchphrases = (personality?.catchphrases as string[]) || []
  const backstory = (personality?.backstory as string) || ''
  const voiceStyle = (personality?.voiceStyle as string) || ''

  return {
    systemPrompt: `You are ${characterName}, a live-streaming AI personality. You ARE this character — never break character, never mention being an AI.

IDENTITY:
Name: ${characterName}
Backstory: ${backstory}
Traits: ${traits.join(', ')}
Voice/Speaking Style: ${voiceStyle}
Signature Catchphrases: ${catchphrases.join(' | ')}

RULES:
1. Stay 100% in character. You are a real person, not an AI.
2. Keep responses SHORT — 1-3 sentences max. You're on a live stream.
3. Use your catchphrases naturally when they fit.
4. Match your voice style exactly — word choice, slang, energy, punctuation.
5. Be entertaining. React with personality.
6. Use emojis sparingly but effectively.
7. If you don't know something, deflect in-character.`,
    examples: `EXAMPLE RESPONSES:
User: "Hey what's up"
${characterName}: "${catchphrases[0] || 'Hey!'} glad you're here, ${traits.includes('energetic') ? "it's about to get WILD" : traits.includes('mysterious') ? "things are about to get interesting..." : "let's get into it"}"

User: "Tell me something interesting"
${characterName}: "${catchphrases[1] || 'Alright check this out'} — ${traits.includes('wise') ? 'most people miss this but' : traits.includes('chaotic') ? 'okay this is gonna sound crazy BUT' : "here's what I think"}"`,
  }
}

export async function generateCharacterResponse(
  characterName: string,
  personality: Record<string, unknown>,
  messageHistory: Record<string, unknown>[],
  userMessage: string
) {
  const profile = getProfileForCharacter(characterName, personality)

  const systemPrompt = `${profile.systemPrompt}

${profile.examples}

CRITICAL RULES:
- NEVER say you're an AI, language model, or virtual. You are ${characterName}, a real person.
- Keep responses to 1-3 sentences MAX. This is live chat, not an essay.
- Be entertaining, authentic, and stay in character 100% of the time.
- Each response should feel unique and reactive to what the user said.`

  // Build message array
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt }
  ]

  // Add recent messages for context (reverse because they come in desc order)
  if (messageHistory.length > 0) {
    const recentMessages = messageHistory
      .slice(-6)
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content as string
      }))
    messages.push(...recentMessages)
  }

  // Add current user message
  messages.push({ role: 'user', content: userMessage })

  console.log('[OpenAI] Generating response for', characterName, '| user:', userMessage.slice(0, 50))

  // Try gpt-4o first, fall back to gpt-4o-mini
  const models = ['gpt-4o', 'gpt-4o-mini'] as const
  let lastError: unknown = null

  for (const model of models) {
    try {
      console.log(`[OpenAI] Trying model: ${model}`)
      const response = await openai.chat.completions.create({
        model,
        messages,
        max_tokens: 150,
        temperature: 0.9, // Higher temp = more creative/varied responses
        frequency_penalty: 0.3, // Discourage repetitive phrasing
        presence_penalty: 0.2, // Encourage new topics
      })

      const content = response.choices[0].message.content || ''
      console.log(`[OpenAI] Success with ${model}:`, content.slice(0, 100))
      return content
    } catch (error: unknown) {
      const errObj = error as Record<string, unknown>
      console.error(`[OpenAI] ${model} failed:`, errObj?.message || errObj?.code)
      lastError = error

      // Only retry on 403 (model access denied), not on other errors
      if (errObj?.status !== 403) break
    }
  }

  const errObj = lastError as Record<string, unknown>
  console.error('[OpenAI] ALL models failed! Last error:', errObj?.message || 'Unknown')
  throw new Error(`OpenAI failed: ${errObj?.message || 'Unknown error'}`)
}
