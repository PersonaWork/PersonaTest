import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api';
import { LIVE_CHAT_FEE } from '@/lib/wallet/base';
import { processNextMessage } from '@/lib/live-chat/process';
import { z } from 'zod';

// Allow up to 120s for AI response + TTS + lip sync
export const maxDuration = 120;

const SendSchema = z.object({
  message: z.string().min(1).max(500, 'Message too long (500 char max)'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const { claims } = await requireAuth(request.headers);

    const body = await request.json();
    const parsed = SendSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    // Look up DB user
    const user = await prisma.user.findUnique({
      where: { privyId: claims.userId },
    });
    if (!user) return errorResponse('User not found', 404);

    // Look up character
    const character = await prisma.character.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!character) return errorResponse('Character not found', 404);

    // Check shareholding (must hold shares to chat)
    const holding = await prisma.holding.findUnique({
      where: { userId_characterId: { userId: user.id, characterId: character.id } },
      select: { shares: true },
    });
    if (!holding || holding.shares <= 0) {
      return errorResponse('You must hold shares to send live messages', 403);
    }

    // Check balance
    if (user.usdcBalance < LIVE_CHAT_FEE) {
      return errorResponse(`Insufficient balance. Live messages cost $${LIVE_CHAT_FEE.toFixed(2)}`, 400);
    }

    // Rate limit: max 1 pending message per user per character
    const existingPending = await prisma.liveMessage.findFirst({
      where: {
        userId: user.id,
        characterId: character.id,
        status: { in: ['pending', 'processing'] },
      },
    });
    if (existingPending) {
      return errorResponse('You already have a message in the queue', 429);
    }

    // Atomic: deduct fee + create message + record transaction
    const [liveMessage] = await prisma.$transaction([
      prisma.liveMessage.create({
        data: {
          userId: user.id,
          characterId: character.id,
          content: parsed.data.message,
          shares: holding.shares,
          fee: LIVE_CHAT_FEE,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { usdcBalance: { decrement: LIVE_CHAT_FEE } },
      }),
      prisma.transaction.create({
        data: {
          buyerId: user.id,
          characterId: character.id,
          shares: 0,
          pricePerShare: 0,
          total: LIVE_CHAT_FEE,
          platformFee: LIVE_CHAT_FEE,
          type: 'live_chat',
        },
      }),
    ]);

    // Count position in queue
    const position = await prisma.liveMessage.count({
      where: {
        characterId: character.id,
        status: 'pending',
        OR: [
          { shares: { gt: holding.shares } },
          { shares: holding.shares, createdAt: { lt: liveMessage.createdAt } },
        ],
      },
    });

    // Process synchronously — on Vercel serverless, fire-and-forget dies when response is sent
    let processingError: string | null = null;
    try {
      await processNextMessage(character.id, slug);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[LiveChat] Processing error:', errMsg);
      processingError = errMsg;
    }

    return successResponse({
      messageId: liveMessage.id,
      position: position + 1,
      fee: LIVE_CHAT_FEE,
      processingError,
    });
  } catch (error: any) {
    if (error?.statusCode === 401 || error?.statusCode === 403) {
      return errorResponse(error.message, error.statusCode);
    }
    console.error('Live send failed:', error);
    return errorResponse('Failed to send message', 500);
  }
}
