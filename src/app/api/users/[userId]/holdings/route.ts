import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { claims } = await requireAuth(request.headers);
    const authUser = await prisma.user.findUnique({ where: { privyId: claims.userId } });
    if (!authUser) {
      return errorResponse('User not found', 404);
    }

    const holdings = await prisma.holding.findMany({
      where: { userId: authUser.id },
      include: {
        character: {
          select: {
            id: true,
            name: true,
            slug: true,
            currentPrice: true,
            thumbnailUrl: true,
          }
        }
      }
    });

    // Transform data for frontend
    const transformedHoldings = holdings.map(holding => {
      const currentPrice = holding.character.currentPrice;
      const totalValue = holding.shares * currentPrice;
      const totalCost = holding.shares * holding.avgBuyPrice;
      const pnl = totalValue - totalCost;
      const pnlPercent = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

      return {
        id: holding.id,
        characterId: holding.characterId,
        characterName: holding.character.name,
        characterSlug: holding.character.slug,
        characterThumbnail: holding.character.thumbnailUrl,
        shares: holding.shares,
        avgBuyPrice: holding.avgBuyPrice,
        currentPrice,
        totalValue,
        pnl,
        pnlPercent
      };
    });

    return successResponse(transformedHoldings);
  } catch (error) {
    console.error('Failed to fetch holdings:', error);
    return errorResponse('Failed to fetch holdings', 500);
  }
}
