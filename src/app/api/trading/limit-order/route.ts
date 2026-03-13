import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api';
import { BONDING_CURVE_FACTOR, VIRTUAL_LIQUIDITY, PHASE_GRADUATED } from '@/lib/wallet/base';
import { matchNewLimitOrder } from '@/lib/trading/p2p-matcher';
import { z } from 'zod';

/** Format a price with enough decimals to be meaningful */
function fmtPrice(p: number): string {
  if (p >= 1) return p.toFixed(2);
  if (p >= 0.01) return p.toFixed(4);
  if (p >= 0.0001) return p.toFixed(6);
  return p.toFixed(8);
}

const LimitOrderSchema = z.object({
  characterId: z.string().min(1, 'Character ID is required'),
  side: z.enum(['buy', 'sell']),
  shares: z.number().int().positive('Shares must be a positive integer'),
  triggerPrice: z.number().positive('Trigger price must be positive'),
  expiresAt: z.string().datetime().optional(),
});

// POST — Create a new limit order
export async function POST(request: NextRequest) {
  try {
    const { claims } = await requireAuth(request.headers);
    const body = await request.json().catch(() => ({}));

    const parsed = LimitOrderSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { characterId, side, shares, triggerPrice, expiresAt } = parsed.data;
    const userId = claims.userId;

    if (!userId) {
      return errorResponse('User ID not found in claims', 400);
    }

    const user = await prisma.user.findUnique({ where: { privyId: userId } });
    if (!user) {
      return errorResponse('User not found in database', 404);
    }

    const result = await prisma.$transaction(async (tx) => {
      const character = await tx.character.findUnique({ where: { id: characterId } });
      if (!character) {
        throw new Error('Character not found');
      }

      const isGraduated = character.phase === PHASE_GRADUATED;

      // ─── Validate trigger price ───
      if (isGraduated) {
        // In graduated phase, limit orders sit on the order book.
        // Buy orders: place below current price (or at any price if you want to be aggressive)
        // Sell orders: place above current price (or at any price)
        // We still validate basic direction for UX, but allow crossing the spread for immediate fills
      } else {
        // Bonding curve phase: traditional trigger-based orders
        if (side === 'buy' && triggerPrice >= character.currentPrice) {
          throw new Error(
            `Trigger price ($${fmtPrice(triggerPrice)}) must be below current price ($${fmtPrice(character.currentPrice)}) for limit buy orders. Use a market buy instead.`
          );
        }
        if (side === 'sell' && triggerPrice <= character.currentPrice) {
          throw new Error(
            `Trigger price ($${fmtPrice(triggerPrice)}) must be above current price ($${fmtPrice(character.currentPrice)}) for limit sell orders. Use a market sell instead.`
          );
        }
      }

      let lockedAmount = 0;
      let lockedAvgBuyPrice: number | null = null;

      if (side === 'buy') {
        // Calculate USDC to lock
        if (isGraduated) {
          // Simple price * shares + buffer for fees
          lockedAmount = shares * triggerPrice * (1 + 0.005); // price + 0.5% fee
        } else {
          // Bonding curve estimated cost at trigger price
          const estimatedPricePerShare = triggerPrice * (1 + (shares / (character.sharesIssued + VIRTUAL_LIQUIDITY)) * BONDING_CURVE_FACTOR);
          lockedAmount = shares * estimatedPricePerShare;
        }

        const buyer = await tx.user.findUnique({ where: { id: user.id } });
        if (!buyer || buyer.usdcBalance < lockedAmount) {
          throw new Error(
            `Insufficient USDC balance. Need $${lockedAmount.toFixed(6)} USDC to place this order but have $${(buyer?.usdcBalance ?? 0).toFixed(6)} USDC available.`
          );
        }

        // Lock funds
        await tx.user.update({
          where: { id: user.id },
          data: { usdcBalance: { decrement: lockedAmount } },
        });
      } else {
        // side === 'sell' — lock shares
        const holding = await tx.holding.findUnique({
          where: { userId_characterId: { userId: user.id, characterId } },
        });

        if (!holding || holding.shares < shares) {
          throw new Error(
            `Insufficient shares. You have ${holding?.shares ?? 0} shares but need ${shares} for this order.`
          );
        }

        lockedAvgBuyPrice = holding.avgBuyPrice;

        if (holding.shares === shares) {
          await tx.holding.delete({
            where: { userId_characterId: { userId: user.id, characterId } },
          });
        } else {
          await tx.holding.update({
            where: { userId_characterId: { userId: user.id, characterId } },
            data: { shares: { decrement: shares } },
          });
        }
      }

      // Create the limit order
      const limitOrder = await tx.limitOrder.create({
        data: {
          userId: user.id,
          characterId,
          side,
          shares,
          sharesRemaining: shares,
          filledShares: 0,
          triggerPrice,
          lockedAmount,
          lockedAvgBuyPrice,
          status: 'pending',
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
        include: {
          character: { select: { name: true, slug: true, currentPrice: true, phase: true } },
        },
      });

      // In graduated phase, immediately try to match against the order book
      let immediatelyFilled = 0;
      if (isGraduated) {
        const matchResult = await matchNewLimitOrder(tx, {
          id: limitOrder.id,
          userId: user.id,
          characterId,
          side,
          shares,
          sharesRemaining: shares,
          triggerPrice,
          lockedAmount,
        });
        immediatelyFilled = matchResult.sharesFilled;
      }

      // Re-fetch the order to get updated state after matching
      const finalOrder = await tx.limitOrder.findUnique({
        where: { id: limitOrder.id },
        include: {
          character: { select: { name: true, slug: true, currentPrice: true, phase: true } },
        },
      });

      return { ...finalOrder, immediatelyFilled };
    }, { isolationLevel: 'Serializable' });

    return successResponse(result, 201);
  } catch (err: unknown) {
    const error = err as Error & { code?: string; statusCode?: number };
    console.error('Create limit order failed:', error);

    if (error.code === 'P2034') {
      return errorResponse('Order conflict — please retry', 409);
    }
    if (
      error.message?.includes('Insufficient') ||
      error.message?.includes('Trigger price') ||
      error.message === 'Character not found'
    ) {
      return errorResponse(error.message, 400);
    }
    const status = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    return errorResponse(error?.message || 'Failed to create limit order', status);
  }
}

// GET — List user's limit orders
export async function GET(request: NextRequest) {
  try {
    const { claims } = await requireAuth(request.headers);
    const userId = claims.userId;

    const user = await prisma.user.findUnique({ where: { privyId: userId } });
    if (!user) {
      return errorResponse('User not found', 404);
    }

    const statusFilter = request.nextUrl.searchParams.get('status');
    const characterId = request.nextUrl.searchParams.get('characterId');

    const where: Record<string, unknown> = { userId: user.id };
    if (statusFilter) where.status = statusFilter;
    if (characterId) where.characterId = characterId;

    const orders = await prisma.limitOrder.findMany({
      where,
      include: {
        character: { select: { name: true, slug: true, currentPrice: true, phase: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return successResponse(orders);
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };
    const status = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    return errorResponse(error?.message || 'Failed to fetch limit orders', status);
  }
}
