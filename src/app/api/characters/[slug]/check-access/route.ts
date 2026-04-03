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

    // Look up DB user by Privy ID (claims.userId is the Privy ID, not DB ID)
    const user = await prisma.user.findUnique({
      where: { privyId: claims.userId }
    });

    if (!user) {
      return NextResponse.json({ hasAccess: false });
    }

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

    // Check if user has holdings (only fetch shares count)
    const holding = await prisma.holding.findUnique({
      where: {
        userId_characterId: {
          userId: user.id,
          characterId: character.id
        }
      },
      select: { shares: true }
    });

    const shares = holding?.shares ?? 0;
    const hasAccess = shares > 0;

    return NextResponse.json({ hasAccess, shares });
  } catch (error) {
    console.error('Failed to check access:', error);
    return NextResponse.json(
      { error: 'Failed to check access' },
      { status: 500 }
    );
  }
}
