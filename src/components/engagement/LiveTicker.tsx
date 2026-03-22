'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface FeedItem {
  id: string;
  type: string;
  shares: number;
  price: number;
  total: number;
  characterName: string;
  characterSlug: string;
  username?: string;
  time: string;
}

export default function LiveTicker() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [visible, setVisible] = useState(true);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/activity/feed');
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.data) {
        setItems(json.data);
      }
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchFeed]);

  if (items.length === 0 || !visible) return null;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  // Duplicate items for seamless scroll
  const doubled = [...items, ...items];

  return (
    <div className="relative overflow-hidden border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-sm">
      <div className="flex items-center">
        {/* Label */}
        <div className="flex-shrink-0 px-4 py-2.5 bg-gradient-to-r from-indigo-600/20 to-transparent border-r border-slate-800/60 flex items-center gap-2 z-10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-black text-emerald-300 uppercase tracking-widest whitespace-nowrap">Live</span>
        </div>

        {/* Scrolling ticker */}
        <div className="overflow-hidden flex-1">
          <div className="flex animate-ticker whitespace-nowrap">
            {doubled.map((item, i) => (
              <Link
                key={`${item.id}-${i}`}
                href={`/character/${item.characterSlug}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 hover:bg-slate-800/30 transition-colors flex-shrink-0"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${item.type === 'buy' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span className="text-xs text-slate-400">
                  <span className="text-white font-bold">{item.username || 'anon'}</span>
                  {' '}
                  <span className={item.type === 'buy' ? 'text-emerald-400' : 'text-red-400'}>
                    {item.type === 'buy' ? 'bought' : 'sold'}
                  </span>
                  {' '}
                  <span className="text-white font-semibold">{item.shares}</span>
                  {' '}
                  <span className="text-indigo-300 font-semibold">{item.characterName}</span>
                  {' '}
                  <span className="text-slate-500">• {timeAgo(item.time)}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={() => setVisible(false)}
          className="flex-shrink-0 px-3 py-2.5 text-slate-600 hover:text-slate-300 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
