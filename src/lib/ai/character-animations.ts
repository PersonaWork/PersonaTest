// Animation types based on context
export type AnimationType = 'idle' | 'greeting' | 'talking' | 'excited' | 'celebrating' | 'thinking' | 'laughing' | 'scheming' | 'meditating' | 'teaching' | 'hyping' | 'dancing'

export async function generateCharacterAnimation(
    characterName: string,
    animationType: AnimationType,
    duration: number = 3
): Promise<string[]> {
    // Return fallback animation URL since Replicate API integration was removed
    return [`https://cdn.example.com/animations/${characterName}_${animationType}_${Date.now()}.mp4`]
}

// Get animation based on message content and character personality
export function selectAnimationFromMessage(
    characterName: string,
    personality: Record<string, unknown>,
    message: string
): AnimationType {
    const traits = Array.isArray(personality?.traits) ? personality.traits : []
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

    // Default to talking
    return 'talking'
}

// Generate animation for trading events
export function getTradingAnimation(tradeType: 'buy' | 'sell', characterName: string): AnimationType {
    if (tradeType === 'buy') {
        return characterName.toLowerCase() === 'rex' ? 'celebrating' : 'excited'
    } else {
        return 'thinking'
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
