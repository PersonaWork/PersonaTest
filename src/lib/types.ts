// Character action types
export interface CharacterAction {
    id: string;
    name: string;
    clipUrl: string;
    audioUrl?: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
    weight: number; // higher = more likely to trigger
    duration: number; // clip length in seconds
}

export interface CharacterPersonality {
    traits: string[];
    catchphrases: string[];
    backstory: string;
    voiceStyle: string;
    systemPrompt: string; // used for chat AI
}

export interface CharacterEnvironment {
    backgroundUrl: string;
    ambientAudioUrl?: string;
    idleClipUrl: string;
    theme: string; // e.g., "cyberpunk-bedroom", "enchanted-forest"
}

// State machine types
export type CamState = 'IDLE' | 'ACTION' | 'TRANSITION' | 'RARE_EVENT';

export interface CamEvent {
    action: string;
    character: string;
    clipUrl: string;
    audioUrl?: string;
    isRare: boolean;
}

// Trading types
export interface TradeOrder {
    userId: string;
    characterId: string;
    shares: number;
    type: 'buy' | 'sell';
}

export interface PortfolioHolding {
    characterId: string;
    characterName: string;
    characterSlug: string;
    characterAvatar: string;
    shares: number;
    avgBuyPrice: number;
    currentPrice: number;
    totalValue: number;
    pnl: number;
    pnlPercent: number;
}
