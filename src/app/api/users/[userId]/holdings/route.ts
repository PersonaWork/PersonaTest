import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const holdings = await prisma.holding.findMany({
      where: { userId },
      include: {
        character: true
      }
    });

    // Transform data for frontend
    const transformedHoldings = holdings.map(holding => {
      const currentPrice = holding.character.currentPrice;
      const totalValue = holding.shares * currentPrice;
      const totalCost = holding.shares * holding.avgBuyPrice;
      const pnl = totalValue - totalCost;
      const pnlPercent = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

      return {
        id: holding.id,
        characterId: holding.characterId,
        characterName: holding.character.name,
        characterSlug: holding.character.slug,
        characterThumbnail: holding.character.thumbnailUrl,
        shares: holding.shares,
        avgBuyPrice: holding.avgBuyPrice,
        currentPrice,
        totalValue,
        pnl,
        pnlPercent
      };
    });

    return NextResponse.json(transformedHoldings);
  } catch (error) {
    console.error('Failed to fetch holdings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch holdings' },
      { status: 500 }
    );
  }
}
