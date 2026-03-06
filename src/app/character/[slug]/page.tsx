'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button, Card, Skeleton } from '@/components/ui';
import AnimatedLiveCam from '@/components/character/AnimatedLiveCam';
import Link from 'next/link';
import Image from 'next/image';

interface Character {
  id: string;
  name: string;
  slug: string;
  description: string;
  thumbnailUrl?: string;
  currentPrice: number;
  marketCap: number;
  priceChange: number;
  totalShares: number;
  sharesIssued: number;
  holders: number;
  isLaunched: boolean;
  personality: Record<string, unknown>;
  environment: Record<string, unknown>;
  tiktokHandle?: string;
  instagramHandle?: string;
}

interface CharacterEvent {
  id: string;
  actionId: string;
  isRare: boolean;
  triggeredAt: string;
}

export default function CharacterPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [character, setCharacter] = useState<Character | null>(null);
  const [events, setEvents] = useState<CharacterEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCharacter = useCallback(async () => {
    try {
      const response = await fetch(`/api/characters/${slug}`);
      if (!response.ok) throw new Error('Failed to fetch character');

      const json = await response.json();
      if (json.success && json.data) {
        setCharacter(json.data);
      } else {
        setCharacter(json);
      }
    } catch (error) {
      console.error('Failed to fetch character:', error);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetch(`/api/characters/${slug}/events`);
      if (!response.ok) return;

      const json = await response.json();
      if (json.success && json.data) {
        setEvents(json.data.slice(0, 5));
      } else {
        setEvents(json.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  }, [slug]);

  useEffect(() => {
    if (slug) {
      fetchCharacter();
      fetchEvents();
    }
  }, [slug, fetchCharacter, fetchEvents]);

  if (loading) {
    return (
      <div className="min-h-screen pt-8 px-6 max-w-7xl mx-auto pb-20">
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-4">
            <Skeleton className="h-[600px] w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Card className="text-center py-16 px-12 animate-in zoom-in-95 duration-500" hover={false}>
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-white mb-2">Character not found</h1>
          <p className="text-slate-400 mb-6">They might have been removed or haven&apos;t launched yet.</p>
          <Link href="/marketplace">
            <Button>Explore Marketplace</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const personality = character.personality as { traits?: string[] } | undefined;
  // Ensure we have a default value for change if undefined
  const priceChange = character.priceChange ?? 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="min-h-screen pb-20">
      {/* Background Hero Blur */}
      <div className="absolute top-0 left-0 right-0 h-[500px] overflow-hidden -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/10 via-[#0a0a0f]/80 to-[#0a0a0f] z-10" />
        {character.thumbnailUrl && (
          <Image
            src={character.thumbnailUrl}
            alt={character.name}
            fill
            className="object-cover opacity-20 blur-3xl scale-125 translate-y-[-20%]"
          />
        )}
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-10">
        <div className="grid lg:grid-cols-12 gap-8">

          {/* Main Left Content */}
          <div className="lg:col-span-8 flex flex-col gap-6">

            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
              <div className="flex items-center gap-5">
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-slate-700 shadow-xl overflow-hidden relative">
                    {character.thumbnailUrl ? (
                      <Image src={character.thumbnailUrl} alt={character.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white">{character.name[0]}</div>
                    )}
                  </div>
                  {character.isLaunched && (
                    <div className="absolute -bottom-2 -right-2">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500 border border-red-600 shadow-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span className="text-[9px] font-black text-white uppercase tracking-wider">Live</span>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight">{character.name}</h1>
                  <p className="text-lg font-medium text-indigo-400">@{character.slug}_persona</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Link href={`/character/${character.slug}/trade`}>
                  <Button size="lg" className="shadow-indigo-500/20 shadow-lg">Buy shares</Button>
                </Link>
                <Link href={`/character/${character.slug}/chat`}>
                  <Button variant="secondary" size="lg" className="gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Chat
                  </Button>
                </Link>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800/80 mb-2">
              <Link href={`/character/${character.slug}`} className="px-6 py-4 border-b-2 border-indigo-500 text-indigo-400 font-bold text-sm hover:text-indigo-300 transition-colors">
                Overview
              </Link>
              <Link href={`/character/${character.slug}/trade`} className="px-6 py-4 text-slate-400 font-bold text-sm hover:text-white transition-colors">
                Trade Central
              </Link>
              <Link href={`/character/${character.slug}/chat`} className="px-6 py-4 text-slate-400 font-bold text-sm hover:text-white transition-colors">
                Live Chat
              </Link>
            </div>

            {/* Live Camera Feed */}
            <Card className="h-[600px] overflow-hidden border-slate-700/50 shadow-2xl relative" padding="none" hover={false}>
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-xs font-bold text-white uppercase tracking-widest">
                  Live Feed
                </div>
              </div>
              <AnimatedLiveCam
                slug={character.slug}
                characterName={character.name}
                personality={character.personality}
                idleClipUrl={(character.environment as { idleClipUrl?: string })?.idleClipUrl || ''}
              />
            </Card>

            {/* About / Description */}
            <Card className="bg-slate-900/40 backdrop-blur-sm border-slate-800/80" hover={false}>
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                About {character.name}
              </h3>
              <p className="text-slate-300 leading-relaxed text-lg">{character.description}</p>
            </Card>

          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-4 space-y-6">

            {/* Market Stats */}
            <Card className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50" hover={false}>
              <div className="p-1">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Current Price</p>
                <div className="flex items-baseline gap-3 mb-6">
                  <p className="text-4xl font-black text-white">${(character.currentPrice ?? 0).toFixed(2)}</p>
                  <p className={`text-sm font-bold px-2 py-1 rounded-md ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/50">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 mt-0.5">Market Cap</p>
                    <p className="text-xl font-bold text-white">${(character.marketCap / 1000).toFixed(1)}K</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/50">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 mt-0.5">Holders</p>
                    <p className="text-xl font-bold text-white">{character.holders?.toLocaleString() || '0'}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Personality Traits */}
            {personality?.traits && personality.traits.length > 0 && (
              <Card hover={false} className="bg-slate-900/40 border-slate-800/80">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Personality Traits</h3>
                <div className="flex flex-wrap gap-2">
                  {personality.traits.map((trait: string, index: number) => (
                    <span key={index} className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-lg text-sm font-medium">
                      {trait}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Recent Actions Feed */}
            <Card hover={false} className="bg-slate-900/40 border-slate-800/80">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Live Activity</h3>
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Syncing</span>
                </div>
              </div>

              {events.length > 0 ? (
                <div className="space-y-3">
                  {events.map((event) => (
                    <div key={event.id} className="flex gap-3 p-3 rounded-xl bg-slate-950/50 border border-slate-800/50 transition-colors hover:border-slate-700">
                      <div className="shrink-0 mt-0.5">
                        {event.isRare ? (
                          <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-indigo-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 capitalize truncate">{event.actionId.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {new Date(event.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center border border-dashed border-slate-800 rounded-xl">
                  <p className="text-slate-500 text-sm font-medium">No recent activity</p>
                </div>
              )}
            </Card>

            {/* Social Connect */}
            {(character.tiktokHandle || character.instagramHandle) && (
              <Card hover={false} className="bg-slate-900/40 border-slate-800/80">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Connected Socials</h3>
                <div className="space-y-3">
                  {character.tiktokHandle && (
                    <a
                      href={`https://tiktok.com/@${character.tiktokHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/50 border border-slate-800/50 hover:bg-slate-800 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 3.73 1.24V6.43a.2.2 0 0 0 0-.01z" /></svg>
                      </div>
                      <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">@{character.tiktokHandle}</span>
                    </a>
                  )}
                  {character.instagramHandle && (
                    <a
                      href={`https://instagram.com/${character.instagramHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/50 border border-slate-800/50 hover:bg-slate-800 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 flex items-center justify-center text-white">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" /></svg>
                      </div>
                      <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">@{character.instagramHandle}</span>
                    </a>
                  )}
                </div>
              </Card>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
