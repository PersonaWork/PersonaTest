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

    // Get character and user holding
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

    if (!existingHolding || existingHolding.shares < shares) {
      return NextResponse.json(
        { error: 'Insufficient shares to sell' },
        { status: 400 }
      );
    }

    // Calculate price with algorithm
    const currentPrice = character.currentPrice;
    const pricePerShare = currentPrice * (1 - (shares / character.totalShares) * 0.05);
    const totalProceeds = shares * pricePerShare;

    // Update character price and market cap
    const newPrice = currentPrice * (1 - (shares / character.totalShares) * 0.05);
    const newSharesIssued = character.sharesIssued - shares;
    const newMarketCap = newPrice * newSharesIssued;

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        sellerId: userId,
        characterId,
        shares,
        pricePerShare,
        total: totalProceeds,
        type: 'sell'
      }
    });

    // Update or delete holding
    let holding;
    if (existingHolding.shares === shares) {
      // Delete holding if all shares sold
      await prisma.holding.delete({
        where: { userId_characterId: { userId, characterId } }
      });
      holding = null;
    } else {
      // Update holding with remaining shares
      holding = await prisma.holding.update({
        where: { userId_characterId: { userId, characterId } },
        data: {
          shares: existingHolding.shares - shares
          // avgBuyPrice stays the same
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
      totalProceeds
    });

  } catch (error) {
    console.error('Sell failed:', error);
    return NextResponse.json(
      { error: 'Transaction failed' },
      { status: 500 }
    );
  }
}
