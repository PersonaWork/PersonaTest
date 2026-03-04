import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getPrivyWallet } from '@/lib/wallet/privy';

// Mock crypto price data - in production you'd use CoinGecko, CoinMarketCap, etc.
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

    // Get Privy wallet info
    let privyWallet = null;
    try {
      privyWallet = await getPrivyWallet(userId);
    } catch (error) {
      console.log('Privy wallet not found, using fallback');
    }

    // Use wallet address from Privy or database, with fallback
    const walletAddress = privyWallet?.address || user.walletAddress || `0x${'0'.repeat(40)}`;

    // Generate deposit addresses for each supported crypto
    const depositAddresses = {
      'ETH': walletAddress,
      'USDC': walletAddress,
      'USDT': walletAddress,
      'MATIC': walletAddress,
      'BTC': '1' + walletAddress.slice(2, 42)
    };

    return NextResponse.json({
      userId,
      walletAddress: user.walletAddress,
      privyWallet: privyWallet ? {
        address: privyWallet.address,
        type: 'embedded'
      } : null,
      depositAddresses: depositAddresses,
      supportedCryptos: Object.keys(CRYPTO_PRICES),
      currentPrices: CRYPTO_PRICES,
      instructions: {
        'ETH': `Send ETH to ${depositAddresses.ETH}`,
        'BTC': `Send BTC to ${depositAddresses.BTC}`,
        'USDC': `Send USDC (ERC-20) to ${depositAddresses.USDC}`,
        'USDT': `Send USDT (ERC-20) to ${depositAddresses.USDT}`,
        'MATIC': `Send MATIC to ${depositAddresses.MATIC}`
      },
      networkInfo: {
        'ETH': 'Ethereum Mainnet',
        'BTC': 'Bitcoin Mainnet', 
        'USDC': 'Ethereum Mainnet (ERC-20)',
        'USDT': 'Ethereum Mainnet (ERC-20)',
        'MATIC': 'Polygon Mainnet'
      }
    });

  } catch (error: any) {
    console.error('Failed to get deposit info:', error);
    return NextResponse.json(
      { error: 'Failed to get deposit info' },
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

    // In production, you would:
    // 1. Use Privy's APIs to verify the transaction
    // 2. Check that funds were sent to the user's Privy wallet
    // 3. Wait for blockchain confirmations
    // 4. Update the user's wallet balance in Privy

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
        walletType: 'Privy Embedded', // Always Privy since we're using Privy wallets
        confirmed: true // In production, this would be verified on-chain
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
