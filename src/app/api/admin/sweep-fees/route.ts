import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  sendUsdcFromTreasury,
  FEE_COLLECTOR_ADDRESS,
  getFeeCollectorBalance,
} from '@/lib/wallet/base';

/**
 * POST /api/admin/sweep-fees — Sweep accumulated platform fees to fee collector wallet
 *
 * Calculates total earned fees minus previously swept fees, then sends
 * the difference from treasury → fee collector wallet in one transaction.
 *
 * Protected by CRON_SECRET. Can be called manually or via daily cron.
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  const querySecret = request.nextUrl.searchParams.get('secret');
  const token = authHeader?.replace('Bearer ', '') || querySecret;

  if (token !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Total fees earned across all transactions
    const totalEarned = await prisma.transaction.aggregate({
      _sum: { platformFee: true },
      where: { platformFee: { gt: 0 } },
    });

    // Total previously swept (recorded as type 'fee_sweep' transactions)
    const totalSwept = await prisma.transaction.aggregate({
      _sum: { total: true },
      where: { type: 'fee_sweep' },
    });

    const earned = totalEarned._sum.platformFee || 0;
    const swept = totalSwept._sum.total || 0;
    const pendingFees = earned - swept;

    // Need at least $1 to be worth sweeping (save on gas)
    if (pendingFees < 1) {
      return NextResponse.json({
        success: true,
        data: {
          swept: false,
          reason: 'below_threshold',
          pendingFees,
          totalEarned: earned,
          totalSwept: swept,
          message: `Only $${pendingFees.toFixed(2)} pending — minimum $1 to sweep.`,
        },
      });
    }

    // Send fees from treasury → fee collector
    let txHash: string;
    try {
      txHash = await sendUsdcFromTreasury(FEE_COLLECTOR_ADDRESS, pendingFees);
    } catch (error) {
      console.error('[SWEEP-FEES] On-chain transfer failed:', error);
      return NextResponse.json({
        success: false,
        error: 'Fee sweep transfer failed — treasury may need more ETH for gas or USDC.',
      }, { status: 500 });
    }

    // Record the sweep so we don't double-send
    await prisma.transaction.create({
      data: {
        type: 'fee_sweep',
        txHash,
        shares: 0,
        pricePerShare: 0,
        total: pendingFees,
        platformFee: 0,
      },
    });

    // Get updated fee collector balance
    const feeCollectorBalance = await getFeeCollectorBalance();

    console.log(`[SWEEP-FEES] Swept $${pendingFees.toFixed(2)} USDC to fee collector. TX: ${txHash}`);

    return NextResponse.json({
      success: true,
      data: {
        swept: true,
        amount: pendingFees,
        txHash,
        totalEarned: earned,
        totalSwept: swept + pendingFees,
        feeCollectorBalance,
      },
    });
  } catch (error) {
    console.error('[SWEEP-FEES] Failed:', error);
    return NextResponse.json({ error: 'Fee sweep failed' }, { status: 500 });
  }
}
