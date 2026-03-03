import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Mock crypto price data
const CRYPTO_PRICES = {
  'ETH': 3500.00,
  'BTC': 67000.00,
  'USDC': 1.00,
  'USDT': 1.00,
  'MATIC': 0.85
};

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

    // Generate deposit addresses for each supported crypto
    // In production, these would be the user's actual Privy wallet addresses
    const depositAddresses = {
      'ETH': user.walletAddress,
      'USDC': user.walletAddress, // Same address for ERC-20 tokens
      'USDT': user.walletAddress, // Same address for ERC-20 tokens
      'MATIC': user.walletAddress, // Same address for Polygon tokens
      'BTC': '1' + user.walletAddress.slice(2, 42) // Mock BTC address (different format)
    };

    return NextResponse.json({
      success: true,
      userId,
      walletAddress: user.walletAddress,
      walletType: 'Privy Embedded Wallet',
      depositAddresses: depositAddresses,
      supportedCryptos: Object.keys(CRYPTO_PRICES),
      currentPrices: CRYPTO_PRICES,
      instructions: {
        'ETH': {
          address: depositAddresses.ETH,
          network: 'Ethereum Mainnet',
          memo: 'Send ETH to this address'
        },
        'BTC': {
          address: depositAddresses.BTC,
          network: 'Bitcoin Mainnet',
          memo: 'Send BTC to this address'
        },
        'USDC': {
          address: depositAddresses.USDC,
          network: 'Ethereum Mainnet (ERC-20)',
          memo: 'Send USDC tokens to this address'
        },
        'USDT': {
          address: depositAddresses.USDT,
          network: 'Ethereum Mainnet (ERC-20)',
          memo: 'Send USDT tokens to this address'
        },
        'MATIC': {
          address: depositAddresses.MATIC,
          network: 'Polygon Mainnet',
          memo: 'Send MATIC to this address'
        }
      },
      qrCodes: {
        // In production, you'd generate actual QR codes for each address
        'ETH': `ethereum:${depositAddresses.ETH}`,
        'BTC': `bitcoin:${depositAddresses.BTC}`,
        'USDC': `ethereum:${depositAddresses.USDC}?contract=0xA0b86a33E6441b8c8c8c8c8c8c8c8c8c8c8c8c8c`,
        'USDT': `ethereum:${depositAddresses.USDT}?contract=0xdAC17F958D2ee523a2206206994597C13D831ec7`,
        'MATIC': `polygon:${depositAddresses.MATIC}`
      }
    });

  } catch (error: any) {
    console.error('Failed to get deposit addresses:', error);
    return NextResponse.json(
      { error: 'Failed to get deposit addresses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, cryptoType, amount, txHash, fromAddress } = body;

    if (!userId || !cryptoType || !amount || !txHash) {
      return NextResponse.json(
        { error: 'User ID, crypto type, amount, and transaction hash required' },
        { status: 400 }
      );
    }

    // Validate crypto type
    if (!CRYPTO_PRICES[cryptoType.toUpperCase() as keyof typeof CRYPTO_PRICES]) {
      return NextResponse.json(
        { error: 'Unsupported cryptocurrency' },
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

    return NextResponse.json({
      success: true,
      message: `Successfully deposited ${amount} ${cryptoType.toUpperCase()} ($${usdValue.toFixed(2)}) to your Privy wallet`,
      transaction: cryptoTransaction,
      depositDetails: {
        cryptoType: cryptoType.toUpperCase(),
        cryptoAmount: amount,
        usdValue: usdValue,
        txHash: txHash,
        fromAddress: fromAddress,
        toAddress: user.walletAddress,
        walletType: 'Privy Embedded Wallet',
        confirmed: true,
        status: 'completed'
      }
    });

  } catch (error: any) {
    console.error('Crypto deposit failed:', error);
    return NextResponse.json(
      { error: 'Crypto deposit failed' },
      { status: 500 }
    );
  }
}
