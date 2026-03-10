'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { usePrivyAuthedFetch } from '@/lib/auth/privy-client';
import { Button, Card } from '@/components/ui';
import { encodeFunctionData, parseUnits } from 'viem';

// Constants matching server-side values
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const TREASURY_ADDRESS = '0x797C0D912A65BCcCC2F52d9328f763DbC067b883';
const BASE_CHAIN_ID = 8453;

const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function' as const,
    inputs: [
      { name: 'to', type: 'address' as const },
      { name: 'amount', type: 'uint256' as const },
    ],
    outputs: [{ name: '', type: 'bool' as const }],
    stateMutability: 'nonpayable' as const,
  },
] as const;

type WalletStatus = {
  userId: string;
  walletAddress: string;
  chain: 'base';
  platformBalance: number;
  walletBalance: number;
  canBuy: boolean;
};

export default function FundPage() {
  const { ready, authenticated, login } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const privyFetch = usePrivyAuthedFetch();
  const hasFetched = useRef(false);

  const [status, setStatus] = useState<WalletStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [txMessage, setTxMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // External withdrawal state
  const [externalAddress, setExternalAddress] = useState('');
  const [externalAmount, setExternalAmount] = useState('');
  const [isSendingExternal, setIsSendingExternal] = useState(false);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await privyFetch('/api/wallet/status');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load wallet status');
      setStatus(data.data || data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load wallet status');
    } finally {
      setIsLoading(false);
    }
  }, [privyFetch]);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      setIsLoading(false);
      return;
    }
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchStatus();
    }
  }, [ready, authenticated, fetchStatus]);

  // Real deposit: send USDC on-chain from Privy wallet → treasury, then verify via API
  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) return;

    const wallet = wallets.find((w) => w.walletClientType === 'privy');
    if (!wallet) {
      setTxMessage({ type: 'error', text: 'No embedded wallet found. Try logging out and back in.' });
      return;
    }

    setIsDepositing(true);
    setTxMessage(null);

    try {
      // Step 1: Ensure wallet is on Base chain
      setTxMessage({ type: 'success', text: 'Switching to Base network...' });
      try {
        await wallet.switchChain(BASE_CHAIN_ID);
      } catch {
        // If switch fails, try to continue anyway — might already be on Base
      }

      const provider = await wallet.getEthereumProvider();

      // Step 2: Auto-fund gas if needed (we cover ETH fees for users)
      setTxMessage({ type: 'success', text: 'Checking gas balance...' });
      let gasFunded = false;
      try {
        const gasRes = await privyFetch('/api/wallet/gas', { method: 'POST' });
        const gasData = await gasRes.json();
        if (gasRes.ok && gasData.data?.funded) {
          gasFunded = true;
          setTxMessage({ type: 'success', text: 'Gas funded! Waiting for confirmation...' });
          await new Promise(resolve => setTimeout(resolve, 4000));
        } else if (!gasRes.ok) {
          console.warn('Gas funding failed:', gasData?.error);
        }
      } catch {
        console.warn('Gas funding request failed');
      }

      // Step 3: Verify ETH balance before attempting tx — prevents Privy error modal
      const ethHex = await provider.request({
        method: 'eth_getBalance',
        params: [wallet.address, 'latest'],
      });
      const ethBalance = parseInt(ethHex as string, 16) / 1e18;

      if (ethBalance < 0.00005) {
        // Not enough gas to do anything
        if (gasFunded) {
          throw new Error('Gas was sent but hasn\'t arrived yet. Please wait 10 seconds and try again.');
        } else {
          throw new Error('Your wallet needs ETH for gas fees. Gas auto-funding may be temporarily unavailable — please try again in a moment.');
        }
      }

      // Step 4: Encode the USDC transfer(treasury, amount) call
      const usdcAmount = parseUnits(amount.toString(), 6); // USDC has 6 decimals
      const data = encodeFunctionData({
        abi: ERC20_TRANSFER_ABI,
        functionName: 'transfer',
        args: [TREASURY_ADDRESS as `0x${string}`, usdcAmount],
      });

      // Step 5: Send the transaction via Privy embedded wallet
      setTxMessage({ type: 'success', text: 'Sending USDC to platform...' });
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: wallet.address,
          to: USDC_ADDRESS,
          data,
          chainId: `0x${BASE_CHAIN_ID.toString(16)}`,
        }],
      });

      // Step 5: Wait for confirmation & verify via API
      setTxMessage({ type: 'success', text: 'Transaction sent! Waiting for confirmation...' });

      // Poll for confirmation with retries
      let verified = false;
      for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        try {
          const res = await privyFetch('/api/wallet/fund', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ txHash }),
          });

          const result = await res.json();
          if (res.ok) {
            setTxMessage({
              type: 'success',
              text: result.data?.message || `Deposited ${amount} USDC to your trading balance!`,
            });
            verified = true;
            break;
          }
          // If it says "not confirmed yet", keep retrying
          if (result?.error?.includes('not confirmed') || result?.error?.includes('not found')) {
            setTxMessage({ type: 'success', text: `Waiting for on-chain confirmation... (attempt ${i + 2}/5)` });
            continue;
          }
          throw new Error(result?.error || 'Deposit verification failed');
        } catch (e: unknown) {
          if (i === 4) throw e;
        }
      }

      if (!verified) {
        throw new Error('Transaction sent but verification timed out. Your deposit should appear shortly — try refreshing.');
      }

      setDepositAmount('');
      hasFetched.current = false;
      await fetchStatus();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Deposit failed';
      if (msg.includes('insufficient funds') || msg.includes('gas')) {
        setTxMessage({ type: 'error', text: 'Gas funding may have failed. Please try again — we cover gas fees automatically.' });
      } else if (msg.includes('User rejected') || msg.includes('denied')) {
        setTxMessage({ type: 'error', text: 'Transaction was cancelled.' });
      } else {
        setTxMessage({ type: 'error', text: msg });
      }
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) return;

    setIsWithdrawing(true);
    setTxMessage(null);

    try {
      const res = await privyFetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Withdrawal failed');

      const received = data.data?.amountSent ?? (amount - 0.5);
      setTxMessage({ type: 'success', text: `Withdrew $${amount.toFixed(2)} — $${received.toFixed(2)} sent to your wallet` });
      setWithdrawAmount('');
      hasFetched.current = false;
      await fetchStatus();
    } catch (e: unknown) {
      setTxMessage({ type: 'error', text: e instanceof Error ? e.message : 'Withdrawal failed' });
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Send USDC from Privy embedded wallet → any external address
  const handleSendExternal = async () => {
    const amount = parseFloat(externalAmount);
    if (!amount || amount <= 0 || !externalAddress) return;

    if (!/^0x[a-fA-F0-9]{40}$/.test(externalAddress)) {
      setTxMessage({ type: 'error', text: 'Invalid wallet address. Must be a valid Ethereum/Base address.' });
      return;
    }

    const wallet = wallets.find((w) => w.walletClientType === 'privy');
    if (!wallet) {
      setTxMessage({ type: 'error', text: 'No embedded wallet found. Try logging out and back in.' });
      return;
    }

    setIsSendingExternal(true);
    setTxMessage(null);

    try {
      // Switch chain
      try {
        await wallet.switchChain(BASE_CHAIN_ID);
      } catch {
        // may already be on Base
      }

      const provider = await wallet.getEthereumProvider();

      // Fund gas if needed
      setTxMessage({ type: 'success', text: 'Checking gas balance...' });
      let gasFunded = false;
      try {
        const gasRes = await privyFetch('/api/wallet/gas', { method: 'POST' });
        const gasData = await gasRes.json();
        if (gasRes.ok && gasData.data?.funded) {
          gasFunded = true;
          setTxMessage({ type: 'success', text: 'Gas funded! Waiting for confirmation...' });
          await new Promise(resolve => setTimeout(resolve, 4000));
        }
      } catch {
        // best-effort
      }

      // Verify ETH balance before attempting tx
      const ethHex = await provider.request({
        method: 'eth_getBalance',
        params: [wallet.address, 'latest'],
      });
      const ethBalance = parseInt(ethHex as string, 16) / 1e18;

      if (ethBalance < 0.00005) {
        if (gasFunded) {
          throw new Error('Gas was sent but hasn\'t arrived yet. Please wait 10 seconds and try again.');
        } else {
          throw new Error('Your wallet needs ETH for gas fees. Gas auto-funding may be temporarily unavailable — please try again in a moment.');
        }
      }

      const usdcAmount = parseUnits(amount.toString(), 6);
      const data = encodeFunctionData({
        abi: ERC20_TRANSFER_ABI,
        functionName: 'transfer',
        args: [externalAddress as `0x${string}`, usdcAmount],
      });

      setTxMessage({ type: 'success', text: 'Sending USDC to external wallet...' });
      await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: wallet.address,
          to: USDC_ADDRESS,
          data,
          chainId: `0x${BASE_CHAIN_ID.toString(16)}`,
        }],
      });

      setTxMessage({ type: 'success', text: `Sent ${amount} USDC to ${externalAddress.slice(0, 6)}...${externalAddress.slice(-4)}` });
      setExternalAmount('');
      setExternalAddress('');
      hasFetched.current = false;
      await fetchStatus();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Transfer failed';
      if (msg.includes('User rejected') || msg.includes('denied')) {
        setTxMessage({ type: 'error', text: 'Transaction was cancelled.' });
      } else {
        setTxMessage({ type: 'error', text: msg });
      }
    } finally {
      setIsSendingExternal(false);
    }
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore
    }
  };

  // Get embedded wallet address from Privy (may differ from DB until sync)
  const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');
  const displayAddress = status?.walletAddress || embeddedWallet?.address || '';

  // Withdrawal preview
  const withdrawNum = parseFloat(withdrawAmount) || 0;
  const withdrawReceive = Math.max(0, withdrawNum - 0.5);

  if (!ready || (authenticated && !walletsReady)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <Card className="max-w-md w-full p-8 text-center" hover={false}>
          <div className="text-5xl mb-4">💰</div>
          <h1 className="text-2xl font-black text-white mb-2">Fund your account</h1>
          <p className="text-slate-400 mb-6">
            Sign in to deposit USDC and start trading character shares.
          </p>
          <Button size="lg" className="w-full" onClick={() => login()}>
            Sign In
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="pt-10 pb-8 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-2">Fund Account</h1>
              <p className="text-slate-400 font-medium">
                Deposit USDC on Base to trade character shares.
              </p>
            </div>
            <Link href="/marketplace">
              <Button variant="secondary">Back to Marketplace</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 space-y-6">
        {isLoading ? (
          <Card className="p-8" hover={false}>
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500"></div>
              <p className="text-slate-400">Loading wallet status…</p>
            </div>
          </Card>
        ) : error ? (
          <Card className="p-8" hover={false}>
            <p className="text-red-400 font-medium mb-4">{error}</p>
            <Button onClick={() => { hasFetched.current = false; fetchStatus(); }}>Retry</Button>
          </Card>
        ) : status ? (
          <>
            {/* Your Wallet Address — show first so users know where to send USDC */}
            <Card className="p-8" hover={false}>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Your Wallet Address (Base)</p>
              {displayAddress ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-mono text-white break-all">{displayAddress}</p>
                    <Button variant="secondary" size="sm" onClick={() => copy(displayAddress)}>
                      Copy
                    </Button>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-slate-400">
                    <p>Send <span className="text-white font-semibold">USDC on Base network</span> to this address from any exchange (Coinbase, Binance, etc).</p>
                    <p>After sending, click <strong className="text-white">Refresh</strong> to see your updated balance, then deposit to your trading balance.</p>
                  </div>
                </>
              ) : (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-amber-200 font-medium text-sm">
                    Your wallet is being created. Please try logging out and back in, or wait a moment and refresh.
                  </p>
                </div>
              )}
              <div className="mt-4">
                <Button variant="secondary" onClick={() => { hasFetched.current = false; fetchStatus(); }}>Refresh Balances</Button>
              </div>
            </Card>

            {/* Balances */}
            <Card className="p-8" hover={false}>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Platform Balance</p>
                  <p className="text-3xl font-black text-white">{status.platformBalance.toFixed(2)}</p>
                  <p className="text-sm text-slate-400 mt-1">USDC · Available to trade</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Wallet Balance</p>
                  <p className="text-3xl font-black text-white">{status.walletBalance.toFixed(2)}</p>
                  <p className="text-sm text-slate-400 mt-1">USDC · On-chain (Base)</p>
                </div>
              </div>

              {status.canBuy ? (
                <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-emerald-300 font-semibold text-sm">✓ You have funds to trade</p>
                </div>
              ) : (
                <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-amber-200 font-semibold text-sm">
                    Deposit USDC to start trading character shares
                  </p>
                </div>
              )}
            </Card>

            {/* Transaction message */}
            {txMessage && (
              <div className={`p-4 rounded-xl border ${txMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>
                <p className="font-medium text-sm">{txMessage.text}</p>
              </div>
            )}

            {/* Deposit to Platform */}
            <Card className="p-8" hover={false}>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Deposit to Trading Balance</p>
              <div className="flex gap-3">
                <div className="flex-1 flex gap-2">
                  <input
                    type="number"
                    placeholder="Amount (USDC)"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="flex-1 h-12 px-4 rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:border-indigo-500 text-white placeholder:text-slate-500"
                    min="0"
                    step="0.01"
                  />
                  <button
                    onClick={() => setDepositAmount(status.walletBalance.toFixed(2))}
                    className="h-12 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                  >
                    MAX
                  </button>
                </div>
                <Button onClick={handleDeposit} disabled={isDepositing || !depositAmount || parseFloat(depositAmount) <= 0}>
                  {isDepositing ? 'Processing...' : 'Deposit'}
                </Button>
              </div>
              <div className="mt-3 space-y-1">
                <p className="text-xs text-slate-500">
                  Sends USDC from your wallet to the platform treasury on Base. You&apos;ll be asked to confirm the transaction.
                </p>
                <p className="text-xs text-emerald-500/70">
                  Gas fees are covered automatically — no ETH needed.
                </p>
              </div>
            </Card>

            {/* Withdraw from Platform */}
            <Card className="p-8" hover={false}>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Withdraw to Wallet</p>
              <div className="flex gap-3">
                <div className="flex-1 flex gap-2">
                  <input
                    type="number"
                    placeholder="Amount (USDC)"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="flex-1 h-12 px-4 rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:border-indigo-500 text-white placeholder:text-slate-500"
                    min="0"
                    step="0.01"
                  />
                  <button
                    onClick={() => setWithdrawAmount(status.platformBalance.toFixed(2))}
                    className="h-12 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                  >
                    MAX
                  </button>
                </div>
                <Button
                  variant="secondary"
                  onClick={handleWithdraw}
                  disabled={isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) < 1}
                >
                  {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
                </Button>
              </div>
              {/* Withdrawal preview */}
              {withdrawNum >= 1 && (
                <div className="mt-3 p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">You withdraw:</span>
                    <span className="text-white font-semibold">${withdrawNum.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-400">Fee:</span>
                    <span className="text-slate-300">-$0.50</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1 pt-1 border-t border-slate-800">
                    <span className="text-slate-300 font-semibold">You receive:</span>
                    <span className="text-white font-bold">${withdrawReceive.toFixed(2)} USDC</span>
                  </div>
                </div>
              )}
              <div className="mt-3 space-y-1">
                <p className="text-xs text-slate-500">
                  Moves USDC from your trading balance back to your embedded wallet on Base.
                </p>
                <p className="text-xs text-amber-400/70">
                  $0.50 USDC fee is subtracted from your withdrawal. Minimum: $1.00 USDC.
                </p>
              </div>
            </Card>

            {/* Send to External Wallet */}
            <Card className="p-8" hover={false}>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Send to External Wallet</p>
              <p className="text-xs text-slate-400 mb-4">
                Send USDC directly from your embedded wallet to any personal wallet or exchange address on Base.
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Recipient address (0x...)"
                  value={externalAddress}
                  onChange={(e) => setExternalAddress(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:border-indigo-500 text-white placeholder:text-slate-500 font-mono text-sm"
                />
                <div className="flex gap-3">
                  <div className="flex-1 flex gap-2">
                    <input
                      type="number"
                      placeholder="Amount (USDC)"
                      value={externalAmount}
                      onChange={(e) => setExternalAmount(e.target.value)}
                      className="flex-1 h-12 px-4 rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:border-indigo-500 text-white placeholder:text-slate-500"
                      min="0"
                      step="0.01"
                    />
                    <button
                      onClick={() => setExternalAmount(status.walletBalance.toFixed(2))}
                      className="h-12 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={handleSendExternal}
                    disabled={isSendingExternal || !externalAmount || !externalAddress || parseFloat(externalAmount) <= 0}
                  >
                    {isSendingExternal ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                This sends from your on-chain wallet balance (not your trading balance). No platform fee — only Base gas.
              </p>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
