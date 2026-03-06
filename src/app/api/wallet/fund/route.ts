import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const FundSchema = z.object({ amount: z.number().positive(), paymentMethod: z.string().optional() });

export async function POST(request: NextRequest) {
  try {
    const { claims } = await requireAuth(request.headers);
    const user = await prisma.user.findUnique({ where: { privyId: claims.userId } });
    if (!user) return errorResponse('User not found', 404);

    const body = await request.json();
    const parsed = FundSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const { amount } = parsed.data;

    // In production, you would integrate with Stripe, Coinbase, etc.
    // For now, we'll simulate the funding process
    
    // Create funding transaction record (using Luna's character ID for funding)
    const fundingTransaction = await prisma.transaction.create({
      data: {
        buyerId: user.id,
        characterId: '55f58a0a-ef04-4eb1-a3cc-2f100d40bfa5', // Use Luna's character ID
        type: 'fund',
        shares: 0,
        pricePerShare: amount,
        total: amount,
        sellerId: null
      }
    });

    // Update user's wallet balance (you'd track this in User model or separate Wallet model)
    // For now, we'll just return success
    
    return successResponse({
      message: `Successfully funded wallet with $${amount}`,
      transaction: fundingTransaction,
      newBalance: amount // In production, calculate actual balance
    });

  } catch (error: unknown) {
    console.error('Funding failed:', error);
    return errorResponse('Funding failed', 500);
  }
}

export async function GET(request: Request) {
  try {
    const { claims } = await requireAuth(request.headers as Headers);
    const user = await prisma.user.findUnique({ where: { privyId: claims.userId } });
    if (!user) return errorResponse('User not found', 404);

    // Get user's funding history
    const fundingTransactions = await prisma.transaction.findMany({
      where: {
        buyerId: user.id,
        type: 'fund'
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate total funded amount
    const totalFunded = fundingTransactions.reduce((sum, tx) => sum + tx.total, 0);

    return successResponse({
      userId: user.id,
      totalFunded,
      fundingHistory: fundingTransactions,
      walletAddress: user.walletAddress || '0x1234567890123456789012345678901234567890'
    });

  } catch (error: unknown) {
    console.error('Failed to get wallet info:', error);
    return errorResponse('Failed to get wallet info', 500);
  }
}
