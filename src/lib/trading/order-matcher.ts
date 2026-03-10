/**
 * Limit Order Matching Engine
 *
 * Called inside existing buy/sell Prisma transactions after price updates.
 * Finds and executes any pending limit orders that are now triggerable.
 * Handles cascading: if executing an order changes the price enough
 * to trigger another order, that one executes too (up to maxCascadeDepth).
 */

// Use Prisma's transaction client type
type TxClient = Parameters<Parameters<import('@prisma/client').PrismaClient['$transaction']>[0]>[0];

interface MatchResult {
  filledOrderIds: string[];
}

export async function matchLimitOrders(
  tx: TxClient,
  characterId: string,
  maxCascadeDepth: number = 10
): Promise<MatchResult> {
  const filledOrderIds: string[] = [];
  let depth = 0;

  while (depth < maxCascadeDepth) {
    // Re-fetch character price (may have changed from previous cascade iteration)
    const character = await tx.character.findUnique({ where: { id: characterId } });
    if (!character) break;

    const currentPrice = character.currentPrice;
    const now = new Date();

    // Find all pending limit orders for this character that should trigger
    // Limit buy: triggers when currentPrice <= triggerPrice (price dropped to target)
    // Limit sell: triggers when currentPrice >= triggerPrice (price rose to target)
    const pendingOrders = await tx.limitOrder.findMany({
      where: {
        characterId,
        status: 'pending',
        OR: [
          { side: 'buy', triggerPrice: { gte: currentPrice } },
          { side: 'sell', triggerPrice: { lte: currentPrice } },
        ],
      },
      orderBy: { createdAt: 'asc' }, // FIFO: oldest orders execute first
    });

    // Separate expired from valid
    const expiredOrders = pendingOrders.filter(
      (o) => o.expiresAt && o.expiresAt <= now
    );
    const validOrders = pendingOrders.filter(
      (o) => !o.expiresAt || o.expiresAt > now
    );

    // Mark expired ones and refund
    for (const expired of expiredOrders) {
      await expireOrder(tx, expired);
    }

    if (validOrders.length === 0) break;

    // Execute one order at a time (price changes after each)
    const order = validOrders[0];
    const filled = await executeOrder(tx, order, character);
    if (filled) {
      filledOrderIds.push(order.id);
    } else {
      // If we couldn't fill the first qualifying order, skip it and try next
      // This handles the case where locked amount is insufficient
      // But we break to avoid infinite loops on the same unfillable order
      break;
    }

    depth++;
  }

  return { filledOrderIds };
}

async function executeOrder(
  tx: TxClient,
  order: { id: string; userId: string; characterId: string; side: string; shares: number; lockedAmount: number },
  character: { id: string; currentPrice: number; totalShares: number; sharesIssued: number }
): Promise<boolean> {
  if (order.side === 'buy') {
    return executeLimitBuy(tx, order, character);
  } else {
    return executeLimitSell(tx, order, character);
  }
}

