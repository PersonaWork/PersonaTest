'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button, Card } from '@/components/ui';
import { usePrivy } from '@privy-io/react-auth';
import { usePrivyAuthedFetch } from '@/lib/auth/privy-client';

interface Holding {
  id: string;
  characterId: string;
  characterName: string;
  characterSlug: string;
  characterThumbnail?: string;
  shares: number;
  avgBuyPrice: number;
  currentPrice: number;
  totalValue: number;
  pnl: number;
  pnlPercent: number;
}

interface Transaction {
  id: string;
  type: string;
  characterName: string;
  shares: number;
  pricePerShare: number;
  total: number;
  createdAt: string;
}

export default function PortfolioPage() {
    const { ready, authenticated, user, login } = usePrivy();
    const privyFetch = usePrivyAuthedFetch();
    const [holdings, setHoldings] = useState<Holding[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPortfolio();
    }, []);

    const fetchPortfolio = async () => {
        try {
            setLoading(true);
            const userId = user?.id;
            if (!userId) return;
            
            // Fetch holdings with character data
            const holdingsResponse = await privyFetch(`/api/users/${userId}/holdings`);
            if (holdingsResponse.ok) {
                const holdingsData = await holdingsResponse.json();
                setHoldings(holdingsData);
            }

            // Fetch transactions
            const transactionsResponse = await privyFetch(`/api/users/${userId}/transactions`);
            if (transactionsResponse.ok) {
                const transactionsData = await transactionsResponse.json();
                setTransactions(transactionsData);
            }
        } catch (error) {
            console.error('Failed to fetch portfolio:', error);
        } finally {
            setLoading(false);
        }
    };

    const totalValue = holdings.reduce((acc, h) => acc + h.totalValue, 0);
    const totalCost = holdings.reduce((acc, h) => acc + (h.shares * h.avgBuyPrice), 0);
    const totalProfit = totalValue - totalCost;
    const totalProfitPercent = totalCost > 0 ? ((totalProfit / totalCost) * 100) : 0;
    const isProfit = totalProfit >= 0;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

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
                    <div className="text-5xl mb-4">🔒</div>
                    <h1 className="text-2xl font-black text-white mb-2">Portfolio locked</h1>
                    <p className="text-slate-400 mb-6">Sign in to view your holdings and transactions.</p>
                    <Button size="lg" className="w-full" onClick={() => login()}>
                        Sign In
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20">
            <div className="pt-8 pb-8 px-6">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-black text-white mb-3">Portfolio</h1>
                    <p className="text-lg text-slate-400 font-medium">Track your AI character investments</p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6">
                {/* Portfolio Summary */}
                <div className="grid md:grid-cols-4 gap-4 mb-10">
                    <Card className="p-6" hover={false}>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Total Value</p>
                        <p className="text-3xl font-black text-white">${totalValue.toFixed(2)}</p>
                    </Card>
                    <Card className="p-6" hover={false}>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Total Cost</p>
                        <p className="text-3xl font-black text-white">${totalCost.toFixed(2)}</p>
                    </Card>
                    <Card className="p-6" hover={false}>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Profit / Loss</p>
                        <p className={`text-3xl font-black ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isProfit ? '+' : ''}${totalProfit.toFixed(2)}
                        </p>
                    </Card>
                    <Card className="p-6" hover={false}>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Return</p>
                        <p className={`text-3xl font-black ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isProfit ? '+' : ''}{totalProfitPercent.toFixed(1)}%
                        </p>
                    </Card>
                </div>

                {/* Holdings */}
                <div className="mb-10">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white">Holdings</h2>
                        <Link href="/marketplace">
                            <Button variant="secondary" size="sm">
                                Buy More
                            </Button>
                        </Link>
                    </div>

                    {holdings.length > 0 ? (
                        <div className="space-y-4">
                            {holdings.map((holding) => {
                                const isHoldingProfit = holding.pnl >= 0;

                                return (
                                    <Card key={holding.id} className="p-6" hover>
                                        <div className="flex items-center gap-6">
                                            {/* Avatar */}
                                            <div className="w-14 h-14 rounded-xl bg-slate-800 overflow-hidden flex-shrink-0">
                                                {holding.characterThumbnail ? (
                                                    <img src={holding.characterThumbnail} alt={holding.characterName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-white text-lg">
                                                        {holding.characterName.charAt(0)}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="text-lg font-bold text-white">{holding.characterName}</h3>
                                                    <span className="text-sm text-slate-500">@{holding.characterSlug}_persona</span>
                                                </div>
                                                <p className="text-sm text-slate-400">
                                                    {holding.shares.toLocaleString()} shares @ ${holding.avgBuyPrice.toFixed(2)}
                                                </p>
                                            </div>

                                            {/* Value */}
                                            <div className="text-right">
                                                <p className="text-xl font-bold text-white">${holding.totalValue.toFixed(2)}</p>
                                                <p className={`text-sm font-semibold ${isHoldingProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {isHoldingProfit ? '+' : ''}{holding.pnlPercent.toFixed(1)}%
                                                </p>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-2">
                                                <Link href={`/character/${holding.characterSlug}`}>
                                                    <Button variant="secondary" size="sm">
                                                        View
                                                    </Button>
                                                </Link>
                                                <Link href={`/character/${holding.characterSlug}/trade`}>
                                                    <Button variant="ghost" size="sm">
                                                        Trade
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    ) : (
                        <Card className="text-center py-12" hover={false}>
                            <div className="text-5xl mb-4">📊</div>
                            <h3 className="text-xl font-bold text-white mb-2">No holdings yet</h3>
                            <p className="text-slate-400 mb-6">Start investing in AI characters to build your portfolio.</p>
                            <Link href="/marketplace">
                                <Button>Browse Marketplace</Button>
                            </Link>
                        </Card>
                    )}
                </div>

                {/* Recent Transactions */}
                <div>
                    <h2 className="text-2xl font-bold text-white mb-6">Recent Transactions</h2>
                    <Card className="overflow-hidden" padding="none" hover={false}>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-800">
                                        <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Type</th>
                                        <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Character</th>
                                        <th className="text-right p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Shares</th>
                                        <th className="text-right p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Price</th>
                                        <th className="text-right p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Total</th>
                                        <th className="text-right p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.length > 0 ? (
                                        transactions.map((tx) => (
                                            <tr key={tx.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${tx.type === 'buy'
                                                            ? 'bg-emerald-500/20 text-emerald-400'
                                                            : 'bg-red-500/20 text-red-400'
                                                        }`}>
                                                        {tx.type === 'buy' ? (
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                                                            </svg>
                                                        )}
                                                        {tx.type}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-sm font-medium text-white">{tx.characterName}</td>
                                                <td className="p-4 text-sm text-slate-300 text-right">{tx.shares.toLocaleString()}</td>
                                                <td className="p-4 text-sm text-slate-300 text-right">${tx.pricePerShare.toFixed(2)}</td>
                                                <td className="p-4 text-sm font-semibold text-white text-right">${tx.total.toFixed(2)}</td>
                                                <td className="p-4 text-sm text-slate-500 text-right">{new Date(tx.createdAt).toLocaleDateString()}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-slate-500">
                                                No transactions yet
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
