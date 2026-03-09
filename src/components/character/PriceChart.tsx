'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui';

interface PricePoint {
  time: string;
  price: number;
}

type Period = '1d' | '7d' | '30d' | 'all';

const PERIODS: { value: Period; label: string }[] = [
  { value: '1d', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: 'all', label: 'All' },
];

export default function PriceChart({ slug }: { slug: string }) {
  const [points, setPoints] = useState<PricePoint[]>([]);
  const [period, setPeriod] = useState<Period>('7d');
  const [loading, setLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/characters/${slug}/price-history?period=${period}`);
      if (!res.ok) throw new Error('fetch failed');
      const json = await res.json();
      const data = json.data || json;
      setPoints(data.points || []);
    } catch {
      setPoints([]);
    } finally {
      setLoading(false);
    }
  }, [slug, period]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const { pathD, areaD, minPrice, maxPrice, priceRange, chartPoints } = useMemo(() => {
    if (points.length < 2) {
      return { pathD: '', areaD: '', minPrice: 0, maxPrice: 0, priceRange: 0, chartPoints: [] };
    }

    const prices = points.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 0.01; // Prevent division by zero

    const W = 600;
    const H = 200;
    const padY = 16;

    const pts = points.map((p, i) => {
      const x = (i / (points.length - 1)) * W;
      const y = padY + (1 - (p.price - min) / range) * (H - padY * 2);
      return { x, y, ...p };
    });

    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const area = `${line} L ${W} ${H} L 0 ${H} Z`;

    return { pathD: line, areaD: area, minPrice: min, maxPrice: max, priceRange: range, chartPoints: pts };
  }, [points]);

  const currentPrice = points.length > 0 ? points[points.length - 1].price : 0;
  const startPrice = points.length > 0 ? points[0].price : 0;
  const change = startPrice > 0 ? ((currentPrice - startPrice) / startPrice) * 100 : 0;
  const isPositive = change >= 0;

  const displayPrice = hoveredIndex !== null && chartPoints[hoveredIndex]
    ? chartPoints[hoveredIndex].price
    : currentPrice;

  const displayTime = hoveredIndex !== null && chartPoints[hoveredIndex]
    ? new Date(chartPoints[hoveredIndex].time).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null;

  const strokeColor = isPositive ? '#34d399' : '#f87171';
  const fillColor = isPositive ? 'rgba(52, 211, 153, 0.08)' : 'rgba(248, 113, 113, 0.08)';

  return (
    <Card className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 overflow-hidden" hover={false} padding="none">
      <div className="p-5 pb-2">
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Share Price</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-white">${displayPrice.toFixed(4)}</p>
              <span className={`text-sm font-bold px-2 py-0.5 rounded-md ${
                isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
              }`}>
                {isPositive ? '+' : ''}{change.toFixed(2)}%
              </span>
            </div>
            {displayTime && (
              <p className="text-xs text-slate-500 mt-1">{displayTime}</p>
            )}
          </div>

          {/* Period toggles */}
          <div className="flex bg-slate-950/60 rounded-lg p-0.5 border border-slate-800">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  period === p.value
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 pb-3">
        {loading ? (
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500" />
          </div>
        ) : points.length < 2 ? (
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-sm text-slate-500">No trading activity yet</p>
          </div>
        ) : (
          <svg
            viewBox="0 0 600 200"
            className="w-full h-[200px]"
            preserveAspectRatio="none"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient id={`grad-${slug}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity="0.15" />
                <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map((pct) => (
              <line
                key={pct}
                x1="0"
                y1={16 + pct * 168}
                x2="600"
                y2={16 + pct * 168}
                stroke="rgba(148,163,184,0.06)"
                strokeWidth="1"
              />
            ))}

            {/* Area fill */}
            <path d={areaD} fill={`url(#grad-${slug})`} />

            {/* Price line */}
            <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

            {/* Hover dots — invisible hit areas */}
            {chartPoints.map((pt, i) => (
              <rect
                key={i}
                x={pt.x - (300 / points.length)}
                y="0"
                width={600 / points.length}
                height="200"
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(i)}
              />
            ))}

            {/* Hovered point indicator */}
            {hoveredIndex !== null && chartPoints[hoveredIndex] && (
              <>
                <line
                  x1={chartPoints[hoveredIndex].x}
                  y1="0"
                  x2={chartPoints[hoveredIndex].x}
                  y2="200"
                  stroke="rgba(148,163,184,0.2)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <circle
                  cx={chartPoints[hoveredIndex].x}
                  cy={chartPoints[hoveredIndex].y}
                  r="5"
                  fill={strokeColor}
                  stroke="#0f172a"
                  strokeWidth="2"
                />
              </>
            )}

            {/* Price labels */}
            <text x="4" y="14" fontSize="10" fill="rgba(148,163,184,0.4)" fontFamily="monospace">
              ${maxPrice.toFixed(4)}
            </text>
            <text x="4" y="196" fontSize="10" fill="rgba(148,163,184,0.4)" fontFamily="monospace">
              ${minPrice.toFixed(4)}
            </text>
          </svg>
        )}
      </div>
    </Card>
  );
}
