/**
 * Limit Order Matching Engine (Phase 1 — Bonding Curve)
 *
 * Called inside existing buy/sell Prisma transactions after price updates.
 * Finds and executes any pending limit orders that are now triggerable.
 * Handles cascading: if executing an order changes the price enough
 * to trigger another order, that one executes too (up to maxCascadeDepth).
 *
 * NOTE: This only runs for BONDING_CURVE phase characters.
 * Graduated phase characters use p2p-matcher.ts instead.
 */

import { PLATFORM_FEE_RATE, BONDING_CURVE_FACTOR, PRICE_FLOOR, VIRTUAL_LIQUIDITY, PHASE_GRADUATED } from '@/lib/wallet/base';

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
    const character = await tx.character.findUnique({ where: { id: characterId } });
    if (!character) break;

    // Skip graduated characters — they use P2P matching
    if (character.phase === PHASE_GRADUATED) break;

    const currentPrice = character.currentPrice;
    const now = new Date();

    // Find pending limit orders that should trigger
    const pendingOrders = await tx.limitOrder.findMany({
      where: {
        characterId,
        status: 'pending',
        OR: [
          { side: 'buy', triggerPrice: { gte: currentPrice } },
          { side: 'sell', triggerPrice: { lte: currentPrice } },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    // Separate expired from valid
    const expiredOrders = pendingOrders.filter(
      (o) => o.expiresAt && o.expiresAt <= now
    );
    const validOrders = pendingOrders.filter(
      (o) => !o.expiresAt || o.expiresAt > now
    );

    for (const expired of expiredOrders) {
      await expireOrder(tx, expired);
    }

    if (validOrders.length === 0) break;

    const order = validOrders[0];
    const filled = await executeOrder(tx, order, character);
    if (filled) {
      filledOrderIds.push(order.id);
    } else {
      break;
    }

    depth++;
  }

  return { filledOrderIds };
}

async function executeOrder(
  tx: TxClient,
  order: { id: string; userId: string; characterId: string; side: string; shares: number; lockedAmount: number },
  character: { id: string; currentPrice: number; totalShares: number; sharesIssued: number; poolBalance: number; phase: string }
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
  character: { id: string; currentPrice: number; totalShares: number; sharesIssued: number; poolBalance: number; phase: string }
): Promise<boolean> {
  // Check supply cap in bonding curve phase
  const availableShares = character.totalShares - character.sharesIssued;
  if (order.shares > availableShares) return false;

  const pricePerShare = character.currentPrice * (1 + (order.shares / (character.sharesIssued + VIRTUAL_LIQUIDITY)) * BONDING_CURVE_FACTOR);
  const totalCost = order.shares * pricePerShare;
  const fee = totalCost * PLATFORM_FEE_RATE;
  const totalWithFee = totalCost + fee;

  if (totalWithFee > order.lockedAmount) return false;

  // Refund excess
  const refund = order.lockedAmount - totalWithFee;
  if (refund > 0) {
    await tx.user.update({
      where: { id: order.userId },
      data: { usdcBalance: { increment: refund } },
    });
  }

  // Update character price, shares, and pool balance
  const newPrice = character.currentPrice * (1 + (order.shares / (character.sharesIssued + VIRTUAL_LIQUIDITY)) * BONDING_CURVE_FACTOR);
  const newSharesIssued = character.sharesIssued + order.shares;
  const newMarketCap = newPrice * newSharesIssued;
  const newPoolBalance = character.poolBalance + totalCost;

  // Check for graduation
  const shouldGraduate = newSharesIssued >= character.totalShares;

  await tx.character.update({
    where: { id: character.id },
    data: {
      currentPrice: newPrice,
      sharesIssued: newSharesIssued,
      marketCap: newMarketCap,
      poolBalance: newPoolBalance,
      ...(shouldGraduate ? {
        phase: PHASE_GRADUATED,
        graduatedAt: new Date(),
      } : {}),
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
      platformFee: fee,
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
    await tx.holding.update({
      where: { userId_characterId: { userId: order.userId, characterId: order.characterId } },
      data: { shares: totalSharesOwned, avgBuyPrice: totalCostBasis / totalSharesOwned },
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
    data: {
      status: 'filled',
      filledAt: new Date(),
      transactionId: txnRecord.id,
      sharesRemaining: 0,
      filledShares: order.shares,
    },
  });

  return true;
}

async function executeLimitSell(
  tx: TxClient,
  order: { id: string; userId: string; characterId: string; shares: number; lockedAmount: number },
  character: { id: string; currentPrice: number; totalShares: number; sharesIssued: number; poolBalance: number; phase: string }
): Promise<boolean> {
  const pricePerShare = Math.max(PRICE_FLOOR, character.currentPrice * (1 - (order.shares / (character.sharesIssued + VIRTUAL_LIQUIDITY)) * BONDING_CURVE_FACTOR));
  const totalProceeds = order.shares * pricePerShare;
  const fee = totalProceeds * PLATFORM_FEE_RATE;
  const proceedsAfterFee = totalProceeds - fee;

  // Verify pool has enough liquidity
  if (character.poolBalance < totalProceeds) return false;

  // Credit seller
  await tx.user.update({
    where: { id: order.userId },
    data: { usdcBalance: { increment: proceedsAfterFee } },
  });

  // Update character (burning supply, draining pool)
  const newPrice = Math.max(PRICE_FLOOR, character.currentPrice * (1 - (order.shares / (character.sharesIssued + VIRTUAL_LIQUIDITY)) * BONDING_CURVE_FACTOR));
  const newSharesIssued = character.sharesIssued - order.shares;
  const newMarketCap = newPrice * newSharesIssued;
  const newPoolBalance = character.poolBalance - totalProceeds;

  await tx.character.update({
    where: { id: character.id },
    data: {
      currentPrice: newPrice,
      sharesIssued: newSharesIssued,
      marketCap: newMarketCap,
      poolBalance: newPoolBalance,
    },
  });

  const txnRecord = await tx.transaction.create({
    data: {
      sellerId: order.userId,
      characterId: order.characterId,
      shares: order.shares,
      pricePerShare,
      total: totalProceeds,
      platformFee: fee,
      type: 'sell',
    },
  });

  await tx.limitOrder.update({
    where: { id: order.id },
    data: {
      status: 'filled',
      filledAt: new Date(),
      transactionId: txnRecord.id,
      sharesRemaining: 0,
      filledShares: order.shares,
    },
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
    await tx.user.update({
      where: { id: order.userId },
      data: { usdcBalance: { increment: order.lockedAmount } },
    });
  } else {
    const existingHolding = await tx.holding.findUnique({
      where: { userId_characterId: { userId: order.userId, characterId: order.characterId } },
    });

    if (existingHolding) {
      await tx.holding.update({
        where: { userId_characterId: { userId: order.userId, characterId: order.characterId } },
        data: { shares: { increment: order.shares } },
      });
    } else {
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
