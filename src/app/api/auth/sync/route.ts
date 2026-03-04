import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const { claims } = await requireAuth(request.headers);
    const body = await request.json().catch(() => ({}));
    const { email, privyId } = body;

    const privyUserId = privyId || claims.userId;

    if (!privyUserId) {
      return errorResponse('Privy user ID required', 400);
    }

    // Try to find existing user by privyId
    let user = await prisma.user.findUnique({
      where: { privyId: privyUserId },
    });

    if (user) {
      // Update email if provided and different
      if (email && email !== user.email) {
        try {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { email },
          });
        } catch {
          // Email might conflict with another user, ignore
        }
      }
      return successResponse({ user });
    }

    // Create new user
    const username = email
      ? email.split('@')[0]
      : `user-${privyUserId.slice(0, 8)}`;

    // Ensure unique username
    let finalUsername = username;
    let counter = 0;
    while (true) {
      const existing = await prisma.user.findUnique({
        where: { username: finalUsername },
      });
      if (!existing) break;
      counter++;
      finalUsername = `${username}${counter}`;
    }

    // Ensure unique email
    let finalEmail = email || `${privyUserId}@privy.user`;
    const existingEmail = await prisma.user.findUnique({
      where: { email: finalEmail },
    });
    if (existingEmail) {
      finalEmail = `${privyUserId}@privy.user`;
    }

    user = await prisma.user.create({
      data: {
        privyId: privyUserId,
        email: finalEmail,
        username: finalUsername,
      },
    });

    return successResponse({ user }, 201);
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };
    const status = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    return errorResponse(error?.message || 'Auth sync failed', status);
  }
}
