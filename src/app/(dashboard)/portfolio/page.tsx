'use client';

import Link from 'next/link';

const MOCK_HOLDINGS = [
    {
        id: '1',
        name: 'Luna',
        slug: 'luna',
        shares: 5000,
        avgBuyPrice: 0.10,
        currentPrice: 0.12,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
        value: 600,
        profit: 100,
        profitPercent: 20
    },
    {
        id: '2',
        name: 'Nova',
        slug: 'nova',
        shares: 2500,
        avgBuyPrice: 0.12,
        currentPrice: 0.15,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nova',
        value: 375,
        profit: 75,
        profitPercent: 25
    }
];

const MOCK_TRANSACTIONS = [
    { id: '1', type: 'buy', character: 'Luna', shares: 1000, price: 0.10, total: 100, date: '2024-01-15' },
    { id: '2', type: 'buy', character: 'Nova', shares: 2500, price: 0.12, total: 300, date: '2024-01-14' },
    { id: '3', type: 'buy', character: 'Luna', shares: 4000, price: 0.10, total: 400, date: '2024-01-10' },
];

export default function PortfolioPage() {
    const totalValue = MOCK_HOLDINGS.reduce((acc, h) => acc + h.value, 0);
    const totalProfit = MOCK_HOLDINGS.reduce((acc, h) => acc + h.profit, 0);

    return (
        <div className="min-h-screen pt-24 pb-12 px-6 ml-[240px] max-md:ml-0">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-black text-white mb-2">Portfolio</h1>
                    <p className="text-slate-400 font-medium">Track your AI character investments</p>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="glass-card p-6 border-white/5">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Total Value</div>
                        <div className="text-3xl font-black text-white">${totalValue.toLocaleString()}</div>
                        <div className="text-sm text-emerald-400 font-medium mt-1">+${totalProfit} all time</div>
                    </div>
                    <div className="glass-card p-6 border-white/5">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Total Profit</div>
                        <div className="text-3xl font-black text-emerald-400">+${totalProfit}</div>
                        <div className="text-sm text-emerald-400/70 font-medium mt-1">21.7% return</div>
                    </div>
                    <div className="glass-card p-6 border-white/5">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Characters Owned</div>
                        <div className="text-3xl font-black text-white">{MOCK_HOLDINGS.length}</div>
                        <div className="text-sm text-slate-400 font-medium mt-1">2 active positions</div>
                    </div>
                </div>

                {/* Holdings */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white">Your Holdings</h2>
                        <Link href="/marketplace" className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">
                            Browse more →
                        </Link>
                    </div>

                    <div className="grid gap-4">
                        {MOCK_HOLDINGS.map((holding) => (
                            <Link
                                key={holding.id}
                                href={`/character/${holding.slug}`}
                                className="no-underline"
                            >
                                <div className="glass-card p-6 border-white/5 hover:border-indigo-500/30 transition-all group">
                                    <div className="flex items-center gap-6">
                                        <img
                                            src={holding.avatar}
                                            alt={holding.name}
                                            className="w-16 h-16 rounded-2xl"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                                                    {holding.name}
                                                </h3>
                                                <span className="live-badge scale-75">
                                                    <span className="live-dot"></span>
                                                    Live
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-500">
                                                {holding.shares.toLocaleString()} shares @ ${holding.avgBuyPrice}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-black text-white">${holding.value}</div>
                                            <div className="text-sm font-medium text-emerald-400">
                                                +${holding.profit} ({holding.profitPercent}%)
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Recent Transactions */}
                <div>
                    <h2 className="text-xl font-bold text-white mb-6">Recent Transactions</h2>
                    <div className="glass-card overflow-hidden border-white/5">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-800">
                                        <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-widest px-6 py-4">Type</th>
                                        <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-widest px-6 py-4">Character</th>
                                        <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-widest px-6 py-4">Shares</th>
                                        <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-widest px-6 py-4">Price</th>
                                        <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-widest px-6 py-4">Total</th>
                                        <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-widest px-6 py-4">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {MOCK_TRANSACTIONS.map((tx) => (
                                        <tr key={tx.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${tx.type === 'buy'
                                                        ? 'bg-emerald-500/20 text-emerald-400'
                                                        : 'bg-pink-500/20 text-pink-400'
                                                    }`}>
                                                    {tx.type.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Link href={`/character/${tx.character.toLowerCase()}`} className="text-white font-medium hover:text-indigo-400">
                                                    {tx.character}
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 text-slate-300">{tx.shares.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-slate-300">${tx.price}</td>
                                            <td className="px-6 py-4 text-white font-bold">${tx.total}</td>
                                            <td className="px-6 py-4 text-slate-500">{tx.date}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Payouts Section */}
                <div className="mt-8">
                    <h2 className="text-xl font-bold text-white mb-6">Revenue Payouts</h2>
                    <div className="glass-card p-8 border-white/5 text-center">
                        <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">No payouts yet</h3>
                        <p className="text-slate-400 mb-4">Once your characters generate revenue from TikTok & Instagram, you'll receive payouts automatically.</p>
                        <Link href="/marketplace" className="btn-secondary inline-flex">
                            Find opportunities
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
