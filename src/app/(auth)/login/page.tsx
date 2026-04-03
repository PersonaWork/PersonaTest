'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { Button } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isAuthenticated, isLoading, login } = useAuth();

    const redirect = searchParams.get('redirect') || '/marketplace';

    useEffect(() => {
        if (isAuthenticated && !isLoading) {
            router.push(redirect);
        }
    }, [isAuthenticated, isLoading, redirect, router]);

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 page-enter">
            {/* Background */}
            <div className="fixed inset-0 -z-10 overflow-hidden">
                <div className="orb orb-indigo w-[600px] h-[600px] top-0 left-[15%]" />
                <div className="orb orb-purple w-[500px] h-[500px] bottom-0 right-[15%]" />
                <div className="orb orb-pink w-[400px] h-[400px] top-[40%] left-[40%]" />
            </div>

            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-3">
                        <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <span className="text-white font-black text-3xl">P</span>
                        </div>
                    </Link>
                </div>

                <div className="glass-card p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-black text-white mb-3">Welcome to Persona</h1>
                        <p className="text-slate-400 font-medium text-lg">
                            Own AI characters. Watch them live. Earn revenue.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <Button
                            onClick={login}
                            className="w-full"
                            size="lg"
                        >
                            Sign In
                        </Button>

                        <p className="text-center text-sm text-slate-500">
                            We&apos;ll send a verification code to your email
                        </p>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-lg font-black text-white">24/7</p>
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Live AI</p>
                            </div>
                            <div>
                                <p className="text-lg font-black text-white">100%</p>
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Rev Share</p>
                            </div>
                            <div>
                                <p className="text-lg font-black text-white">1+</p>
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Share = Chat</p>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="mt-6 text-center text-xs text-slate-600">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
