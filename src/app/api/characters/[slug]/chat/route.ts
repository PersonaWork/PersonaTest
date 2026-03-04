import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateCharacterResponse } from '@/lib/ai/openai';
import { requirePrivyClaims } from '@/lib/auth/privy-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { claims } = await requirePrivyClaims(request.headers);
    const body = await request.json();
    const { message } = body;
    const userId = claims.userId;

    if (!message) {
      return NextResponse.json(
        { error: 'User ID and message required' },
        { status: 400 }
      );
    }

    // Get character
    const character = await prisma.character.findUnique({
      where: { slug }
    });

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
    }

    // Check user has access (holds shares)
    const holding = await prisma.holding.findUnique({
      where: {
        userId_characterId: {
          userId,
          characterId: character.id
        }
      }
    });

    if (!holding || holding.shares <= 0) {
      return NextResponse.json(
        { error: 'Access denied - no shares held' },
        { status: 403 }
      );
    }

    // Get message history
    const messageHistory = await prisma.message.findMany({
      where: { characterId: character.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

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
        character.personality,
        messageHistory,
        message
      );
    } catch (aiError) {
      console.error('AI generation failed, using fallback:', aiError);
      // Fallback response
      const traits = (character.personality as any)?.traits || [];
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

    // Get updated message list
    const updatedMessages = await prisma.message.findMany({
      where: { characterId: character.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return NextResponse.json({
      messages: updatedMessages.reverse(),
      userMessage: userMessageRecord,
      aiMessage: aiMessageRecord
    });

  } catch (error) {
    console.error('Chat failed:', error);
    return NextResponse.json(
      { error: 'Chat failed' },
      { status: 500 }
    );
  }
}
