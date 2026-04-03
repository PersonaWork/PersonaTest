import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';

/**
 * GET /api/leaderboard — Get top traders by various metrics
 * Query params:
 *   - metric: 'portfolio' | 'trades' | 'holdings' | 'referrals' (default: 'portfolio')
 *   - limit: number (default: 50, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric') || 'portfolio';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    if (metric === 'portfolio') {
      // Top users by total portfolio value (sum of holdings × current price)
      const users = await prisma.user.findMany({
        where: { hasSetUsername: true },
        select: {
          id: true,
          username: true,
          displayName: true,
          createdAt: true,
          holdings: {
            where: { shares: { gt: 0 } },
            select: {
              shares: true,
              avgBuyPrice: true,
              character: {
                select: { name: true, currentPrice: true, slug: true },
              },
            },
          },
          _count: { select: { referrals: true } },
        },
      });

      const ranked = users
        .map((u) => {
          const portfolioValue = u.holdings.reduce(
            (sum, h) => sum + h.shares * h.character.currentPrice,
            0
          );
          const totalInvested = u.holdings.reduce(
            (sum, h) => sum + h.shares * h.avgBuyPrice,
            0
          );
          const pnl = portfolioValue - totalInvested;
          const pnlPercent = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;
          const topHolding = u.holdings.length > 0
            ? u.holdings.reduce((best, h) => {
                const val = h.shares * h.character.currentPrice;
                const bestVal = best.shares * best.character.currentPrice;
                return val > bestVal ? h : best;
              })
            : null;

          return {
            username: u.username,
            displayName: u.displayName,
            joinedAt: u.createdAt,
            portfolioValue,
            totalInvested,
            pnl,
            pnlPercent,
            holdingsCount: u.holdings.length,
            referrals: u._count.referrals,
            topHolding: topHolding
              ? { name: topHolding.character.name, slug: topHolding.character.slug }
              : null,
          };
        })
        .filter((u) => u.portfolioValue > 0)
        .sort((a, b) => b.portfolioValue - a.portfolioValue)
        .slice(0, limit);

      return successResponse(ranked);
    }

    if (metric === 'trades') {
      // Top users by number of trades
      const users = await prisma.user.findMany({
        where: { hasSetUsername: true },
        select: {
          id: true,
          username: true,
          displayName: true,
          createdAt: true,
          _count: {
            select: {
              buyerTxns: true,
              sellerTxns: true,
              referrals: true,
            },
          },
          holdings: {
            where: { shares: { gt: 0 } },
            select: { shares: true, character: { select: { currentPrice: true } } },
          },
        },
      });

      const ranked = users
        .map((u) => {
          const totalTrades = u._count.buyerTxns + u._count.sellerTxns;
          const portfolioValue = u.holdings.reduce(
            (sum, h) => sum + h.shares * h.character.currentPrice,
            0
          );
          return {
            username: u.username,
            displayName: u.displayName,
            joinedAt: u.createdAt,
            totalTrades,
            buys: u._count.buyerTxns,
            sells: u._count.sellerTxns,
            portfolioValue,
            holdingsCount: u.holdings.length,
            referrals: u._count.referrals,
          };
        })
        .filter((u) => u.totalTrades > 0)
        .sort((a, b) => b.totalTrades - a.totalTrades)
        .slice(0, limit);

      return successResponse(ranked);
    }

    if (metric === 'holdings') {
      // Top users by number of unique characters held
      const users = await prisma.user.findMany({
        where: { hasSetUsername: true },
        select: {
          username: true,
          displayName: true,
          createdAt: true,
          holdings: {
            where: { shares: { gt: 0 } },
            select: {
              shares: true,
              character: { select: { name: true, currentPrice: true } },
            },
          },
          _count: { select: { referrals: true } },
        },
      });

      const ranked = users
        .map((u) => {
          const totalShares = u.holdings.reduce((sum, h) => sum + h.shares, 0);
          const portfolioValue = u.holdings.reduce(
            (sum, h) => sum + h.shares * h.character.currentPrice,
            0
          );
          return {
            username: u.username,
            displayName: u.displayName,
            joinedAt: u.createdAt,
            holdingsCount: u.holdings.length,
            totalShares,
            portfolioValue,
            referrals: u._count.referrals,
          };
        })
        .filter((u) => u.holdingsCount > 0)
        .sort((a, b) => b.holdingsCount - a.holdingsCount || b.totalShares - a.totalShares)
        .slice(0, limit);

      return successResponse(ranked);
    }

    if (metric === 'referrals') {
      const users = await prisma.user.findMany({
        where: { hasSetUsername: true },
        select: {
          username: true,
          displayName: true,
          createdAt: true,
          _count: { select: { referrals: true } },
          holdings: {
            where: { shares: { gt: 0 } },
            select: { shares: true, character: { select: { currentPrice: true } } },
          },
        },
      });

      const ranked = users
        .map((u) => {
          const portfolioValue = u.holdings.reduce(
            (sum, h) => sum + h.shares * h.character.currentPrice,
            0
          );
          return {
            username: u.username,
            displayName: u.displayName,
            joinedAt: u.createdAt,
            referrals: u._count.referrals,
            holdingsCount: u.holdings.length,
            portfolioValue,
          };
        })
        .filter((u) => u.referrals > 0)
        .sort((a, b) => b.referrals - a.referrals)
        .slice(0, limit);

      return successResponse(ranked);
    }

    return errorResponse('Invalid metric. Use: portfolio, trades, holdings, referrals', 400);
  } catch (err: unknown) {
    const error = err as Error;
    return errorResponse(error?.message || 'Failed to fetch leaderboard', 500);
  }
}
