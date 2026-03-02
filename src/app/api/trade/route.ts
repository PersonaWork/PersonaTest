import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const { slug, amount, type } = await req.json();

        // In a real app, we'd check the user's balance and update holdings.
        // For now, we'll just log the "trade" and return success.

        console.log(`Trade Executed: ${type} ${amount} shares of ${slug}`);

        // Update character market cap/price slightly based on trade
        const priceChange = type === 'buy' ? 1.01 : 0.99;

        const updated = await prisma.character.update({
            where: { slug },
            data: {
                currentPrice: { multiply: priceChange },
                marketCap: { multiply: priceChange },
            }
        });

        return NextResponse.json({
            success: true,
            message: `${type === 'buy' ? 'Purchased' : 'Sold'} ${amount} shares of ${updated.name}`,
            newPrice: updated.currentPrice
        });

    } catch (error: any) {
        console.error('Trade API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
