import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, amount, paymentMethod } = body;

    if (!userId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'User ID and valid amount required' },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // In production, you would integrate with Stripe, Coinbase, etc.
    // For now, we'll simulate the funding process
    
    // Create funding transaction record (using Luna's character ID for funding)
    const fundingTransaction = await prisma.transaction.create({
      data: {
        buyerId: userId,
        characterId: '55f58a0a-ef04-4eb1-a3cc-2f100d40bfa5', // Use Luna's character ID
        type: 'fund',
        shares: 0,
        pricePerShare: amount,
        total: amount,
        sellerId: null
      }
    });

    // Update user's wallet balance (you'd track this in User model or separate Wallet model)
    // For now, we'll just return success
    
    return NextResponse.json({
      success: true,
      message: `Successfully funded wallet with $${amount}`,
      transaction: fundingTransaction,
      newBalance: amount // In production, calculate actual balance
    });

  } catch (error: any) {
    console.error('Funding failed:', error);
    return NextResponse.json(
      { error: 'Funding failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Get user's funding history
    const fundingTransactions = await prisma.transaction.findMany({
      where: {
        buyerId: userId,
        type: 'fund'
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate total funded amount
    const totalFunded = fundingTransactions.reduce((sum, tx) => sum + tx.total, 0);

    return NextResponse.json({
      userId,
      totalFunded,
      fundingHistory: fundingTransactions,
      walletAddress: '0x1234567890123456789012345678901234567890' // From user record
    });

  } catch (error: any) {
    console.error('Failed to get wallet info:', error);
    return NextResponse.json(
      { error: 'Failed to get wallet info' },
      { status: 500 }
    );
  }
}
