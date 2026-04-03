import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api';

// Reward tiers by streak day (in USDC)
// Days 1-7 cycle, then repeat. Bigger rewards = more reason to come back.
const STREAK_REWARDS = [
  0.01,  // Day 1
  0.02,  // Day 2
  0.03,  // Day 3
  0.05,  // Day 4
  0.08,  // Day 5
  0.12,  // Day 6
  0.25,  // Day 7 (weekly bonus!)
];

function getRewardForDay(streak: number): number {
  const idx = ((streak - 1) % STREAK_REWARDS.length);
  return STREAK_REWARDS[idx];
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate();
}

function isYesterday(d1: Date, d2: Date): boolean {
  const yesterday = new Date(d2);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return isSameDay(d1, yesterday);
}

/**
 * GET /api/rewards/daily — Check streak status
 */
export async function GET(request: NextRequest) {
  try {
    const { claims } = await requireAuth(request.headers);
    const user = await prisma.user.findUnique({
      where: { privyId: claims.userId },
      select: { dailyStreak: true, lastClaimAt: true, totalClaimed: true },
    });

    if (!user) return errorResponse('User not found', 404);

    const now = new Date();
    const canClaim = !user.lastClaimAt || !isSameDay(user.lastClaimAt, now);
    const streakAlive = user.lastClaimAt && (isSameDay(user.lastClaimAt, now) || isYesterday(user.lastClaimAt, now));

    const currentStreak = streakAlive ? user.dailyStreak : 0;
    const nextReward = getRewardForDay(canClaim ? currentStreak + 1 : currentStreak);

    return successResponse({
      streak: currentStreak,
      canClaim,
      nextReward,
      totalClaimed: user.totalClaimed,
      streakRewards: STREAK_REWARDS,
    });
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    if (err.statusCode === 401) return errorResponse(err.message, 401);
    return errorResponse('Failed to check rewards', 500);
  }
}

/**
 * POST /api/rewards/daily — Claim daily reward
 */
export async function POST(request: NextRequest) {
  try {
    const { claims } = await requireAuth(request.headers);
    const user = await prisma.user.findUnique({
      where: { privyId: claims.userId },
      select: { id: true, dailyStreak: true, lastClaimAt: true, totalClaimed: true },
    });

    if (!user) return errorResponse('User not found', 404);

    const now = new Date();

    // Already claimed today
    if (user.lastClaimAt && isSameDay(user.lastClaimAt, now)) {
      return errorResponse('Already claimed today! Come back tomorrow.', 400);
    }

    // Calculate new streak
    const streakContinues = user.lastClaimAt && isYesterday(user.lastClaimAt, now);
    const newStreak = streakContinues ? user.dailyStreak + 1 : 1;
    const reward = getRewardForDay(newStreak);

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        dailyStreak: newStreak,
        lastClaimAt: now,
        totalClaimed: { increment: reward },
        usdcBalance: { increment: reward },
      },
    });

    // Record as a transaction for accounting
    await prisma.transaction.create({
      data: {
        buyerId: user.id,
        type: 'reward',
        shares: 0,
        pricePerShare: 0,
        total: reward,
        platformFee: 0,
      },
    });

    return successResponse({
      streak: newStreak,
      reward,
      isWeeklyBonus: newStreak % 7 === 0,
      nextReward: getRewardForDay(newStreak + 1),
    });
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    if (err.statusCode === 401) return errorResponse(err.message, 401);
    console.error('Daily reward claim error:', error);
    return errorResponse('Failed to claim reward', 500);
  }
}
