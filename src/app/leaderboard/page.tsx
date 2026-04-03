'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui';

type Metric = 'portfolio' | 'trades' | 'holdings' | 'referrals';

interface LeaderboardEntry {
  username: string;
  displayName: string | null;
  joinedAt: string;
  portfolioValue?: number;
  pnl?: number;
  pnlPercent?: number;
  totalInvested?: number;
  holdingsCount: number;
  referrals: number;
  totalTrades?: number;
  buys?: number;
  sells?: number;
  totalShares?: number;
  topHolding?: { name: string; slug: string } | null;
}

const metrics: { key: Metric; label: string; icon: string }[] = [
  { key: 'portfolio', label: 'Portfolio Value', icon: '💰' },
  { key: 'trades', label: 'Most Trades', icon: '📊' },
  { key: 'holdings', label: 'Most Holdings', icon: '🏆' },
  { key: 'referrals', label: 'Top Referrers', icon: '🤝' },
];

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(6)}`;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [metric, setMetric] = useState<Metric>('portfolio');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?metric=${metric}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.data || data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [metric]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const getPrimaryValue = (e: LeaderboardEntry): string => {
    switch (metric) {
      case 'portfolio':
        return formatUsd(e.portfolioValue || 0);
      case 'trades':
        return `${e.totalTrades || 0} trades`;
      case 'holdings':
        return `${e.holdingsCount} characters`;
      case 'referrals':
        return `${e.referrals} referrals`;
    }
  };

  const getSecondaryValue = (e: LeaderboardEntry): string => {
    switch (metric) {
      case 'portfolio':
        return `${(e.pnlPercent || 0) >= 0 ? '+' : ''}${(e.pnlPercent || 0).toFixed(1)}% P&L`;
      case 'trades':
        return `${e.buys || 0} buys / ${e.sells || 0} sells`;
      case 'holdings':
        return `${(e.totalShares || 0).toLocaleString()} total shares`;
      case 'referrals':
        return `${e.holdingsCount} holdings`;
    }
  };

  const getMedalColor = (rank: number): string => {
    if (rank === 0) return 'from-yellow-400 to-amber-500';
    if (rank === 1) return 'from-slate-300 to-slate-400';
    if (rank === 2) return 'from-amber-600 to-orange-700';
    return 'from-slate-600 to-slate-700';
  };

  return (
    <div className="min-h-screen pb-20 relative">
      {/* Background */}
      <div className="absolute top-0 left-0 right-0 h-[400px] overflow-hidden -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/40 via-[#0a0a0f]/80 to-[#0a0a0f] z-10" />
        <div className="absolute top-[-10%] left-[30%] w-[600px] h-[600px] bg-amber-600/10 rounded-full blur-[150px]" />
        <div className="absolute top-[-20%] right-[20%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        {/* Header */}
        <div className="mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-2 sm:mb-3 tracking-tight">Leaderboard</h1>
          <p className="text-base sm:text-xl text-slate-400 font-medium">Top traders on Persona</p>
        </div>

        {/* Metric Tabs */}
        <div className="mb-6 sm:mb-8">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {metrics.map((m) => (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  metric === m.key
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Top 3 Podium (only on portfolio metric and when we have data) */}
        {!loading && entries.length >= 3 && metric === 'portfolio' && (
          <div className="mb-8 sm:mb-10">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end">
              {/* 2nd Place */}
              <div className="order-1">
                <Card className="p-3 sm:p-5 text-center border-slate-300/10 bg-slate-900/60" hover={false}>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-slate-300 to-slate-400 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                    <span className="text-sm sm:text-lg font-black text-slate-900">2</span>
                  </div>
                  <button onClick={() => router.push(`/user/${entries[1].username}`)} className="hover:opacity-80">
                    <p className="text-sm sm:text-base font-bold text-white truncate">@{entries[1].username}</p>
                  </button>
                  <p className="text-xs sm:text-sm font-bold text-emerald-400 mt-1">{formatUsd(entries[1].portfolioValue || 0)}</p>
                </Card>
              </div>
              {/* 1st Place */}
              <div className="order-2">
                <Card className="p-4 sm:p-6 text-center border-yellow-500/20 bg-gradient-to-b from-yellow-500/5 to-transparent" hover={false}>
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-lg shadow-yellow-500/25">
                    <span className="text-lg sm:text-2xl font-black text-yellow-900">1</span>
                  </div>
                  <div className="text-lg sm:text-2xl mb-1">👑</div>
                  <button onClick={() => router.push(`/user/${entries[0].username}`)} className="hover:opacity-80">
                    <p className="text-sm sm:text-lg font-bold text-white truncate">@{entries[0].username}</p>
                  </button>
                  <p className="text-sm sm:text-lg font-bold text-emerald-400 mt-1">{formatUsd(entries[0].portfolioValue || 0)}</p>
                  <p className="text-[10px] sm:text-xs text-slate-500 mt-1">
                    {(entries[0].pnlPercent || 0) >= 0 ? '+' : ''}{(entries[0].pnlPercent || 0).toFixed(1)}% ROI
                  </p>
                </Card>
              </div>
              {/* 3rd Place */}
              <div className="order-3">
                <Card className="p-3 sm:p-5 text-center border-amber-600/10 bg-slate-900/60" hover={false}>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-amber-600 to-orange-700 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                    <span className="text-sm sm:text-lg font-black text-amber-100">3</span>
                  </div>
                  <button onClick={() => router.push(`/user/${entries[2].username}`)} className="hover:opacity-80">
                    <p className="text-sm sm:text-base font-bold text-white truncate">@{entries[2].username}</p>
                  </button>
                  <p className="text-xs sm:text-sm font-bold text-emerald-400 mt-1">{formatUsd(entries[2].portfolioValue || 0)}</p>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Full Rankings */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="h-16 sm:h-20 animate-pulse" hover={false} />
            ))}
          </div>
        ) : entries.length > 0 ? (
          <div className="space-y-2">
            {entries.map((entry, idx) => (
              <Card
                key={entry.username}
                className="p-0 border-slate-700/50 hover:border-indigo-500/30 transition-all cursor-pointer"
                hover
              >
                <button
                  onClick={() => router.push(`/user/${entry.username}`)}
                  className="w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3 sm:py-4 text-left"
                >
                  {/* Rank */}
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r ${getMedalColor(idx)} flex items-center justify-center flex-shrink-0`}>
                    <span className={`text-xs sm:text-sm font-black ${idx < 3 ? 'text-white' : 'text-slate-300'}`}>
                      {idx + 1}
                    </span>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-bold text-white truncate">
                      @{entry.username}
                      {entry.displayName && (
                        <span className="text-slate-500 font-normal ml-2 hidden sm:inline">
                          {entry.displayName}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{getSecondaryValue(entry)}</p>
                  </div>

                  {/* Primary Metric */}
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm sm:text-base font-bold ${
                      metric === 'portfolio' ? 'text-emerald-400' : 'text-white'
                    }`}>
                      {getPrimaryValue(entry)}
                    </p>
                    {metric === 'portfolio' && entry.topHolding && (
                      <p className="text-[10px] sm:text-xs text-slate-500 truncate max-w-[100px] sm:max-w-none">
                        Top: {entry.topHolding.name}
                      </p>
                    )}
                  </div>
                </button>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center bg-slate-900/40 border-slate-800 border-dashed" hover={false}>
            <div className="text-5xl mb-4">🏆</div>
            <p className="text-lg font-bold text-white mb-2">No rankings yet</p>
            <p className="text-slate-500">Be the first to trade and claim your spot!</p>
          </Card>
        )}
      </div>
    </div>
  );
}
