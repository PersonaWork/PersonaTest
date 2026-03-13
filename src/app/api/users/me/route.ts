import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api';
import { z } from 'zod';

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

const UpdateSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be 20 characters or less')
    .regex(USERNAME_REGEX, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
});

/**
 * GET /api/users/me — Get current user profile
 */
export async function GET(request: NextRequest) {
  try {
    const { claims } = await requireAuth(request.headers);
    const user = await prisma.user.findUnique({ where: { privyId: claims.userId } });
    if (!user) return errorResponse('User not found', 404);

    return successResponse({
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      walletAddress: user.walletAddress,
      usdcBalance: user.usdcBalance,
      hasSetUsername: user.hasSetUsername,
      preferences: user.preferences,
      createdAt: user.createdAt,
    });
  } catch (err: unknown) {
    const error = err as { message?: string; statusCode?: number };
    const status = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    return errorResponse(error?.message || 'Failed to get user', status);
  }
}

/**
 * PATCH /api/users/me — Update current user profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const { claims } = await requireAuth(request.headers);
    const body = await request.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.data.displayName !== undefined) {
      updateData.displayName = parsed.data.displayName;
    }

    if (parsed.data.username !== undefined) {
      const newUsername = parsed.data.username.toLowerCase();

      // Check if username is taken by another user
      const existing = await prisma.user.findUnique({ where: { username: newUsername } });
      const currentUser = await prisma.user.findUnique({ where: { privyId: claims.userId } });

      if (existing && existing.id !== currentUser?.id) {
        return errorResponse('Username is already taken', 409);
      }

      updateData.username = newUsername;
      updateData.hasSetUsername = true;
    }

    if (parsed.data.preferences !== undefined) {
      updateData.preferences = parsed.data.preferences;
    }

    const user = await prisma.user.update({
      where: { privyId: claims.userId },
      data: updateData,
    });

    return successResponse({
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      hasSetUsername: user.hasSetUsername,
    });
  } catch (err: unknown) {
    const error = err as { message?: string; statusCode?: number };
    const status = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    return errorResponse(error?.message || 'Failed to update user', status);
  }
}

/**
 * DELETE /api/users/me — Delete current user account
 */
export async function DELETE(request: NextRequest) {
  try {
    const { claims } = await requireAuth(request.headers);

    // Delete user and all related data
    await prisma.$transaction([
      prisma.message.deleteMany({ where: { user: { privyId: claims.userId } } }),
      prisma.holding.deleteMany({ where: { user: { privyId: claims.userId } } }),
      prisma.payout.deleteMany({ where: { user: { privyId: claims.userId } } }),
      prisma.user.delete({ where: { privyId: claims.userId } }),
    ]);

    return successResponse({ deleted: true });
  } catch (err: unknown) {
    const error = err as { message?: string; statusCode?: number };
    const status = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    return errorResponse(error?.message || 'Failed to delete account', status);
  }
}
