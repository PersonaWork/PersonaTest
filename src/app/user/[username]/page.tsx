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
  avgBuyPrice: number;
  currentPrice: number;
  totalValue: number;
  totalCost: number;
  pnl: number;
  pnlPercent: number;
}

interface ProfileTransaction {
  id: string;
  type: string;
  characterName: string;
  characterSlug: string;
  shares: number;
  pricePerShare: number;
  total: number;
  createdAt: string;
}

interface UserProfile {
  id: string;
  username: string;
  displayName: string | null;
  joinedAt: string;
  holdings: ProfileHolding[];
  totalPortfolioValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPercent: number;
  holdingsCount: number;
  totalTrades: number;
  referralCount: number;
  bestHolding: { characterName: string; pnlPercent: number } | null;
  recentTransactions: ProfileTransaction[];
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const username = params.username as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<'holdings' | 'activity'>('holdings');

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
  const daysSinceJoin = profile ? Math.floor((Date.now() - new Date(profile.joinedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;

  if (loading) {
    return (
      <div className="min-h-screen pt-12 px-6 max-w-4xl mx-auto pb-20">
        <Skeleton className="h-48 w-full rounded-3xl mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12">
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
            <Card className="p-6 sm:p-8 mb-6 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-2xl" hover={false}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
                  <span className="text-white font-black text-2xl sm:text-3xl">
                    {profile.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
                      {profile.displayName || `@${profile.username}`}
                    </h1>
                    {isOwnProfile && (
                      <Link href="/settings">
                        <Button variant="ghost" size="sm">Edit</Button>
                      </Link>
                    )}
                  </div>
                  {profile.displayName && (
                    <p className="text-base sm:text-lg text-indigo-400 font-semibold mb-1">@{profile.username}</p>
                  )}
                  <p className="text-sm text-slate-500">
                    Joined {new Date(profile.joinedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    {' '}&middot; {daysSinceJoin}d ago
                  </p>
                </div>
                <div className="text-left sm:text-right mt-2 sm:mt-0">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Portfolio Value</p>
                  <p className="text-2xl sm:text-3xl font-black text-white">${profile.totalPortfolioValue.toFixed(2)}</p>
                  {profile.totalPnl !== 0 && (
                    <p className={`text-sm font-bold ${profile.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {profile.totalPnl >= 0 ? '+' : ''}${profile.totalPnl.toFixed(2)} ({profile.totalPnl >= 0 ? '+' : ''}{profile.totalPnlPercent.toFixed(1)}%)
                    </p>
                  )}
                </div>
              </div>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <Card className="p-4" hover={false}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Holdings</p>
                <p className="text-2xl font-black text-white">{profile.holdingsCount}</p>
              </Card>
              <Card className="p-4" hover={false}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Trades</p>
                <p className="text-2xl font-black text-white">{profile.totalTrades}</p>
              </Card>
              <Card className="p-4" hover={false}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Referrals</p>
                <p className="text-2xl font-black text-indigo-400">{profile.referralCount}</p>
              </Card>
              <Card className="p-4" hover={false}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Best Performer</p>
                {profile.bestHolding ? (
                  <div>
                    <p className="text-sm font-bold text-white truncate">{profile.bestHolding.characterName}</p>
                    <p className={`text-xs font-bold ${profile.bestHolding.pnlPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {profile.bestHolding.pnlPercent >= 0 ? '+' : ''}{profile.bestHolding.pnlPercent.toFixed(1)}%
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">--</p>
                )}
              </Card>
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-900/50 rounded-xl p-1 border border-slate-800 w-fit mb-6">
              <button
                onClick={() => setActiveTab('holdings')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'holdings' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Holdings
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'activity' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Trade History
              </button>
            </div>

            {/* Holdings Tab */}
            {activeTab === 'holdings' && (
              <div className="mb-8">
                {profile.holdings.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {profile.holdings.map((h) => {
                      const isProfit = h.pnl >= 0;
                      return (
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
                              <div className="min-w-0">
                                <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors truncate">{h.characterName}</h3>
                                <p className="text-xs text-slate-500">{h.shares.toLocaleString()} shares</p>
                              </div>
                            </div>
                            <div className="flex justify-between items-center pt-3 border-t border-slate-800/50">
                              <div>
                                <span className="text-xs text-slate-500">Value</span>
                                <p className="text-sm font-bold text-white">${h.totalValue.toFixed(2)}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-xs text-slate-500">P&L</span>
                                <p className={`text-sm font-bold ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {isProfit ? '+' : ''}{h.pnlPercent.toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="p-12 text-center bg-slate-900/40 border-slate-800 border-dashed" hover={false}>
                    <p className="text-slate-500 font-semibold">No holdings yet</p>
                  </Card>
                )}
              </div>
            )}

            {/* Trade History Tab */}
            {activeTab === 'activity' && (
              <div className="mb-8">
                {profile.recentTransactions.length > 0 ? (
                  <Card className="overflow-hidden bg-slate-900/60 border border-slate-700/50" padding="none" hover={false}>
                    {/* Mobile-friendly card list */}
                    <div className="sm:hidden divide-y divide-slate-800/60">
                      {profile.recentTransactions.map((tx) => (
                        <div key={tx.id} className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-white text-sm">{tx.characterName}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              tx.type === 'buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                            }`}>{tx.type}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>{tx.shares} shares @ ${tx.pricePerShare.toFixed(4)}</span>
                            <span className="font-bold text-white">${tx.total.toFixed(2)}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">
                            {new Date(tx.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      ))}
                    </div>
                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-950/40">
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Asset</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Action</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Price</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Shares</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Total</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {profile.recentTransactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="p-4 font-bold text-white text-sm">{tx.characterName}</td>
                              <td className="p-4">
                                <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase ${
                                  tx.type === 'buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                }`}>{tx.type}</span>
                              </td>
                              <td className="p-4 text-sm font-semibold text-slate-300 text-right">${tx.pricePerShare.toFixed(4)}</td>
                              <td className="p-4 text-sm font-semibold text-slate-300 text-right">{tx.shares.toLocaleString()}</td>
                              <td className="p-4 text-sm font-bold text-white text-right">${tx.total.toFixed(2)}</td>
                              <td className="p-4 text-xs font-medium text-slate-500 text-right">
                                {new Date(tx.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                ) : (
                  <Card className="p-12 text-center bg-slate-900/40 border-slate-800 border-dashed" hover={false}>
                    <p className="text-slate-500 font-semibold">No trading activity yet</p>
                  </Card>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
