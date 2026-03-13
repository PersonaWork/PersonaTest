import { createPublicClient, createWalletClient, http, parseAbi, parseUnits, parseEther } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// USDC on Base mainnet
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;
export const USDC_DECIMALS = 6;

// Platform treasury address on Base — receives deposits, funds withdrawals
export const TREASURY_ADDRESS = '0x797C0D912A65BCcCC2F52d9328f763DbC067b883' as const;

// ── Two-Phase Trading System ─────────────────────────────────────
// Phase 1: Bonding curve — protocol is counterparty, builds liquidity pool
// Phase 2: Graduated — peer-to-peer order book, price set by market
export const PHASE_BONDING_CURVE = 'BONDING_CURVE';
export const PHASE_GRADUATED = 'GRADUATED';
export const DEFAULT_TOTAL_SHARES = 10_000;

// ── Anti-Whale Protection (Phase 1) ──────────────────────────────
export const MAX_WHALE_PERCENT = 0.01;   // 1% of total shares per user during bonding curve
//   e.g. 10,000 total → max 100 shares per wallet at launch

// ── Bonding Curve Constants (Phase 1) ───────────────────────────
export const BONDING_CURVE_FACTOR = 1.5;   // Price impact multiplier
export const VIRTUAL_LIQUIDITY = 1000;     // Virtual supply pool — controls early volatility
//   Price impact = shares / (sharesIssued + VIRTUAL_LIQUIDITY) * FACTOR
//   Early (0 supply): buying 100 shares → 100/1000*1.5 = 15% move
//   Mature (10k supply): buying 100 shares → 100/11000*1.5 = 1.4% move
export const PRICE_FLOOR = 0.0000001;      // Absolute minimum price to prevent negatives

// ── Platform fees ──────────────────────────────────────────────────
export const PLATFORM_FEE_RATE = 0.005;   // 0.5% on every buy/sell trade
export const WITHDRAWAL_FEE = 0.50;        // $0.50 USDC flat fee on withdrawals
export const FEE_COLLECTOR_ADDRESS = '0x43c661401D7a80ed3260D6252Cc1f431380e0809' as const;

// ── Gas sponsoring ─────────────────────────────────────────────────
export const GAS_MIN_THRESHOLD = 0.000008; // Fund user if below ~1 USDC transfer worth of gas
export const GAS_TARGET_BALANCE = 0.00003; // Top up to this amount (~3 USDC transfers worth of gas)

/** Normalize a private key to ensure it has 0x prefix and no whitespace */
function normalizeKey(key: string): `0x${string}` {
  const trimmed = key.trim();
  return (trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`) as `0x${string}`;
}

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
  const rawKey = process.env.TREASURY_PRIVATE_KEY;
  if (!rawKey) {
    throw new Error('TREASURY_PRIVATE_KEY not configured');
  }

  const account = privateKeyToAccount(normalizeKey(rawKey));
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

// ── Gas Station ──────────────────────────────────────────────────────

/**
 * Send ETH from the gas station wallet to a user's address for gas sponsoring.
 * Requires GAS_STATION_PRIVATE_KEY env var.
 */
export async function sendEthFromGasStation(
  toAddress: `0x${string}`,
  amountEth: number,
): Promise<`0x${string}`> {
  const rawKey = process.env.GAS_STATION_PRIVATE_KEY;
  if (!rawKey) {
    throw new Error('GAS_STATION_PRIVATE_KEY not configured');
  }

  const account = privateKeyToAccount(normalizeKey(rawKey));
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(),
  });

  const txHash = await walletClient.sendTransaction({
    to: toAddress,
    value: parseEther(amountEth.toString()),
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== 'success') {
    throw new Error('Gas station ETH transfer failed on-chain');
  }

  return txHash;
}

/**
 * Get the ETH balance of the gas station wallet
 */
export async function getGasStationBalance(): Promise<number> {
  const rawKey = process.env.GAS_STATION_PRIVATE_KEY;
  if (!rawKey) return 0;

  const account = privateKeyToAccount(normalizeKey(rawKey));
  return getEthBalance(account.address);
}

/**
 * Get treasury balances (USDC + ETH)
 */
export async function getTreasuryBalances(): Promise<{
  usdcBalance: number;
  ethBalance: number;
}> {
  const [usdcBalance, ethBalance] = await Promise.all([
    getUsdcBalance(TREASURY_ADDRESS),
    getEthBalance(TREASURY_ADDRESS),
  ]);
  return { usdcBalance, ethBalance };
}

/**
 * Get fee collector wallet USDC balance
 */
export async function getFeeCollectorBalance(): Promise<number> {
  return getUsdcBalance(FEE_COLLECTOR_ADDRESS);
}
