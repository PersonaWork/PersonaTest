import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, characterId, shares } = body;

    if (!userId || !characterId || !shares || shares <= 0) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    // Get character and current user holding
    const [character, existingHolding] = await Promise.all([
      prisma.character.findUnique({ where: { id: characterId } }),
      prisma.holding.findUnique({
        where: { userId_characterId: { userId, characterId } }
      })
    ]);

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
    }

    // Calculate price with algorithm
    const currentPrice = character.currentPrice;
    const pricePerShare = currentPrice * (1 + (shares / character.totalShares) * 0.05);
    const totalCost = shares * pricePerShare;

    // Update character price and market cap
    const newPrice = currentPrice * (1 + (shares / character.totalShares) * 0.05);
    const newSharesIssued = character.sharesIssued + shares;
    const newMarketCap = newPrice * newSharesIssued;

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        buyerId: userId,
        characterId,
        shares,
        pricePerShare,
        total: totalCost,
        type: 'buy'
      }
    });

    // Update or create holding
    let holding;
    if (existingHolding) {
      const totalSharesOwned = existingHolding.shares + shares;
      const totalCostBasis = (existingHolding.avgBuyPrice * existingHolding.shares) + totalCost;
      const newAvgPrice = totalCostBasis / totalSharesOwned;

      holding = await prisma.holding.update({
        where: { userId_characterId: { userId, characterId } },
        data: {
          shares: totalSharesOwned,
          avgBuyPrice: newAvgPrice
        }
      });
    } else {
      holding = await prisma.holding.create({
        data: {
          userId,
          characterId,
          shares,
          avgBuyPrice: pricePerShare
        }
      });
    }

    // Update character
    await prisma.character.update({
      where: { id: characterId },
      data: {
        currentPrice: newPrice,
        sharesIssued: newSharesIssued,
        marketCap: newMarketCap
      }
    });

    return NextResponse.json({
      success: true,
      transaction,
      holding,
      newPrice,
      totalCost
    });

  } catch (error) {
    console.error('Buy failed:', error);
    return NextResponse.json(
      { error: 'Transaction failed' },
      { status: 500 }
    );
  }
}
