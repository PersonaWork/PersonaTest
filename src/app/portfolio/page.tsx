'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Card, Skeleton } from '@/components/ui';
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
        if (ready && authenticated && user?.id) {
            fetchPortfolio();
        } else if (ready && !authenticated) {
            setLoading(false);
        }
    }, [ready, authenticated, user?.id]);

    const fetchPortfolio = async () => {
        try {
            setLoading(true);
            const userId = user?.id;
            if (!userId) return;

            const holdingsResponse = await privyFetch(`/api/users/${userId}/holdings`);
            if (holdingsResponse.ok) {
                const holdingsData = await holdingsResponse.json();
                setHoldings(holdingsData);
            }

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

    if (!ready || loading) {
        return (
            <div className="min-h-screen pt-12 px-6 max-w-7xl mx-auto pb-20">
                <Skeleton className="h-48 w-full rounded-3xl mb-12" />
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    <Skeleton className="h-64 rounded-3xl" />
                    <Skeleton className="h-64 rounded-3xl" />
                </div>
            </div>
        );
    }

    if (!authenticated) {
        return (
            <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 to-[#0a0a0f] pointer-events-none" />
                <Card className="max-w-md w-full p-10 text-center border-slate-800 shadow-2xl relative z-10" hover={false}>
                    <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-black text-white mb-3 tracking-tight">Access Locked</h1>
                    <p className="text-slate-400 mb-8 text-lg">Sign in to view your character holdings and track your investment performance.</p>
                    <Button size="lg" className="w-full text-lg h-14" onClick={() => login()}>
                        Connect Wallet or Email
                    </Button>
                </Card>
            </div>
        );
    }

    const totalValue = holdings.reduce((acc, h) => acc + h.totalValue, 0);
    const totalCost = holdings.reduce((acc, h) => acc + (h.shares * h.avgBuyPrice), 0);
    const totalProfit = totalValue - totalCost;
    const totalProfitPercent = totalCost > 0 ? ((totalProfit / totalCost) * 100) : 0;
    const isProfit = totalProfit >= 0;

    return (
        <div className="min-h-screen pb-20 relative">
            {/* Background Effect */}
            <div className="absolute top-0 left-0 right-0 h-[600px] overflow-hidden -z-10 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/40 via-[#0a0a0f]/80 to-[#0a0a0f] z-10" />
                <div className="absolute top-[-20%] left-[20%] w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[150px]" />
                <div className="absolute top-[-10%] right-[10%] w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[150px]" />
            </div>

            <div className="max-w-7xl mx-auto px-6 pt-12">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">Portfolio</h1>
                        <p className="text-xl text-slate-400 font-medium">Track your AI character investments</p>
                    </div>
                    <Link href="/marketplace">
                        <Button size="lg" className="shadow-indigo-500/20 shadow-lg">Browse Marketplace</Button>
                    </Link>
                </div>

                {/* Global Stats Board */}
                <Card hover={false} className="mb-16 bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 p-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] pointer-events-none" />
                    <div className="grid md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-800/60 relative z-10">
                        <div className="p-8">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                Total Value
                            </p>
                            <p className="text-4xl lg:text-5xl font-black text-white tracking-tight">${totalValue.toFixed(2)}</p>
                        </div>
                        <div className="p-8">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Total Invested
                            </p>
                            <p className="text-4xl lg:text-5xl font-black text-white tracking-tight">${totalCost.toFixed(2)}</p>
                        </div>
                        <div className="p-8">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Profit / Loss</p>
                            <p className={`text-4xl lg:text-5xl font-black tracking-tight ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                                {isProfit ? '+' : ''}${totalProfit.toFixed(2)}
                            </p>
                        </div>
                        <div className="p-8">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Total Return</p>
                            <div className="flex items-center gap-3">
                                <p className={`text-4xl lg:text-5xl font-black tracking-tight ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {isProfit ? '+' : ''}{totalProfitPercent.toFixed(1)}%
                                </p>
                                {totalValue > 0 && (
                                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${isProfit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            {isProfit ? (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                            ) : (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                                            )}
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Holdings Section */}
                <div className="mb-16">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            Your Holdings
                        </h2>
                        <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-bold text-slate-300">
                            {holdings.length} Assets
                        </span>
                    </div>

                    {holdings.length > 0 ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {holdings.map((holding) => {
                                const isHoldingProfit = holding.pnl >= 0;

                                return (
                                    <Card key={holding.id} className="p-1 group relative overflow-hidden border-slate-700/50 hover:border-slate-600 transition-all duration-300" hover>
                                        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                                        <div className="p-5 flex flex-col h-full bg-slate-900/60 backdrop-blur-sm rounded-2xl relative z-10">
                                            {/* Holding Header */}
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-xl bg-slate-800 flex-shrink-0 border border-slate-700 shadow-xl overflow-hidden">
                                                        {holding.characterThumbnail ? (
                                                            <img src={holding.characterThumbnail} alt={holding.characterName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold">
                                                                {holding.characterName.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-bold text-white mb-0.5">{holding.characterName}</h3>
                                                        <span className="text-xs font-bold text-indigo-400">@{holding.characterSlug}_persona</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Holding Stats */}
                                            <div className="grid grid-cols-2 gap-4 mb-6 pt-4 border-t border-slate-800/80">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Value</p>
                                                    <p className="text-xl font-black text-white">${holding.totalValue.toFixed(2)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Profit/Loss</p>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <p className={`text-xl font-black ${isHoldingProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {isHoldingProfit ? '+' : ''}${holding.pnl.toFixed(2)}
                                                        </p>
                                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${isHoldingProfit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                            {isHoldingProfit ? '+' : ''}{holding.pnlPercent.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Deep Stats Base */}
                                            <div className="mt-auto bg-slate-950/50 rounded-xl p-4 mb-5 border border-slate-800/50">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm text-slate-400">Shares owned</span>
                                                    <span className="text-sm font-semibold text-white">{holding.shares.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-slate-400">Avg entry price</span>
                                                    <span className="text-sm font-semibold text-white">${holding.avgBuyPrice.toFixed(2)}</span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="grid grid-cols-2 gap-3 mt-auto">
                                                <Link href={`/character/${holding.characterSlug}`} className="w-full">
                                                    <Button variant="secondary" className="w-full shadow-md">Overview</Button>
                                                </Link>
                                                <Link href={`/character/${holding.characterSlug}/trade`} className="w-full">
                                                    <Button className="w-full shadow-indigo-500/20 shadow-md">Trade</Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    ) : (
                        <Card hover={false} className="bg-slate-900/40 border-slate-800 border-dashed text-center">
                            <div className="p-16">
                                <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <span className="text-5xl">📊</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-3">No holdings yet</h3>
                                <p className="text-slate-400 mb-8 max-w-md mx-auto text-lg leading-relaxed">Start investing in AI characters to build your portfolio and unlock chat access.</p>
                                <Link href="/marketplace">
                                    <Button size="lg" className="shadow-indigo-500/20 shadow-lg text-lg h-14 px-8">Browse Marketplace</Button>
                                </Link>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Recent Transactions Table */}
                <div>
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                        <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Recent Activity
                    </h2>
                    <Card className="overflow-hidden bg-slate-900/60 backdrop-blur-md border border-slate-700/50 shadow-2xl" padding="none" hover={false}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-800 bg-slate-950/40">
                                        <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Asset</th>
                                        <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Action</th>
                                        <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-right whitespace-nowrap">Price</th>
                                        <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-right whitespace-nowrap">Shares</th>
                                        <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-right whitespace-nowrap">Total</th>
                                        <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-right whitespace-nowrap">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {transactions.length > 0 ? (
                                        transactions.map((tx) => (
                                            <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors group">
                                                <td className="p-5 font-bold text-white whitespace-nowrap">{tx.characterName}</td>
                                                <td className="p-5 whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider ${tx.type === 'buy'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 group-hover:border-emerald-500/20'
                                                        : 'bg-red-500/10 text-red-400 border border-red-500/10 group-hover:border-red-500/20'
                                                        }`}>
                                                        {tx.type === 'buy' ? (
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                                                            </svg>
                                                        )}
                                                        {tx.type}
                                                    </span>
                                                </td>
                                                <td className="p-5 text-sm font-semibold text-slate-300 text-right whitespace-nowrap">${tx.pricePerShare.toFixed(2)}</td>
                                                <td className="p-5 text-sm font-semibold text-slate-300 text-right whitespace-nowrap">{tx.shares.toLocaleString()}</td>
                                                <td className="p-5 text-sm font-bold text-white text-right whitespace-nowrap">${tx.total.toFixed(2)}</td>
                                                <td className="p-5 text-xs font-medium text-slate-500 text-right whitespace-nowrap">
                                                    {new Date(tx.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-slate-500 bg-slate-950/20">
                                                <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-3">
                                                    <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <p className="font-semibold text-slate-400">No trading activity</p>
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
