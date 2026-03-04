'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { usePrivy } from '@privy-io/react-auth';
import { usePrivyAuthedFetch } from '@/lib/auth/privy-client';

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

  const { ready, authenticated, login } = usePrivy();
  const privyFetch = usePrivyAuthedFetch();
  
  const [character, setCharacter] = useState<Character | null>(null);
  const [holding, setHolding] = useState<Holding | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Trade form states
  const [buyShares, setBuyShares] = useState('');
  const [sellShares, setSellShares] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchCharacter();
      fetchTransactions();
    }
  }, [slug]);

  const fetchCharacter = async () => {
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
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`/api/characters/${slug}/transactions`);
      if (!response.ok) return;
      
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

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
        if (response.status === 402 || data?.error === 'Wallet not funded') {
          router.push('/fund');
          return;
        }
        throw new Error(data?.error || 'Trade failed');
      }
      
      await fetchCharacter();
      await fetchTransactions();
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
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/character/${slug}`} className="text-indigo-400 hover:text-indigo-300 mb-4 inline-block">
            ← Back to {character.name}
          </Link>
          <h1 className="text-3xl font-black text-white mb-2">Trade {character.name}</h1>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-2xl font-black text-white">${character.currentPrice.toFixed(2)}</p>
              <p className="text-sm text-slate-400">per share</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-white">${(character.marketCap / 1000).toFixed(0)}K</p>
              <p className="text-sm text-slate-400">market cap</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Price Chart */}
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">Price History</h2>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="time" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#6366f1" 
                      strokeWidth={2}
                      dot={{ fill: '#6366f1' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-500">
                  No trading history yet
                </div>
              )}
            </div>
          </Card>

          {/* Trading Panel */}
          <div className="space-y-6">
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
                        <span className="text-white font-semibold">${estimatedBuyCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">New ownership:</span>
                        <span className="text-white font-semibold">
                          {((buySharesNum / character.totalShares) * 100).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={handleBuy}
                    disabled={!buySharesNum || isProcessing}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Processing...' : `Buy ${buySharesNum || 0} shares`}
                  </button>
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
                        <span className="text-white font-semibold">${estimatedSellProceeds.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Remaining shares:</span>
                        <span className="text-white font-semibold">
                          {(holding?.shares || 0) - sellSharesNum}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={handleSell}
                    disabled={!sellSharesNum || !holding || sellSharesNum > holding.shares || isProcessing}
                    className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white font-semibold py-3 rounded-xl hover:from-red-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Processing...' : `Sell ${sellSharesNum || 0} shares`}
                  </button>
                </div>
              </div>
            </Card>

            {/* Your Holdings */}
            {holding && (
              <Card>
                <div className="p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Your Holdings</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Shares owned:</span>
                      <span className="text-white font-semibold">{holding.shares.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Avg buy price:</span>
                      <span className="text-white font-semibold">${holding.avgBuyPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Current value:</span>
                      <span className="text-white font-semibold">
                        ${(holding.shares * character.currentPrice).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">P&L:</span>
                      <span className={`font-semibold ${
                        (character.currentPrice - holding.avgBuyPrice) >= 0 
                          ? 'text-emerald-400' 
                          : 'text-red-400'
                      }`}>
                        ${((character.currentPrice - holding.avgBuyPrice) * holding.shares).toFixed(2)}
                        ({((character.currentPrice - holding.avgBuyPrice) / holding.avgBuyPrice * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
