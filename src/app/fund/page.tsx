'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { usePrivyAuthedFetch } from '@/lib/auth/privy-client';
import { Button, Card } from '@/components/ui';

type WalletStatus = {
  userId: string;
  walletAddress: string;
  chain: 'polygon';
  balances: {
    matic: number;
  };
  requirements: {
    minMaticToEnableBuy: number;
  };
  canBuy: boolean;
};

export default function FundPage() {
  const { ready, authenticated, login } = usePrivy();
  const privyFetch = usePrivyAuthedFetch();

  const [status, setStatus] = useState<WalletStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await privyFetch('/api/wallet/status');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load wallet status');
      setStatus(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load wallet status');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      setIsLoading(false);
      return;
    }
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated]);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore
    }
  };

  if (!ready) {
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
          <div className="text-5xl mb-4">💳</div>
          <h1 className="text-2xl font-black text-white mb-2">Fund your wallet</h1>
          <p className="text-slate-400 mb-6">
            Sign in to see your embedded wallet address and fund it on Polygon.
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
              <h1 className="text-4xl md:text-5xl font-black text-white mb-2">Fund Wallet</h1>
              <p className="text-slate-400 font-medium">
                You must fund your embedded wallet on Polygon mainnet before your first buy.
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
            <Button onClick={fetchStatus}>Retry</Button>
          </Card>
        ) : status ? (
          <>
            <Card className="p-8" hover={false}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Your wallet address</p>
                  <p className="text-sm font-mono text-white break-all">{status.walletAddress}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => copy(status.walletAddress)}>
                  Copy
                </Button>
              </div>

              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Polygon MATIC balance</p>
                  <p className="text-2xl font-black text-white">{status.balances.matic.toFixed(4)}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Required to enable buying</p>
                  <p className="text-2xl font-black text-white">{status.requirements.minMaticToEnableBuy.toFixed(4)} MATIC</p>
                </div>
              </div>

              <div className="mt-6">
                {status.canBuy ? (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-emerald-300 font-semibold">You’re funded. Buying is enabled.</p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <p className="text-amber-200 font-semibold">
                      Not funded yet. Send a small amount of MATIC to your address to enable buying.
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-8" hover={false}>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">How to fund</p>
              <div className="space-y-3 text-sm text-slate-300">
                <p>
                  1) Buy or withdraw <span className="text-white font-semibold">MATIC on Polygon mainnet</span> from your exchange.
                </p>
                <p>
                  2) Send it to the address above. Start with a small test amount.
                </p>
                <p>
                  3) Click refresh below once it confirms.
                </p>
              </div>
              <div className="mt-6 flex gap-3 flex-wrap">
                <Button onClick={fetchStatus}>Refresh Balance</Button>
                <Link href="/marketplace">
                  <Button variant="secondary">Continue</Button>
                </Link>
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
