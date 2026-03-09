'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { usePrivyAuthedFetch } from '@/lib/auth/privy-client';
import { Button, Card } from '@/components/ui';

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

  // Simplified deposit: send amount to API, backend verifies on-chain balance
  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) return;

    setIsDepositing(true);
    setTxMessage(null);

    try {
      const res = await privyFetch('/api/wallet/fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Deposit failed');

      setTxMessage({ type: 'success', text: data.data?.message || `Deposited ${amount} USDC` });
      setDepositAmount('');
      hasFetched.current = false;
      await fetchStatus();
    } catch (e: unknown) {
      setTxMessage({ type: 'error', text: e instanceof Error ? e.message : 'Deposit failed' });
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

      setTxMessage({ type: 'success', text: `Withdrew ${amount} USDC` });
      setWithdrawAmount('');
      hasFetched.current = false;
      await fetchStatus();
    } catch (e: unknown) {
      setTxMessage({ type: 'error', text: e instanceof Error ? e.message : 'Withdrawal failed' });
    } finally {
      setIsWithdrawing(false);
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
                <input
                  type="number"
                  placeholder="Amount (USDC)"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="flex-1 h-12 px-4 rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:border-indigo-500 text-white placeholder:text-slate-500"
                  min="0"
                  step="0.01"
                />
                <Button onClick={handleDeposit} disabled={isDepositing || !depositAmount || parseFloat(depositAmount) <= 0}>
                  {isDepositing ? 'Depositing...' : 'Deposit'}
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Moves USDC from your wallet to your platform trading balance. Your wallet must have USDC on Base network.
              </p>
            </Card>

            {/* Withdraw from Platform */}
            <Card className="p-8" hover={false}>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Withdraw to Wallet</p>
              <div className="flex gap-3">
                <input
                  type="number"
                  placeholder="Amount (USDC)"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="flex-1 h-12 px-4 rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:border-indigo-500 text-white placeholder:text-slate-500"
                  min="0"
                  step="0.01"
                />
                <Button
                  variant="secondary"
                  onClick={handleWithdraw}
                  disabled={isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                >
                  {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Moves USDC from your trading balance back to your embedded wallet on Base.
              </p>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
