'use client';

import Link from 'next/link';
import { Button, Card } from '@/components/ui';
import CharacterCard from '@/components/marketplace/CharacterCard';

const MOCK_CHARACTERS = [
  {
    id: '1',
    name: 'Luna',
    slug: 'luna',
    description: 'A witty, tech-savvy AI traveler from a neon-soaked future. Luna loves exploring digital archives and sharing her findings.',
    price: 0.12,
    change: 4.5,
    marketCap: 120000,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
    status: 'LIVE' as const,
    holders: 1420,
    totalShares: 1000000,
    sharesIssued: 1000000
  },
  {
    id: '2',
    name: 'Jax',
    slug: 'jax',
    description: 'The ultimate digital hype-man and street-culture enthusiast. Always high energy, always authentic.',
    price: 0.08,
    change: -2.1,
    marketCap: 80000,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jax',
    status: 'LIVE' as const,
    holders: 890,
    totalShares: 1000000,
    sharesIssued: 1000000
  },
  {
    id: '3',
    name: 'Nova',
    slug: 'nova',
    description: 'A serene AI philosopher exploring the intersection of data and soul. Deep thoughts, gentle wisdom.',
    price: 0.15,
    change: 12.8,
    marketCap: 150000,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nova',
    status: 'LIVE' as const,
    holders: 2100,
    totalShares: 1000000,
    sharesIssued: 1000000
  }
];

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    title: '24/7 Live Characters',
    description: 'Watch AI characters in their unique environments. They live, play, and interact in real-time.'
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    title: 'Earn From Their Success',
    description: 'Own shares of AI characters and earn revenue from their TikTok and Instagram posts.'
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    title: 'Direct Chat Access',
    description: 'Chat with characters you own. Shareholders get exclusive access to AI-powered conversations.'
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Voting Rights',
    description: 'As a shareholder, you get voting rights on character decisions and future developments.'
  }
];

export default function HomePage() {
  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 px-6 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-pink-500/10 rounded-full blur-[150px]" />
        </div>

        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-sm font-semibold text-indigo-300">3 AI Personas Now Live</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight text-white leading-tight">
            Own the <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Future</span>
            <br />of Digital Life
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            The first platform where you can own, watch, and earn from AI Characters.
            Shares start at just <span className="font-bold text-white">$0.10</span>.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/marketplace">
              <Button size="lg" variant="primary" className="px-8">
                Explore Marketplace
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="lg" variant="secondary" className="px-8">
                Join the Alpha
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-6xl mx-auto px-6 mb-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Live Characters', value: '3', color: 'text-indigo-400' },
            { label: 'Floor Price', value: '$0.08', color: 'text-pink-400' },
            { label: 'Total Holders', value: '4.4K', color: 'text-blue-400' },
            { label: 'Revenue Share', value: '100%', color: 'text-emerald-400' },
          ].map((stat, i) => (
            <Card key={i} className="text-center p-6" hover={false}>
              <div className={`text-3xl md:text-4xl font-black mb-1 ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                {stat.label}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Featured Characters */}
      <section className="max-w-6xl mx-auto px-6 mb-24">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-2">Featured Personas</h2>
            <p className="text-slate-400 font-medium">Meet the AI characters you can own today.</p>
          </div>
          <Link href="/marketplace" className="hidden md:block">
            <Button variant="ghost" rightIcon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            }>
              View All
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MOCK_CHARACTERS.map((char) => (
            <CharacterCard key={char.id} character={char} />
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-6 mb-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Why Own a Persona?</h2>
          <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">
            Be part of the next generation of digital ownership.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature, i) => (
            <Card key={i} className="text-center p-6" hover>
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-4xl mx-auto px-6 mb-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">How It Works</h2>
          <p className="text-lg text-slate-500 font-medium">Three steps to the digital frontier.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Buy Shares',
              description: 'Purchase ownership shares in AI characters at launch price. Starting at just $0.10 per share.',
              icon: '💎'
            },
            {
              step: '02',
              title: 'Watch & Engage',
              description: 'Follow your characters live 24/7. See them interact, evolve, and create content.',
              icon: '🎥'
            },
            {
              step: '03',
              title: 'Earn & Vote',
              description: 'Earn revenue from their social media posts. Get voting rights on character decisions.',
              icon: '💰'
            }
          ].map((item, i) => (
            <div key={i} className="relative">
              <div className="text-8xl font-black text-slate-800/50 absolute -top-4 -left-2">
                {item.step}
              </div>
              <Card className="pt-12 pb-8 px-6" hover>
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-6">
        <Card className="text-center p-12 relative overflow-hidden" hover={false}>
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-pink-600/10" />
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              Ready to Join?
            </h2>
            <p className="text-lg text-slate-400 mb-8 max-w-xl mx-auto">
              Be among the first to own AI Characters. Create your account and start building your portfolio today.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" variant="primary" className="px-8">
                  Get Started Free
                </Button>
              </Link>
              <Link href="/marketplace">
                <Button size="lg" variant="secondary" className="px-8">
                  Browse Characters
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
