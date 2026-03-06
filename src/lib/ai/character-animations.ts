// Animation types based on context
export type AnimationType = 'idle' | 'greeting' | 'talking' | 'excited' | 'celebrating' | 'thinking' | 'laughing' | 'scheming' | 'meditating' | 'teaching' | 'hyping' | 'dancing';

// Get animation based on message content and character personality
export function selectAnimationFromMessage(
    characterName: string,
    personality: Record<string, unknown>,
    message: string
): AnimationType {
    const traits = Array.isArray(personality?.traits) ? personality.traits : [];
    const messageLower = message.toLowerCase();

    if (messageLower.includes('hello') || messageLower.includes('hi') || messageLower.includes('hey')) {
        return 'greeting';
    }

    if (messageLower.includes('!') || messageLower.includes('wow') || messageLower.includes('amazing')) {
        return traits.includes('energetic') ? 'hyping' : 'excited';
    }

    if (messageLower.includes('?') || messageLower.includes('how') || messageLower.includes('what') || messageLower.includes('why')) {
        return traits.includes('wise') ? 'teaching' : 'thinking';
    }

    if (messageLower.includes('lol') || messageLower.includes('haha') || messageLower.includes('funny')) {
        return traits.includes('chaotic') ? 'laughing' : 'excited';
    }

    return 'talking';
}

// Generate animation type for trading events
export function getTradingAnimation(tradeType: 'buy' | 'sell', characterName: string): AnimationType {
    if (tradeType === 'buy') {
        return characterName.toLowerCase() === 'rex' ? 'celebrating' : 'excited';
    }
    return 'thinking';
}

// Generate animation type for milestones
export function getMilestoneAnimation(milestone: string, characterName: string): AnimationType {
    switch (milestone) {
        case 'first_shareholder':
            return 'celebrating';
        case 'price_target':
            return characterName.toLowerCase() === 'jax' ? 'hyping' : 'excited';
        case 'revenue_goal':
            return 'celebrating';
        default:
            return 'excited';
    }
}
