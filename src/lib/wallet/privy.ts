import { PrivyClient } from '@privy-io/node'
import { createWalletClient, http } from 'viem'
import { mainnet, polygon } from 'viem/chains'

// Lazy-initialize Privy client to avoid build-time errors
let privyClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient {
  if (!privyClient) {
    const appId = process.env.PRIVY_APP_ID || process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;
    
    if (!appId || !appSecret) {
      throw new Error('Privy not configured: PRIVY_APP_ID and PRIVY_APP_SECRET required');
    }
    
    privyClient = new PrivyClient({
      appId,
      appSecret
    });
  }
  return privyClient;
}

export async function createPrivyWallet(userId: string) {
  try {
    // For now, return a mock wallet - in production you'd use Privy's actual API
    console.log('Creating Privy wallet for user:', userId);
    
    return {
      address: `0x${userId.slice(0, 40)}`,
      userId,
      type: 'embedded'
    }
  } catch (error) {
    console.error('Failed to create Privy wallet:', error)
    throw error
  }
}

export async function getPrivyWallet(userId: string) {
  try {
    // For now, return mock wallet data
    console.log('Getting Privy wallet for user:', userId);
    
    return {
      address: `0x${userId.slice(0, 40)}`,
      userId,
      type: 'embedded'
    }
  } catch (error) {
    console.error('Failed to get Privy wallet:', error)
    return null
  }
}

export async function getUserWallets(userId: string) {
  try {
    // For now, return mock wallet data
    console.log('Getting wallets for user:', userId);
    
    return [{
      address: `0x${userId.slice(0, 40)}`,
      userId,
      type: 'embedded'
    }]
  } catch (error) {
    console.error('Failed to get user wallets:', error)
    return []
  }
}

// Wallet client for transactions
export function getWalletClient(walletAddress: string) {
  return createWalletClient({
    account: walletAddress as `0x${string}`,
    chain: polygon, // Use Polygon for lower gas fees
    transport: http()
  })
}
