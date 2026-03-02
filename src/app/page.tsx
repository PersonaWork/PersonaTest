import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen pt-20 pb-12 px-6 max-md:ml-0 ml-[240px]">
      {/* Hero Section */}
      <section className="relative max-w-5xl mx-auto text-center py-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-30 select-none pointer-events-none">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-indigo-200 rounded-full blur-3xl animate-pulse-soft"></div>
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-pink-100 rounded-full blur-3xl animate-pulse-soft"></div>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 mb-8">
          <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
          <span className="text-sm font-bold text-indigo-700 uppercase tracking-wider">3 AI Personas Live</span>
        </div>

        <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tight">
          Own the <span className="gradient-text">Future</span><br />
          of Digital Life
        </h1>

        <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
          The first platform where you can own, watch, and earn from AI Characters.
          Shares starting at <span className="font-bold text-indigo-600">$0.10</span>.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/marketplace" className="btn-primary px-10 py-4 text-lg">
            Explore Marketplace
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7 7 7-7 7" /></svg>
          </Link>
          <Link href="/signup" className="btn-secondary px-10 py-4 text-lg">
            Join the Alpha
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
        {[
          { label: 'Live Characters', value: '3', color: 'text-indigo-600' },
          { label: 'Floor Shares', value: '$0.10', color: 'text-pink-500' },
          { label: 'Shares / Persona', value: '1M', color: 'text-blue-500' },
          { label: 'Rev Share', value: '100%', color: 'text-emerald-500' },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-8 text-center group">
            <div className={`text-4xl font-black mb-2 ${stat.color} transition-transform group-hover:scale-110`}>
              {stat.value}
            </div>
            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              {stat.label}
            </div>
          </div>
        ))}
      </section>

      {/* How it Works */}
      <section className="max-w-6xl mx-auto mb-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4">How it Works</h2>
          <p className="text-lg text-slate-500 font-medium tracking-tight">Three steps to the digital frontier.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              id: '01',
              title: 'Secure Your Stake',
              desc: 'Buy shares in upcoming or live AI characters. Own a piece of their digital identity and earnings.',
              icon: '💎'
            },
            {
              id: '02',
              title: 'Watch the Story',
              desc: 'Characters live on-platform 24/7. Watch them interact, evolve, and perform rare scripted events.',
              icon: '🎥'
            },
            {
              id: '03',
              title: 'Earn & Influence',
              desc: 'Get paid revenue from their social posts. Use your shares to vote on their future personality traits.',
              icon: '📈'
            }
          ].map((item, i) => (
            <div key={i} className="glass-card p-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-premium flex items-center justify-center text-3xl mb-8 -mt-16 border border-slate-100">
                {item.icon}
              </div>
              <div className="text-slate-300 font-black text-5xl mb-4 opacity-20 font-display">{item.id}</div>
              <h3 className="text-xl font-bold mb-4">{item.title}</h3>
              <p className="text-slate-500 font-medium leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="max-w-6xl mx-auto glass-card p-12 bg-indigo-600 overflow-hidden relative">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          <div>
            <h2 className="text-3xl font-black text-white mb-2">Ready to enter the Arena?</h2>
            <p className="text-indigo-100 font-medium opacity-80">Join 5,000+ others owning the next generation of social stars.</p>
          </div>
          <Link href="/signup" className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black text-lg shadow-xl hover:scale-105 transition-transform">
            Get Started Now
          </Link>
        </div>
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-white opacity-5 rounded-full blur-3xl"></div>
      </section>
    </div>
  );
}
