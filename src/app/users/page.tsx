'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@/components/ui';

interface UserResult {
  id: string;
  username: string;
  displayName: string | null;
  joinedAt: string;
  holdingsCount: number;
}

export default function UsersPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (query.length < 2) return;
    setSearching(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.data || data || []);
      }
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 relative">
      {/* Background */}
      <div className="absolute top-0 left-0 right-0 h-[400px] overflow-hidden -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/40 via-[#0a0a0f]/80 to-[#0a0a0f] z-10" />
        <div className="absolute top-[-10%] left-[40%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-3xl mx-auto px-6 pt-12">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">Find Traders</h1>
          <p className="text-xl text-slate-400 font-medium">Search for users by username and view their portfolios</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by username..."
                className="w-full pl-12 pr-4 py-3.5 bg-slate-900/60 border border-slate-700/50 rounded-xl text-white text-base placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
                autoFocus
              />
            </div>
            <Button onClick={handleSearch} disabled={query.length < 2 || searching} size="lg">
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((u) => (
              <Card
                key={u.id}
                className="p-0 border-slate-700/50 hover:border-indigo-500/30 transition-all cursor-pointer"
                hover
              >
                <button
                  onClick={() => router.push(`/user/${u.username}`)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-black text-indigo-400">{u.username.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-base font-bold text-white">@{u.username}</p>
                      {u.displayName && (
                        <p className="text-sm text-slate-400">{u.displayName}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-white">{u.holdingsCount} {u.holdingsCount === 1 ? 'holding' : 'holdings'}</p>
                    <p className="text-xs text-slate-500">
                      Joined {new Date(u.joinedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </button>
              </Card>
            ))}
          </div>
        )}

        {hasSearched && results.length === 0 && !searching && (
          <Card className="p-12 text-center bg-slate-900/40 border-slate-800 border-dashed" hover={false}>
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-lg font-bold text-white mb-2">No users found</p>
            <p className="text-slate-500">Try a different search term</p>
          </Card>
        )}

        {!hasSearched && (
          <Card className="p-12 text-center bg-slate-900/40 border-slate-800 border-dashed" hover={false}>
            <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-lg font-bold text-white mb-2">Search for traders</p>
            <p className="text-slate-500">Enter a username to find other traders and view their portfolios</p>
          </Card>
        )}
      </div>
    </div>
  );
}
