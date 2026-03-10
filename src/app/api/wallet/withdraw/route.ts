import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';
import { requireAuth } from '@/lib/auth';
import { sendUsdcFromTreasury, WITHDRAWAL_FEE } from '@/lib/wallet/base';
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
    const fee = WITHDRAWAL_FEE; // $1 flat fee
    const totalDeduction = amount + fee;
    const sendAmount = amount; // User receives exactly what they requested

    // Minimum withdrawal (must be at least $2 to cover fee + meaningful amount)
    if (amount < 2) {
      return errorResponse('Minimum withdrawal is 2 USDC (includes $1 fee)', 400);
    }

    // Check sufficient balance (amount + fee)
    if (user.usdcBalance < totalDeduction) {
      return errorResponse(
        `Insufficient balance. You need ${totalDeduction.toFixed(2)} USDC (${amount.toFixed(2)} + $${fee} fee) but have ${user.usdcBalance.toFixed(2)} USDC`,
        400
      );
    }

    // Deduct balance first (amount + fee — prevents double-spend)
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { usdcBalance: { decrement: totalDeduction } },
    });

    // Send USDC on-chain (user receives full requested amount; fee stays in treasury)
    let txHash: string;
    try {
      txHash = await sendUsdcFromTreasury(
        user.walletAddress as `0x${string}`,
        sendAmount,
      );
    } catch (error) {
      // Refund full deduction if on-chain transfer fails
      await prisma.user.update({
        where: { id: user.id },
        data: { usdcBalance: { increment: totalDeduction } },
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
        platformFee: fee,
        buyerId: null,
      },
    });

    return successResponse({
      message: `Successfully withdrew ${amount} USDC ($${fee} fee applied)`,
      txHash,
      fee,
      newBalance: updatedUser.usdcBalance,
    });
  } catch (error: unknown) {
    console.error('Withdrawal failed:', error);
    const message = error instanceof Error ? error.message : 'Withdrawal failed';
    return errorResponse(message, 500);
  }
}
