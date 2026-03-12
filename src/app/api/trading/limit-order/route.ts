import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api';
import { BONDING_CURVE_FACTOR } from '@/lib/wallet/base';
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

      // Validate supply cap for buy orders
      if (side === 'buy') {
        const availableShares = character.totalShares - character.sharesIssued;
        if (shares > availableShares) {
          throw new Error(
            availableShares === 0
              ? 'All shares have been issued. Wait for someone to sell before placing a buy order.'
              : `Only ${availableShares.toLocaleString()} shares available. You requested ${shares.toLocaleString()}.`
          );
        }
      }

      // Validate trigger price direction
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

      let lockedAmount = 0;
      let lockedAvgBuyPrice: number | null = null;

      if (side === 'buy') {
        // Calculate the maximum cost at the trigger price using bonding curve
        const estimatedPricePerShare = triggerPrice * (1 + (shares / character.totalShares) * BONDING_CURVE_FACTOR);
        lockedAmount = shares * estimatedPricePerShare;

        // Check user has enough available balance
        const buyer = await tx.user.findUnique({ where: { id: user.id } });
        if (!buyer || buyer.usdcBalance < lockedAmount) {
          throw new Error(
            `Insufficient USDC balance. Need $${lockedAmount.toFixed(6)} USDC to place this order but have $${(buyer?.usdcBalance ?? 0).toFixed(6)} USDC available.`
          );
        }

        // Lock funds by deducting from balance
        await tx.user.update({
          where: { id: user.id },
          data: { usdcBalance: { decrement: lockedAmount } },
        });
      } else {
        // side === 'sell' — lock shares by deducting from holding
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
          triggerPrice,
          lockedAmount,
          lockedAvgBuyPrice,
          status: 'pending',
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
        include: {
          character: { select: { name: true, slug: true, currentPrice: true } },
        },
      });

      return limitOrder;
    });

    return successResponse(result, 201);
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };
    console.error('Create limit order failed:', error);

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
        character: { select: { name: true, slug: true, currentPrice: true } },
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
