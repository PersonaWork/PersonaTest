import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPrivyUser } from '@/lib/auth';
// Mock crypto price data
const CRYPTO_PRICES = {
  'ETH': 3500.00,
  'BTC': 67000.00,
  'USDC': 1.00,
  'USDT': 1.00,
  'MATIC': 0.85
};

async function getUserFromSession(request: Request) {
  try {
    const claims = await getPrivyUser(request.headers);
    if (!claims || !claims.userId) return null;

    const user = await prisma.user.findUnique({
      where: { privyId: claims.userId }
    });
    return user;
  } catch (error) {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromSession(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If no wallet address, return error prompting to create wallet first
    if (!dbUser.walletAddress) {
      return NextResponse.json(
        { error: 'No wallet found. Please create a wallet first.' },
        { status: 400 }
      );
    }

    const walletAddress = dbUser.walletAddress;

    // Generate deposit addresses for each supported crypto
    const depositAddresses = {
      'ETH': walletAddress,
      'USDC': walletAddress,
      'USDT': walletAddress,
      'MATIC': walletAddress,
      'BTC': '1' + walletAddress.slice(2, 42)
    };

    return NextResponse.json({
      success: true,
      userId,
      walletAddress: walletAddress,
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
        'ETH': `ethereum:${depositAddresses.ETH}`,
        'BTC': `bitcoin:${depositAddresses.BTC}`,
        'USDC': `ethereum:${depositAddresses.USDC}`,
        'USDT': `ethereum:${depositAddresses.USDT}`,
        'MATIC': `polygon:${depositAddresses.MATIC}`
      }
    });

  } catch (error: unknown) {
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
    const user = await getUserFromSession(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const { cryptoType, amount, txHash, fromAddress } = body;

    if (!cryptoType || !amount || !txHash) {
      return NextResponse.json(
        { error: 'Crypto type, amount, and transaction hash required' },
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
    const dbUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!dbUser) {
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
        characterId: '55f58a0a-ef04-4eb1-a3cc-2f100d40bfa5',
        type: 'crypto-deposit',
        shares: 0,
        pricePerShare: usdValue,
        total: usdValue,
        sellerId: null
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deposited ${amount} ${cryptoType.toUpperCase()} ($${usdValue.toFixed(2)})`,
      transaction: cryptoTransaction,
      depositDetails: {
        cryptoType: cryptoType.toUpperCase(),
        cryptoAmount: amount,
        usdValue: usdValue,
        txHash: txHash,
        fromAddress: fromAddress,
        toAddress: dbUser.walletAddress,
        walletType: 'Embedded Wallet',
        confirmed: true,
        status: 'completed'
      }
    });

  } catch (error: unknown) {
    console.error('Crypto deposit failed:', error);
    return NextResponse.json(
      { error: 'Crypto deposit failed' },
      { status: 500 }
    );
  }
}
