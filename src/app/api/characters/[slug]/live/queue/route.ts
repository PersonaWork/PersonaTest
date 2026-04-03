import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api';

/**
 * Check the user's position in the live chat queue for a character.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const { claims } = await requireAuth(request.headers);

    const user = await prisma.user.findUnique({
      where: { privyId: claims.userId },
      select: { id: true },
    });
    if (!user) return errorResponse('User not found', 404);

    const character = await prisma.character.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!character) return errorResponse('Character not found', 404);

    // Find user's pending/processing messages
    const myMessages = await prisma.liveMessage.findMany({
      where: {
        userId: user.id,
        characterId: character.id,
        status: { in: ['pending', 'processing'] },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        content: true,
        shares: true,
        status: true,
        createdAt: true,
      },
    });

    // Calculate position for each pending message
    const withPositions = await Promise.all(
      myMessages.map(async (msg) => {
        if (msg.status === 'processing') {
          return { ...msg, position: 0 };
        }
        const ahead = await prisma.liveMessage.count({
          where: {
            characterId: character.id,
            status: 'pending',
            OR: [
              { shares: { gt: msg.shares } },
              { shares: msg.shares, createdAt: { lt: msg.createdAt } },
            ],
          },
        });
        return { ...msg, position: ahead + 1 };
      }),
    );

    return successResponse({ messages: withPositions });
  } catch (error: any) {
    if (error?.statusCode === 401 || error?.statusCode === 403) {
      return errorResponse(error.message, error.statusCode);
    }
    console.error('Queue check failed:', error);
    return errorResponse('Queue check failed', 500);
  }
}
