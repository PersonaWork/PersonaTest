'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

interface FeedItem {
  id: string;
  type: string;
  shares: number;
  characterName: string;
  characterSlug: string;
  username?: string;
  time: string;
}

export default function ActivityToast() {
  const [currentItem, setCurrentItem] = useState<FeedItem | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const shownIds = useRef(new Set<string>());
  const queueRef = useRef<FeedItem[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNext = useCallback(() => {
    if (queueRef.current.length === 0) return;

    const item = queueRef.current.shift()!;
    shownIds.current.add(item.id);
    setCurrentItem(item);
    setIsVisible(true);

    // Hide after 4 seconds
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      // Show next after fade out
      timeoutRef.current = setTimeout(() => {
        showNext();
      }, 500);
    }, 4000);
  }, []);

  const fetchAndQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/activity/feed');
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.data) {
        const newItems = (json.data as FeedItem[]).filter(
          (item) => !shownIds.current.has(item.id)
        );
        if (newItems.length > 0) {
          queueRef.current.push(...newItems.slice(0, 3));
          if (!currentItem || !isVisible) {
            showNext();
          }
        }
      }
    } catch {
      // silent
    }
  }, [showNext, currentItem, isVisible]);

  useEffect(() => {
    // Initial delay before showing first toast
    const initialDelay = setTimeout(() => {
      fetchAndQueue();
    }, 8000); // wait 8s after page load

    const interval = setInterval(fetchAndQueue, 45000); // check every 45s

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [fetchAndQueue]);

  if (!currentItem) return null;

  return (
    <div
      className={`
        fixed bottom-24 sm:bottom-6 left-4 sm:left-6 z-50
        transition-all duration-500 ease-out
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}
      `}
    >
      <Link href={`/character/${currentItem.characterSlug}`}>
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 shadow-2xl shadow-black/40 hover:border-indigo-500/40 transition-colors max-w-sm">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            currentItem.type === 'buy'
              ? 'bg-emerald-500/15 border border-emerald-500/25'
              : 'bg-red-500/15 border border-red-500/25'
          }`}>
            {currentItem.type === 'buy' ? (
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white font-semibold truncate">
              <span className="text-slate-300">{currentItem.username || 'Someone'}</span>
              {' '}
              <span className={currentItem.type === 'buy' ? 'text-emerald-400' : 'text-red-400'}>
                {currentItem.type === 'buy' ? 'bought' : 'sold'}
              </span>
              {' '}
              <span>{currentItem.shares} shares</span>
            </p>
            <p className="text-xs text-slate-400 truncate">
              {currentItem.characterName}
            </p>
          </div>
          <div className="flex-shrink-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              {(() => {
                const diff = Date.now() - new Date(currentItem.time).getTime();
                const mins = Math.floor(diff / 60000);
                if (mins < 1) return 'now';
                if (mins < 60) return `${mins}m`;
                return `${Math.floor(mins / 60)}h`;
              })()}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
