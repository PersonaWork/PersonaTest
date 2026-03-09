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
    const isPositive = character.change >= 0;
    const progress = character.totalShares
        ? ((character.sharesIssued || 0) / character.totalShares) * 100
        : 0;

    return (
        <Link href={`/character/${character.slug}`} className="block no-underline">
            <Card className="h-full group cursor-pointer" padding="none">
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
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Live</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">{character.status}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Name & Price */}
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                                {character.name}
                            </h3>
                            <p className="text-sm text-slate-500">@{character.slug}_persona</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-black text-white">${character.price.toFixed(2)}</p>
                            <p className={`text-xs font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                {isPositive ? '+' : ''}{character.change.toFixed(1)}%
                            </p>
                        </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                        {character.description}
                    </p>

                    {showStats && (
                        <>
                            {/* Progress Bar (if applicable) */}
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

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-slate-900/50">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Market Cap</p>
                                    <p className="text-sm font-bold text-white">
                                        ${(character.marketCap / 1000).toFixed(0)}K
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-900/50">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Holders</p>
                                    <p className="text-sm font-bold text-white">
                                        {character.holders?.toLocaleString() || '--'}
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </Card>
        </Link>
    );
});

export default CharacterCard;
