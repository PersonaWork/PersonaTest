import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api';

// DELETE — Cancel a pending limit order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { claims } = await requireAuth(request.headers);
    const { orderId } = await params;

    const user = await prisma.user.findUnique({ where: { privyId: claims.userId } });
    if (!user) {
      return errorResponse('User not found', 404);
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.limitOrder.findUnique({ where: { id: orderId } });

      if (!order) {
        throw new Error('Order not found');
      }
      if (order.userId !== user.id) {
        throw new Error('Forbidden');
      }
      if (order.status !== 'pending') {
        throw new Error(`Cannot cancel order with status "${order.status}"`);
      }

      if (order.side === 'buy') {
        // Refund locked USDC
        await tx.user.update({
          where: { id: user.id },
          data: { usdcBalance: { increment: order.lockedAmount } },
        });
      } else {
        // Return locked shares to holding
        const existingHolding = await tx.holding.findUnique({
          where: { userId_characterId: { userId: user.id, characterId: order.characterId } },
        });

        if (existingHolding) {
          await tx.holding.update({
            where: { userId_characterId: { userId: user.id, characterId: order.characterId } },
            data: { shares: { increment: order.shares } },
          });
        } else {
          // Holding was deleted — recreate with saved avgBuyPrice
          await tx.holding.create({
            data: {
              userId: user.id,
              characterId: order.characterId,
              shares: order.shares,
              avgBuyPrice: order.lockedAvgBuyPrice ?? 0,
            },
          });
        }
      }

      // Mark as cancelled
      const cancelled = await tx.limitOrder.update({
        where: { id: orderId },
        data: { status: 'cancelled', cancelledAt: new Date() },
      });

      return cancelled;
    });

    return successResponse(result);
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };
    if (error.message === 'Order not found') return errorResponse(error.message, 404);
    if (error.message === 'Forbidden') return errorResponse(error.message, 403);
    if (error.message?.startsWith('Cannot cancel')) return errorResponse(error.message, 400);
    const status = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    return errorResponse(error?.message || 'Failed to cancel order', status);
  }
}
