import Link from 'next/link';

const MOCK_CHARACTERS = [
    {
        id: '1',
        name: 'Luna',
        slug: 'luna',
        description: 'A witty, tech-savvy AI traveler from a neon-soaked future.',
        price: 0.12,
        change: 4.5,
        marketCap: 120000,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
        status: 'LIVE'
    },
    {
        id: '2',
        name: 'Jax',
        slug: 'jax',
        description: 'The ultimate digital hype-man and street-culture enthusiast.',
        price: 0.08,
        change: -2.1,
        marketCap: 80000,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jax',
        status: 'LIVE'
    },
    {
        id: '3',
        name: 'Nova',
        slug: 'nova',
        description: 'A serene AI philosopher exploring the intersection of data and soul.',
        price: 0.15,
        change: 12.8,
        marketCap: 150000,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nova',
        status: 'DROPPING SOON'
    }
];

export default function MarketplacePage() {
    return (
        <div className="min-h-screen pt-24 pb-12 px-6 ml-[240px] max-md:ml-0">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-5xl font-black mb-4">Marketplace</h1>
                        <p className="text-slate-500 font-medium">Discover and own the next generation of digital icons.</p>
                    </div>

                    <div className="flex gap-2">
                        <button className="px-4 py-2 rounded-xl bg-white border border-slate-200 font-bold text-sm text-slate-600 shadow-sm hover:border-indigo-200 transition-all">
                            Top Gainers
                        </button>
                        <button className="px-4 py-2 rounded-xl bg-white border border-slate-200 font-bold text-sm text-slate-600 shadow-sm hover:border-indigo-200 transition-all">
                            Recently Added
                        </button>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {MOCK_CHARACTERS.map((char) => (
                        <Link key={char.id} href={`/character/${char.slug}`} className="no-underline group">
                            <div className="glass-card overflow-hidden flex flex-col h-full border-indigo-50/50">
                                {/* Image/Status Area */}
                                <div className="relative h-48 bg-slate-50 flex items-center justify-center p-8 overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-pink-50/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <img
                                        src={char.avatar}
                                        alt={char.name}
                                        className="w-32 h-32 relative z-10 transition-transform duration-500 group-hover:scale-110"
                                    />

                                    <div className="absolute top-4 right-4">
                                        {char.status === 'LIVE' ? (
                                            <div className="live-badge">
                                                <span className="live-dot"></span>
                                                Live
                                            </div>
                                        ) : (
                                            <div className="px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest border border-amber-100">
                                                {char.status}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Content Area */}
                                <div className="p-8 flex flex-col flex-1">
                                    <div className="flex justify-between items-start mb-4">
                                        <h2 className="text-2xl font-black text-slate-900">{char.name}</h2>
                                        <div className="text-right">
                                            <div className="text-xl font-black text-indigo-600">${char.price}</div>
                                            <div className={`text-xs font-bold ${char.change >= 0 ? 'text-emerald-500' : 'text-pink-500'}`}>
                                                {char.change >= 0 ? '+' : ''}{char.change}%
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8 flex-1">
                                        {char.description}
                                    </p>

                                    <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                                        <div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Market Cap</div>
                                            <div className="text-sm font-bold text-slate-700">${char.marketCap.toLocaleString()}</div>
                                        </div>

                                        <div className="btn-primary py-2 px-6 rounded-xl scale-90 group-hover:scale-100 origin-right transition-transform">
                                            View Profile
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
