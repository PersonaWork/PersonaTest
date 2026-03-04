'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import AnimatedLiveCam from '@/components/character/AnimatedLiveCam';
import Link from 'next/link';

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
  personality: any;
  environment: any;
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

  useEffect(() => {
    if (slug) {
      fetchCharacter();
      fetchEvents();
    }
  }, [slug]);

  const fetchCharacter = async () => {
    try {
      const response = await fetch(`/api/characters/${slug}`);
      if (!response.ok) throw new Error('Failed to fetch character');
      
      const data = await response.json();
      setCharacter(data);
    } catch (error) {
      console.error('Failed to fetch character:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch(`/api/characters/${slug}/events`);
      if (!response.ok) return;
      
      const data = await response.json();
      setEvents(data.slice(0, 5)); // Last 5 events
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Character not found</h1>
          <Link href="/marketplace" className="text-indigo-400 hover:text-indigo-300">
            ← Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const personality = character.personality as any;
  const isPositive = character.change >= 0;

  return (
    <div className="min-h-screen">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left/Main Panel - Live Cam */}
        <div className="lg:col-span-2">
          <Card className="h-[600px]" padding="none">
            <AnimatedLiveCam 
              slug={character.slug}
              characterName={character.name}
              personality={character.personality}
              idleClipUrl={character.environment?.idleClipUrl || ''}
            />
          </Card>
        </div>

        {/* Right Panel - Character Info */}
        <div className="space-y-6">
          {/* Character Header */}
          <Card>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-black text-white mb-1">{character.name}</h1>
                  <p className="text-slate-400">@{character.slug}_persona</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-white">${character.price.toFixed(2)}</p>
                  <p className={`text-sm font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isPositive ? '+' : ''}{character.change.toFixed(1)}%
                  </p>
                </div>
              </div>

              <p className="text-slate-300 mb-4">{character.description}</p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 rounded-xl bg-slate-900/50">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Market Cap</p>
                  <p className="text-lg font-black text-white">${(character.marketCap / 1000).toFixed(0)}K</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/50">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Holders</p>
                  <p className="text-lg font-black text-white">{character.holders.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link href={`/character/${character.slug}/trade`} className="w-full">
                  <Button className="w-full" size="lg">
                    Buy shares
                  </Button>
                </Link>
                <Link href="/fund" className="w-full">
                  <Button className="w-full" variant="secondary" size="lg">
                    Fund wallet
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          {/* Personality Traits */}
          {personality?.traits && (
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-bold text-white mb-3">Personality</h3>
                <div className="flex flex-wrap gap-2">
                  {personality.traits.map((trait: string, index: number) => (
                    <span key={index} className="px-3 py-1 bg-indigo-600/20 text-indigo-400 rounded-lg text-sm">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Recent Events */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-bold text-white mb-3">Recent Actions</h3>
              {events.length > 0 ? (
                <div className="space-y-2">
                  {events.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                      <span className="text-sm text-slate-300">{event.actionId}</span>
                      <div className="flex items-center gap-2">
                        {event.isRare && (
                          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        )}
                        <span className="text-xs text-slate-500">
                          {new Date(event.triggeredAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No recent actions</p>
              )}
            </div>
          </Card>

          {/* Social Links */}
          {(character.tiktokHandle || character.instagramHandle) && (
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-bold text-white mb-3">Social</h3>
                <div className="space-y-2">
                  {character.tiktokHandle && (
                    <a 
                      href={`https://tiktok.com/@${character.tiktokHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                    >
                      <span className="text-black">♬</span> @{character.tiktokHandle}
                    </a>
                  )}
                  {character.instagramHandle && (
                    <a 
                      href={`https://instagram.com/${character.instagramHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                    >
                      <span className="text-black">📷</span> @{character.instagramHandle}
                    </a>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
