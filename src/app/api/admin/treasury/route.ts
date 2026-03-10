import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTreasuryBalances, getGasStationBalance, getFeeCollectorBalance } from '@/lib/wallet/base';

/**
 * GET /api/admin/treasury — Treasury health dashboard
 *
 * Protected by CRON_SECRET (shared with cron jobs) or admin auth.
 * Returns treasury USDC/ETH, gas station ETH, total platform revenue,
 * and total user liabilities.
 */
export async function GET(request: NextRequest) {
  // Simple auth: require CRON_SECRET as bearer token or query param
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
    // Fetch all data in parallel
    const [treasuryBalances, gasStationEth, feeCollectorUsdc, feeStats, userBalances] = await Promise.all([
      getTreasuryBalances(),
      getGasStationBalance(),
      getFeeCollectorBalance(),
      prisma.transaction.aggregate({
        _sum: { platformFee: true },
        where: { platformFee: { gt: 0 } },
      }),
      prisma.user.aggregate({
        _sum: { usdcBalance: true },
        _count: true,
      }),
    ]);

    // Fee breakdown by type + swept amount
    const [tradeFees, withdrawFees, totalSwept] = await Promise.all([
      prisma.transaction.aggregate({
        _sum: { platformFee: true },
        where: { type: { in: ['buy', 'sell'] }, platformFee: { gt: 0 } },
      }),
      prisma.transaction.aggregate({
        _sum: { platformFee: true },
        where: { type: 'withdraw', platformFee: { gt: 0 } },
      }),
      prisma.transaction.aggregate({
        _sum: { total: true },
        where: { type: 'fee_sweep' },
      }),
    ]);

    const totalRevenue = feeStats._sum.platformFee || 0;
    const totalUserLiabilities = userBalances._sum.usdcBalance || 0;
    const swept = totalSwept._sum.total || 0;
    const pendingFees = totalRevenue - swept;

    return NextResponse.json({
      success: true,
      data: {
        treasury: {
          usdc: treasuryBalances.usdcBalance,
          eth: treasuryBalances.ethBalance,
        },
        gasStation: {
          eth: gasStationEth,
          estimatedUsersCanFund: Math.floor(gasStationEth / 0.0005),
        },
        feeCollector: {
          usdc: feeCollectorUsdc,
          address: '0x43c661401D7a80ed3260D6252Cc1f431380e0809',
        },
        revenue: {
          totalEarned: totalRevenue,
          tradeFees: tradeFees._sum.platformFee || 0,
          withdrawFees: withdrawFees._sum.platformFee || 0,
          swept,
          pendingFees,
        },
        platform: {
          totalUserBalances: totalUserLiabilities,
          totalUsers: userBalances._count,
          // Surplus = treasury USDC - user liabilities (positive = healthy)
          surplus: treasuryBalances.usdcBalance - totalUserLiabilities,
        },
        warnings: [
          ...(gasStationEth < 0.01 ? ['Gas station ETH is low! Fund the gas station wallet.'] : []),
          ...(treasuryBalances.ethBalance < 0.005 ? ['Treasury ETH is low! Needed for withdrawal transactions.'] : []),
          ...(treasuryBalances.usdcBalance < totalUserLiabilities ? ['Treasury USDC is below user liabilities!'] : []),
        ],
      },
    });
  } catch (error) {
    console.error('Treasury health check failed:', error);
    return NextResponse.json({ error: 'Failed to fetch treasury health' }, { status: 500 });
  }
}
