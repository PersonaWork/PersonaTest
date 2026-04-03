import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api';
import { NextRequest } from 'next/server';

/**
 * GET /api/chat?room=trading-floor&cursor=<id>&limit=50
 * Fetch recent chat messages for a room. Public read.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const room = searchParams.get('room') || 'trading-floor';
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const messages = await prisma.chatMessage.findMany({
      where: { roomId: room },
      take: limit,
      orderBy: { createdAt: 'desc' },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        content: true,
        roomId: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    return successResponse({
      messages: messages.reverse(), // Return in chronological order
      nextCursor: messages.length === limit ? messages[0]?.id : null,
    });
  } catch (error) {
    console.error('Chat fetch error:', error);
    return errorResponse('Failed to load chat', 500);
  }
}

/**
 * POST /api/chat
 * Send a chat message. Requires auth.
 * Body: { content: string, room?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { claims } = await requireAuth(request.headers);
    const body = await request.json();
    const { content, room = 'trading-floor' } = body;

    if (!content || typeof content !== 'string') {
      return errorResponse('Message content required', 400);
    }

    const trimmed = content.trim();
    if (trimmed.length === 0 || trimmed.length > 500) {
      return errorResponse('Message must be 1-500 characters', 400);
    }

    // Get user from Privy ID
    const user = await prisma.user.findUnique({
      where: { privyId: claims.userId },
      select: { id: true, username: true, displayName: true },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Rate limit: max 1 message per 2 seconds per user
    const recentMsg = await prisma.chatMessage.findFirst({
      where: {
        userId: user.id,
        createdAt: { gt: new Date(Date.now() - 2000) },
      },
    });

    if (recentMsg) {
      return errorResponse('Slow down! Wait a moment before sending another message.', 429);
    }

    const message = await prisma.chatMessage.create({
      data: {
        userId: user.id,
        content: trimmed,
        roomId: room,
      },
      select: {
        id: true,
        content: true,
        roomId: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    return successResponse(message);
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    if (err.statusCode === 401) {
      return errorResponse(err.message, 401);
    }
    console.error('Chat send error:', error);
    return errorResponse('Failed to send message', 500);
  }
}
