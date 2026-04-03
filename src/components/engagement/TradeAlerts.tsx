'use client';

import { useState, useEffect, useRef } from 'react';

interface TradeAlert {
  id: string;
  type: string;
  shares: number;
  price: number;
  total: number;
  username: string;
  time: string;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export default function TradeAlerts({ characterSlug }: { characterSlug: string }) {
  const [alerts, setAlerts] = useState<TradeAlert[]>([]);
  const [newAlert, setNewAlert] = useState<TradeAlert | null>(null);
  const lastIdRef = useRef<string | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch('/api/activity/feed');
        const data = await res.json();
        if (data.data) {
          // Filter to just this character
          const charAlerts = data.data
            .filter((t: { characterSlug: string }) => t.characterSlug === characterSlug)
            .slice(0, 5);

          if (charAlerts.length > 0 && charAlerts[0].id !== lastIdRef.current) {
            if (lastIdRef.current !== null) {
              // New trade alert!
              setNewAlert(charAlerts[0]);
              setTimeout(() => setNewAlert(null), 4000);
            }
            lastIdRef.current = charAlerts[0].id;
          }

          setAlerts(charAlerts);
        }
      } catch {
        // Silently fail
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000); // Every 10s for character page
    return () => clearInterval(interval);
  }, [characterSlug]);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Pop-in alert for new trade */}
      {newAlert && (
        <div className="animate-slide-in-left">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
            newAlert.type === 'buy'
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : 'bg-red-500/10 border-red-500/20'
          }`}>
            <span className={`text-lg ${newAlert.type === 'buy' ? '' : ''}`}>
              {newAlert.type === 'buy' ? '🟢' : '🔴'}
            </span>
            <div className="flex-1">
              <p className="text-sm text-white">
                <span className="font-bold">{newAlert.username}</span>
                {' '}just {newAlert.type === 'buy' ? 'bought' : 'sold'}{' '}
                <span className="font-bold font-mono">{newAlert.shares}</span> shares
              </p>
              <p className="text-xs text-slate-400 font-mono">
                ${newAlert.total.toFixed(4)} total
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent trades list */}
      <div className="space-y-1">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Recent Trades</h4>
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${
                alert.type === 'buy' ? 'bg-emerald-500' : 'bg-red-500'
              }`} />
              <span className="text-xs text-slate-400">
                <span className="text-white font-medium">{alert.username || 'Anon'}</span>
                {' '}{alert.type === 'buy' ? 'bought' : 'sold'}{' '}
                <span className="font-mono text-white">{alert.shares}</span>
              </span>
            </div>
            <span className="text-[10px] text-slate-600">{timeAgo(alert.time)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
