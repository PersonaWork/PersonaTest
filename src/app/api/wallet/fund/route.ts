import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';
import { requireAuth } from '@/lib/auth';
import { verifyUsdcTransfer, USDC_ADDRESS, TREASURY_ADDRESS } from '@/lib/wallet/base';
import { z } from 'zod';

const DepositSchema = z.object({
  txHash: z.string().min(1, 'Transaction hash is required'),
  walletAddress: z.string().optional(), // Client sends the wallet that signed the tx
});

/**
 * POST /api/wallet/fund — Credit user's platform balance after on-chain deposit
 *
 * Flow:
 * 1. User sends USDC from their Privy wallet → treasury address (client-side)
 * 2. Client sends the tx hash to this endpoint
 * 3. We verify the on-chain transfer (from user wallet → treasury)
 * 4. Credit the verified amount to the user's usdcBalance
 *
 * This prevents double-crediting by checking for duplicate tx hashes.
 */
export async function POST(request: NextRequest) {
  try {
    const { claims } = await requireAuth(request.headers);
    const user = await prisma.user.findUnique({ where: { privyId: claims.userId } });
    if (!user) return errorResponse('User not found', 404);

    const body = await request.json();
    const parsed = DepositSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { txHash, walletAddress: clientWallet } = parsed.data;

    // Use client-provided wallet address (the one that actually signed the tx),
    // falling back to DB address. This fixes the case where the DB address
    // hasn't been synced yet from the Privy embedded wallet.
    const senderAddress = clientWallet || user.walletAddress;
    if (!senderAddress) {
      return errorResponse('No wallet address available. Please log out and back in.', 400);
    }

    // If client sent a wallet address and it differs from DB, update the DB
    if (clientWallet && clientWallet !== user.walletAddress) {
      await prisma.user.update({
        where: { id: user.id },
        data: { walletAddress: clientWallet },
      }).catch(() => { /* ignore conflicts */ });
    }

    // Prevent double-crediting: check if this tx hash was already processed
    const duplicateCheck = await prisma.transaction.findUnique({
      where: { txHash },
    });
    if (duplicateCheck) {
      return errorResponse('This transaction has already been processed', 400);
    }

    // Verify the on-chain USDC transfer
    let transferResult;
    try {
      transferResult = await verifyUsdcTransfer(
        txHash as `0x${string}`,
        senderAddress as `0x${string}`,
        TREASURY_ADDRESS,
      );
    } catch (error) {
      console.error('Transfer verification failed:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to verify on-chain transfer',
        400
      );
    }

    const amount = transferResult.amount;
    if (amount <= 0) {
      return errorResponse('Transfer amount must be greater than 0', 400);
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
          type: 'deposit',
          txHash,
          shares: 0,
          pricePerShare: 1,
          total: amount,
        },
      }),
    ]);

    return successResponse({
      message: `Successfully deposited ${amount.toFixed(2)} USDC to your trading balance`,
      newBalance: updatedUser.usdcBalance,
      txHash,
      amount,
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
        treasuryAddress: TREASURY_ADDRESS,
        walletAddress: user.walletAddress || '',
        note: 'Send USDC on Base network to your wallet address, then deposit to move funds to your trading balance.',
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
