import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

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
