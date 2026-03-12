import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api';

export async function GET(
  request: Request,
  { params: _params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { claims } = await requireAuth(request.headers);
    const authUser = await prisma.user.findUnique({ where: { privyId: claims.userId } });
    if (!authUser) {
      return errorResponse('User not found', 404);
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { buyerId: authUser.id },
          { sellerId: authUser.id }
        ]
      },
      include: {
        character: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    // Transform data for frontend
    const transformedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      type: transaction.type,
      characterName: transaction.character?.name ?? transaction.type,
      shares: transaction.shares,
      pricePerShare: transaction.pricePerShare,
      total: transaction.total,
      createdAt: transaction.createdAt.toISOString()
    }));

    return successResponse(transformedTransactions);
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return errorResponse('Failed to fetch transactions', 500);
  }
}
