'use client';

import { use } from 'react';
import Link from 'next/link';
import LiveCam from '@/components/character/LiveCam';
import ChatWindow from '@/components/character/ChatWindow';

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
        idleClipUrl: 'https://cdn.pixabay.com/video/2023/10/26/186596-878153496_large.mp4', // Placeholder
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
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
        idleClipUrl: 'https://cdn.pixabay.com/video/2023/10/26/186596-878153496_large.mp4',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jax',
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
        idleClipUrl: 'https://cdn.pixabay.com/video/2023/10/26/186596-878153496_large.mp4',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nova',
    }
};

export default function CharacterPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const character = MOCK_CHARACTERS[slug] || MOCK_CHARACTERS['luna'];

    return (
        <div className="min-h-screen pt-24 pb-12 px-6 ml-[240px] max-md:ml-0">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left/Middle Column - Cam & Info */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Header */}
                    <div className="flex items-center gap-6">
                        <Link href="/marketplace" className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                        </Link>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-4xl font-black text-slate-900">{character.name}</h1>
                                <div className="live-indicator self-center scale-90"></div>
                            </div>
                            <p className="text-slate-500 font-medium">@{character.slug}_persona</p>
                        </div>
                    </div>

                    {/* Live Cam */}
                    <LiveCam slug={character.slug} idleClipUrl={character.idleClipUrl} />

                    {/* Character Description & Personality */}
                    <div className="glass-card p-10">
                        <h3 className="text-xl font-bold mb-6">About {character.name}</h3>
                        <p className="text-slate-500 font-medium leading-relaxed mb-8">
                            {character.description}
                        </p>

                        <div className="flex flex-wrap gap-2">
                            {character.personality.map((trait: string) => (
                                <span key={trait} className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 text-xs font-black uppercase tracking-widest border border-indigo-100">
                                    {trait}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column - Stats & Trading */}
                <div className="space-y-8">
                    {/* Market Stats */}
                    <div className="glass-card p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-bold">Market Stats</h3>
                            <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-lg border border-emerald-100">TRADING LIVE</div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">Share Price</span>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-slate-900">${character.price}</div>
                                    <div className={`text-sm font-bold ${character.change >= 0 ? 'text-emerald-500' : 'text-pink-500'}`}>
                                        {character.change >= 0 ? '+' : ''}{character.change}% (24h)
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50">
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Market Cap</div>
                                    <div className="text-lg font-bold text-slate-700">${character.marketCap.toLocaleString()}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Holders</div>
                                    <div className="text-lg font-bold text-slate-700">{character.holders.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Trading Interface */}
                    <div className="glass-card p-8 border-indigo-100 bg-white shadow-premium">
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl mb-8">
                            <button className="flex-1 py-3 rounded-xl bg-white shadow-sm font-black text-sm text-indigo-600">Buy</button>
                            <button className="flex-1 py-3 rounded-xl font-black text-sm text-slate-400 hover:text-slate-600 transition-colors">Sell</button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Shares to Buy</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        className="w-full h-16 rounded-2xl bg-slate-50 border border-slate-100 px-6 font-black text-xl focus:outline-none focus:border-indigo-300 transition-all"
                                    />
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-bold">SHARES</div>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-50 space-y-2">
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-slate-400">Total Cost</span>
                                    <span className="text-slate-900">$0.00</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-slate-400">Slippage</span>
                                    <span className="text-slate-900">1.5%</span>
                                </div>
                            </div>

                            <button className="w-full btn-primary h-16 justify-center text-lg">
                                Execute Order
                            </button>
                        </div>
                    </div>

                    {/* Chat Interface */}
                    <ChatWindow slug={character.slug} characterName={character.name} />

                    {/* Chat Gated Notification (Optional / Alternative state) */}
                    <div className="glass-card p-6 bg-indigo-50/30 border-none text-center">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Shareholder Perks</p>
                        <p className="text-xs text-slate-500 font-medium mt-1">Own 1,000+ shares to unlock exclusive voice calls.</p>
                    </div>
                </div>

            </div>
        </div>
    );
}
