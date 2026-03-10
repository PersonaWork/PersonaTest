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

export interface LimitOrder {
    id: string;
    userId: string;
    characterId: string;
    side: 'buy' | 'sell';
    shares: number;
    triggerPrice: number;
    lockedAmount: number;
    lockedAvgBuyPrice: number | null;
    status: 'pending' | 'filled' | 'cancelled' | 'expired';
    expiresAt: string | null;
    filledAt: string | null;
    cancelledAt: string | null;
    transactionId: string | null;
    createdAt: string;
    character?: {
        name: string;
        slug: string;
        currentPrice: number;
    };
}
