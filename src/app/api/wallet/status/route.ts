import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getUsdcBalance } from '@/lib/wallet/base';
import { successResponse, errorResponse } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const { claims } = await requireAuth(request.headers);

    const user = await prisma.user.findUnique({ where: { privyId: claims.userId } });
    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Get on-chain USDC balance if wallet exists
    let walletBalance = 0;
    if (user.walletAddress) {
      try {
        walletBalance = await getUsdcBalance(user.walletAddress as `0x${string}`);
      } catch {
        // If chain read fails, just show 0
        walletBalance = 0;
      }
    }

    return successResponse({
      userId: user.id,
      walletAddress: user.walletAddress,
      chain: 'base',
      platformBalance: user.usdcBalance,   // DB balance — what you can trade with
      walletBalance,                         // On-chain USDC — what you can deposit
      canBuy: user.usdcBalance > 0,
    });
  } catch (err: unknown) {
    const error = err as { message?: string; statusCode?: number };
    const status = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    return errorResponse(error?.message || 'Failed to get wallet status', status);
  }
}
