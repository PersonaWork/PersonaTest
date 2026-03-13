'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Card, Skeleton } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';

interface ProfileHolding {
  characterId: string;
  characterName: string;
  characterSlug: string;
  characterThumbnail: string | null;
  shares: number;
  currentPrice: number;
  totalValue: number;
}

interface UserProfile {
  id: string;
  username: string;
  displayName: string | null;
  joinedAt: string;
  holdings: ProfileHolding[];
  totalPortfolioValue: number;
  holdingsCount: number;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const username = params.username as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string; displayName: string | null; holdingsCount: number }[]>([]);
  const [searching, setSearching] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setNotFound(false);
      const res = await fetch(`/api/users/profile/${encodeURIComponent(username)}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setProfile(data.data || data);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (username) fetchProfile();
  }, [username, fetchProfile]);

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.data || data || []);
      }
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  };

  const isOwnProfile = currentUser?.username === username;

  if (loading) {
    return (
      <div className="min-h-screen pt-12 px-6 max-w-4xl mx-auto pb-20">
        <Skeleton className="h-48 w-full rounded-3xl mb-8" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-10 text-center border-slate-800 shadow-2xl" hover={false}>
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white mb-3">User Not Found</h1>
          <p className="text-slate-400 mb-6">No user with the username &quot;{username}&quot; exists.</p>
          <Link href="/marketplace">
            <Button>Back to Marketplace</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 relative">
      {/* Background */}
      <div className="absolute top-0 left-0 right-0 h-[400px] overflow-hidden -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/40 via-[#0a0a0f]/80 to-[#0a0a0f] z-10" />
        <div className="absolute top-[-10%] left-[40%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-12">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search users by username..."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-900/60 border border-slate-700/50 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
              />
            </div>
            <Button onClick={handleSearch} disabled={searchQuery.length < 2 || searching} variant="secondary">
              {searching ? '...' : 'Search'}
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-3 bg-slate-900/80 border border-slate-700/50 rounded-xl overflow-hidden">
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => { router.push(`/user/${u.username}`); setSearchResults([]); setSearchQuery(''); }}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-800/50 transition-colors border-b border-slate-800/50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-500/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-indigo-400">{u.username.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-white">@{u.username}</p>
                      {u.displayName && <p className="text-xs text-slate-500">{u.displayName}</p>}
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">{u.holdingsCount} holdings</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {profile && (
          <>
            {/* Profile Header */}
            <Card className="p-8 mb-8 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-2xl" hover={false}>
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
                  <span className="text-white font-black text-3xl">
                    {profile.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-3xl font-black text-white tracking-tight">
                      {profile.displayName || `@${profile.username}`}
                    </h1>
                    {isOwnProfile && (
                      <Link href="/settings">
                        <Button variant="ghost" size="sm">Edit</Button>
                      </Link>
                    )}
                  </div>
                  {profile.displayName && (
                    <p className="text-lg text-indigo-400 font-semibold mb-1">@{profile.username}</p>
                  )}
                  <p className="text-sm text-slate-500">
                    Joined {new Date(profile.joinedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Portfolio Value</p>
                  <p className="text-3xl font-black text-white">${profile.totalPortfolioValue.toFixed(2)}</p>
                  <p className="text-sm text-slate-400">{profile.holdingsCount} {profile.holdingsCount === 1 ? 'character' : 'characters'}</p>
                </div>
              </div>
            </Card>

            {/* Holdings */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white mb-6">Holdings</h2>
              {profile.holdings.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {profile.holdings.map((h) => (
                    <Link key={h.characterId} href={`/character/${h.characterSlug}`}>
                      <Card className="p-5 group border-slate-700/50 hover:border-indigo-500/30 transition-all" hover>
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-800 flex-shrink-0 border border-slate-700 overflow-hidden relative">
                            {h.characterThumbnail ? (
                              <Image src={h.characterThumbnail} alt={h.characterName} fill className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white text-lg font-bold">
                                {h.characterName.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">{h.characterName}</h3>
                            <p className="text-xs text-slate-500">{h.shares.toLocaleString()} shares</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-slate-800/50">
                          <span className="text-xs text-slate-500">Value</span>
                          <span className="text-sm font-bold text-white">${h.totalValue.toFixed(2)}</span>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <Card className="p-12 text-center bg-slate-900/40 border-slate-800 border-dashed" hover={false}>
                  <p className="text-slate-500 font-semibold">No holdings yet</p>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
