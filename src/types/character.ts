export interface CharacterPersonality {
    traits: string[];
    background: string;
    speakingStyle: string;
}

export interface CharacterAction {
    id: string;
    name: string;
    description: string;
    isRare: boolean;
}

export interface Character {
    id: string;
    name: string;
    slug: string;
    description: string;
    thumbnailUrl?: string | null;
    personality: CharacterPersonality;
    actions: CharacterAction[];
    environment: Record<string, string>;
    totalShares: number;
    sharesIssued: number;
    currentPrice: number;
    marketCap: number;
    launchAt?: Date | null;
    isLaunched: boolean;
    tiktokHandle?: string | null;
    instagramHandle?: string | null;
    createdAt: Date;
}
