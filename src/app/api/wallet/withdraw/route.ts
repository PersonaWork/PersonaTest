import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';
import { requireAuth } from '@/lib/auth';
import { walletLimiter } from '@/lib/rate-limit';
import { sendUsdcFromTreasury, WITHDRAWAL_FEE_RATE, WITHDRAWAL_FEE_MIN } from '@/lib/wallet/base';
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

    const rl = walletLimiter(claims.userId);
    if (!rl.success) return errorResponse('Too many withdrawal attempts. Please wait.', 429);

    const user = await prisma.user.findUnique({ where: { privyId: claims.userId } });
    if (!user) return errorResponse('User not found', 404);
    if (!user.walletAddress) return errorResponse('No wallet address on file', 400);

    const body = await request.json();
    const parsed = WithdrawSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { amount } = parsed.data;
    // 2% fee with $1.00 minimum
    const fee = Math.max(amount * WITHDRAWAL_FEE_RATE, WITHDRAWAL_FEE_MIN);
    const sendAmount = amount - fee;

    // Minimum withdrawal ($5 so fee isn't disproportionate)
    if (amount < 5) {
      return errorResponse('Minimum withdrawal is $5.00 USDC', 400);
    }

    // Check sufficient balance
    if (user.usdcBalance < amount) {
      return errorResponse(
        `Insufficient balance. You have ${user.usdcBalance.toFixed(2)} USDC`,
        400
      );
    }

    // Deduct full amount from balance (fee stays in treasury as revenue)
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { usdcBalance: { decrement: amount } },
    });

    // Send USDC on-chain (user receives amount minus fee)
    let txHash: string;
    try {
      txHash = await sendUsdcFromTreasury(
        user.walletAddress as `0x${string}`,
        sendAmount,
      );
    } catch (error) {
      // Refund full amount if on-chain transfer fails
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
        type: 'withdraw',
        txHash,
        shares: 0,
        pricePerShare: 1,
        total: amount,
        platformFee: fee,
      },
    });

    return successResponse({
      message: `Withdrew $${amount.toFixed(2)} USDC — you receive $${sendAmount.toFixed(2)} after ${(WITHDRAWAL_FEE_RATE * 100).toFixed(0)}% fee ($${fee.toFixed(2)})`,
      txHash,
      fee,
      amountSent: sendAmount,
      newBalance: updatedUser.usdcBalance,
    });
  } catch (error: unknown) {
    console.error('Withdrawal failed:', error);
    const message = error instanceof Error ? error.message : 'Withdrawal failed';
    return errorResponse(message, 500);
  }
}
