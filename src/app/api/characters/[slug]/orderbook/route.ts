import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';

/**
 * GET /api/characters/[slug]/orderbook
 * Returns the current order book for a character (buy/sell limit orders).
 * Available for both phases but most useful in graduated phase.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const character = await prisma.character.findUnique({
      where: { slug },
      select: { id: true, phase: true, currentPrice: true, totalShares: true, sharesIssued: true },
    });

    if (!character) {
      return errorResponse('Character not found', 404);
    }

    const now = new Date();

    // Fetch active buy orders (bids) — highest price first
    const buyOrders = await prisma.limitOrder.findMany({
      where: {
        characterId: character.id,
        side: 'buy',
        status: { in: ['pending', 'partial'] },
        sharesRemaining: { gt: 0 },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      orderBy: [
        { triggerPrice: 'desc' },
        { createdAt: 'asc' },
      ],
      select: {
        id: true,
        triggerPrice: true,
        shares: true,
        sharesRemaining: true,
        createdAt: true,
      },
      take: 50,
    });

    // Fetch active sell orders (asks) — lowest price first
    const sellOrders = await prisma.limitOrder.findMany({
      where: {
        characterId: character.id,
        side: 'sell',
        status: { in: ['pending', 'partial'] },
        sharesRemaining: { gt: 0 },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      orderBy: [
        { triggerPrice: 'asc' },
        { createdAt: 'asc' },
      ],
      select: {
        id: true,
        triggerPrice: true,
        shares: true,
        sharesRemaining: true,
        createdAt: true,
      },
      take: 50,
    });

    // Aggregate by price level
    const aggregateBids = aggregateByPrice(buyOrders);
    const aggregateAsks = aggregateByPrice(sellOrders);

    // Calculate spread
    const bestBid = aggregateBids.length > 0 ? aggregateBids[0].price : null;
    const bestAsk = aggregateAsks.length > 0 ? aggregateAsks[0].price : null;
    const spread = bestBid && bestAsk ? bestAsk - bestBid : null;
    const spreadPercent = spread && bestBid ? (spread / bestBid) * 100 : null;

    return successResponse({
      phase: character.phase,
      currentPrice: character.currentPrice,
      bids: aggregateBids,
      asks: aggregateAsks,
      bestBid,
      bestAsk,
      spread,
      spreadPercent,
      totalBidVolume: aggregateBids.reduce((sum, b) => sum + b.totalShares, 0),
      totalAskVolume: aggregateAsks.reduce((sum, a) => sum + a.totalShares, 0),
    });
  } catch (error) {
    console.error('Failed to fetch order book:', error);
    return errorResponse('Failed to fetch order book', 500);
  }
}

function aggregateByPrice(
  orders: Array<{ triggerPrice: number; sharesRemaining: number }>
): Array<{ price: number; totalShares: number; orderCount: number }> {
  const map = new Map<number, { totalShares: number; orderCount: number }>();

  for (const order of orders) {
    const existing = map.get(order.triggerPrice) || { totalShares: 0, orderCount: 0 };
    existing.totalShares += order.sharesRemaining;
    existing.orderCount += 1;
    map.set(order.triggerPrice, existing);
  }

  return Array.from(map.entries()).map(([price, data]) => ({
    price,
    totalShares: data.totalShares,
    orderCount: data.orderCount,
  }));
}
