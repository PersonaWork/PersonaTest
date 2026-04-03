'use client';

import { useState, useEffect } from 'react';

export default function OnlineIndicator({ className = '' }: { className?: string }) {
  const [online, setOnline] = useState<number | null>(null);

  useEffect(() => {
    const fetchOnline = async () => {
      try {
        const res = await fetch('/api/activity/online');
        const data = await res.json();
        if (data.data?.online) {
          setOnline(data.data.online);
        }
      } catch {
        // Silently fail
      }
    };

    fetchOnline();
    const interval = setInterval(fetchOnline, 30000); // Every 30s
    return () => clearInterval(interval);
  }, []);

  if (online === null) return null;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="text-xs font-bold text-emerald-400 tabular-nums font-mono">
        {online.toLocaleString()}
      </span>
      <span className="text-[10px] text-slate-500 font-medium">online</span>
    </div>
  );
}
