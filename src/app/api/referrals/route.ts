import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api';
import crypto from 'crypto';

/**
 * GET /api/referrals — Get current user's referral code + stats
 */
export async function GET(request: NextRequest) {
  try {
    const { claims } = await requireAuth(request.headers);

    const user = await prisma.user.findUnique({
      where: { privyId: claims.userId },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Generate referral code if user doesn't have one
    let referralCode = user.referralCode;
    if (!referralCode) {
      referralCode = `${user.username}-${crypto.randomBytes(3).toString('hex')}`.toUpperCase();
      await prisma.user.update({
        where: { id: user.id },
        data: { referralCode },
      });
    }

    // Get referral stats
    const referrals = await prisma.user.findMany({
      where: { referredById: user.id },
      select: {
        id: true,
        username: true,
        displayName: true,
        createdAt: true,
        holdings: {
          select: { shares: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalReferrals = referrals.length;
    const activeReferrals = referrals.filter(r => r.holdings.length > 0).length;

    return successResponse({
      referralCode,
      referralLink: `https://persona-test-omega.vercel.app/signup?ref=${referralCode}`,
      totalReferrals,
      activeReferrals,
      referrals: referrals.map(r => ({
        username: r.username,
        displayName: r.displayName,
        joinedAt: r.createdAt,
        isActive: r.holdings.length > 0,
      })),
    });
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };
    const status = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    return errorResponse(error?.message || 'Failed to fetch referrals', status);
  }
}

/**
 * POST /api/referrals — Apply a referral code during signup
 */
export async function POST(request: NextRequest) {
  try {
    const { claims } = await requireAuth(request.headers);
    const body = await request.json();
    const { referralCode } = body;

    if (!referralCode) {
      return errorResponse('Referral code is required', 400);
    }

    const user = await prisma.user.findUnique({
      where: { privyId: claims.userId },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Don't allow if user already has a referrer
    if (user.referredById) {
      return errorResponse('You already have a referrer', 400);
    }

    // Find the referrer
    const referrer = await prisma.user.findUnique({
      where: { referralCode: referralCode.toUpperCase() },
    });

    if (!referrer) {
      return errorResponse('Invalid referral code', 404);
    }

    if (referrer.id === user.id) {
      return errorResponse('You cannot refer yourself', 400);
    }

    // Apply the referral
    await prisma.user.update({
      where: { id: user.id },
      data: { referredById: referrer.id },
    });

    return successResponse({
      message: 'Referral applied successfully',
      referredBy: referrer.username,
    });
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };
    const status = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    return errorResponse(error?.message || 'Failed to apply referral', status);
  }
}
