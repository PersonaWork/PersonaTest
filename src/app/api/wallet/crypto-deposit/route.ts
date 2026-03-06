import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';

// Mock crypto price data - in production you'd use CoinGecko, CoinMarketCap, etc.
const CRYPTO_PRICES = {
  'ETH': 3500.00,
  'BTC': 67000.00,
  'USDC': 1.00,
  'USDT': 1.00,
  'MATIC': 0.85
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, cryptoType, amount, txHash, fromAddress } = body;

    if (!userId || !cryptoType || !amount || !txHash) {
      return errorResponse('User ID, crypto type, amount, and transaction hash required', 400);
    }

    // Validate crypto type
    if (!CRYPTO_PRICES[cryptoType.toUpperCase() as keyof typeof CRYPTO_PRICES]) {
      return errorResponse('Unsupported cryptocurrency', 400);
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Calculate USD value
    const usdValue = parseFloat(amount) * CRYPTO_PRICES[cryptoType.toUpperCase() as keyof typeof CRYPTO_PRICES];

    // Create crypto deposit transaction
    const cryptoTransaction = await prisma.transaction.create({
      data: {
        buyerId: userId,
        characterId: '55f58a0a-ef04-4eb1-a3cc-2f100d40bfa5', // Use Luna's character ID
        type: 'crypto-deposit',
        shares: 0,
        pricePerShare: usdValue,
        total: usdValue,
        sellerId: null
      }
    });

    // In production, you would:
    // 1. Verify the transaction on the blockchain
    // 2. Check that the funds were sent to the correct address
    // 3. Wait for confirmations
    // 4. Update the user's actual wallet balance

    return successResponse({
      message: `Successfully deposited ${amount} ${cryptoType.toUpperCase()} ($${usdValue.toFixed(2)})`,
      transaction: cryptoTransaction,
      depositDetails: {
        cryptoType: cryptoType.toUpperCase(),
        cryptoAmount: amount,
        usdValue: usdValue,
        txHash: txHash,
        fromAddress: fromAddress,
        toAddress: user.walletAddress,
        confirmed: true // In production, this would be verified on-chain
      }
    });

  } catch (error: unknown) {
    console.error('Crypto deposit failed:', error);
    return errorResponse('Crypto deposit failed', 500);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return errorResponse('User ID required', 400);
    }

    // Get user's crypto deposit history
    const cryptoDeposits = await prisma.transaction.findMany({
      where: {
        buyerId: userId,
        type: 'crypto-deposit'
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate total crypto deposited
    const totalCryptoDeposited = cryptoDeposits.reduce((sum, tx) => sum + tx.total, 0);

    return successResponse({
      userId,
      totalCryptoDeposited,
      cryptoDeposits: cryptoDeposits.map(tx => ({
        id: tx.id,
        amount: tx.pricePerShare, // This represents the USD value
        usdValue: tx.total,
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`, // Mock hash
        confirmed: true,
        createdAt: tx.createdAt
      })),
      supportedCryptos: Object.keys(CRYPTO_PRICES),
      currentPrices: CRYPTO_PRICES
    });

  } catch (error: unknown) {
    console.error('Failed to get crypto deposit info:', error);
    return errorResponse('Failed to get crypto deposit info', 500);
  }
}