async function executeLimitBuy(
  tx: TxClient,
  order: { id: string; userId: string; characterId: string; shares: number; lockedAmount: number },
  character: { id: string; currentPrice: number; totalShares: number; sharesIssued: number }
): Promise<boolean> {
  // Calculate actual cost at current bonding curve price
  const pricePerShare = character.currentPrice * (1 + (order.shares / character.totalShares) * 0.05);
  const totalCost = order.shares * pricePerShare;

  // Check if locked amount covers the actual cost
  // If price moved unfavorably, locked funds may be insufficient — skip (don't cancel)
  if (totalCost > order.lockedAmount) {
    return false;
  }

  // Funds were already deducted at order creation. Refund any excess.
  const refund = order.lockedAmount - totalCost;
  if (refund > 0) {
    await tx.user.update({
      where: { id: order.userId },
      data: { usdcBalance: { increment: refund } },
    });
  }

  // Update character price and shares
  const newPrice = character.currentPrice * (1 + (order.shares / character.totalShares) * 0.05);
  const newSharesIssued = character.sharesIssued + order.shares;
  const newMarketCap = newPrice * newSharesIssued;

  await tx.character.update({
    where: { id: character.id },
    data: {
      currentPrice: newPrice,
      sharesIssued: newSharesIssued,
      marketCap: newMarketCap,
    },
  });

  // Create transaction record
  const txnRecord = await tx.transaction.create({
    data: {
      buyerId: order.userId,
      characterId: order.characterId,
      shares: order.shares,
      pricePerShare,
      total: totalCost,
      type: 'buy',
    },
  });

  // Update or create holding
  const existingHolding = await tx.holding.findUnique({
    where: { userId_characterId: { userId: order.userId, characterId: order.characterId } },
  });

  if (existingHolding) {
    const totalSharesOwned = existingHolding.shares + order.shares;
    const totalCostBasis = (existingHolding.avgBuyPrice * existingHolding.shares) + totalCost;
    const newAvgPrice = totalCostBasis / totalSharesOwned;

    await tx.holding.update({
      where: { userId_characterId: { userId: order.userId, characterId: order.characterId } },
      data: { shares: totalSharesOwned, avgBuyPrice: newAvgPrice },
    });
  } else {
    await tx.holding.create({
      data: {
        userId: order.userId,
        characterId: order.characterId,
        shares: order.shares,
        avgBuyPrice: pricePerShare,
      },
    });
  }

  // Mark order as filled
  await tx.limitOrder.update({
    where: { id: order.id },
    data: { status: 'filled', filledAt: new Date(), transactionId: txnRecord.id },
  });

  return true;
}

async function executeLimitSell(
  tx: TxClient,
  order: { id: string; userId: string; characterId: string; shares: number; lockedAmount: number },
  character: { id: string; currentPrice: number; totalShares: number; sharesIssued: number }
): Promise<boolean> {
  // Calculate proceeds at current bonding curve price
  const pricePerShare = Math.max(0.01, character.currentPrice * (1 - (order.shares / character.totalShares) * 0.05));
  const totalProceeds = order.shares * pricePerShare;

  // Shares were already deducted from holding at order creation. Credit USDC.
  await tx.user.update({
    where: { id: order.userId },
    data: { usdcBalance: { increment: totalProceeds } },
  });

  // Update character price
  const newPrice = Math.max(0.01, character.currentPrice * (1 - (order.shares / character.totalShares) * 0.05));
  const newSharesIssued = character.sharesIssued - order.shares;
  const newMarketCap = newPrice * newSharesIssued;

  await tx.character.update({
    where: { id: character.id },
    data: {
      currentPrice: newPrice,
      sharesIssued: newSharesIssued,
      marketCap: newMarketCap,
    },
  });

  // Create transaction record
  const txnRecord = await tx.transaction.create({
    data: {
      sellerId: order.userId,
      characterId: order.characterId,
      shares: order.shares,
      pricePerShare,
      total: totalProceeds,
      type: 'sell',
    },
  });

  // Mark order as filled
  await tx.limitOrder.update({
    where: { id: order.id },
    data: { status: 'filled', filledAt: new Date(), transactionId: txnRecord.id },
  });

  return true;
}

async function expireOrder(
  tx: TxClient,
  order: {
    id: string;
    userId: string;
    characterId: string;
    side: string;
    shares: number;
    lockedAmount: number;
    lockedAvgBuyPrice: number | null;
  }
): Promise<void> {
  if (order.side === 'buy') {
    // Refund locked USDC
    await tx.user.update({
      where: { id: order.userId },
      data: { usdcBalance: { increment: order.lockedAmount } },
    });
  } else {
    // Return locked shares to holding
    const existingHolding = await tx.holding.findUnique({
      where: { userId_characterId: { userId: order.userId, characterId: order.characterId } },
    });

    if (existingHolding) {
      await tx.holding.update({
        where: { userId_characterId: { userId: order.userId, characterId: order.characterId } },
        data: { shares: { increment: order.shares } },
      });
    } else {
      // Holding was deleted — recreate with saved avgBuyPrice
      await tx.holding.create({
        data: {
          userId: order.userId,
          characterId: order.characterId,
          shares: order.shares,
          avgBuyPrice: order.lockedAvgBuyPrice ?? 0,
        },
      });
    }
  }

  await tx.limitOrder.update({
    where: { id: order.id },
    data: { status: 'expired', cancelledAt: new Date() },
  });
}
