import Link from 'next/link';
import { Button, Card } from '@/components/ui';
import { prisma } from '@/lib/prisma';

export const revalidate = 60; // Revalidate every 60 seconds

async function getHomeData() {
  try {
    const [characters, characterCount, holderCount] = await Promise.all([
      prisma.character.findMany({
        take: 6,
        orderBy: { marketCap: 'desc' },
        select: {
          name: true,
          slug: true,
          description: true,
          currentPrice: true,
          marketCap: true,
          totalShares: true,
          sharesIssued: true,
          thumbnailUrl: true,
        },
      }),
      prisma.character.count(),
      prisma.holding.groupBy({ by: ['userId'] }).then((r) => r.length),
    ]);

    return { characters, characterCount, holderCount };
  } catch (error) {
    console.error('prisma:error', error instanceof Error ? error.message : error);
    // Return empty data so the build doesn't crash
    return { characters: [], characterCount: 0, holderCount: 0 };
  }
}

export default async function HomePage() {
  const { characters, characterCount, holderCount } = await getHomeData();

  // Take top 2 for "live now" preview
  const liveCharacters = characters.slice(0, 2);
  // Take top 3 for "meet the characters" section
  const featuredCharacters = characters.slice(0, 3);

  return (
    <div className="min-h-screen">
      {/* Social proof bar */}
      <div className="border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-400">
            Live now:
            <span className="text-white"> {characterCount} persona{characterCount !== 1 ? 's' : ''}</span>
            <span className="text-slate-500"> &bull; </span>
            <span className="text-white">{holderCount.toLocaleString()} holder{holderCount !== 1 ? 's' : ''}</span>
            <span className="text-slate-500"> &bull; </span>
            <span className="text-white">100% revenue share</span>
          </p>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-widest">Watching Live</span>
            </span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-[700px] h-[700px] bg-indigo-600/20 rounded-full blur-[140px]" />
          <div className="absolute bottom-0 right-1/4 w-[650px] h-[650px] bg-purple-600/15 rounded-full blur-[130px]" />
          <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-pink-600/10 rounded-full blur-[110px] transform -translate-x-1/2 -translate-y-1/2" />
        </div>

        <div className="max-w-6xl mx-auto px-6 pt-16 pb-14">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6">
                <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Social investing meets live AI</span>
              </div>

              <h1 className="text-5xl md:text-6xl font-black text-white leading-tight">
                Own the
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"> next</span>
                <br />
                creator you can actually watch.
              </h1>

              <p className="mt-5 text-lg md:text-xl text-slate-300 leading-relaxed">
                Buy shares of AI personas, watch them live 24/7, and earn revenue when they post.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link href="/signup" className="w-full sm:w-auto">
                  <Button size="lg" className="text-base px-7 py-4 w-full sm:w-auto">
                    Create account
                  </Button>
                </Link>
                <Link href="/marketplace" className="w-full sm:w-auto">
                  <Button variant="secondary" size="lg" className="text-base px-7 py-4 w-full sm:w-auto">
                    Watch live now
                  </Button>
                </Link>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <p className="text-2xl font-black text-white">24/7</p>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Live</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <p className="text-2xl font-black text-white">100%</p>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Revenue share</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <p className="text-2xl font-black text-white">1+</p>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Share = chat</p>
                </div>
              </div>
            </div>

            {/* Right: live preview cards */}
            <div className="space-y-4">
              <Card className="p-6" hover={false}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Live now</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {liveCharacters.map((c) => (
                    <Link key={c.slug} href={`/character/${c.slug}`} className="group">
                      <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-white">{c.name}</p>
                            <p className="text-xs text-slate-500">${(c.currentPrice ?? 0).toFixed(2)} USDC</p>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden relative">
                            {c.thumbnailUrl ? (
                              <img src={c.thumbnailUrl} alt={c.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xl">{c.name[0]}</span>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          Live
                          <span className="text-slate-600">&bull;</span>
                          Tap to watch
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>

              <Card className="p-6" hover={false}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Get your first win</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  {[{
                    step: '1',
                    title: 'Create account',
                    desc: 'Instant embedded wallet',
                  }, {
                    step: '2',
                    title: 'Deposit USDC',
                    desc: 'Base network',
                  }, {
                    step: '3',
                    title: 'Buy 1 share',
                    desc: 'Unlock chat',
                  }].map((s) => (
                    <div key={s.step} className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800">
                      <div className="w-7 h-7 rounded-full bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-xs font-black text-indigo-300">
                        {s.step}
                      </div>
                      <p className="mt-3 text-sm font-bold text-white">{s.title}</p>
                      <p className="text-xs text-slate-500">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Why Choose Persona?
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              The revolutionary platform where AI entertainment meets investment opportunities
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 text-center" hover>
              <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Unique AI Personalities</h3>
              <p className="text-slate-400">
                Each character has their own personality, backstory, and behavior patterns.
                From cosmic mystics to gym bros, find characters that match your vibe.
              </p>
            </Card>

            <Card className="p-8 text-center" hover>
              <div className="w-16 h-16 bg-gradient-to-tr from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Real Revenue Sharing</h3>
              <p className="text-slate-400">
                Characters create content on TikTok and Instagram.
                As a shareholder, you earn proportional revenue from every post.
              </p>
            </Card>

            <Card className="p-8 text-center" hover>
              <div className="w-16 h-16 bg-gradient-to-tr from-pink-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">📺</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">24/7 Live Entertainment</h3>
              <p className="text-slate-400">
                Watch your characters live in their environments.
                They perform actions, interact, and evolve based on community engagement.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Characters Preview */}
      <section className="py-20 px-6 bg-slate-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Meet the Characters
            </h2>
            <p className="text-xl text-slate-400">
              Get to know some of our most popular AI personalities
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {featuredCharacters.map((c) => (
              <Card key={c.slug} className="p-6 text-center" hover>
                <div className="w-20 h-20 bg-slate-800 rounded-full mx-auto mb-4 overflow-hidden relative shadow-lg shadow-indigo-500/10">
                  {c.thumbnailUrl ? (
                    <img src={c.thumbnailUrl} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">{c.name[0]}</div>
                  )}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{c.name}</h3>
                <p className="text-slate-400 mb-2 line-clamp-2">
                  {c.description}
                </p>
                <p className="text-sm font-semibold text-indigo-400 mb-4">
                  ${(c.currentPrice ?? 0).toFixed(2)} USDC &bull; {(c.sharesIssued ?? 0).toLocaleString()} shares issued
                </p>
                <Link href={`/character/${c.slug}`}>
                  <Button variant="secondary" size="sm">View Character</Button>
                </Link>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Link href="/marketplace">
              <Button size="lg">View All Characters</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
            Ready to Own Your First AI Character?
          </h2>
          <p className="text-xl text-slate-400 mb-8">
            Join the investors who are already earning from the AI entertainment revolution
          </p>
          <Link href="/marketplace">
            <Button size="lg" className="text-lg px-8 py-4">
              Start Investing Today
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} Persona. All rights reserved.</p>
          <div className="flex items-center gap-6 text-xs text-slate-600">
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/risk-disclaimer" className="hover:text-white transition-colors">Risk Disclaimer</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
