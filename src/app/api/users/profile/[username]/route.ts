import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';

/**
 * GET /api/users/profile/[username] — Public profile by username
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        id: true,
        username: true,
        displayName: true,
        createdAt: true,
        referralCode: true,
        holdings: {
          include: {
            character: {
              select: {
                id: true,
                name: true,
                slug: true,
                currentPrice: true,
                thumbnailUrl: true,
              },
            },
          },
        },
        buyerTxns: {
          select: {
            id: true,
            type: true,
            shares: true,
            pricePerShare: true,
            total: true,
            createdAt: true,
            character: { select: { name: true, slug: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        sellerTxns: {
          select: {
            id: true,
            type: true,
            shares: true,
            pricePerShare: true,
            total: true,
            createdAt: true,
            character: { select: { name: true, slug: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: {
          select: {
            referrals: true,
          },
        },
      },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    const holdings = user.holdings.map(h => ({
      characterId: h.characterId,
      characterName: h.character.name,
      characterSlug: h.character.slug,
      characterThumbnail: h.character.thumbnailUrl,
      shares: h.shares,
      avgBuyPrice: h.avgBuyPrice,
      currentPrice: h.character.currentPrice,
      totalValue: h.shares * h.character.currentPrice,
      totalCost: h.shares * h.avgBuyPrice,
      pnl: (h.shares * h.character.currentPrice) - (h.shares * h.avgBuyPrice),
      pnlPercent: h.avgBuyPrice > 0 ? (((h.character.currentPrice - h.avgBuyPrice) / h.avgBuyPrice) * 100) : 0,
    }));

    const totalPortfolioValue = holdings.reduce((sum, h) => sum + h.totalValue, 0);
    const totalCost = holdings.reduce((sum, h) => sum + h.totalCost, 0);
    const totalPnl = totalPortfolioValue - totalCost;
    const totalPnlPercent = totalCost > 0 ? ((totalPnl / totalCost) * 100) : 0;

    // Merge and sort transactions
    const allTxns = [
      ...user.buyerTxns.map(t => ({ ...t, characterName: t.character?.name || 'Unknown', characterSlug: t.character?.slug || '' })),
      ...user.sellerTxns.map(t => ({ ...t, characterName: t.character?.name || 'Unknown', characterSlug: t.character?.slug || '' })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20);

    const recentTransactions = allTxns.map(t => ({
      id: t.id,
      type: t.type,
      characterName: t.characterName,
      characterSlug: t.characterSlug,
      shares: t.shares,
      pricePerShare: t.pricePerShare,
      total: t.total,
      createdAt: t.createdAt,
    }));

    // Stats
    const totalTrades = user.buyerTxns.length + user.sellerTxns.length;
    const bestHolding = holdings.length > 0
      ? holdings.reduce((best, h) => h.pnlPercent > best.pnlPercent ? h : best, holdings[0])
      : null;

    return successResponse({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      joinedAt: user.createdAt,
      holdings,
      totalPortfolioValue,
      totalCost,
      totalPnl,
      totalPnlPercent,
      holdingsCount: holdings.length,
      totalTrades,
      referralCount: user._count.referrals,
      bestHolding: bestHolding ? {
        characterName: bestHolding.characterName,
        pnlPercent: bestHolding.pnlPercent,
      } : null,
      recentTransactions,
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error('Profile fetch failed:', error);
    return errorResponse('Failed to fetch profile', 500);
  }
}
