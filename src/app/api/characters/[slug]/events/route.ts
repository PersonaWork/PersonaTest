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

    // Get recent events (only needed fields)
    const events = await prisma.characterEvent.findMany({
      where: { characterId: character.id },
      orderBy: { triggeredAt: 'desc' },
      take: 20,
      select: { id: true, actionId: true, isRare: true, triggeredAt: true }
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
