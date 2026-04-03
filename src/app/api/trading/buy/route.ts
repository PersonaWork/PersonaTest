import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api';
import { tradeLimiter } from '@/lib/rate-limit';
import { matchLimitOrders } from '@/lib/trading/order-matcher';
import { matchMarketBuy } from '@/lib/trading/p2p-matcher';
import { BONDING_FEE_RATE, BONDING_CURVE_FACTOR, VIRTUAL_LIQUIDITY, PHASE_GRADUATED, MAX_WHALE_PERCENT } from '@/lib/wallet/base';
import { z } from 'zod';

const BuySchema = z.object({
  characterId: z.string().min(1, 'Character ID is required'),
  shares: z.number().int().positive('Shares must be a positive integer'),
});

export async function POST(request: NextRequest) {
  try {
    const { claims } = await requireAuth(request.headers);

    // Rate limit: 5 trades per 10 seconds
    const rl = tradeLimiter(claims.userId);
    if (!rl.success) return errorResponse('Too many trades. Slow down.', 429);

    const body = await request.json().catch(() => ({}));

    const parsed = BuySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { characterId, shares } = parsed.data;
    const userId = claims.userId;

    if (!userId) {
      return errorResponse('User ID not found in claims', 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { privyId: userId } });
      if (!user) throw new Error('User not found in database');

      const character = await tx.character.findUnique({ where: { id: characterId } });
      if (!character) throw new Error('Character not found');

      // ─── GRADUATED PHASE: P2P order book ───
      if (character.phase === PHASE_GRADUATED) {
        const p2pResult = await matchMarketBuy(tx, characterId, user.id, shares);

        if (!p2pResult.filled) {
          throw new Error('No sellers available. Place a limit buy order to wait for sellers.');
        }

        return {
          phase: 'GRADUATED',
          totalSharesFilled: p2pResult.totalSharesFilled,
          totalCost: p2pResult.totalCost,
          totalFees: p2pResult.totalFees,
          fills: p2pResult.fills.length,
          remainingUnfilled: p2pResult.remainingShares,
          newPrice: character.currentPrice,
        };
      }

      // ─── BONDING CURVE PHASE: Protocol is counterparty ───
      const existingHolding = await tx.holding.findUnique({
        where: { userId_characterId: { userId: user.id, characterId } }
      });

      // Check supply cap — bonding curve phase has a max supply
      const availableShares = character.totalShares - character.sharesIssued;
      if (shares > availableShares) {
        throw new Error(
          availableShares === 0
            ? 'All shares have been issued. This character has graduated to free market trading — use limit orders.'
            : `Only ${availableShares} shares available. ${character.sharesIssued}/${character.totalShares} already issued.`
        );
      }

      // Anti-whale protection — max 1% of total shares per user during bonding curve
      const maxPerUser = Math.floor(character.totalShares * MAX_WHALE_PERCENT);
      const currentlyOwned = existingHolding?.shares || 0;
      const afterBuy = currentlyOwned + shares;
      if (afterBuy > maxPerUser) {
        const canStillBuy = Math.max(0, maxPerUser - currentlyOwned);
        throw new Error(
          canStillBuy === 0
            ? `Anti-whale limit: You already own ${currentlyOwned} shares (max ${maxPerUser} per user during launch phase).`
            : `Anti-whale limit: You can buy up to ${canStillBuy} more shares (max ${maxPerUser} per user during launch phase). You own ${currentlyOwned}.`
        );
      }

      // Calculate price with bonding curve
      const currentPrice = character.currentPrice;
      const pricePerShare = currentPrice * (1 + (shares / (character.sharesIssued + VIRTUAL_LIQUIDITY)) * BONDING_CURVE_FACTOR);
      const totalCost = shares * pricePerShare;
      const fee = totalCost * BONDING_FEE_RATE;
      const totalWithFee = totalCost + fee;

      if (user.usdcBalance < totalWithFee) {
        throw new Error(`Insufficient USDC balance. Need ${totalWithFee.toFixed(6)} USDC (incl. 2% fee) but have ${user.usdcBalance.toFixed(6)} USDC`);
      }

      // Deduct USDC from buyer
      await tx.user.update({
        where: { id: user.id },
        data: { usdcBalance: { decrement: totalWithFee } },
      });

      // Calculate new state
      const newPrice = currentPrice * (1 + (shares / (character.sharesIssued + VIRTUAL_LIQUIDITY)) * BONDING_CURVE_FACTOR);
      const newSharesIssued = character.sharesIssued + shares;
      const newMarketCap = newPrice * newSharesIssued;
      const newPoolBalance = character.poolBalance + totalCost; // USDC goes into liquidity pool

      // Check for graduation
      const shouldGraduate = newSharesIssued >= character.totalShares;

      // Create transaction record
      const transactionRecord = await tx.transaction.create({
        data: {
          buyerId: user.id,
          characterId,
          shares,
          pricePerShare,
          total: totalCost,
          platformFee: fee,
          type: 'buy'
        }
      });

      // Update or create holding
      let holding;
      if (existingHolding) {
        const totalSharesOwned = existingHolding.shares + shares;
        const totalCostBasis = (existingHolding.avgBuyPrice * existingHolding.shares) + totalCost;
        const newAvgPrice = totalCostBasis / totalSharesOwned;

        holding = await tx.holding.update({
          where: { userId_characterId: { userId: user.id, characterId } },
          data: { shares: totalSharesOwned, avgBuyPrice: newAvgPrice }
        });
      } else {
        holding = await tx.holding.create({
          data: { userId: user.id, characterId, shares, avgBuyPrice: pricePerShare }
        });
      }

      // Update character (including pool balance and possible graduation)
      await tx.character.update({
        where: { id: characterId },
        data: {
          currentPrice: newPrice,
          sharesIssued: newSharesIssued,
          marketCap: newMarketCap,
          poolBalance: newPoolBalance,
          ...(shouldGraduate ? {
            phase: PHASE_GRADUATED,
            graduatedAt: new Date(),
          } : {}),
        }
      });

      // Check limit orders
      const { filledOrderIds } = await matchLimitOrders(tx, characterId);

      return {
        phase: 'BONDING_CURVE',
        transaction: transactionRecord,
        holding,
        newPrice,
        totalCost,
        fee,
        totalCharged: totalWithFee,
        filledLimitOrders: filledOrderIds.length,
        graduated: shouldGraduate,
        poolBalance: newPoolBalance,
      };
    }, { timeout: 30000, isolationLevel: 'Serializable' });

    return successResponse(result);

  } catch (err: unknown) {
    const error = err as Error & { code?: string; statusCode?: number };
    console.error('Buy failed:', error);
    if (error.code === 'P2034') {
      return errorResponse('Trade conflict — please retry', 409);
    }
    if (error.message === 'User not found in database') {
      return errorResponse(error.message, 404);
    }
    if (error.message === 'Character not found') {
      return errorResponse(error.message, 404);
    }
    if (error.message?.startsWith('Insufficient USDC balance') ||
        error.message?.startsWith('All shares have been issued') ||
        error.message?.startsWith('Only ') ||
        error.message?.startsWith('No sellers available') ||
        error.message?.startsWith('Anti-whale limit')) {
      return errorResponse(error.message, 400);
    }
    const status = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    return errorResponse(error?.message || 'Transaction failed', status);
  }
}
