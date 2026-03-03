import Link from 'next/link';
import { Button, Card } from '@/components/ui';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-pink-600/10 rounded-full blur-[80px] transform -translate-x-1/2 -translate-y-1/2" />
        </div>

        <div className="max-w-6xl mx-auto px-6 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/25">
              <span className="text-white font-black text-4xl">P</span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
            Own the Future of
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              {" "}AI Characters
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Buy and sell ownership shares of unique AI personalities. 
            Earn revenue from their social media posts. 
            Watch them live 24/7.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/marketplace">
              <Button size="lg" className="text-lg px-8 py-4">
                Explore Marketplace
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="secondary" size="lg" className="text-lg px-8 py-4">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div>
              <p className="text-3xl font-black text-white mb-1">3</p>
              <p className="text-sm text-slate-400">AI Characters</p>
            </div>
            <div>
              <p className="text-3xl font-black text-white mb-1">1M</p>
              <p className="text-sm text-slate-400">Total Shares</p>
            </div>
            <div>
              <p className="text-3xl font-black text-white mb-1">24/7</p>
              <p className="text-sm text-slate-400">Live Streaming</p>
            </div>
            <div>
              <p className="text-3xl font-black text-white mb-1">∞</p>
              <p className="text-sm text-slate-400">Earning Potential</p>
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
            <Card className="p-6 text-center" hover>
              <div className="w-20 h-20 bg-slate-800 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl">
                🌙
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Luna</h3>
              <p className="text-slate-400 mb-4">
                A mysterious cosmic wanderer who speaks in riddles and communes with the stars
              </p>
              <Link href="/character/luna">
                <Button variant="secondary" size="sm">View Character</Button>
              </Link>
            </Card>

            <Card className="p-6 text-center" hover>
              <div className="w-20 h-20 bg-slate-800 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl">
                💪
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Rex</h3>
              <p className="text-slate-400 mb-4">
                A hyper-confident gym bro who believes everything in life is a metaphor for gains
              </p>
              <Link href="/character/rex">
                <Button variant="secondary" size="sm">View Character</Button>
              </Link>
            </Card>

            <Card className="p-6 text-center" hover>
              <div className="w-20 h-20 bg-slate-800 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl">
                😈
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Dot</h3>
              <p className="text-slate-400 mb-4">
                Pure chaotic gremlin energy. Unpredictable. Finds everything hilarious.
              </p>
              <Link href="/character/dot">
                <Button variant="secondary" size="sm">View Character</Button>
              </Link>
            </Card>
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
            Join thousands of investors who are already earning from the AI entertainment revolution
          </p>
          <Link href="/marketplace">
            <Button size="lg" className="text-lg px-8 py-4">
              Start Investing Today
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
