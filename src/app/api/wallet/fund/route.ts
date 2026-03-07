import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';
import { requireAuth } from '@/lib/auth';
import { verifyUsdcTransfer, USDC_ADDRESS } from '@/lib/wallet/base';
import { z } from 'zod';

const DepositSchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
});

/**
 * POST /api/wallet/fund — Verify a USDC deposit and credit the user's platform balance
 *
 * Flow:
 * 1. User sends USDC to the treasury address via their Privy wallet (client-side)
 * 2. User submits the tx hash here
 * 3. We verify the tx on-chain (correct sender, recipient, token)
 * 4. Credit the user's usdcBalance in the database
 */
export async function POST(request: NextRequest) {
  try {
    const { claims } = await requireAuth(request.headers);
    const user = await prisma.user.findUnique({ where: { privyId: claims.userId } });
    if (!user) return errorResponse('User not found', 404);
    if (!user.walletAddress) return errorResponse('No wallet address on file', 400);

    const body = await request.json();
    const parsed = DepositSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const treasuryAddress = process.env.PLATFORM_TREASURY_ADDRESS;
    if (!treasuryAddress) {
      return errorResponse('Platform treasury not configured', 500);
    }

    // Check this tx hasn't already been claimed
    const existingDeposit = await prisma.transaction.findFirst({
      where: { type: 'deposit', sellerId: parsed.data.txHash },
    });
    if (existingDeposit) {
      return errorResponse('This transaction has already been credited', 409);
    }

    // Verify the USDC transfer on Base
    const { amount } = await verifyUsdcTransfer(
      parsed.data.txHash as `0x${string}`,
      user.walletAddress as `0x${string}`,
      treasuryAddress as `0x${string}`,
    );

    if (amount <= 0) {
      return errorResponse('Invalid transfer amount', 400);
    }

    // Credit the user's balance and create a transaction record atomically
    const [updatedUser, depositTx] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { usdcBalance: { increment: amount } },
      }),
      prisma.transaction.create({
        data: {
          buyerId: user.id,
          characterId: 'deposit',  // Not character-specific
          type: 'deposit',
          shares: 0,
          pricePerShare: 1,
          total: amount,
          sellerId: parsed.data.txHash,  // Store tx hash for dedup
        },
      }),
    ]);

    return successResponse({
      message: `Successfully deposited ${amount} USDC`,
      newBalance: updatedUser.usdcBalance,
      transaction: depositTx,
    });
  } catch (error: unknown) {
    console.error('Deposit verification failed:', error);
    const message = error instanceof Error ? error.message : 'Deposit verification failed';
    return errorResponse(message, 500);
  }
}

/**
 * GET /api/wallet/fund — Return deposit instructions and history
 */
export async function GET(request: NextRequest) {
  try {
    const { claims } = await requireAuth(request.headers);
    const user = await prisma.user.findUnique({ where: { privyId: claims.userId } });
    if (!user) return errorResponse('User not found', 404);

    const treasuryAddress = process.env.PLATFORM_TREASURY_ADDRESS || '';

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
        treasuryAddress,
        note: 'Send USDC on Base network to the treasury address. After sending, submit the transaction hash to verify your deposit.',
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
