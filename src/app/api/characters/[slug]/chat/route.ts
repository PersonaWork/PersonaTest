import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCharacterResponse } from '@/lib/ai/openai';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api';
import { z } from 'zod';

const ChatSchema = z.object({ message: z.string().min(1, 'Message is required') });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { claims } = await requireAuth(request.headers);
    const body = await request.json();
    const parsed = ChatSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }
    const { message } = parsed.data;
    const userId = claims.userId;

    // Get character (only fields needed for chat)
    const character = await prisma.character.findUnique({
      where: { slug },
      select: { id: true, name: true, personality: true }
    });

    if (!character) {
      return errorResponse('Character not found', 404);
    }

    // Parallelize: check access + fetch message history at the same time
    const [holding, messageHistory] = await Promise.all([
      prisma.holding.findUnique({
        where: { userId_characterId: { userId, characterId: character.id } },
        select: { shares: true }
      }),
      prisma.message.findMany({
        where: { characterId: character.id },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
    ]);

    if (!holding || holding.shares <= 0) {
      return errorResponse('Access denied - no shares held', 403);
    }

    // Save user message
    const userMessageRecord = await prisma.message.create({
      data: {
        userId,
        characterId: character.id,
        content: message,
        role: 'user'
      }
    });

    // Generate AI response using Claude
    let aiResponse: string;
    try {
      aiResponse = await generateCharacterResponse(
        character.name,
        character.personality as Record<string, unknown>,
        messageHistory,
        message
      );
    } catch (aiError) {
      console.error('AI generation failed, using fallback:', aiError);
      // Fallback response
      const personality = character.personality as Record<string, unknown>;
      const traits = Array.isArray(personality?.traits) ? personality.traits as string[] : [];
      aiResponse = `That's interesting! As someone who is ${traits[0] || 'unique'}, I see things differently. Tell me more about that!`;
    }

    // Save AI response
    const aiMessageRecord = await prisma.message.create({
      data: {
        userId,
        characterId: character.id,
        content: aiResponse,
        role: 'assistant'
      }
    });

    // Construct response from existing data (avoids redundant DB round-trip)
    const allMessages = [...messageHistory.reverse(), userMessageRecord, aiMessageRecord];

    return successResponse({
      messages: allMessages,
      userMessage: userMessageRecord,
      aiMessage: aiMessageRecord
    });

  } catch (error) {
    console.error('Chat failed:', error);
    return errorResponse('Chat failed', 500);
  }
}
