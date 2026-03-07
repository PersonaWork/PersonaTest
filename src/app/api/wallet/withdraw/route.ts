import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';
import { requireAuth } from '@/lib/auth';
import { sendUsdcFromTreasury } from '@/lib/wallet/base';
import { z } from 'zod';

const WithdrawSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
});

/**
 * POST /api/wallet/withdraw — Withdraw USDC from platform balance to user's wallet
 *
 * Flow:
 * 1. Verify user has sufficient platform balance
 * 2. Deduct from DB balance
 * 3. Send USDC from treasury to user's wallet on Base
 * 4. Record the transaction
 */
export async function POST(request: NextRequest) {
  try {
    const { claims } = await requireAuth(request.headers);
    const user = await prisma.user.findUnique({ where: { privyId: claims.userId } });
    if (!user) return errorResponse('User not found', 404);
    if (!user.walletAddress) return errorResponse('No wallet address on file', 400);

    const body = await request.json();
    const parsed = WithdrawSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { amount } = parsed.data;

    // Check sufficient balance
    if (user.usdcBalance < amount) {
      return errorResponse(
        `Insufficient balance. You have ${user.usdcBalance.toFixed(2)} USDC but requested ${amount.toFixed(2)} USDC`,
        400
      );
    }

    // Minimum withdrawal
    if (amount < 1) {
      return errorResponse('Minimum withdrawal is 1 USDC', 400);
    }

    // Deduct balance first (optimistic — prevents double-spend)
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { usdcBalance: { decrement: amount } },
    });

    // Send USDC on-chain
    let txHash: string;
    try {
      txHash = await sendUsdcFromTreasury(
        user.walletAddress as `0x${string}`,
        amount,
      );
    } catch (error) {
      // Refund balance if on-chain transfer fails
      await prisma.user.update({
        where: { id: user.id },
        data: { usdcBalance: { increment: amount } },
      });
      console.error('On-chain withdrawal failed:', error);
      return errorResponse('Withdrawal failed — your balance has been restored', 500);
    }

    // Record the transaction
    await prisma.transaction.create({
      data: {
        sellerId: user.id,
        characterId: 'withdraw',
        type: 'withdraw',
        shares: 0,
        pricePerShare: 1,
        total: amount,
        buyerId: null,
      },
    });

    return successResponse({
      message: `Successfully withdrew ${amount} USDC`,
      txHash,
      newBalance: updatedUser.usdcBalance,
    });
  } catch (error: unknown) {
    console.error('Withdrawal failed:', error);
    const message = error instanceof Error ? error.message : 'Withdrawal failed';
    return errorResponse(message, 500);
  }
}
