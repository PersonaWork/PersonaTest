import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';

/**
 * POST /api/trading/expire-orders
 *
 * Cron endpoint that finds all expired pending limit orders and refunds
 * locked funds/shares. Protected by CRON_SECRET env var.
 *
 * Vercel cron calls this every 5 minutes as a safety net.
 * Expired orders are also caught inline during matchLimitOrders().
 */
export async function POST(request: NextRequest) {
  // Protect with API key for cron jobs
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const now = new Date();
    const expiredOrders = await prisma.limitOrder.findMany({
      where: {
        status: 'pending',
        expiresAt: { lte: now },
      },
    });

    let processed = 0;
    for (const order of expiredOrders) {
      try {
        await prisma.$transaction(async (tx) => {
          // Re-check status inside transaction to avoid race conditions
          const current = await tx.limitOrder.findUnique({ where: { id: order.id } });
          if (!current || current.status !== 'pending') return;

          if (current.side === 'buy') {
            // Refund locked USDC
            await tx.user.update({
              where: { id: current.userId },
              data: { usdcBalance: { increment: current.lockedAmount } },
            });
          } else {
            // Return locked shares to holding
            const holding = await tx.holding.findUnique({
              where: { userId_characterId: { userId: current.userId, characterId: current.characterId } },
            });

            if (holding) {
              await tx.holding.update({
                where: { userId_characterId: { userId: current.userId, characterId: current.characterId } },
                data: { shares: { increment: current.shares } },
              });
            } else {
              // Holding was deleted — recreate with saved avgBuyPrice
              await tx.holding.create({
                data: {
                  userId: current.userId,
                  characterId: current.characterId,
                  shares: current.shares,
                  avgBuyPrice: current.lockedAvgBuyPrice ?? 0,
                },
              });
            }
          }

          await tx.limitOrder.update({
            where: { id: current.id },
            data: { status: 'expired', cancelledAt: now },
          });
        });
        processed++;
      } catch (err) {
        console.error(`Failed to expire order ${order.id}:`, err);
      }
    }

    return successResponse({ expired: processed, checked: expiredOrders.length });
  } catch (err: unknown) {
    console.error('Expire orders failed:', err);
    return errorResponse('Failed to expire orders', 500);
  }
}
