'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { Button } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';

function SignupContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isAuthenticated, isLoading, login } = useAuth();
    const refCode = searchParams.get('ref');

    useEffect(() => {
        // Store referral code in localStorage so we can apply it after signup
        if (refCode) {
            localStorage.setItem('persona_referral_code', refCode);
        }
    }, [refCode]);

    useEffect(() => {
        if (isAuthenticated && !isLoading) {
            router.push('/marketplace');
        }
    }, [isAuthenticated, isLoading, router]);

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 page-enter">
            {/* Background */}
            <div className="fixed inset-0 -z-10 overflow-hidden">
                <div className="orb orb-purple w-[600px] h-[600px] top-0 right-[15%]" />
                <div className="orb orb-indigo w-[500px] h-[500px] bottom-0 left-[15%]" />
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
                        <h1 className="text-3xl font-black text-white mb-3">Join Persona</h1>
                        <p className="text-slate-400 font-medium text-lg">
                            Start owning AI characters in seconds.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center text-sm font-black text-indigo-300">1</div>
                                <div>
                                    <p className="text-sm font-semibold text-white">Enter your email</p>
                                    <p className="text-xs text-slate-500">We&apos;ll send you a verification code</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center text-sm font-black text-indigo-300">2</div>
                                <div>
                                    <p className="text-sm font-semibold text-white">Get an embedded wallet</p>
                                    <p className="text-xs text-slate-500">Created automatically for you</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center text-sm font-black text-indigo-300">3</div>
                                <div>
                                    <p className="text-sm font-semibold text-white">Buy your first share</p>
                                    <p className="text-xs text-slate-500">Unlock chat & earn revenue</p>
                                </div>
                            </div>
                        </div>

                        {refCode && (
                            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                <p className="text-xs text-indigo-300 font-semibold text-center">
                                    Referred by a friend? Your referral code <span className="font-mono">{refCode}</span> will be applied automatically.
                                </p>
                            </div>
                        )}

                        <Button
                            onClick={login}
                            className="w-full"
                            size="lg"
                        >
                            Create Account
                        </Button>
                    </div>

                    <p className="mt-6 text-center text-sm text-slate-500">
                        Already have an account?{' '}
                        <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold">
                            Sign in
                        </Link>
                    </p>
                </div>

                <p className="mt-6 text-center text-xs text-slate-600">
                    By creating an account, you agree to our Terms of Service and Privacy Policy
                </p>
            </div>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" /></div>}>
            <SignupContent />
        </Suspense>
    );
}
