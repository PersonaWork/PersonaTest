import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api';
import { matchLimitOrders } from '@/lib/trading/order-matcher';
import { PLATFORM_FEE_RATE, BONDING_CURVE_FACTOR, PRICE_FLOOR } from '@/lib/wallet/base';
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

    // Wrap everything in a transaction to ensure atomic execution
    const result = await prisma.$transaction(async (tx) => {
      // Resolve privyId → internal user inside the transaction (single lookup)
      const user = await tx.user.findUnique({ where: { privyId: userId } });
      if (!user) {
        throw new Error('User not found in database');
      }

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

      // Calculate price with bonding curve (with price floor)
      const currentPrice = character.currentPrice;
      const pricePerShare = Math.max(PRICE_FLOOR, currentPrice * (1 - (shares / character.totalShares) * BONDING_CURVE_FACTOR));
      const totalProceeds = shares * pricePerShare;
      const fee = totalProceeds * PLATFORM_FEE_RATE;
      const proceedsAfterFee = totalProceeds - fee;

      // Credit USDC balance to seller (proceeds minus fee)
      await tx.user.update({
        where: { id: user.id },
        data: { usdcBalance: { increment: proceedsAfterFee } },
      });

      // Update character price and market cap
      const newPrice = Math.max(PRICE_FLOOR, currentPrice * (1 - (shares / character.totalShares) * BONDING_CURVE_FACTOR));
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
          platformFee: fee,
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

      // After price update, check for triggerable limit orders
      // A market sell decreases price → may trigger limit buy orders
      const { filledOrderIds } = await matchLimitOrders(tx, characterId);

      return {
        transaction: transactionRecord,
        holding,
        newPrice,
        totalProceeds,
        fee,
        proceedsAfterFee,
        filledLimitOrders: filledOrderIds.length,
      };
    }, { timeout: 30000, isolationLevel: 'Serializable' });

    return successResponse(result);

  } catch (err: unknown) {
    const error = err as Error & { code?: string; statusCode?: number };
    console.error('Sell failed:', error);
    // Serialization conflict — tell client to retry
    if (error.code === 'P2034') {
      return errorResponse('Trade conflict — please retry', 409);
    }
    if (error.message === 'User not found in database') {
      return errorResponse(error.message, 404);
    }
    if (error.message === 'Character not found' || error.message === 'Insufficient shares to sell') {
      return errorResponse(error.message, 400);
    }
    const status = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    return errorResponse(error?.message || 'Transaction failed', status);
  }
}
