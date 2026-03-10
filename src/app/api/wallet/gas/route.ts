import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';
import { requireAuth } from '@/lib/auth';
import {
  getEthBalance,
  sendEthFromGasStation,
  GAS_MIN_THRESHOLD,
  GAS_TOPUP_AMOUNT,
} from '@/lib/wallet/base';

const GAS_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours between gas top-ups

/**
 * POST /api/wallet/gas — Auto-fund user with ETH for gas if needed
 *
 * Flow:
 * 1. Check user's ETH balance on Base
 * 2. If below threshold, send ETH from gas station wallet
 * 3. Rate-limited to once per 24h per user
 */
export async function POST(request: NextRequest) {
  try {
    const { claims } = await requireAuth(request.headers);
    const user = await prisma.user.findUnique({ where: { privyId: claims.userId } });
    if (!user) return errorResponse('User not found', 404);
    if (!user.walletAddress) return errorResponse('No wallet address on file', 400);

    // Check rate limit (once per 24h)
    if (user.lastGasFundedAt) {
      const timeSinceLastFund = Date.now() - user.lastGasFundedAt.getTime();
      if (timeSinceLastFund < GAS_COOLDOWN_MS) {
        const hoursRemaining = Math.ceil((GAS_COOLDOWN_MS - timeSinceLastFund) / (60 * 60 * 1000));
        return successResponse({
          funded: false,
          reason: 'cooldown',
          message: `Gas was funded recently. Next top-up available in ~${hoursRemaining}h.`,
        });
      }
    }

    // Check current ETH balance
    const ethBalance = await getEthBalance(user.walletAddress as `0x${string}`);
    console.log(`[GAS] User ${user.walletAddress} ETH balance: ${ethBalance}, threshold: ${GAS_MIN_THRESHOLD}`);

    if (ethBalance >= GAS_MIN_THRESHOLD) {
      return successResponse({
        funded: false,
        reason: 'sufficient',
        ethBalance,
        message: 'User already has enough ETH for gas.',
      });
    }

    // Verify gas station private key is configured
    if (!process.env.GAS_STATION_PRIVATE_KEY) {
      console.error('[GAS] GAS_STATION_PRIVATE_KEY env var is not set!');
      return errorResponse('Gas station not configured on this server.', 500);
    }

    // Send ETH from gas station
    console.log(`[GAS] Sending ${GAS_TOPUP_AMOUNT} ETH to ${user.walletAddress}...`);
    let txHash: string;
    try {
      txHash = await sendEthFromGasStation(
        user.walletAddress as `0x${string}`,
        GAS_TOPUP_AMOUNT,
      );
      console.log(`[GAS] Success! TX: ${txHash}`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[GAS] Send failed: ${errMsg}`, error);
      return errorResponse(
        `Failed to send gas: ${errMsg}`,
        500
      );
    }

    // Update last funded timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastGasFundedAt: new Date() },
    });

    return successResponse({
      funded: true,
      txHash,
      amount: GAS_TOPUP_AMOUNT,
      message: `Sent ${GAS_TOPUP_AMOUNT} ETH for gas fees.`,
    });
  } catch (error: unknown) {
    console.error('Gas funding failed:', error);
    const message = error instanceof Error ? error.message : 'Gas funding failed';
    return errorResponse(message, 500);
  }
}
