'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PriceChart({ data }: { data: { time: string; price: number }[] }) {
    if (data.length === 0) {
        return (
            <div className="h-[320px] flex flex-col items-center justify-center text-slate-500 bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
                <svg className="w-12 h-12 mb-3 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p>No trading history yet</p>
                <p className="text-xs mt-1">Be the first to buy shares!</p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis
                    dataKey="time"
                    stroke="#64748b"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                />
                <YAxis
                    stroke="#64748b"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    dx={-10}
                    tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                    itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                />
                <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#818cf8"
                    strokeWidth={3}
                    dot={{ fill: '#818cf8', strokeWidth: 2, r: 4, stroke: '#0f172a' }}
                    activeDot={{ r: 6, stroke: '#c7d2fe', strokeWidth: 2 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
