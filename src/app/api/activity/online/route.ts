import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';

/**
 * GET /api/activity/online
 * Returns an approximate count of recently active users.
 * "Active" = had a transaction OR sent a chat message in the last 15 minutes.
 * Also returns a baseline boost so numbers always feel alive.
 */
export async function GET() {
  try {
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);

    // Count unique users with recent transactions
    const recentTraders = await prisma.transaction.findMany({
      where: { createdAt: { gt: fifteenMinAgo } },
      select: { buyerId: true, sellerId: true },
      distinct: ['buyerId', 'sellerId'],
    });

    const traderIds = new Set<string>();
    recentTraders.forEach((tx) => {
      if (tx.buyerId) traderIds.add(tx.buyerId);
      if (tx.sellerId) traderIds.add(tx.sellerId);
    });

    // Count unique users with recent chat messages
    const recentChatters = await prisma.chatMessage.findMany({
      where: { createdAt: { gt: fifteenMinAgo } },
      select: { userId: true },
      distinct: ['userId'],
    });

    recentChatters.forEach((msg) => traderIds.add(msg.userId));

    // Add a small base to make it feel more alive (simulates lurkers)
    const activeCount = traderIds.size;
    const displayCount = Math.max(activeCount * 3 + 12, 15); // At minimum show ~15

    return successResponse({
      online: displayCount,
      activeTraders: activeCount,
    });
  } catch (error) {
    console.error('Online count error:', error);
    return errorResponse('Failed to get online count', 500);
  }
}
