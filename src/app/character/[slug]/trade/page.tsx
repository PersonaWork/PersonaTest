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
  lockedUsdc: number;
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

interface PendingOrder {
  id: string;
  side: 'buy' | 'sell';
  shares: number;
  triggerPrice: number;
  lockedAmount: number;
  status: string;
  expiresAt: string | null;
  createdAt: string;
}

const BONDING_CURVE_FACTOR = 1.5; // Must match server-side constant

/** Format a share price with enough decimals for its magnitude */
function formatPrice(price: number): string {
  if (price >= 100) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  if (price >= 0.01) return price.toFixed(4);
  if (price >= 0.0001) return price.toFixed(6);
  return price.toFixed(8);
}

/** Format a USDC dollar amount (trade costs, balances, etc.) */
function formatUsd(amount: number): string {
  if (Math.abs(amount) >= 1) return amount.toFixed(2);
  if (Math.abs(amount) >= 0.01) return amount.toFixed(4);
  if (Math.abs(amount) >= 0.0001) return amount.toFixed(6);
  return amount.toFixed(8);
}

/** Format market cap in a human-readable way */
function formatMarketCap(cap: number): string {
  if (cap >= 1_000_000) return `$${(cap / 1_000_000).toFixed(2)}M`;
  if (cap >= 1_000) return `$${(cap / 1_000).toFixed(2)}K`;
  if (cap >= 1) return `$${cap.toFixed(2)}`;
  return `$${formatUsd(cap)}`;
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

  // Limit order states
  const [orderMode, setOrderMode] = useState<'market' | 'limit'>('market');
  const [buyTriggerPrice, setBuyTriggerPrice] = useState('');
  const [sellTriggerPrice, setSellTriggerPrice] = useState('');
  const [buyExpiry, setBuyExpiry] = useState('');
  const [sellExpiry, setSellExpiry] = useState('');
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [tradeError, setTradeError] = useState<string | null>(null);

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

      const json = await response.json();
      // Unwrap successResponse envelope: { success: true, data: {...} }
      if (json.success && json.data) {
        setCharacter(json.data);
      } else {
        setCharacter(json);
      }
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
        const json = await response.json();
        const holdings = json.data || json;
        const charHolding = Array.isArray(holdings)
          ? holdings.find((h: { characterId: string }) => h.characterId === character.id)
          : null;
        setHolding(charHolding || null);
      }
    } catch (error) {
      console.error('Failed to fetch holding:', error);
    }
  }, [user?.id, character?.id, privyFetch]);

  const fetchPendingOrders = useCallback(async () => {
    if (!authenticated || !character) return;
    try {
      const res = await privyFetch(
        `/api/trading/limit-order?status=pending&characterId=${character.id}`
      );
      if (res.ok) {
        const data = await res.json();
        setPendingOrders(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch pending orders:', error);
    }
  }, [authenticated, character, privyFetch]);

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
      setPendingOrders([]);
      return;
    }
    fetchWalletStatus();
  }, [ready, authenticated, fetchWalletStatus]);

  useEffect(() => {
    if (character && authenticated && user?.id) {
      fetchHolding();
      fetchPendingOrders();
    }
  }, [character, authenticated, user?.id, fetchHolding, fetchPendingOrders]);

  // Helper to compute expiry ISO string
  const getExpiryDate = (expiry: string): string | undefined => {
    if (expiry === '24h') return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    if (expiry === '7d') return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    if (expiry === '30d') return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    return undefined;
  };

  // Refresh all data after trade
  const refreshAfterTrade = async () => {
    await Promise.all([
      fetchCharacter(),
      fetchTransactions(),
      fetchHolding(),
      fetchWalletStatus(),
      fetchPendingOrders(),
    ]);
  };

  /** Execute a trade API call with one automatic retry on 409 (serialization conflict) */
  const tradeWithRetry = async (url: string, body: object): Promise<Response> => {
    const doFetch = () => privyFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const res = await doFetch();
    if (res.status === 409) return doFetch(); // retry once on conflict
    return res;
  };

  const handleBuy = async () => {
    if (!buyShares || !character) return;
    setIsProcessing(true);
    setTradeError(null);
    try {
      const shares = parseInt(buyShares);
      if (!authenticated) { await login(); }

      const response = await tradeWithRetry('/api/trading/buy', {
        characterId: character.id, shares,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data?.error?.includes('Insufficient USDC')) {
          router.push('/fund');
          return;
        }
        throw new Error(data?.error || 'Trade failed');
      }

      await refreshAfterTrade();
      setBuyShares('');
    } catch (error) {
      console.error('Buy failed:', error);
      setTradeError(error instanceof Error ? error.message : 'Buy failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSell = async () => {
    if (!sellShares || !character) return;
    setIsProcessing(true);
    setTradeError(null);
    try {
      const shares = parseInt(sellShares);
      if (!authenticated) { await login(); }

      const response = await tradeWithRetry('/api/trading/sell', {
        characterId: character.id, shares,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Trade failed');
      }

      await refreshAfterTrade();
      setSellShares('');
    } catch (error) {
      console.error('Sell failed:', error);
      setTradeError(error instanceof Error ? error.message : 'Sell failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLimitBuy = async () => {
    if (!buyShares || !buyTriggerPrice || !character) return;
    setIsProcessing(true);
    setTradeError(null);
    try {
      const shares = parseInt(buyShares);
      const triggerPrice = parseFloat(buyTriggerPrice);
      if (!authenticated) { await login(); }

      const response = await privyFetch('/api/trading/limit-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: character.id,
          side: 'buy',
          shares,
          triggerPrice,
          expiresAt: getExpiryDate(buyExpiry),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to place limit order');
      }

      await Promise.all([fetchWalletStatus(), fetchPendingOrders()]);
      setBuyShares('');
      setBuyTriggerPrice('');
    } catch (error) {
      console.error('Limit buy failed:', error);
      setTradeError(error instanceof Error ? error.message : 'Limit buy failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLimitSell = async () => {
    if (!sellShares || !sellTriggerPrice || !character) return;
    setIsProcessing(true);
    setTradeError(null);
    try {
      const shares = parseInt(sellShares);
      const triggerPrice = parseFloat(sellTriggerPrice);
      if (!authenticated) { await login(); }

      const response = await privyFetch('/api/trading/limit-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: character.id,
          side: 'sell',
          shares,
          triggerPrice,
          expiresAt: getExpiryDate(sellExpiry),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to place limit order');
      }

      await Promise.all([fetchHolding(), fetchPendingOrders()]);
      setSellShares('');
      setSellTriggerPrice('');
    } catch (error) {
      console.error('Limit sell failed:', error);
      setTradeError(error instanceof Error ? error.message : 'Limit sell failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    setCancellingOrderId(orderId);
    setTradeError(null);
    try {
      const response = await privyFetch(`/api/trading/limit-order/${orderId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to cancel order');
      }
      await Promise.all([fetchWalletStatus(), fetchPendingOrders(), fetchHolding()]);
    } catch (error) {
      console.error('Cancel failed:', error);
      setTradeError(error instanceof Error ? error.message : 'Cancel failed');
    } finally {
      setCancellingOrderId(null);
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
            &larr; Back to Character
          </Link>
        </div>
      </div>
    );
  }

  const buySharesNum = parseInt(buyShares) || 0;
  const sellSharesNum = parseInt(sellShares) || 0;
  const buyTriggerNum = parseFloat(buyTriggerPrice) || 0;
  const sellTriggerNum = parseFloat(sellTriggerPrice) || 0;

  const PLATFORM_FEE_RATE = 0.005; // 0.5% fee
  const estimatedBuyCost = buySharesNum * character.currentPrice * (1 + (buySharesNum / character.totalShares) * BONDING_CURVE_FACTOR);
  const buyFee = estimatedBuyCost * PLATFORM_FEE_RATE;
  const estimatedBuyTotal = estimatedBuyCost + buyFee;
  const estimatedSellProceeds = sellSharesNum * character.currentPrice * (1 - (sellSharesNum / character.totalShares) * BONDING_CURVE_FACTOR);
  const sellFee = estimatedSellProceeds * PLATFORM_FEE_RATE;
  const estimatedSellAfterFee = estimatedSellProceeds - sellFee;
  const limitBuyLocked = buySharesNum * buyTriggerNum * (1 + (buySharesNum / character.totalShares) * BONDING_CURVE_FACTOR);
  const availableShares = character.totalShares - character.sharesIssued;
  const isSoldOut = availableShares <= 0;

  const chartData = transactions.map(t => ({
    time: new Date(t.createdAt).toLocaleDateString(),
    price: t.pricePerShare
  }));

  const expiryOptions = [
    { value: '', label: 'Never' },
    { value: '24h', label: '24h' },
    { value: '7d', label: '7d' },
    { value: '30d', label: '30d' },
  ];

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
            <p className="text-3xl font-black text-white">${formatPrice(character.currentPrice)}</p>
          </div>
          <div className="w-px h-12 bg-slate-800/80"></div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 mt-0.5">Market Cap</p>
            <p className="text-2xl font-bold text-white">{formatMarketCap(character.marketCap)}</p>
          </div>
          <div className="w-px h-12 bg-slate-800/80 hidden sm:block"></div>
          <div className="hidden sm:block">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 mt-0.5">Supply</p>
            <p className="text-2xl font-bold text-white">{character.sharesIssued.toLocaleString()} / {character.totalShares.toLocaleString()}</p>
            <p className={`text-xs font-semibold mt-0.5 ${isSoldOut ? 'text-red-400' : 'text-emerald-400/70'}`}>
              {isSoldOut ? 'Sold out' : `${availableShares.toLocaleString()} available`}
            </p>
          </div>
        </div>

        {/* Error Banner */}
        {tradeError && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
            <span className="text-red-400 text-sm mt-0.5">!</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-300">{tradeError}</p>
            </div>
            <button onClick={() => setTradeError(null)} className="text-red-400 hover:text-red-300 text-sm font-bold">
              &times;
            </button>
          </div>
        )}

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
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">USDC Balance</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-300">
                        {walletStatusLoading
                          ? 'Checking balance...'
                          : walletStatus
                            ? `$${formatUsd(walletStatus.platformBalance)} USDC`
                            : 'Unable to read balance.'}
                      </p>
                      {walletStatus && walletStatus.lockedUsdc > 0 && (
                        <p className="text-xs text-amber-400/70 mt-1">
                          ${formatUsd(walletStatus.lockedUsdc)} locked in limit orders
                        </p>
                      )}
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
                      <div className="text-amber-500 mt-0.5">!</div>
                      <p className="text-xs font-semibold text-amber-200/80 leading-relaxed">
                        Deposit USDC to your platform balance to start buying shares.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Order Mode Toggle */}
            <div className="flex bg-slate-900/50 rounded-xl p-1 border border-slate-800/50">
              <button
                onClick={() => setOrderMode('market')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  orderMode === 'market'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Market
              </button>
              <button
                onClick={() => setOrderMode('limit')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  orderMode === 'limit'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Limit
              </button>
            </div>

            {/* Buy Panel */}
            <Card>
              <div className="p-6">
                <h2 className="text-xl font-bold text-white mb-4">
                  {orderMode === 'market' ? 'Buy Shares' : 'Limit Buy Order'}
                </h2>
                {isSoldOut && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-sm font-semibold text-red-300">All {character.totalShares.toLocaleString()} shares have been issued. Wait for someone to sell.</p>
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Number of shares
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={buyShares}
                        onChange={(e) => setBuyShares(e.target.value)}
                        min="1"
                        className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Enter amount"
                      />
                      {walletStatus && character && (
                        <button
                          onClick={() => {
                            const maxByBalance = Math.floor(walletStatus.platformBalance / (character.currentPrice * 1.005));
                            const maxShares = Math.min(maxByBalance, availableShares);
                            if (maxShares > 0) setBuyShares(maxShares.toString());
                          }}
                          disabled={isSoldOut}
                          className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-bold text-slate-300 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          MAX
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Limit order: trigger price */}
                  {orderMode === 'limit' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Trigger Price (USDC)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={buyTriggerPrice}
                          onChange={(e) => setBuyTriggerPrice(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder={`Below $${formatPrice(character.currentPrice)}`}
                        />
                        <p className="text-xs text-slate-500 mt-1">Order fills when price drops to this level</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Expiration
                        </label>
                        <div className="flex gap-2">
                          {expiryOptions.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => setBuyExpiry(option.value)}
                              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                                buyExpiry === option.value
                                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
                                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white border border-transparent'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Market order estimate */}
                  {orderMode === 'market' && buySharesNum > 0 && (
                    <div className="p-4 bg-slate-900/50 rounded-lg">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-400">Subtotal:</span>
                        <span className="text-white font-semibold">${formatUsd(estimatedBuyCost)} USDC</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-400">Fee (0.5%):</span>
                        <span className="text-slate-300 font-medium">${formatUsd(buyFee)} USDC</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2 pt-2 border-t border-slate-800">
                        <span className="text-slate-300 font-semibold">Total cost:</span>
                        <span className="text-white font-bold">${formatUsd(estimatedBuyTotal)} USDC</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">New ownership:</span>
                        <span className="text-white font-semibold">
                          {((buySharesNum / character.totalShares) * 100).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Limit order estimate */}
                  {orderMode === 'limit' && buySharesNum > 0 && buyTriggerNum > 0 && (
                    <div className="p-4 bg-slate-900/50 rounded-lg">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-400">USDC to lock:</span>
                        <span className="text-white font-semibold">${formatUsd(limitBuyLocked)} USDC</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-400">Triggers at:</span>
                        <span className="text-amber-400 font-semibold">${formatPrice(buyTriggerNum)} or below</span>
                      </div>
                      {buyTriggerNum >= character.currentPrice && (
                        <p className="text-xs text-red-400 mt-1">Trigger price must be below current price (${formatPrice(character.currentPrice)})</p>
                      )}
                    </div>
                  )}

                  {buySharesNum > availableShares && availableShares > 0 && (
                    <p className="text-xs text-red-400 mb-2">Only {availableShares.toLocaleString()} shares available</p>
                  )}
                  <Button
                    onClick={orderMode === 'market' ? handleBuy : handleLimitBuy}
                    disabled={
                      !buySharesNum || isProcessing || isSoldOut || buySharesNum > availableShares ||
                      (orderMode === 'market' && walletStatus ? !walletStatus.canBuy : false) ||
                      (orderMode === 'limit' && (!buyTriggerNum || buyTriggerNum >= character.currentPrice))
                    }
                    className="w-full"
                    size="lg"
                    variant="primary"
                  >
                    {isProcessing
                      ? 'Processing...'
                      : isSoldOut
                        ? 'Sold Out'
                        : orderMode === 'market'
                          ? `Buy ${buySharesNum || 0} shares`
                          : 'Place Limit Buy'}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Sell Panel */}
            <Card>
              <div className="p-6">
                <h2 className="text-xl font-bold text-white mb-4">
                  {orderMode === 'market' ? 'Sell Shares' : 'Limit Sell Order'}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Number of shares (available: {holding?.shares || 0})
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={sellShares}
                        onChange={(e) => setSellShares(e.target.value)}
                        min="1"
                        max={holding?.shares || 0}
                        className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Enter amount"
                      />
                      {holding && holding.shares > 0 && (
                        <button
                          onClick={() => setSellShares(holding.shares.toString())}
                          className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                        >
                          MAX
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Limit order: trigger price */}
                  {orderMode === 'limit' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Trigger Price (USDC)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={sellTriggerPrice}
                          onChange={(e) => setSellTriggerPrice(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder={`Above $${formatPrice(character.currentPrice)}`}
                        />
                        <p className="text-xs text-slate-500 mt-1">Order fills when price rises to this level</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Expiration
                        </label>
                        <div className="flex gap-2">
                          {expiryOptions.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => setSellExpiry(option.value)}
                              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                                sellExpiry === option.value
                                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
                                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white border border-transparent'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Market sell estimate */}
                  {orderMode === 'market' && sellSharesNum > 0 && (
                    <div className="p-4 bg-slate-900/50 rounded-lg">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-400">Gross proceeds:</span>
                        <span className="text-white font-semibold">${formatUsd(estimatedSellProceeds)} USDC</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-400">Fee (0.5%):</span>
                        <span className="text-slate-300 font-medium">-${formatUsd(sellFee)} USDC</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2 pt-2 border-t border-slate-800">
                        <span className="text-slate-300 font-semibold">You receive:</span>
                        <span className="text-white font-bold">${formatUsd(estimatedSellAfterFee)} USDC</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Remaining shares:</span>
                        <span className="text-white font-semibold">
                          {(holding?.shares || 0) - sellSharesNum}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Limit sell estimate */}
                  {orderMode === 'limit' && sellSharesNum > 0 && sellTriggerNum > 0 && (
                    <div className="p-4 bg-slate-900/50 rounded-lg">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-400">Shares to lock:</span>
                        <span className="text-white font-semibold">{sellSharesNum} shares</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-400">Triggers at:</span>
                        <span className="text-emerald-400 font-semibold">${formatPrice(sellTriggerNum)} or above</span>
                      </div>
                      {sellTriggerNum <= character.currentPrice && (
                        <p className="text-xs text-red-400 mt-1">Trigger price must be above current price (${formatPrice(character.currentPrice)})</p>
                      )}
                    </div>
                  )}

                  <Button
                    onClick={orderMode === 'market' ? handleSell : handleLimitSell}
                    disabled={
                      !sellSharesNum || isProcessing ||
                      (orderMode === 'market' && (!holding || sellSharesNum > holding.shares)) ||
                      (orderMode === 'limit' && (!sellTriggerNum || sellTriggerNum <= character.currentPrice || !holding || sellSharesNum > holding.shares))
                    }
                    className="w-full"
                    size="lg"
                    variant="danger"
                  >
                    {isProcessing
                      ? 'Processing...'
                      : orderMode === 'market'
                        ? `Sell ${sellSharesNum || 0} shares`
                        : 'Place Limit Sell'}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Pending Limit Orders */}
            {pendingOrders.length > 0 && (
              <Card hover={false} className="bg-slate-900/60 border-slate-800/80">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Pending Orders
                    <span className="text-xs font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full ml-1">
                      {pendingOrders.length}
                    </span>
                  </h2>
                  <div className="space-y-3">
                    {pendingOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 bg-slate-950/50 rounded-xl border border-slate-800/50">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                              order.side === 'buy'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}>
                              {order.side}
                            </span>
                            <span className="text-sm font-semibold text-white">
                              {order.shares.toLocaleString()} shares
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            Trigger: ${formatPrice(order.triggerPrice)}
                            {order.expiresAt && ` \u00b7 Expires ${new Date(order.expiresAt).toLocaleDateString()}`}
                          </p>
                          {order.side === 'buy' && (
                            <p className="text-xs text-slate-500">
                              Locked: ${formatUsd(order.lockedAmount)} USDC
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={cancellingOrderId === order.id}
                        >
                          {cancellingOrderId === order.id ? 'Cancelling...' : 'Cancel'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

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
                      <span className="text-lg font-semibold text-slate-200">${formatPrice(holding.avgBuyPrice)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-800">
                      <span className="text-sm font-medium text-slate-400">Current Capital</span>
                      <span className="text-lg font-bold text-white">
                        ${formatUsd(holding.shares * character.currentPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-sm font-bold text-slate-400">Unrealized P&L</span>
                      <div className="text-right">
                        <span className={`text-xl font-black ${(character.currentPrice - holding.avgBuyPrice) >= 0
                          ? 'text-emerald-400'
                          : 'text-red-400'
                          }`}>
                          ${formatUsd((character.currentPrice - holding.avgBuyPrice) * holding.shares)}
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
