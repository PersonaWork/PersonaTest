'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const PriceChart = dynamic(() => import('@/components/trading/PriceChart'), {
  ssr: false,
  loading: () => <div className="h-[320px] bg-slate-950/50 rounded-xl animate-pulse border border-slate-800" />
});
import { usePrivy } from '@privy-io/react-auth';
import { usePrivyAuthedFetch } from '@/lib/auth/privy-client';

type WalletStatus = {
  platformBalance: number;
  walletBalance: number;
  canBuy: boolean;
};

interface Character {
  id: string;
  name: string;
  slug: string;
  currentPrice: number;
  marketCap: number;
  totalShares: number;
  sharesIssued: number;
}

interface Holding {
  shares: number;
  avgBuyPrice: number;
}

interface Transaction {
  createdAt: string;
  pricePerShare: number;
  shares: number;
  type: string;
}

export default function TradePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const { ready, authenticated, login, user } = usePrivy();
  const privyFetch = usePrivyAuthedFetch();

  const [character, setCharacter] = useState<Character | null>(null);
  const [holding, setHolding] = useState<Holding | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletStatus, setWalletStatus] = useState<WalletStatus | null>(null);
  const [walletStatusLoading, setWalletStatusLoading] = useState(false);

  // Trade form states
  const [buyShares, setBuyShares] = useState('');
  const [sellShares, setSellShares] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchWalletStatus = useCallback(async () => {
    setWalletStatusLoading(true);
    try {
      const res = await privyFetch('/api/wallet/status');
      const data = await res.json().catch(() => ({}));
      if (res.ok) setWalletStatus(data.data || data);
    } finally {
      setWalletStatusLoading(false);
    }
  }, [privyFetch]);

  const fetchCharacter = useCallback(async () => {
    try {
      const response = await fetch(`/api/characters/${slug}`);
      if (!response.ok) throw new Error('Failed to fetch character');

      const data = await response.json();
      setCharacter(data);
    } catch (error) {
      console.error('Failed to fetch character:', error);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const fetchTransactions = useCallback(async () => {
    try {
      const response = await fetch(`/api/characters/${slug}/transactions`);
      if (!response.ok) return;

      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  }, [slug]);

  const fetchHolding = useCallback(async () => {
    try {
      if (!user?.id || !character?.id) return;
      const response = await privyFetch(`/api/users/${user.id}/holdings`);
      if (response.ok) {
        const data = await response.json();
        const charHolding = data.find((h: { characterId: string }) => h.characterId === character.id);
        setHolding(charHolding || null);
      }
    } catch (error) {
      console.error('Failed to fetch holding:', error);
    }
  }, [user?.id, character?.id, privyFetch]);

  useEffect(() => {
    if (slug) {
      fetchCharacter();
      fetchTransactions();
    }
  }, [slug, fetchCharacter, fetchTransactions]);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      setWalletStatus(null);
      setHolding(null);
      return;
    }
    fetchWalletStatus();
  }, [ready, authenticated, fetchWalletStatus]);

  useEffect(() => {
    if (character && authenticated && user?.id) {
      fetchHolding();
    }
  }, [character, authenticated, user?.id, fetchHolding]);

  const handleBuy = async () => {
    if (!buyShares || !character) return;

    setIsProcessing(true);
    try {
      const shares = parseInt(buyShares);
      if (!authenticated) {
        await login();
      }

      const response = await privyFetch('/api/trading/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: character.id,
          shares
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data?.error?.includes('Insufficient USDC')) {
          router.push('/fund');
          return;
        }
        throw new Error(data?.error || 'Trade failed');
      }

      await fetchCharacter();
      await fetchTransactions();
      await fetchHolding();
      setBuyShares('');
    } catch (error) {
      console.error('Buy failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSell = async () => {
    if (!sellShares || !character) return;

    setIsProcessing(true);
    try {
      const shares = parseInt(sellShares);
      if (!authenticated) {
        await login();
      }

      const response = await privyFetch('/api/trading/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: character.id,
          shares
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Trade failed');
      }

      await fetchCharacter();
      await fetchTransactions();
      await fetchHolding();
      setSellShares('');
    } catch (error) {
      console.error('Sell failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Character not found</h1>
          <Link href={`/character/${slug}`} className="text-indigo-400 hover:text-indigo-300">
            ← Back to Character
          </Link>
        </div>
      </div>
    );
  }

  const buySharesNum = parseInt(buyShares) || 0;
  const sellSharesNum = parseInt(sellShares) || 0;

  const estimatedBuyCost = buySharesNum * character.currentPrice * (1 + (buySharesNum / character.totalShares) * 0.05);
  const estimatedSellProceeds = sellSharesNum * character.currentPrice * (1 - (sellSharesNum / character.totalShares) * 0.05);

  const chartData = transactions.map(t => ({
    time: new Date(t.createdAt).toLocaleDateString(),
    price: t.pricePerShare
  }));

  return (
    <div className="min-h-screen pb-20">
      {/* Background Effect */}
      <div className="absolute top-0 left-0 right-0 h-[500px] overflow-hidden -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/40 via-[#0a0a0f]/80 to-[#0a0a0f] z-10" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-10">

        {/* Header & Tabs */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/character/${slug}`} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-3xl font-black text-white leading-tight">Trade {character.name}</h1>
              <p className="text-sm font-medium text-slate-400">Manage your investment</p>
            </div>
          </div>

          <div className="hidden sm:flex border border-slate-800 rounded-lg overflow-hidden bg-slate-900/50">
            <Link href={`/character/${slug}`} className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              Overview
            </Link>
            <div className="px-4 py-2 text-sm font-semibold bg-indigo-500/20 text-indigo-300 border-l border-slate-800">
              Trade
            </div>
            <Link href={`/character/${slug}/chat`} className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border-l border-slate-800">
              Chat
            </Link>
          </div>
        </div>

        {/* Global Market Stats */}
        <div className="flex items-center gap-6 mb-8 bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 mt-0.5">Current Price</p>
            <p className="text-3xl font-black text-white">${character.currentPrice.toFixed(2)}</p>
          </div>
          <div className="w-px h-12 bg-slate-800/80"></div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 mt-0.5">Market Cap</p>
            <p className="text-2xl font-bold text-white">${(character.marketCap / 1000).toFixed(1)}K</p>
          </div>
          <div className="w-px h-12 bg-slate-800/80 hidden sm:block"></div>
          <div className="hidden sm:block">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 mt-0.5">Shares Issued</p>
            <p className="text-2xl font-bold text-white">{character.sharesIssued.toLocaleString()} / {character.totalShares.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Price Chart */}
          <Card className="bg-slate-900/60 backdrop-blur-md border-slate-800/80 shadow-2xl" hover={false}>
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Price History
              </h2>
              <PriceChart data={chartData} />
            </div>
          </Card>

          {/* Trading Panel */}
          <div className="space-y-6">
            {/* Funding Gate */}
            {authenticated && (
              <Card hover={false} className="bg-slate-900/40 border-slate-800/80">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4 scale-[0.95] origin-top-left md:scale-100">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">USDC Balance</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-300">
                        {walletStatusLoading
                          ? 'Checking balance...'
                          : walletStatus
                            ? `$${walletStatus.platformBalance.toFixed(2)} USDC`
                            : 'Unable to read balance.'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={fetchWalletStatus} disabled={walletStatusLoading}>
                        Refresh
                      </Button>
                      <Link href="/fund">
                        <Button size="sm" variant={walletStatus?.canBuy ? 'secondary' : 'primary'} className="shadow-lg shadow-indigo-500/10">
                          {walletStatus?.canBuy ? 'Manage Funds' : 'Deposit USDC'}
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {walletStatus && !walletStatus.canBuy && (
                    <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-3 items-start">
                      <div className="text-amber-500 mt-0.5">⚠️</div>
                      <p className="text-xs font-semibold text-amber-200/80 leading-relaxed">
                        Deposit USDC to your platform balance to start buying shares.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Buy Panel */}
            <Card>
              <div className="p-6">
                <h2 className="text-xl font-bold text-white mb-4">Buy Shares</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Number of shares
                    </label>
                    <input
                      type="number"
                      value={buyShares}
                      onChange={(e) => setBuyShares(e.target.value)}
                      min="1"
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter amount"
                    />
                  </div>

                  {buySharesNum > 0 && (
                    <div className="p-4 bg-slate-900/50 rounded-lg">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-400">Estimated cost:</span>
                        <span className="text-white font-semibold">${estimatedBuyCost.toFixed(2)} USDC</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">New ownership:</span>
                        <span className="text-white font-semibold">
                          {((buySharesNum / character.totalShares) * 100).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleBuy}
                    disabled={!buySharesNum || isProcessing || (walletStatus ? !walletStatus.canBuy : false)}
                    className="w-full"
                    size="lg"
                    variant="primary"
                  >
                    {isProcessing ? 'Processing...' : `Buy ${buySharesNum || 0} shares`}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Sell Panel */}
            <Card>
              <div className="p-6">
                <h2 className="text-xl font-bold text-white mb-4">Sell Shares</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Number of shares (max: {holding?.shares || 0})
                    </label>
                    <input
                      type="number"
                      value={sellShares}
                      onChange={(e) => setSellShares(e.target.value)}
                      min="1"
                      max={holding?.shares || 0}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter amount"
                    />
                  </div>

                  {sellSharesNum > 0 && (
                    <div className="p-4 bg-slate-900/50 rounded-lg">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-400">Estimated proceeds:</span>
                        <span className="text-white font-semibold">${estimatedSellProceeds.toFixed(2)} USDC</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Remaining shares:</span>
                        <span className="text-white font-semibold">
                          {(holding?.shares || 0) - sellSharesNum}
                        </span>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleSell}
                    disabled={!sellSharesNum || !holding || sellSharesNum > holding.shares || isProcessing}
                    className="w-full"
                    size="lg"
                    variant="danger"
                  >
                    {isProcessing ? 'Processing...' : `Sell ${sellSharesNum || 0} shares`}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Your Holdings */}
            {holding ? (
              <Card hover={false} className="bg-slate-900/80 border-slate-700 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[40px] pointer-events-none rounded-bl-full" />
                <div className="p-6 relative z-10">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Your Position
                  </h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-slate-800">
                      <span className="text-sm font-medium text-slate-400">Shares Owned</span>
                      <span className="text-lg font-bold text-white">{holding.shares.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-800">
                      <span className="text-sm font-medium text-slate-400">Avg Entry Price</span>
                      <span className="text-lg font-semibold text-slate-200">${holding.avgBuyPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-800">
                      <span className="text-sm font-medium text-slate-400">Current Capital</span>
                      <span className="text-lg font-bold text-white">
                        ${(holding.shares * character.currentPrice).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-sm font-bold text-slate-400">Unrealized P&L</span>
                      <div className="text-right">
                        <span className={`text-xl font-black ${(character.currentPrice - holding.avgBuyPrice) >= 0
                          ? 'text-emerald-400'
                          : 'text-red-400'
                          }`}>
                          ${((character.currentPrice - holding.avgBuyPrice) * holding.shares).toFixed(2)}
                        </span>
                        <div className={`text-xs font-bold ${(character.currentPrice - holding.avgBuyPrice) >= 0
                          ? 'text-emerald-400/80 bg-emerald-500/10'
                          : 'text-red-400/80 bg-red-500/10'
                          } inline-block px-1.5 rounded mt-0.5 ml-1`}>
                          {((character.currentPrice - holding.avgBuyPrice) / holding.avgBuyPrice * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card hover={false} className="bg-slate-900/30 border-slate-800 border-dashed text-center">
                <div className="p-8">
                  <div className="w-12 h-12 rounded-full bg-slate-800 mx-auto flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-slate-300 font-bold mb-1">No Position</h3>
                  <p className="text-xs text-slate-500">Buy shares to monitor your returns</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
