export interface TradeOrder {
    characterId: string;
    shares: number;
    type: 'buy' | 'sell';
}

export interface PortfolioHolding {
    id: string;
    userId: string;
    characterId: string;
    shares: number;
    avgBuyPrice: number;
    createdAt: Date;
    updatedAt: Date;
    character?: {
        id: string;
        name: string;
        slug: string;
        currentPrice: number;
    };
}

export interface Transaction {
    id: string;
    buyerId?: string | null;
    sellerId?: string | null;
    characterId: string;
    shares: number;
    pricePerShare: number;
    total: number;
    type: 'buy' | 'sell';
    createdAt: Date;
}
