import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';

export const maxDuration = 120;
/**
 * Public poll endpoint — any viewer can call this.
 * Returns new responses since `after` timestamp.
 * Processing is handled by the /send endpoint, not here.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const after = request.nextUrl.searchParams.get('after');

    const character = await prisma.character.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!character) return errorResponse('Character not found', 404);

    // Fetch responses: if `after` is provided, get new ones since then.
    // On first load (no `after`), only show responses from last 30 minutes.
    const timeFilter = after
      ? { gt: new Date(after) }
      : { gt: new Date(Date.now() - 30 * 60 * 1000) };

    const responses = await prisma.liveResponse.findMany({
      where: {
        characterId: character.id,
        createdAt: timeFilter,
      },
      orderBy: { createdAt: 'asc' },
      take: 5,
      select: {
        id: true,
        senderName: true,
        questionText: true,
        responseText: true,
        audioUrl: true,
        videoUrl: true,
        audioDuration: true,
        createdAt: true,
      },
    });

    // Queue info
    const [queueDepth, processing] = await Promise.all([
      prisma.liveMessage.count({
        where: { characterId: character.id, status: 'pending' },
      }),
      prisma.liveMessage.findFirst({
        where: { characterId: character.id, status: 'processing' },
        include: { user: { select: { displayName: true, username: true } } },
      }),
    ]);

    return successResponse({
      responses,
      queueDepth,
      processing: processing
        ? {
            senderName: processing.user.displayName || processing.user.username,
            question: processing.content,
          }
        : null,
    });
  } catch (error) {
    console.error('Live poll failed:', error);
    return errorResponse('Poll failed', 500);
  }
}
