import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePrivyClaims } from '@/lib/auth/privy-server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { claims } = await requirePrivyClaims(request.headers);
    const { userId } = await params;
    if (userId !== claims.userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { buyerId: userId },
          { sellerId: userId }
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
      characterName: transaction.character.name,
      shares: transaction.shares,
      pricePerShare: transaction.pricePerShare,
      total: transaction.total,
      createdAt: transaction.createdAt.toISOString()
    }));

    return NextResponse.json(transformedTransactions);
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
