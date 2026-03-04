'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import Link from 'next/link';
import { Button, Card } from '@/components/ui';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Global Error Boundary caught an error:', error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a0a0f] relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />

            <Card className="max-w-md w-full p-8 text-center border-red-500/20 shadow-2xl relative z-10" hover={false}>
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>

                <h2 className="text-3xl font-black text-white mb-3 tracking-tight">System Fault</h2>
                <p className="text-slate-400 mb-8 text-lg">
                    We encountered an unexpected error while loading this page. Our systems have logged the issue.
                </p>

                <div className="space-y-3">
                    <Button
                        onClick={() => reset()}
                        size="lg"
                        className="w-full text-lg h-14 bg-red-600 hover:bg-red-500 shadow-red-500/20 shadow-lg border-none"
                    >
                        Attempt Recovery
                    </Button>

                    <Link href="/" className="block">
                        <Button size="lg" variant="secondary" className="w-full text-lg h-14">
                            Return Home
                        </Button>
                    </Link>
                </div>

                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-6 p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-left overflow-x-auto">
                        <p className="text-xs font-mono text-red-400 font-bold mb-1">Developer Details:</p>
                        <p className="text-xs font-mono text-slate-400 break-all">{error.message}</p>
                    </div>
                )}
            </Card>
        </div>
    );
}
