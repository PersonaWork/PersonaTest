import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';

/**
 * GET /api/activity/pulse
 * Returns market activity metrics for the pulse/heartbeat widget.
 * Shows how "hot" the market is right now.
 */
export async function GET() {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Trades in the last hour
    const hourlyTrades = await prisma.transaction.count({
      where: {
        createdAt: { gt: oneHourAgo },
        type: { in: ['buy', 'sell'] },
        characterId: { not: null },
      },
    });

    // Trades in the last 5 minutes (for "right now" pulse)
    const recentTrades = await prisma.transaction.count({
      where: {
        createdAt: { gt: fiveMinAgo },
        type: { in: ['buy', 'sell'] },
        characterId: { not: null },
      },
    });

    // Volume in last hour
    const hourlyVolume = await prisma.transaction.aggregate({
      where: {
        createdAt: { gt: oneHourAgo },
        type: { in: ['buy', 'sell'] },
        characterId: { not: null },
      },
      _sum: { total: true },
    });

    // Determine market "heat" level
    let heat: 'cold' | 'warm' | 'hot' | 'fire' = 'cold';
    if (recentTrades >= 10) heat = 'fire';
    else if (recentTrades >= 5) heat = 'hot';
    else if (recentTrades >= 2) heat = 'warm';
    else if (hourlyTrades >= 5) heat = 'warm';

    return successResponse({
      hourlyTrades,
      recentTrades,
      hourlyVolume: hourlyVolume._sum.total || 0,
      heat,
    });
  } catch (error) {
    console.error('Market pulse error:', error);
    return errorResponse('Failed to get market pulse', 500);
  }
}
