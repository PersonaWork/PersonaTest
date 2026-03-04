import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { claims } = await requireAuth(request.headers);
    const userId = claims.userId;

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
