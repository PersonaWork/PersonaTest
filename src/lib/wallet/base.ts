import { createPublicClient, createWalletClient, http, parseAbi, parseUnits } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// USDC on Base mainnet
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;
export const USDC_DECIMALS = 6;

const ERC20_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]);

export const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

/**
 * Read a user's USDC balance on Base
 */
export async function getUsdcBalance(address: `0x${string}`): Promise<number> {
  const raw = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  });
  return Number(raw) / 10 ** USDC_DECIMALS;
}

/**
 * Read a user's ETH (gas) balance on Base
 */
export async function getEthBalance(address: `0x${string}`): Promise<number> {
  const wei = await publicClient.getBalance({ address });
  return Number(wei) / 1e18;
}

/**
 * Verify a USDC transfer transaction on Base
 * Returns the amount transferred if valid, throws if invalid
 */
export async function verifyUsdcTransfer(
  txHash: `0x${string}`,
  expectedFrom: `0x${string}`,
  expectedTo: `0x${string}`,
): Promise<{ amount: number; from: string; to: string }> {
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash });

  if (receipt.status !== 'success') {
    throw new Error('Transaction failed on-chain');
  }

  // Parse Transfer event logs from the USDC contract
  const transferLogs = receipt.logs.filter(
    (log) => log.address.toLowerCase() === USDC_ADDRESS.toLowerCase()
  );

  if (transferLogs.length === 0) {
    throw new Error('No USDC transfer found in transaction');
  }

  // Find the Transfer event matching our expected from/to
  for (const log of transferLogs) {
    // Transfer(address from, address to, uint256 value)
    // topic[0] = event signature, topic[1] = from, topic[2] = to
    if (log.topics.length >= 3) {
      const from = ('0x' + log.topics[1]!.slice(26)).toLowerCase();
      const to = ('0x' + log.topics[2]!.slice(26)).toLowerCase();
      const value = BigInt(log.data);
      const amount = Number(value) / 10 ** USDC_DECIMALS;

      if (
        from === expectedFrom.toLowerCase() &&
        to === expectedTo.toLowerCase()
      ) {
        return { amount, from, to };
      }
    }
  }

  throw new Error('USDC transfer does not match expected sender/recipient');
}

/**
 * Send USDC from the platform treasury to a user's wallet (for withdrawals)
 * Requires TREASURY_PRIVATE_KEY env var
 */
export async function sendUsdcFromTreasury(
  toAddress: `0x${string}`,
  amount: number,
): Promise<`0x${string}`> {
  const privateKey = process.env.TREASURY_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('TREASURY_PRIVATE_KEY not configured');
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(),
  });

  const usdcAmount = parseUnits(amount.toString(), USDC_DECIMALS);

  const txHash = await walletClient.writeContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [toAddress, usdcAmount],
  });

  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== 'success') {
    throw new Error('Treasury USDC transfer failed on-chain');
  }

  return txHash;
}
