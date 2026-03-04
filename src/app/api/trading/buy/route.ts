import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api';
import { z } from 'zod';

const BuySchema = z.object({
  characterId: z.string().min(1, 'Character ID is required'),
  shares: z.number().int().positive('Shares must be a positive integer'),
});

export async function POST(request: NextRequest) {
  try {
    const { claims } = await requireAuth(request.headers);
    const body = await request.json().catch(() => ({}));

    // Zod Validation
    const parsed = BuySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { characterId, shares } = parsed.data;
    const userId = claims.userId;

    if (!userId) {
      return errorResponse('User ID not found in claims', 400);
    }

    const user = await prisma.user.findUnique({ where: { privyId: userId } });
    if (!user) {
      return errorResponse('User not found in database', 404);
    }

    // Wrap everything in a transaction to ensure atomic execution
    const result = await prisma.$transaction(async (tx) => {
      // Get character and current user holding
      const character = await tx.character.findUnique({ where: { id: characterId } });
      if (!character) {
        throw new Error('Character not found');
      }

      const existingHolding = await tx.holding.findUnique({
        where: { userId_characterId: { userId: user.id, characterId } }
      });

      // Calculate price with algorithm
      const currentPrice = character.currentPrice;
      const pricePerShare = currentPrice * (1 + (shares / character.totalShares) * 0.05);
      const totalCost = shares * pricePerShare;

      // Update character price and market cap
      const newPrice = currentPrice * (1 + (shares / character.totalShares) * 0.05);
      const newSharesIssued = character.sharesIssued + shares;
      const newMarketCap = newPrice * newSharesIssued;

      // Create transaction record
      const transactionRecord = await tx.transaction.create({
        data: {
          buyerId: user.id,
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

        holding = await tx.holding.update({
          where: { userId_characterId: { userId: user.id, characterId } },
          data: {
            shares: totalSharesOwned,
            avgBuyPrice: newAvgPrice
          }
        });
      } else {
        holding = await tx.holding.create({
          data: {
            userId: user.id,
            characterId,
            shares,
            avgBuyPrice: pricePerShare
          }
        });
      }

      // Update character
      await tx.character.update({
        where: { id: characterId },
        data: {
          currentPrice: newPrice,
          sharesIssued: newSharesIssued,
          marketCap: newMarketCap
        }
      });

      return {
        transaction: transactionRecord,
        holding,
        newPrice,
        totalCost
      };
    });

    return successResponse(result);

  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };
    console.error('Buy failed:', error);
    if (error.message === 'Character not found') {
      return errorResponse(error.message, 404);
    }
    const status = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    return errorResponse(error?.message || 'Transaction failed', status);
  }
}
