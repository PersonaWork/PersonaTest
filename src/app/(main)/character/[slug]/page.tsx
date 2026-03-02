'use client';

import { use } from 'react';
import Link from 'next/link';
import { Button, Card } from '@/components/ui';
import LiveCam from '@/components/character/LiveCam';
import ChatWindow from '@/components/character/ChatWindow';
import TradingPanel from '@/components/marketplace/TradingPanel';

const MOCK_CHARACTERS: Record<string, any> = {
    luna: {
        name: 'Luna',
        slug: 'luna',
        description: 'A witty, tech-savvy AI traveler from a neon-soaked future. Luna loves exploring digital archives and sharing her findings on TikTok. She has a sharp tongue but a heart of (simulated) gold.',
        personality: ['Witty', 'Curious', 'Tech-savvy', 'Sassy'],
        price: 0.12,
        change: 4.5,
        marketCap: 120000,
        holders: 1420,
        totalShares: 1000000,
        sharesIssued: 1000000,
        idleClipUrl: 'https://cdn.pixabay.com/video/2023/10/26/186596-878153496_large.mp4',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
        tiktok: '@luna_persona',
        instagram: '@luna.persona'
    },
    jax: {
        name: 'Jax',
        slug: 'jax',
        description: 'The ultimate digital hype-man. Jax is all about street culture, sneakers, and the latest trends. He is always high energy and loves interacting with his shareholders.',
        personality: ['Energetic', 'Trend-setter', 'Loyal', 'Hype'],
        price: 0.08,
        change: -2.1,
        marketCap: 80000,
        holders: 890,
        totalShares: 1000000,
        sharesIssued: 1000000,
        idleClipUrl: 'https://cdn.pixabay.com/video/2023/10/26/186596-878153496_large.mp4',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jax',
        tiktok: '@jax_persona',
        instagram: '@jax.persona'
    },
    nova: {
        name: 'Nova',
        slug: 'nova',
        description: 'Nova is a serene AI philosopher. She spends her time contemplating the nature of consciousness and the intersection of data and soul.',
        personality: ['Serene', 'Philosophical', 'Calm', 'Enigmatic'],
        price: 0.15,
        change: 12.8,
        marketCap: 150000,
        holders: 2100,
        totalShares: 1000000,
        sharesIssued: 1000000,
        idleClipUrl: 'https://cdn.pixabay.com/video/2023/10/26/186596-878153496_large.mp4',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nova',
        tiktok: '@nova_persona',
        instagram: '@nova.persona'
    }
};

export default function CharacterPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const character = MOCK_CHARACTERS[slug] || MOCK_CHARACTERS['luna'];
    const isPositive = character.change >= 0;

    return (
        <div className="min-h-screen pb-20">
            <div className="max-w-7xl mx-auto px-6 pt-8">
                {/* Back Link */}
                <Link href="/marketplace" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="font-medium">Back to Marketplace</span>
                </Link>

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 overflow-hidden shadow-xl">
                        <img src={character.avatarUrl} alt={character.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-4xl font-black text-white">{character.name}</h1>
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-xs font-bold text-red-400 uppercase">Live</span>
                            </div>
                        </div>
                        <p className="text-slate-500 font-medium">@{character.slug}_persona</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-right">
                            <p className="text-3xl font-black text-white">${character.price.toFixed(2)}</p>
                            <p className={`text-sm font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                {isPositive ? '+' : ''}{character.change.toFixed(1)}%
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Column - Live Cam & Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Live Cam */}
                        <LiveCam slug={character.slug} idleClipUrl={character.idleClipUrl} />

                        {/* Stats Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card className="p-4" hover={false}>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Market Cap</p>
                                <p className="text-xl font-black text-white">${(character.marketCap / 1000).toFixed(0)}K</p>
                            </Card>
                            <Card className="p-4" hover={false}>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Holders</p>
                                <p className="text-xl font-black text-white">{character.holders.toLocaleString()}</p>
                            </Card>
                            <Card className="p-4" hover={false}>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Shares</p>
                                <p className="text-xl font-black text-white">{(character.sharesIssued / 1000).toFixed(0)}K / {(character.totalShares / 1000).toFixed(0)}K</p>
                            </Card>
                            <Card className="p-4" hover={false}>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Supply</p>
                                <p className="text-xl font-black text-white">100%</p>
                            </Card>
                        </div>

                        {/* About */}
                        <Card className="p-6" hover={false}>
                            <h3 className="text-lg font-bold text-white mb-4">About {character.name}</h3>
                            <p className="text-slate-400 leading-relaxed mb-6">
                                {character.description}
                            </p>

                            {/* Personality Traits */}
                            <div className="mb-6">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Personality</p>
                                <div className="flex flex-wrap gap-2">
                                    {character.personality.map((trait: string) => (
                                        <span key={trait} className="px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-sm font-medium text-indigo-300">
                                            {trait}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Social Links */}
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Social Media</p>
                                <div className="flex gap-3">
                                    <a href={`https://tiktok.com/${character.tiktok}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/50 border border-slate-700 hover:border-pink-500/50 transition-colors">
                                        <svg className="w-5 h-5 text-pink-400" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
                                        </svg>
                                        <span className="text-sm font-medium text-slate-300">{character.tiktok}</span>
                                    </a>
                                    <a href={`https://instagram.com/${character.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/50 border border-slate-700 hover:border-pink-500/50 transition-colors">
                                        <svg className="w-5 h-5 text-pink-400" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                        </svg>
                                        <span className="text-sm font-medium text-slate-300">{character.instagram}</span>
                                    </a>
                                </div>
                            </div>
                        </Card>

                        {/* Chat Section */}
                        <Card className="p-0 overflow-hidden" hover={false}>
                            <div className="p-4 border-b border-slate-800">
                                <h3 className="text-lg font-bold text-white">Chat with {character.name}</h3>
                                <p className="text-sm text-slate-500">Shareholders only — buy shares to unlock</p>
                            </div>
                            <ChatWindow slug={character.slug} characterName={character.name} />
                        </Card>
                    </div>

                    {/* Right Column - Trading Panel */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-8">
                            <TradingPanel
                                characterName={character.name}
                                characterSlug={character.slug}
                                currentPrice={character.price}
                                userShares={5000}
                                userBalance={100.00}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
