'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Card, Skeleton } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';
import { usePrivy } from '@privy-io/react-auth';
import AnimatedNumber from '@/components/engagement/AnimatedNumber';

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
    const { user: dbUser, isAuthenticated, isLoading: authLoading, login } = useAuth();
    const { getAccessToken } = usePrivy();
    const [holdings, setHoldings] = useState<Holding[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const hasFetched = useRef(false);

    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated || !dbUser?.id) {
            setLoading(false);
            return;
        }
        if (hasFetched.current) return;
        hasFetched.current = true;

        const fetchPortfolio = async () => {
            try {
                setLoading(true);
                const dbUserId = dbUser.id;
                const token = await getAccessToken();
                const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

                const [holdingsRes, txRes] = await Promise.all([
                    fetch(`/api/users/${dbUserId}/holdings`, { headers }),
                    fetch(`/api/users/${dbUserId}/transactions`, { headers }),
                ]);

                if (holdingsRes.ok) {
                    const hData = await holdingsRes.json();
                    setHoldings(hData.data || hData || []);
                }
                if (txRes.ok) {
                    const tData = await txRes.json();
                    setTransactions(tData.data || tData || []);
                }
            } catch (error) {
                console.error('Failed to fetch portfolio:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPortfolio();
    }, [authLoading, isAuthenticated, dbUser?.id]);

    if (authLoading || loading) {
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

    if (!isAuthenticated) {
        return (
            <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6">
                <Card className="max-w-md w-full p-10 text-center border-slate-800 shadow-2xl" hover={false}>
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
        <div className="min-h-screen pb-20 page-enter">
            <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }}>
                <div className="orb orb-purple" style={{ width: 500, height: 500, top: -150, left: '15%' }} />
                <div className="orb orb-indigo" style={{ width: 400, height: 400, bottom: '10%', right: '10%' }} />
            </div>
            <div className="max-w-7xl mx-auto px-6 pt-12">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">Portfolio</h1>
                        <p className="text-xl text-slate-400 font-medium">Track your AI character investments</p>
                    </div>
                    <Link href="/marketplace">
                        <Button size="lg">Browse Marketplace</Button>
                    </Link>
                </div>

                {/* Global Stats Board */}
                <Card hover={false} className="mb-16 bg-slate-900/40 border border-slate-700/50 p-1 overflow-hidden relative">
                    {/* Subtle animated glow based on P/L */}
                    <div className={`absolute inset-0 opacity-20 pointer-events-none ${
                        isProfit ? 'bg-gradient-to-r from-emerald-500/10 to-transparent' : 'bg-gradient-to-r from-red-500/10 to-transparent'
                    }`} />
                    <div className="grid md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-800/60 relative">
                        <div className="p-8">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Total Value</p>
                            <AnimatedNumber
                                value={totalValue}
                                prefix="$"
                                className="text-4xl lg:text-5xl font-black text-white tracking-tight"
                            />
                        </div>
                        <div className="p-8">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Total Invested</p>
                            <AnimatedNumber
                                value={totalCost}
                                prefix="$"
                                className="text-4xl lg:text-5xl font-black text-white tracking-tight"
                            />
                        </div>
                        <div className="p-8">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Profit / Loss</p>
                            <AnimatedNumber
                                value={totalProfit}
                                prefix={isProfit ? '+$' : '-$'}
                                className={`text-4xl lg:text-5xl font-black tracking-tight ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}
                            />
                        </div>
                        <div className="p-8">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Total Return</p>
                            <AnimatedNumber
                                value={Math.abs(totalProfitPercent)}
                                prefix={isProfit ? '+' : '-'}
                                suffix="%"
                                decimals={1}
                                className={`text-4xl lg:text-5xl font-black tracking-tight ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}
                            />
                        </div>
                    </div>
                </Card>

                {/* Holdings Section */}
                <div className="mb-16">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-bold text-white">Your Holdings</h2>
                        <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-bold text-slate-300">
                            {holdings.length} Assets
                        </span>
                    </div>

                    {holdings.length > 0 ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {holdings.map((holding) => {
                                const isHoldingProfit = holding.pnl >= 0;
                                return (
                                    <Card key={holding.id} className="p-1 group border-slate-700/50 hover:border-slate-600 transition-colors" hover>
                                        <div className="p-5 flex flex-col h-full bg-slate-900/60 rounded-2xl">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-xl bg-slate-800 flex-shrink-0 border border-slate-700 overflow-hidden relative">
                                                        {holding.characterThumbnail ? (
                                                            <Image src={holding.characterThumbnail} alt={holding.characterName} fill className="object-cover" />
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

                                            <div className="grid grid-cols-2 gap-3 mt-auto">
                                                <Link href={`/character/${holding.characterSlug}`} className="w-full">
                                                    <Button variant="secondary" className="w-full">Overview</Button>
                                                </Link>
                                                <Link href={`/character/${holding.characterSlug}/trade`} className="w-full">
                                                    <Button className="w-full">Trade</Button>
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
                                <p className="text-slate-400 mb-8 max-w-md mx-auto text-lg">Start investing in AI characters to build your portfolio and unlock chat access.</p>
                                <Link href="/marketplace">
                                    <Button size="lg">Browse Marketplace</Button>
                                </Link>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Recent Transactions */}
                <div>
                    <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
                    <Card className="overflow-hidden bg-slate-900/60 border border-slate-700/50" padding="none" hover={false}>
                        {/* Mobile card list */}
                        <div className="sm:hidden divide-y divide-slate-800/60">
                            {transactions.length > 0 ? (
                                transactions.map((tx) => (
                                    <div key={tx.id} className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-white text-sm">{tx.characterName}</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                tx.type === 'buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                            }`}>{tx.type}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-slate-400">
                                            <span>{tx.shares} shares @ ${tx.pricePerShare.toFixed(4)}</span>
                                            <span className="font-bold text-white">${tx.total.toFixed(2)}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            {new Date(tx.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="p-12 text-center">
                                    <p className="font-semibold text-slate-400">No trading activity</p>
                                </div>
                            )}
                        </div>
                        {/* Desktop table */}
                        <div className="hidden sm:block overflow-x-auto">
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
                                            <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="p-5 font-bold text-white whitespace-nowrap">{tx.characterName}</td>
                                                <td className="p-5 whitespace-nowrap">
                                                    <span className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase ${tx.type === 'buy'
                                                        ? 'bg-emerald-500/10 text-emerald-400'
                                                        : 'bg-red-500/10 text-red-400'
                                                        }`}>
                                                        {tx.type}
                                                    </span>
                                                </td>
                                                <td className="p-5 text-sm font-semibold text-slate-300 text-right whitespace-nowrap">${tx.pricePerShare.toFixed(4)}</td>
                                                <td className="p-5 text-sm font-semibold text-slate-300 text-right whitespace-nowrap">{tx.shares.toLocaleString()}</td>
                                                <td className="p-5 text-sm font-bold text-white text-right whitespace-nowrap">${tx.total.toFixed(2)}</td>
                                                <td className="p-5 text-xs font-medium text-slate-500 text-right whitespace-nowrap">
                                                    {new Date(tx.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-slate-500">
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
