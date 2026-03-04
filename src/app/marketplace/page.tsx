'use client';

import { useState, useEffect } from 'react';
import { Button, Card } from '@/components/ui';
import CharacterCard from '@/components/marketplace/CharacterCard';
import Link from 'next/link';
import Image from 'next/image';

interface Character {
    id: string;
    name: string;
    slug: string;
    description: string;
    thumbnailUrl?: string;
    price: number;
    marketCap: number;
    change: number;
    totalShares: number;
    sharesIssued: number;
    holders: number;
    status: string;
}

type SortOption = 'market_cap' | 'price' | 'change' | 'holders';
type FilterOption = 'all' | 'live' | 'launching';

export default function MarketplacePage() {
    const [characters, setCharacters] = useState<Character[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<SortOption>('market_cap');
    const [filter, setFilter] = useState<FilterOption>('all');

    useEffect(() => {
        fetchCharacters();
    }, [filter]);

    const fetchCharacters = async () => {
        try {
            setLoading(true);
            const url = filter === 'all'
                ? '/api/characters'
                : `/api/characters?status=${filter === 'live' ? 'live' : 'launching'}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch characters');

            const json = await response.json();
            if (json.success && json.data) {
                setCharacters(json.data);
            } else {
                setCharacters(json); // fallback if it's the old shape
            }
        } catch (error) {
            console.error('Failed to fetch characters:', error);
        } finally {
            setLoading(false);
        }
    };

    // Sort characters
    const sortedCharacters = [...characters].sort((a, b) => {
        switch (sortBy) {
            case 'market_cap':
                return b.marketCap - a.marketCap;
            case 'price':
                return b.price - a.price;
            case 'change':
                return Math.abs(b.change) - Math.abs(a.change);
            case 'holders':
                return b.holders - a.holders;
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

            {/* Live Now Stories Row */}
            <div className="max-w-6xl mx-auto px-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white">Live Now</h2>
                    <Link href="/" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
                        How it works
                    </Link>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2">
                    {sortedCharacters
                        .filter(c => c.status === 'LIVE')
                        .slice(0, 8)
                        .map((c, idx) => {
                            const ring = idx % 3 === 0
                                ? 'from-indigo-500 to-pink-500'
                                : idx % 3 === 1
                                    ? 'from-emerald-500 to-cyan-500'
                                    : 'from-amber-500 to-rose-500';

                            return (
                                <Link key={c.id} href={`/character/${c.slug}`} className="flex-shrink-0">
                                    <div className="group">
                                        <div className={`p-[2px] rounded-2xl bg-gradient-to-r ${ring} shadow-lg shadow-indigo-500/10 group-hover:shadow-indigo-500/20 transition-shadow`}>
                                            <div className="relative w-24 h-24 rounded-2xl bg-slate-900/70 border border-white/5 overflow-hidden flex items-center justify-center">
                                                {c.thumbnailUrl ? (
                                                    <Image src={c.thumbnailUrl} alt={c.name} fill className="object-cover" />
                                                ) : (
                                                    <span className="text-2xl font-black text-white">{c.name.charAt(0)}</span>
                                                )}

                                                <div className="absolute top-2 left-2">
                                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/25 border border-red-500/30 backdrop-blur-sm">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                                        <span className="text-[10px] font-black text-red-200 uppercase tracking-widest">Live</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-2">
                                            <p className="text-sm font-bold text-white leading-tight">{c.name}</p>
                                            <p className="text-xs text-slate-500">Tap to watch</p>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                </div>
            </div>

            {/* Trending Strip */}
            <div className="max-w-6xl mx-auto px-6 mb-10">
                <Card className="p-4" hover={false}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Trending today</p>
                            <p className="text-sm text-slate-300">Fast-moving characters. Tap to watch before the price moves.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {['AI Characters', 'Live 24/7', 'Revenue share', 'Shareholder chat'].map((tag) => (
                                <span key={tag} className="px-3 py-1 rounded-full bg-slate-900/50 border border-slate-800 text-xs font-semibold text-slate-300">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </Card>
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
                        <p className="text-2xl font-black text-white">
                            ${characters.reduce((sum, c) => sum + c.marketCap, 0).toLocaleString()}
                        </p>
                    </Card>
                    <Card className="p-4" hover={false}>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Characters</p>
                        <p className="text-2xl font-black text-white">{characters.length}</p>
                    </Card>
                    <Card className="p-4" hover={false}>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Floor Price</p>
                        <p className="text-2xl font-black text-emerald-400">
                            ${characters.length > 0 ? Math.min(...characters.map(c => c.price)).toFixed(2) : '0.00'}
                        </p>
                    </Card>
                    <Card className="p-4" hover={false}>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Holders</p>
                        <p className="text-2xl font-black text-indigo-400">
                            {characters.reduce((sum, c) => sum + c.holders, 0).toLocaleString()}
                        </p>
                    </Card>
                </div>
            </div>

            {/* Character Grid */}
            <div className="max-w-6xl mx-auto px-6">
                {loading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <Card key={i} className="h-64 animate-pulse" hover={false} />
                        ))}
                    </div>
                ) : sortedCharacters.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedCharacters.map((char) => (
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
