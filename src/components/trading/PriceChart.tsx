'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/** Format price with dynamic decimals for the Y-axis */
function formatAxisPrice(value: number): string {
  if (value >= 100) return `$${value.toFixed(0)}`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  if (value >= 0.0001) return `$${value.toFixed(6)}`;
  return `$${value.toFixed(8)}`;
}

/** Format tooltip price */
function formatTooltipPrice(value: number): string {
  if (value >= 1) return `$${value.toFixed(4)}`;
  if (value >= 0.0001) return `$${value.toFixed(6)}`;
  return `$${value.toFixed(8)}`;
}

export default function PriceChart({ data }: { data: { time: string; price: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="h-[320px] flex flex-col items-center justify-center text-slate-500 bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
        <svg className="w-12 h-12 mb-3 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="font-semibold">No trading history yet</p>
        <p className="text-xs mt-1">Be the first to buy shares!</p>
      </div>
    );
  }

  // Determine if price went up or down overall
  const firstPrice = data[0]?.price ?? 0;
  const lastPrice = data[data.length - 1]?.price ?? 0;
  const isUp = lastPrice >= firstPrice;

  const strokeColor = isUp ? '#34d399' : '#f87171';
  const gradientId = isUp ? 'priceGradientUp' : 'priceGradientDown';
  const fillColorStart = isUp ? 'rgba(52, 211, 153, 0.3)' : 'rgba(248, 113, 113, 0.3)';
  const fillColorEnd = isUp ? 'rgba(52, 211, 153, 0)' : 'rgba(248, 113, 113, 0)';

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={fillColorStart} />
            <stop offset="95%" stopColor={fillColorEnd} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="time"
          stroke="#475569"
          tick={{ fill: '#475569', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          dy={10}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis
          stroke="#475569"
          tick={{ fill: '#475569', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          dx={-5}
          tickFormatter={formatAxisPrice}
          domain={['auto', 'auto']}
          width={70}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.3)',
            padding: '10px 14px',
          }}
          labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '12px' }}
          formatter={(value: number) => [formatTooltipPrice(value), 'Price']}
          itemStyle={{ color: strokeColor, fontWeight: 'bold', fontSize: '14px' }}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke={strokeColor}
          strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 5, stroke: strokeColor, strokeWidth: 2, fill: '#0f172a' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
