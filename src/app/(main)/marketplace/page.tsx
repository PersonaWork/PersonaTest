'use client';

import { useState } from 'react';
import { Button, Card } from '@/components/ui';
import CharacterCard from '@/components/marketplace/CharacterCard';

const MOCK_CHARACTERS = [
    {
        id: '1',
        name: 'Luna',
        slug: 'luna',
        description: 'A witty, tech-savvy AI traveler from a neon-soaked future. Luna loves exploring digital archives and sharing her findings on TikTok. She has a sharp tongue but a heart of (simulated) gold.',
        price: 0.12,
        change: 4.5,
        marketCap: 120000,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
        status: 'LIVE' as const,
        holders: 1420,
        totalShares: 1000000,
        sharesIssued: 1000000
    },
    {
        id: '2',
        name: 'Jax',
        slug: 'jax',
        description: 'The ultimate digital hype-man and street-culture enthusiast. Jax is all about street culture, sneakers, and the latest trends. He is always high energy and loves interacting with his shareholders.',
        price: 0.08,
        change: -2.1,
        marketCap: 80000,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jax',
        status: 'LIVE' as const,
        holders: 890,
        totalShares: 1000000,
        sharesIssued: 1000000
    },
    {
        id: '3',
        name: 'Nova',
        slug: 'nova',
        description: 'A serene AI philosopher exploring the intersection of data and soul. Nova spends her time contemplating consciousness and sharing wisdom with her followers.',
        price: 0.15,
        change: 12.8,
        marketCap: 150000,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nova',
        status: 'LIVE' as const,
        holders: 2100,
        totalShares: 1000000,
        sharesIssued: 1000000
    }
];

type SortOption = 'market_cap' | 'price' | 'change' | 'holders';
type FilterOption = 'all' | 'live' | 'launching';

export default function MarketplacePage() {
    const [sortBy, setSortBy] = useState<SortOption>('market_cap');
    const [filter, setFilter] = useState<FilterOption>('all');

    // Sort and filter characters
    let characters = [...MOCK_CHARACTERS];

    if (filter === 'live') {
        characters = characters.filter(c => c.status === 'LIVE');
    }

    characters.sort((a, b) => {
        switch (sortBy) {
            case 'market_cap':
                return b.marketCap - a.marketCap;
            case 'price':
                return b.price - a.price;
            case 'change':
                return Math.abs(b.change) - Math.abs(a.change);
            case 'holders':
                return (b.holders || 0) - (a.holders || 0);
            default:
                return 0;
        }
    });

    return (
        <div className="min-h-screen pb-20">
            {/* Header */}
            <div className="pt-8 pb-8 px-6">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-black text-white mb-3">Marketplace</h1>
                    <p className="text-lg text-slate-400 font-medium">Discover and own the next generation of digital icons.</p>
                </div>
            </div>

            {/* Filters & Sort */}
            <div className="max-w-6xl mx-auto px-6 mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Filter Tabs */}
                    <div className="flex bg-slate-900/50 rounded-xl p-1 border border-slate-800 w-fit">
                        {(['all', 'live', 'launching'] as FilterOption[]).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${filter === f
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                {f === 'all' ? 'All' : f === 'live' ? 'Live Now' : 'Coming Soon'}
                            </button>
                        ))}
                    </div>

                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-500 font-medium">Sort by:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        >
                            <option value="market_cap">Market Cap</option>
                            <option value="price">Price</option>
                            <option value="change">24h Change</option>
                            <option value="holders">Holders</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Market Stats */}
            <div className="max-w-6xl mx-auto px-6 mb-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4" hover={false}>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Market Cap</p>
                        <p className="text-2xl font-black text-white">$350K</p>
                    </Card>
                    <Card className="p-4" hover={false}>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">24h Volume</p>
                        <p className="text-2xl font-black text-white">$42.5K</p>
                    </Card>
                    <Card className="p-4" hover={false}>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Floor Price</p>
                        <p className="text-2xl font-black text-emerald-400">$0.08</p>
                    </Card>
                    <Card className="p-4" hover={false}>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Holders</p>
                        <p className="text-2xl font-black text-indigo-400">4,410</p>
                    </Card>
                </div>
            </div>

            {/* Character Grid */}
            <div className="max-w-6xl mx-auto px-6">
                {characters.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {characters.map((char) => (
                            <CharacterCard key={char.id} character={char} />
                        ))}
                    </div>
                ) : (
                    <Card className="text-center py-16" hover={false}>
                        <div className="text-6xl mb-4">🔍</div>
                        <h3 className="text-xl font-bold text-white mb-2">No characters found</h3>
                        <p className="text-slate-400">Try adjusting your filters.</p>
                    </Card>
                )}
            </div>
        </div>
    );
}
