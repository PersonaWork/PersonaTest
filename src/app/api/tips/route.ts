import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api';
import { TIP_FEE_RATE } from '@/lib/wallet/base';
import { z } from 'zod';

const TipSchema = z.object({
  recipientId: z.string().min(1),
  amount: z.number().positive().max(100, 'Max tip is $100'),
  message: z.string().max(200).optional(),
});

/**
 * POST /api/tips — Send a tip to another user
 * Platform takes 10% cut. Minimum tip: $0.01
 */
export async function POST(request: NextRequest) {
  try {
    const { claims } = await requireAuth(request.headers);
    const body = await request.json();
    const parsed = TipSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { recipientId, amount, message } = parsed.data;

    if (amount < 0.01) {
      return errorResponse('Minimum tip is $0.01', 400);
    }

    const sender = await prisma.user.findUnique({
      where: { privyId: claims.userId },
      select: { id: true, username: true, usdcBalance: true },
    });

    if (!sender) return errorResponse('User not found', 404);
    if (sender.id === recipientId) return errorResponse('Cannot tip yourself', 400);

    if (sender.usdcBalance < amount) {
      return errorResponse('Insufficient balance', 400);
    }

    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, username: true },
    });

    if (!recipient) return errorResponse('Recipient not found', 404);

    const platformFee = amount * TIP_FEE_RATE;
    const recipientAmount = amount - platformFee;

    // Execute tip in a transaction
    await prisma.$transaction([
      // Deduct from sender
      prisma.user.update({
        where: { id: sender.id },
        data: { usdcBalance: { decrement: amount } },
      }),
      // Credit recipient (minus platform cut)
      prisma.user.update({
        where: { id: recipient.id },
        data: { usdcBalance: { increment: recipientAmount } },
      }),
      // Record the tip transaction
      prisma.transaction.create({
        data: {
          buyerId: recipient.id,
          sellerId: sender.id,
          type: 'tip',
          shares: 0,
          pricePerShare: 0,
          total: amount,
          platformFee,
        },
      }),
    ]);

    // If there's a message, post it as a chat message
    if (message) {
      await prisma.chatMessage.create({
        data: {
          userId: sender.id,
          content: `💰 tipped @${recipient.username} $${amount.toFixed(2)} — ${message}`,
          roomId: 'trading-floor',
        },
      });
    }

    return successResponse({
      sent: amount,
      recipientReceived: recipientAmount,
      platformFee,
      recipientUsername: recipient.username,
    });
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    if (err.statusCode === 401) return errorResponse(err.message, 401);
    console.error('Tip error:', error);
    return errorResponse('Failed to send tip', 500);
  }
}
