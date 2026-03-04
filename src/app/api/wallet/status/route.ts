import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getPolygonMaticBalance } from '@/lib/wallet/polygon';

const MIN_MATIC_TO_ENABLE_BUY = 0.01;

export async function GET(request: NextRequest) {
  try {
    const { claims } = await requireAuth(request.headers);

    const user = await prisma.user.findUnique({ where: { id: claims.userId } });
    if (!user?.walletAddress) {
      return NextResponse.json(
        { error: 'Wallet not found for user' },
        { status: 404 }
      );
    }

    const { matic } = await getPolygonMaticBalance(user.walletAddress as `0x${string}`);

    return NextResponse.json({
      userId: user.id,
      walletAddress: user.walletAddress,
      chain: 'polygon',
      balances: {
        matic,
      },
      requirements: {
        minMaticToEnableBuy: MIN_MATIC_TO_ENABLE_BUY,
      },
      canBuy: matic >= MIN_MATIC_TO_ENABLE_BUY,
    });
  } catch (err: unknown) {
    const error = err as { message?: string; statusCode?: number };
    const status = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    return NextResponse.json(
      { error: error?.message || 'Failed to get wallet status' },
      { status }
    );
  }
}
