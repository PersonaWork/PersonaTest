import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api';
import { tradeLimiter } from '@/lib/rate-limit';
import { matchLimitOrders } from '@/lib/trading/order-matcher';
import { matchMarketSell } from '@/lib/trading/p2p-matcher';
import { BONDING_FEE_RATE, BONDING_CURVE_FACTOR, PRICE_FLOOR, VIRTUAL_LIQUIDITY, PHASE_GRADUATED } from '@/lib/wallet/base';
import { z } from 'zod';

const SellSchema = z.object({
  characterId: z.string().min(1, 'Character ID is required'),
  shares: z.number().int().positive('Shares must be a positive integer'),
});

export async function POST(request: NextRequest) {
  try {
    const { claims } = await requireAuth(request.headers);

    const rl = tradeLimiter(claims.userId);
    if (!rl.success) return errorResponse('Too many trades. Slow down.', 429);

    const body = await request.json().catch(() => ({}));

    const parsed = SellSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { characterId, shares } = parsed.data;
    const userId = claims.userId;

    if (!userId) {
      return errorResponse('User ID not found in claims', 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { privyId: userId } });
      if (!user) throw new Error('User not found in database');

      const character = await tx.character.findUnique({ where: { id: characterId } });
      if (!character) throw new Error('Character not found');

      const existingHolding = await tx.holding.findUnique({
        where: { userId_characterId: { userId: user.id, characterId } }
      });

      if (!existingHolding || existingHolding.shares < shares) {
        throw new Error('Insufficient shares to sell');
      }

      // ─── GRADUATED PHASE: P2P order book ───
      if (character.phase === PHASE_GRADUATED) {
        const p2pResult = await matchMarketSell(tx, characterId, user.id, shares);

        if (!p2pResult.filled) {
          throw new Error('No buyers available. Place a limit sell order to wait for buyers.');
        }

        return {
          phase: 'GRADUATED',
          totalSharesFilled: p2pResult.totalSharesFilled,
          totalProceeds: p2pResult.totalCost,
          totalFees: p2pResult.totalFees,
          fills: p2pResult.fills.length,
          remainingUnfilled: p2pResult.remainingShares,
          newPrice: character.currentPrice,
        };
      }

      // ─── BONDING CURVE PHASE: Protocol buys back from pool ───
      const currentPrice = character.currentPrice;
      const pricePerShare = Math.max(PRICE_FLOOR, currentPrice * (1 - (shares / (character.sharesIssued + VIRTUAL_LIQUIDITY)) * BONDING_CURVE_FACTOR));
      const totalProceeds = shares * pricePerShare;
      const fee = totalProceeds * BONDING_FEE_RATE;
      const proceedsAfterFee = totalProceeds - fee;

      // Verify pool has enough liquidity to pay seller
      if (character.poolBalance < totalProceeds) {
        throw new Error('Insufficient liquidity in pool. Try selling fewer shares.');
      }

      // Credit USDC to seller
      await tx.user.update({
        where: { id: user.id },
        data: { usdcBalance: { increment: proceedsAfterFee } },
      });

      // Update character price, supply, and pool balance
      const newPrice = Math.max(PRICE_FLOOR, currentPrice * (1 - (shares / (character.sharesIssued + VIRTUAL_LIQUIDITY)) * BONDING_CURVE_FACTOR));
      const newSharesIssued = character.sharesIssued - shares;
      const newMarketCap = newPrice * newSharesIssued;
      const newPoolBalance = character.poolBalance - totalProceeds;

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
          data: { shares: existingHolding.shares - shares }
        });
      }

      // Update character
      await tx.character.update({
        where: { id: characterId },
        data: {
          currentPrice: newPrice,
          sharesIssued: newSharesIssued,
          marketCap: newMarketCap,
          poolBalance: newPoolBalance,
        }
      });

      // Check limit orders
      const { filledOrderIds } = await matchLimitOrders(tx, characterId);

      return {
        phase: 'BONDING_CURVE',
        transaction: transactionRecord,
        holding,
        newPrice,
        totalProceeds,
        fee,
        proceedsAfterFee,
        filledLimitOrders: filledOrderIds.length,
        poolBalance: newPoolBalance,
      };
    }, { timeout: 30000, isolationLevel: 'Serializable' });

    return successResponse(result);

  } catch (err: unknown) {
    const error = err as Error & { code?: string; statusCode?: number };
    console.error('Sell failed:', error);
    if (error.code === 'P2034') {
      return errorResponse('Trade conflict — please retry', 409);
    }
    if (error.message === 'User not found in database') {
      return errorResponse(error.message, 404);
    }
    if (error.message === 'Character not found' ||
        error.message === 'Insufficient shares to sell' ||
        error.message?.startsWith('No buyers available') ||
        error.message?.startsWith('Insufficient liquidity')) {
      return errorResponse(error.message, 400);
    }
    const status = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    return errorResponse(error?.message || 'Transaction failed', status);
  }
}
