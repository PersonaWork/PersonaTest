import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';

/**
 * GET /api/activity/feed
 * Returns recent platform-wide trading activity for the live feed ticker.
 * No auth required — this is public social proof.
 */
export async function GET() {
  try {
    const recentTrades = await prisma.transaction.findMany({
      take: 20,
      where: { characterId: { not: null }, type: { in: ['buy', 'sell'] } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        shares: true,
        pricePerShare: true,
        total: true,
        createdAt: true,
        character: {
          select: { name: true, slug: true, thumbnailUrl: true },
        },
        buyer: {
          select: { username: true },
        },
        seller: {
          select: { username: true },
        },
      },
    });

    const feed = recentTrades
      .filter((tx) => tx.character)
      .map((tx) => ({
        id: tx.id,
        type: tx.type,
        shares: tx.shares,
        price: tx.pricePerShare,
        total: tx.total,
        characterName: tx.character!.name,
        characterSlug: tx.character!.slug,
        characterThumb: tx.character!.thumbnailUrl,
        username: tx.type === 'buy' ? tx.buyer?.username : tx.seller?.username,
        time: tx.createdAt,
      }));

    return successResponse(feed);
  } catch (error) {
    console.error('Activity feed error:', error);
    return errorResponse('Failed to load activity feed', 500);
  }
}
