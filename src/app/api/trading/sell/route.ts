import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api';
import { z } from 'zod';

const SellSchema = z.object({
  characterId: z.string().min(1, 'Character ID is required'),
  shares: z.number().int().positive('Shares must be a positive integer'),
});

export async function POST(request: NextRequest) {
  try {
    const { claims } = await requireAuth(request.headers);
    const body = await request.json().catch(() => ({}));

    // Zod Validation
    const parsed = SellSchema.safeParse(body);
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

      if (!existingHolding || existingHolding.shares < shares) {
        throw new Error('Insufficient shares to sell');
      }

      // Calculate price with algorithm
      const currentPrice = character.currentPrice;
      const pricePerShare = currentPrice * (1 - (shares / character.totalShares) * 0.05);
      const totalProceeds = shares * pricePerShare;

      // Update character price and market cap
      const newPrice = currentPrice * (1 - (shares / character.totalShares) * 0.05);
      const newSharesIssued = character.sharesIssued - shares;
      const newMarketCap = newPrice * newSharesIssued;

      // Create transaction record
      const transactionRecord = await tx.transaction.create({
        data: {
          sellerId: user.id,
          characterId,
          shares,
          pricePerShare,
          total: totalProceeds,
          type: 'sell'
        }
      });

      // Update or delete holding
      let holding = null;
      if (existingHolding.shares === shares) {
        await tx.holding.delete({
          where: { userId_characterId: { userId: user.id, characterId } }
        });
      } else {
        holding = await tx.holding.update({
          where: { userId_characterId: { userId: user.id, characterId } },
          data: {
            shares: existingHolding.shares - shares
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
        totalProceeds
      };
    });

    return successResponse(result);

  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };
    console.error('Sell failed:', error);
    if (error.message === 'Character not found' || error.message === 'Insufficient shares to sell') {
      return errorResponse(error.message, 400);
    }
    const status = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    return errorResponse(error?.message || 'Transaction failed', status);
  }
}
