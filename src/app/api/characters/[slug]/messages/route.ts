import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Get character ID only
    const character = await prisma.character.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
    }

    // Get recent messages (only needed fields)
    const messages = await prisma.message.findMany({
      where: { characterId: character.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, content: true, role: true, createdAt: true }
    });

    return NextResponse.json(messages.reverse());
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
