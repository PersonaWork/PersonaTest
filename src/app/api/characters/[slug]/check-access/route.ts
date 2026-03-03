import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
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

    // Check if user has holdings
    const holding = await prisma.holding.findUnique({
      where: {
        userId_characterId: {
          userId,
          characterId: character.id
        }
      }
    });

    const hasAccess = holding && holding.shares > 0;

    return NextResponse.json({ hasAccess });
  } catch (error) {
    console.error('Failed to check access:', error);
    return NextResponse.json(
      { error: 'Failed to check access' },
      { status: 500 }
    );
  }
}
