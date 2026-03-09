import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';

export const revalidate = 30;

/**
 * GET /api/characters/:slug/price-history
 * Returns price data points for charting.
 * Combines transaction history with the current price.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d'; // 1d, 7d, 30d, all

    const character = await prisma.character.findUnique({
      where: { slug },
      select: { id: true, currentPrice: true, createdAt: true },
    });

    if (!character) {
      return errorResponse('Character not found', 404);
    }

    // Calculate the start date based on period
    const now = new Date();
    let since: Date;
    switch (period) {
      case '1d':
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        since = character.createdAt;
    }

    // Get all transactions in the period, ordered by time
    const transactions = await prisma.transaction.findMany({
      where: {
        characterId: character.id,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        pricePerShare: true,
        createdAt: true,
        type: true,
      },
    });

    // Build price points: start with creation price, add each transaction, end with current
    const points: { time: string; price: number }[] = [];

    // Add initial point (character creation or period start)
    const startPrice = transactions.length > 0
      ? transactions[0].pricePerShare
      : character.currentPrice;

    points.push({
      time: since.toISOString(),
      price: startPrice,
    });

    // Add transaction price points
    for (const tx of transactions) {
      points.push({
        time: tx.createdAt.toISOString(),
        price: tx.pricePerShare,
      });
    }

    // Add current price as the last point
    points.push({
      time: now.toISOString(),
      price: character.currentPrice,
    });

    return successResponse({
      slug,
      period,
      currentPrice: character.currentPrice,
      points,
    });
  } catch (error) {
    console.error('Failed to fetch price history:', error);
    return errorResponse('Failed to fetch price history', 500);
  }
}
