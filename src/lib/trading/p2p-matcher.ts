/**
 * Peer-to-Peer Order Matching Engine (Phase 2 — Graduated)
 *
 * In the graduated phase, there's no bonding curve. Trading is purely
 * peer-to-peer: buyers match against sell orders, sellers match against
 * buy orders. Partial fills are supported.
 *
 * Market buys → match against cheapest sell limit orders (ascending price)
 * Market sells → match against highest buy limit orders (descending price)
 */

import { PLATFORM_FEE_RATE } from '@/lib/wallet/base';

type TxClient = Parameters<Parameters<import('@prisma/client').PrismaClient['$transaction']>[0]>[0];

interface P2PFillResult {
  filled: boolean;
  totalSharesFilled: number;
  totalCost: number;
  totalFees: number;
  fills: Array<{
    orderId: string;
    shares: number;
    pricePerShare: number;
    cost: number;
  }>;
  remainingShares: number;
}

/**
 * Execute a market buy by matching against sell limit orders in the order book.
 * Fills cheapest sell orders first (price-time priority).
 */
export async function matchMarketBuy(
  tx: TxClient,
  characterId: string,
  buyerUserId: string,
  shares: number,
): Promise<P2PFillResult> {
  const result: P2PFillResult = {
    filled: false,
    totalSharesFilled: 0,
    totalCost: 0,
    totalFees: 0,
    fills: [],
    remainingShares: shares,
  };

  // Find active sell orders sorted by price (cheapest first), then by time (oldest first)
  const sellOrders = await tx.limitOrder.findMany({
    where: {
      characterId,
      side: 'sell',
      status: { in: ['pending', 'partial'] },
      sharesRemaining: { gt: 0 },
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    orderBy: [
      { triggerPrice: 'asc' },
      { createdAt: 'asc' },
    ],
  });

  for (const order of sellOrders) {
    if (result.remainingShares <= 0) break;

    const fillShares = Math.min(result.remainingShares, order.sharesRemaining);
    const pricePerShare = order.triggerPrice;
    const cost = fillShares * pricePerShare;
    const fee = cost * PLATFORM_FEE_RATE;

    // Check buyer has enough USDC
    const buyer = await tx.user.findUnique({ where: { id: buyerUserId } });
    if (!buyer || buyer.usdcBalance < cost + fee) break;

    // Deduct USDC from buyer (cost + fee)
    await tx.user.update({
      where: { id: buyerUserId },
      data: { usdcBalance: { decrement: cost + fee } },
    });

    // Credit USDC to seller (from locked amount, minus seller fee)
    const sellerFee = cost * PLATFORM_FEE_RATE;
    const sellerProceeds = cost - sellerFee;
    await tx.user.update({
      where: { id: order.userId },
      data: { usdcBalance: { increment: sellerProceeds } },
    });

    // Transfer shares: create/update buyer's holding
    const buyerHolding = await tx.holding.findUnique({
      where: { userId_characterId: { userId: buyerUserId, characterId } },
    });

    if (buyerHolding) {
      const totalShares = buyerHolding.shares + fillShares;
      const totalCostBasis = (buyerHolding.avgBuyPrice * buyerHolding.shares) + cost;
      await tx.holding.update({
        where: { userId_characterId: { userId: buyerUserId, characterId } },
        data: { shares: totalShares, avgBuyPrice: totalCostBasis / totalShares },
      });
    } else {
      await tx.holding.create({
        data: {
          userId: buyerUserId,
          characterId,
          shares: fillShares,
          avgBuyPrice: pricePerShare,
        },
      });
    }

    // Update the sell order (shares were already removed from seller's holding at order creation)
    const newRemaining = order.sharesRemaining - fillShares;
    const newFilled = order.filledShares + fillShares;
    const isFullyFilled = newRemaining <= 0;

    await tx.limitOrder.update({
      where: { id: order.id },
      data: {
        sharesRemaining: newRemaining,
        filledShares: newFilled,
        status: isFullyFilled ? 'filled' : 'partial',
        ...(isFullyFilled ? { filledAt: new Date() } : {}),
      },
    });

    // Create transaction record for this fill
    await tx.transaction.create({
      data: {
        buyerId: buyerUserId,
        sellerId: order.userId,
        characterId,
        shares: fillShares,
        pricePerShare,
        total: cost,
        platformFee: fee + sellerFee,
        type: 'p2p_trade',
      },
    });

    result.fills.push({ orderId: order.id, shares: fillShares, pricePerShare, cost });
    result.totalSharesFilled += fillShares;
    result.totalCost += cost;
    result.totalFees += fee + sellerFee;
    result.remainingShares -= fillShares;
  }

  result.filled = result.totalSharesFilled > 0;

  // Update character's current price to last fill price
  if (result.fills.length > 0) {
    const lastFillPrice = result.fills[result.fills.length - 1].pricePerShare;
    const character = await tx.character.findUnique({ where: { id: characterId } });
    if (character) {
      await tx.character.update({
        where: { id: characterId },
        data: {
          currentPrice: lastFillPrice,
          marketCap: lastFillPrice * character.sharesIssued,
        },
      });
    }
  }

  return result;
}

/**
 * Execute a market sell by matching against buy limit orders in the order book.
 * Fills highest buy orders first (price-time priority).
 */
export async function matchMarketSell(
  tx: TxClient,
  characterId: string,
  sellerUserId: string,
  shares: number,
): Promise<P2PFillResult> {
  const result: P2PFillResult = {
    filled: false,
    totalSharesFilled: 0,
    totalCost: 0,
    totalFees: 0,
    fills: [],
    remainingShares: shares,
  };

  // Find active buy orders sorted by price (highest first), then by time (oldest first)
  const buyOrders = await tx.limitOrder.findMany({
    where: {
      characterId,
      side: 'buy',
      status: { in: ['pending', 'partial'] },
      sharesRemaining: { gt: 0 },
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    orderBy: [
      { triggerPrice: 'desc' },
      { createdAt: 'asc' },
    ],
  });

  // First verify seller has enough shares
  const sellerHolding = await tx.holding.findUnique({
    where: { userId_characterId: { userId: sellerUserId, characterId } },
  });

  if (!sellerHolding || sellerHolding.shares < shares) {
    return result; // Not enough shares
  }

  for (const order of buyOrders) {
    if (result.remainingShares <= 0) break;

    const fillShares = Math.min(result.remainingShares, order.sharesRemaining);
    const pricePerShare = order.triggerPrice;
    const cost = fillShares * pricePerShare;
    const sellerFee = cost * PLATFORM_FEE_RATE;
    const sellerProceeds = cost - sellerFee;

    // Credit USDC to seller
    await tx.user.update({
      where: { id: sellerUserId },
      data: { usdcBalance: { increment: sellerProceeds } },
    });

    // Transfer shares to buyer: create/update buyer's holding
    // (The buyer's USDC was already locked when they placed the buy limit order)
    const buyerHolding = await tx.holding.findUnique({
      where: { userId_characterId: { userId: order.userId, characterId } },
    });

    if (buyerHolding) {
      const totalShares = buyerHolding.shares + fillShares;
      const totalCostBasis = (buyerHolding.avgBuyPrice * buyerHolding.shares) + cost;
      await tx.holding.update({
        where: { userId_characterId: { userId: order.userId, characterId } },
        data: { shares: totalShares, avgBuyPrice: totalCostBasis / totalShares },
      });
    } else {
      await tx.holding.create({
        data: {
          userId: order.userId,
          characterId,
          shares: fillShares,
          avgBuyPrice: pricePerShare,
        },
      });
    }

    // Update the buy order
    const newRemaining = order.sharesRemaining - fillShares;
    const newFilled = order.filledShares + fillShares;
    const isFullyFilled = newRemaining <= 0;

    // Calculate proportional refund of locked amount for partial fills
    const proportionFilled = fillShares / order.shares;
    const lockedUsed = order.lockedAmount * proportionFilled;
    const buyerFee = cost * PLATFORM_FEE_RATE;

    // If the fill price is less than what was locked, refund excess to buyer
    const excess = lockedUsed - cost - buyerFee;
    if (excess > 0) {
      await tx.user.update({
        where: { id: order.userId },
        data: { usdcBalance: { increment: excess } },
      });
    }

    // If fully filled, refund any remaining locked amount
    if (isFullyFilled) {
      const actualSpent = result.fills.reduce((sum, f) => {
        if (f.orderId === order.id) return sum + f.cost;
        return sum;
      }, cost);
      const totalBuyerFees = actualSpent * PLATFORM_FEE_RATE;
      const finalRefund = order.lockedAmount - actualSpent - totalBuyerFees;
      if (finalRefund > 0.000001) {
        await tx.user.update({
          where: { id: order.userId },
          data: { usdcBalance: { increment: finalRefund } },
        });
      }
    }

    await tx.limitOrder.update({
      where: { id: order.id },
      data: {
        sharesRemaining: newRemaining,
        filledShares: newFilled,
        status: isFullyFilled ? 'filled' : 'partial',
        ...(isFullyFilled ? { filledAt: new Date() } : {}),
      },
    });

    // Create transaction record
    await tx.transaction.create({
      data: {
        buyerId: order.userId,
        sellerId: sellerUserId,
        characterId,
        shares: fillShares,
        pricePerShare,
        total: cost,
        platformFee: sellerFee + buyerFee,
        type: 'p2p_trade',
      },
    });

    result.fills.push({ orderId: order.id, shares: fillShares, pricePerShare, cost });
    result.totalSharesFilled += fillShares;
    result.totalCost += cost;
    result.totalFees += sellerFee + buyerFee;
    result.remainingShares -= fillShares;
  }

  // Deduct sold shares from seller's holding
  if (result.totalSharesFilled > 0) {
    const updatedHolding = await tx.holding.findUnique({
      where: { userId_characterId: { userId: sellerUserId, characterId } },
    });

    if (updatedHolding) {
      const newShares = updatedHolding.shares - result.totalSharesFilled;
      if (newShares <= 0) {
        await tx.holding.delete({
          where: { userId_characterId: { userId: sellerUserId, characterId } },
        });
      } else {
        await tx.holding.update({
          where: { userId_characterId: { userId: sellerUserId, characterId } },
          data: { shares: newShares },
        });
      }
    }
  }

  result.filled = result.totalSharesFilled > 0;

  // Update character's current price to last fill price
  if (result.fills.length > 0) {
    const lastFillPrice = result.fills[result.fills.length - 1].pricePerShare;
    const character = await tx.character.findUnique({ where: { id: characterId } });
    if (character) {
      await tx.character.update({
        where: { id: characterId },
        data: {
          currentPrice: lastFillPrice,
          marketCap: lastFillPrice * character.sharesIssued,
        },
      });
    }
  }

  return result;
}

/**
 * Try to match a newly placed limit order against existing opposite-side orders.
 * If a buy limit is placed at $0.05 and there's a sell at $0.04, they match.
 */
export async function matchNewLimitOrder(
  tx: TxClient,
  order: {
    id: string;
    userId: string;
    characterId: string;
    side: string;
    shares: number;
    sharesRemaining: number;
    triggerPrice: number;
    lockedAmount: number;
  },
): Promise<{ sharesFilled: number }> {
  if (order.side === 'buy') {
    // Buy limit order: match against sell orders at or below our price
    const sellOrders = await tx.limitOrder.findMany({
      where: {
        characterId: order.characterId,
        side: 'sell',
        status: { in: ['pending', 'partial'] },
        sharesRemaining: { gt: 0 },
        triggerPrice: { lte: order.triggerPrice },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: [
        { triggerPrice: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    let sharesFilled = 0;
    let remainingShares = order.sharesRemaining;
    let amountSpent = 0;

    for (const sellOrder of sellOrders) {
      if (remainingShares <= 0) break;

      const fillShares = Math.min(remainingShares, sellOrder.sharesRemaining);
      const pricePerShare = sellOrder.triggerPrice; // Execute at seller's ask price
      const cost = fillShares * pricePerShare;
      const buyerFee = cost * PLATFORM_FEE_RATE;
      const sellerFee = cost * PLATFORM_FEE_RATE;

      // Credit seller (shares were already locked when sell order was placed)
      const sellerProceeds = cost - sellerFee;
      await tx.user.update({
        where: { id: sellOrder.userId },
        data: { usdcBalance: { increment: sellerProceeds } },
      });

      // Transfer shares to buyer
      const buyerHolding = await tx.holding.findUnique({
        where: { userId_characterId: { userId: order.userId, characterId: order.characterId } },
      });

      if (buyerHolding) {
        const totalShares = buyerHolding.shares + fillShares;
        const totalCostBasis = (buyerHolding.avgBuyPrice * buyerHolding.shares) + cost;
        await tx.holding.update({
          where: { userId_characterId: { userId: order.userId, characterId: order.characterId } },
          data: { shares: totalShares, avgBuyPrice: totalCostBasis / totalShares },
        });
      } else {
        await tx.holding.create({
          data: {
            userId: order.userId,
            characterId: order.characterId,
            shares: fillShares,
            avgBuyPrice: pricePerShare,
          },
        });
      }

      // Update sell order
      const sellNewRemaining = sellOrder.sharesRemaining - fillShares;
      const sellNewFilled = sellOrder.filledShares + fillShares;
      await tx.limitOrder.update({
        where: { id: sellOrder.id },
        data: {
          sharesRemaining: sellNewRemaining,
          filledShares: sellNewFilled,
          status: sellNewRemaining <= 0 ? 'filled' : 'partial',
          ...(sellNewRemaining <= 0 ? { filledAt: new Date() } : {}),
        },
      });

      // Create transaction
      await tx.transaction.create({
        data: {
          buyerId: order.userId,
          sellerId: sellOrder.userId,
          characterId: order.characterId,
          shares: fillShares,
          pricePerShare,
          total: cost,
          platformFee: buyerFee + sellerFee,
          type: 'p2p_trade',
        },
      });

      sharesFilled += fillShares;
      remainingShares -= fillShares;
      amountSpent += cost + buyerFee;
    }

    // Update our buy order
    if (sharesFilled > 0) {
      const newRemaining = order.sharesRemaining - sharesFilled;
      const newFilled = (order.shares - order.sharesRemaining) + sharesFilled;

      // Refund unused locked amount
      const refund = order.lockedAmount - amountSpent;
      if (refund > 0.000001 && newRemaining <= 0) {
        await tx.user.update({
          where: { id: order.userId },
          data: { usdcBalance: { increment: refund } },
        });
      }

      await tx.limitOrder.update({
        where: { id: order.id },
        data: {
          sharesRemaining: newRemaining,
          filledShares: newFilled,
          status: newRemaining <= 0 ? 'filled' : 'partial',
          ...(newRemaining <= 0 ? { filledAt: new Date() } : {}),
        },
      });

      // Update character price
      const character = await tx.character.findUnique({ where: { id: order.characterId } });
      if (character) {
        const lastPrice = sellOrders[Math.min(sellOrders.length - 1, sharesFilled > 0 ? sellOrders.length - 1 : 0)].triggerPrice;
        await tx.character.update({
          where: { id: order.characterId },
          data: {
            currentPrice: lastPrice,
            marketCap: lastPrice * character.sharesIssued,
          },
        });
      }
    }

    return { sharesFilled };
  } else {
    // Sell limit order: match against buy orders at or above our price
    const buyOrders = await tx.limitOrder.findMany({
      where: {
        characterId: order.characterId,
        side: 'buy',
        status: { in: ['pending', 'partial'] },
        sharesRemaining: { gt: 0 },
        triggerPrice: { gte: order.triggerPrice },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: [
        { triggerPrice: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    let sharesFilled = 0;
    let remainingShares = order.sharesRemaining;

    for (const buyOrder of buyOrders) {
      if (remainingShares <= 0) break;

      const fillShares = Math.min(remainingShares, buyOrder.sharesRemaining);
      const pricePerShare = order.triggerPrice; // Execute at seller's ask price
      const cost = fillShares * pricePerShare;
      const sellerFee = cost * PLATFORM_FEE_RATE;
      const buyerFee = cost * PLATFORM_FEE_RATE;

      // Credit seller (the one who placed this limit sell)
      const sellerProceeds = cost - sellerFee;
      await tx.user.update({
        where: { id: order.userId },
        data: { usdcBalance: { increment: sellerProceeds } },
      });

      // Transfer shares to buyer
      const buyerHolding = await tx.holding.findUnique({
        where: { userId_characterId: { userId: buyOrder.userId, characterId: order.characterId } },
      });

      if (buyerHolding) {
        const totalShares = buyerHolding.shares + fillShares;
        const totalCostBasis = (buyerHolding.avgBuyPrice * buyerHolding.shares) + cost;
        await tx.holding.update({
          where: { userId_characterId: { userId: buyOrder.userId, characterId: order.characterId } },
          data: { shares: totalShares, avgBuyPrice: totalCostBasis / totalShares },
        });
      } else {
        await tx.holding.create({
          data: {
            userId: buyOrder.userId,
            characterId: order.characterId,
            shares: fillShares,
            avgBuyPrice: pricePerShare,
          },
        });
      }

      // Update buy order and refund excess
      const buyNewRemaining = buyOrder.sharesRemaining - fillShares;
      const buyNewFilled = buyOrder.filledShares + fillShares;
      const proportionUsed = fillShares / buyOrder.shares;
      const lockedUsed = buyOrder.lockedAmount * proportionUsed;
      const excess = lockedUsed - cost - buyerFee;
      if (excess > 0.000001) {
        await tx.user.update({
          where: { id: buyOrder.userId },
          data: { usdcBalance: { increment: excess } },
        });
      }

      // If fully filled, refund remaining locked amount
      if (buyNewRemaining <= 0) {
        const totalLockedUsed = cost + buyerFee;
        // Account for previous partial fills too
        const previousFillsProportion = buyOrder.filledShares / buyOrder.shares;
        const previousLockedUsed = buyOrder.lockedAmount * previousFillsProportion;
        const remainingLocked = buyOrder.lockedAmount - previousLockedUsed - totalLockedUsed;
        if (remainingLocked > 0.000001) {
          await tx.user.update({
            where: { id: buyOrder.userId },
            data: { usdcBalance: { increment: remainingLocked } },
          });
        }
      }

      await tx.limitOrder.update({
        where: { id: buyOrder.id },
        data: {
          sharesRemaining: buyNewRemaining,
          filledShares: buyNewFilled,
          status: buyNewRemaining <= 0 ? 'filled' : 'partial',
          ...(buyNewRemaining <= 0 ? { filledAt: new Date() } : {}),
        },
      });

      await tx.transaction.create({
        data: {
          buyerId: buyOrder.userId,
          sellerId: order.userId,
          characterId: order.characterId,
          shares: fillShares,
          pricePerShare,
          total: cost,
          platformFee: sellerFee + buyerFee,
          type: 'p2p_trade',
        },
      });

      sharesFilled += fillShares;
      remainingShares -= fillShares;
    }

    // Update our sell order
    if (sharesFilled > 0) {
      const newRemaining = order.sharesRemaining - sharesFilled;
      const newFilled = (order.shares - order.sharesRemaining) + sharesFilled;

      await tx.limitOrder.update({
        where: { id: order.id },
        data: {
          sharesRemaining: newRemaining,
          filledShares: newFilled,
          status: newRemaining <= 0 ? 'filled' : 'partial',
          ...(newRemaining <= 0 ? { filledAt: new Date() } : {}),
        },
      });

      // Update character price
      const character = await tx.character.findUnique({ where: { id: order.characterId } });
      if (character) {
        await tx.character.update({
          where: { id: order.characterId },
          data: {
            currentPrice: order.triggerPrice,
            marketCap: order.triggerPrice * character.sharesIssued,
          },
        });
      }
    }

    return { sharesFilled };
  }
}
