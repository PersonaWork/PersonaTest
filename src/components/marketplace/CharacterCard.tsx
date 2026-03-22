'use client';

import { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Card from '../ui/Card';

interface Character {
    id: string;
    name: string;
    slug: string;
    description: string;
    price: number;
    change: number;
    marketCap: number;
    avatarUrl?: string;
    thumbnailUrl?: string;
    status: string;
    holders?: number;
    totalShares?: number;
    sharesIssued?: number;
}

interface CharacterCardProps {
    character: Character;
    showStats?: boolean;
}

const CharacterCard = memo(function CharacterCard({ character, showStats = true }: CharacterCardProps) {
    const isPositive = (character.change ?? 0) >= 0;
    const progress = character.totalShares
        ? ((character.sharesIssued || 0) / character.totalShares) * 100
        : 0;

    return (
        <div className="block no-underline relative group/card">
            <Link href={`/character/${character.slug}`} className="block no-underline">
                <Card className="h-full group cursor-pointer overflow-hidden" padding="none">
                    {/* Image Area */}
                    <div className="relative h-48 bg-gradient-to-br from-indigo-900/40 via-purple-900/30 to-pink-900/20 overflow-hidden">
                        {/* Animated background */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-pink-500/20" />
                        </div>

                        {/* Character Avatar */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="relative">
                                <div className="w-28 h-28 rounded-full bg-slate-800/80 border-4 border-slate-700 overflow-hidden shadow-2xl group-hover:scale-110 group-hover:border-indigo-500/50 transition-all duration-300 relative">
                                    {(character.avatarUrl || character.thumbnailUrl) ? (
                                        <Image
                                            src={character.avatarUrl || character.thumbnailUrl || ''}
                                            alt={character.name}
                                            fill
                                            className="object-cover"
                                            sizes="112px"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-4xl text-white">
                                            {character.name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                {/* Subtle glow on hover */}
                                <div className="absolute inset-0 rounded-full bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className="absolute top-4 right-4">
                            {character.status === 'LIVE' ? (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/30">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Live</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30">
                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">{character.status}</span>
                                </div>
                            )}
                        </div>

                        {/* Price change overlay */}
                        <div className="absolute top-4 left-4">
                            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full backdrop-blur-sm ${
                                isPositive
                                    ? 'bg-emerald-500/20 border border-emerald-500/30'
                                    : 'bg-red-500/20 border border-red-500/30'
                            }`}>
                                <svg className={`w-3 h-3 ${isPositive ? 'text-emerald-400' : 'text-red-400 rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                                <span className={`text-xs font-black ${isPositive ? 'text-emerald-300' : 'text-red-300'}`}>
                                    {isPositive ? '+' : ''}{(character.change ?? 0).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                        {/* Name & Price */}
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                                    {character.name}
                                </h3>
                                <p className="text-xs text-slate-500">@{character.slug}_persona</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-black text-white tabular-nums">${(character.price ?? 0).toFixed(2)}</p>
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                            {character.description}
                        </p>

                        {showStats && (
                            <>
                                {/* Progress Bar */}
                                {character.totalShares && character.sharesIssued !== undefined && (
                                    <div className="mb-4">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-slate-500">Shares sold</span>
                                            <span className="text-slate-300 font-medium">
                                                {((character.sharesIssued || 0) / 1000).toFixed(0)}K / {((character.totalShares || 0) / 1000).toFixed(0)}K
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                                                style={{ width: `${Math.min(progress, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Stats + Quick Trade */}
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                        <div className="p-2.5 rounded-lg bg-slate-900/50">
                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">MCap</p>
                                            <p className="text-sm font-bold text-white tabular-nums">
                                                ${((character.marketCap ?? 0) / 1000).toFixed(0)}K
                                            </p>
                                        </div>
                                        <div className="p-2.5 rounded-lg bg-slate-900/50">
                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Holders</p>
                                            <p className="text-sm font-bold text-white tabular-nums">
                                                {character.holders?.toLocaleString() || '--'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </Card>
            </Link>

            {/* Quick Trade Button - appears on hover */}
            <div className="absolute bottom-4 right-4 opacity-0 group-hover/card:opacity-100 transition-all duration-200 translate-y-1 group-hover/card:translate-y-0 z-10">
                <Link
                    href={`/character/${character.slug}/trade`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/30 transition-all hover:shadow-indigo-500/50 no-underline"
                    onClick={(e) => e.stopPropagation()}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Trade
                </Link>
            </div>
        </div>
    );
});

export default CharacterCard;
