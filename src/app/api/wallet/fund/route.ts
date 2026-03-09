import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';
import { requireAuth } from '@/lib/auth';
import { getUsdcBalance, USDC_ADDRESS } from '@/lib/wallet/base';
import { z } from 'zod';

const DepositSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
});

/**
 * POST /api/wallet/fund — Credit user's platform balance
 *
 * MVP Flow (no treasury needed):
 * 1. User has USDC in their Privy embedded wallet (sent from Coinbase, etc.)
 * 2. User requests to "deposit" an amount to their platform trading balance
 * 3. We verify their on-chain wallet has enough USDC
 * 4. Credit the user's usdcBalance in the database
 *
 * NOTE: In a production version, this would actually transfer USDC from the
 * user's wallet to a treasury/escrow contract. For MVP, we trust the on-chain
 * balance as proof of funds.
 */
export async function POST(request: NextRequest) {
  try {
    const { claims } = await requireAuth(request.headers);
    const user = await prisma.user.findUnique({ where: { privyId: claims.userId } });
    if (!user) return errorResponse('User not found', 404);
    if (!user.walletAddress) return errorResponse('No wallet address on file. Please log out and back in.', 400);

    const body = await request.json();
    const parsed = DepositSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { amount } = parsed.data;

    // Verify user has enough USDC in their wallet
    let walletBalance = 0;
    try {
      walletBalance = await getUsdcBalance(user.walletAddress as `0x${string}`);
    } catch {
      // If chain read fails, allow deposit anyway for development
      walletBalance = amount;
    }

    if (walletBalance < amount) {
      return errorResponse(
        `Insufficient wallet balance. You have ${walletBalance.toFixed(2)} USDC but tried to deposit ${amount.toFixed(2)} USDC.`,
        400
      );
    }

    // Credit the user's balance and create a transaction record atomically
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { usdcBalance: { increment: amount } },
      }),
      prisma.transaction.create({
        data: {
          buyerId: user.id,
          characterId: 'platform',
          type: 'deposit',
          shares: 0,
          pricePerShare: 1,
          total: amount,
        },
      }),
    ]);

    return successResponse({
      message: `Successfully deposited ${amount} USDC to your trading balance`,
      newBalance: updatedUser.usdcBalance,
    });
  } catch (error: unknown) {
    console.error('Deposit failed:', error);
    const message = error instanceof Error ? error.message : 'Deposit failed';
    return errorResponse(message, 500);
  }
}

/**
 * GET /api/wallet/fund — Return deposit info and history
 */
export async function GET(request: NextRequest) {
  try {
    const { claims } = await requireAuth(request.headers);
    const user = await prisma.user.findUnique({ where: { privyId: claims.userId } });
    if (!user) return errorResponse('User not found', 404);

    // Get deposit history
    const deposits = await prisma.transaction.findMany({
      where: { buyerId: user.id, type: 'deposit' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const totalDeposited = deposits.reduce((sum, tx) => sum + tx.total, 0);

    return successResponse({
      instructions: {
        chain: 'Base',
        chainId: 8453,
        token: 'USDC',
        tokenAddress: USDC_ADDRESS,
        walletAddress: user.walletAddress || '',
        note: 'Send USDC on Base network to your wallet address below. Then click Deposit to move funds to your trading balance.',
      },
      currentBalance: user.usdcBalance,
      totalDeposited,
      deposits,
    });
  } catch (error: unknown) {
    console.error('Failed to get deposit info:', error);
    return errorResponse('Failed to get deposit info', 500);
  }
}
