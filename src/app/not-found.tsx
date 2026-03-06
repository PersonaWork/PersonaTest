import Link from 'next/link';
import { Button, Card } from '@/components/ui';

export default function NotFound() {
    return (
        <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-6 bg-[#0a0a0f] relative overflow-hidden">
            {/* Background Effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

            <Card className="max-w-md w-full p-10 text-center border-slate-800 shadow-2xl relative z-10" hover={false}>
                <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-purple-600 mb-6 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                    404
                </div>

                <h1 className="text-2xl font-bold text-white mb-3">Signal Lost</h1>
                <p className="text-slate-400 mb-8 leading-relaxed">
                    The page you&apos;re looking for has been archived, moved, or never existed on our servers.
                </p>

                <div className="space-y-4">
                    <Link href="/marketplace" className="block">
                        <Button size="lg" className="w-full h-14 text-lg shadow-indigo-500/20 shadow-lg group">
                            Explore Characters
                            <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </Button>
                    </Link>
                    <Link href="/" className="block">
                        <Button size="lg" variant="secondary" className="w-full h-14 text-lg">
                            Return Home
                        </Button>
                    </Link>
                </div>
            </Card>

            <div className="mt-12 text-slate-600 font-mono text-xs uppercase tracking-widest text-center">
                Error 404 • Destination Unknown
            </div>
        </div>
    );
}
