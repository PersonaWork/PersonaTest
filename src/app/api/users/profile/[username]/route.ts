import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';

/**
 * GET /api/users/profile/[username] — Public profile by username
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        id: true,
        username: true,
        displayName: true,
        createdAt: true,
        holdings: {
          include: {
            character: {
              select: {
                id: true,
                name: true,
                slug: true,
                currentPrice: true,
                thumbnailUrl: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    const holdings = user.holdings.map(h => ({
      characterId: h.characterId,
      characterName: h.character.name,
      characterSlug: h.character.slug,
      characterThumbnail: h.character.thumbnailUrl,
      shares: h.shares,
      currentPrice: h.character.currentPrice,
      totalValue: h.shares * h.character.currentPrice,
    }));

    const totalPortfolioValue = holdings.reduce((sum, h) => sum + h.totalValue, 0);

    return successResponse({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      joinedAt: user.createdAt,
      holdings,
      totalPortfolioValue,
      holdingsCount: holdings.length,
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error('Profile fetch failed:', error);
    return errorResponse('Failed to fetch profile', 500);
  }
}
