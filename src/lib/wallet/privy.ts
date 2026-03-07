import { PrivyClient } from '@privy-io/server-auth';

let privyClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient {
  if (privyClient) return privyClient;

  const appId = process.env.PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error('Missing PRIVY_APP_ID or PRIVY_APP_SECRET');
  }

  privyClient = new PrivyClient(appId, appSecret);
  return privyClient;
}

/**
 * Get a user's embedded wallet address from Privy
 * Returns the first embedded wallet address, or null if none exists
 */
export async function getPrivyWalletAddress(privyUserId: string): Promise<string | null> {
  try {
    const client = getPrivyClient();
    const user = await client.getUser(privyUserId);

    // Find embedded wallet in linked accounts
    const embeddedWallet = user.linkedAccounts.find(
      (account) => account.type === 'wallet' && account.walletClientType === 'privy'
    );

    if (embeddedWallet && 'address' in embeddedWallet) {
      return embeddedWallet.address;
    }

    return null;
  } catch (error) {
    console.error('Failed to get Privy wallet for user:', privyUserId, error);
    return null;
  }
}
