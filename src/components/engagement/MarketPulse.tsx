'use client';

import { useState, useEffect } from 'react';

interface PulseData {
  hourlyTrades: number;
  recentTrades: number;
  hourlyVolume: number;
  heat: 'cold' | 'warm' | 'hot' | 'fire';
}

const heatConfig = {
  cold: {
    label: 'Quiet',
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
    icon: '❄️',
    pulseSpeed: 'duration-[3000ms]',
  },
  warm: {
    label: 'Active',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: '🔥',
    pulseSpeed: 'duration-[1500ms]',
  },
  hot: {
    label: 'Hot',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    icon: '🔥',
    pulseSpeed: 'duration-[800ms]',
  },
  fire: {
    label: 'On Fire!',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    icon: '🚀',
    pulseSpeed: 'duration-[400ms]',
  },
};

export default function MarketPulse({ className = '' }: { className?: string }) {
  const [pulse, setPulse] = useState<PulseData | null>(null);

  useEffect(() => {
    const fetchPulse = async () => {
      try {
        const res = await fetch('/api/activity/pulse');
        const data = await res.json();
        if (data.data) {
          setPulse(data.data);
        }
      } catch {
        // Silently fail
      }
    };

    fetchPulse();
    const interval = setInterval(fetchPulse, 20000); // Every 20s
    return () => clearInterval(interval);
  }, []);

  if (!pulse) return null;

  const config = heatConfig[pulse.heat];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Heartbeat indicator */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg} border ${config.border}`}>
        {/* Animated pulse bars */}
        <div className="flex items-end gap-[2px] h-3">
          {[0.4, 0.7, 1, 0.6, 0.3].map((scale, i) => (
            <div
              key={i}
              className={`w-[3px] rounded-full ${config.color} transition-all ${config.pulseSpeed}`}
              style={{
                height: `${scale * 12}px`,
                backgroundColor: 'currentColor',
                animation: `pulse-bar ${pulse.heat === 'fire' ? '0.4s' : pulse.heat === 'hot' ? '0.8s' : '1.5s'} ease-in-out ${i * 0.1}s infinite alternate`,
              }}
            />
          ))}
        </div>

        <span className={`text-xs font-bold ${config.color}`}>
          {config.icon} {config.label}
        </span>
      </div>

      {/* Quick stats */}
      <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500">
        <span className="font-mono tabular-nums">
          <span className="text-white font-bold">{pulse.hourlyTrades}</span> trades/hr
        </span>
        <span className="font-mono tabular-nums">
          <span className="text-white font-bold">${pulse.hourlyVolume.toFixed(2)}</span> vol
        </span>
      </div>
    </div>
  );
}
