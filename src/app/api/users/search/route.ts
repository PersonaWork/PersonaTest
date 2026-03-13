import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';

/**
 * GET /api/users/search?q=username — Search users by username
 * Public endpoint — no auth required
 */
export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')?.trim();
    if (!q || q.length < 2) {
      return errorResponse('Search query must be at least 2 characters', 400);
    }

    const users = await prisma.user.findMany({
      where: {
        username: { contains: q.toLowerCase(), mode: 'insensitive' },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        createdAt: true,
        _count: {
          select: { holdings: true },
        },
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    const results = users.map(u => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      joinedAt: u.createdAt,
      holdingsCount: u._count.holdings,
    }));

    return successResponse(results);
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error('User search failed:', error);
    return errorResponse('Search failed', 500);
  }
}
