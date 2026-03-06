'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Card, Input } from '@/components/ui';
import { usePrivy } from '@privy-io/react-auth';

export default function SettingsPage() {
    const { ready, authenticated, user, logout, linkEmail, linkWallet, linkGoogle } = usePrivy();
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        setSaveSuccess(false);
        // Simulate save
        await new Promise(resolve => setTimeout(resolve, 800));
        setIsSaving(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    };

    if (!ready) {
        return (
            <div className="min-h-screen pt-12 flex justify-center pb-20">
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!authenticated) {
        return (
            <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 to-[#0a0a0f] pointer-events-none" />
                <Card className="max-w-md w-full p-10 text-center border-slate-800 shadow-2xl relative z-10" hover={false}>
                    <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-black text-white mb-3 tracking-tight">Access Locked</h1>
                    <p className="text-slate-400 mb-8 text-lg">Sign in to manage your account settings and preferences.</p>
                    <Link href="/login">
                        <Button size="lg" className="w-full text-lg h-14 shadow-indigo-500/20 shadow-lg">
                            Sign In
                        </Button>
                    </Link>
                </Card>
            </div>
        );
    }

    const preferredEmail = user?.email?.address || '';
    const walletAddress = user?.wallet?.address || '';

    return (
        <div className="min-h-screen pb-20 relative">
            {/* Background Effect */}
            <div className="absolute top-0 left-0 right-0 h-[500px] overflow-hidden -z-10 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/40 via-[#0a0a0f]/80 to-[#0a0a0f] z-10" />
                <div className="absolute top-[-10%] left-[30%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px]" />
            </div>

            <div className="max-w-4xl mx-auto px-6 pt-12">
                <div className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">Settings</h1>
                    <p className="text-xl text-slate-400 font-medium">Manage your linked accounts and preferences</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {/* Navigation Sidebar */}
                    <div className="space-y-2">
                        <button className="w-full text-left px-4 py-3 bg-indigo-500/10 text-indigo-400 font-bold rounded-xl border border-indigo-500/20 flex items-center gap-3">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            Account
                        </button>
                        <button className="w-full text-left px-4 py-3 text-slate-400 font-semibold hover:text-white hover:bg-slate-800/50 rounded-xl transition-colors flex items-center gap-3">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                            Notifications
                        </button>
                        <button className="w-full text-left px-4 py-3 text-slate-400 font-semibold hover:text-white hover:bg-slate-800/50 rounded-xl transition-colors flex items-center gap-3">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            Security
                        </button>
                    </div>

                    {/* Main Content Area */}
                    <div className="md:col-span-2 space-y-6">

                        {/* Linked Accounts */}
                        <Card className="p-6 md:p-8 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-2xl" hover={false}>
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                Linked Accounts
                            </h2>
                            <p className="text-slate-400 text-sm mb-8">
                                Connect multiple accounts to ensure you don&apos;t lose access to your portfolio. Privy handles all connections securely.
                            </p>

                            <div className="space-y-4">
                                {/* Email */}
                                <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">Email Address</p>
                                            <p className="text-sm font-medium text-slate-400">{preferredEmail || 'Not linked'}</p>
                                        </div>
                                    </div>
                                    {!user?.email ? (
                                        <Button variant="secondary" size="sm" onClick={linkEmail}>Connect</Button>
                                    ) : (
                                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20">Connected</span>
                                    )}
                                </div>

                                {/* Google */}
                                <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-2.5">
                                            <svg viewBox="0 0 24 24" className="w-full h-full">
                                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">Google</p>
                                            <p className="text-sm font-medium text-slate-400">{user?.google ? 'Connected' : 'Not linked'}</p>
                                        </div>
                                    </div>
                                    {!user?.google ? (
                                        <Button variant="secondary" size="sm" onClick={linkGoogle}>Connect</Button>
                                    ) : (
                                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20">Connected</span>
                                    )}
                                </div>

                                {/* External Wallet */}
                                <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">Crypto Wallet</p>
                                            <p className="text-sm font-medium text-slate-400 font-mono">
                                                {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not linked'}
                                            </p>
                                        </div>
                                    </div>
                                    {!user?.wallet ? (
                                        <Button variant="secondary" size="sm" onClick={linkWallet}>Connect</Button>
                                    ) : (
                                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20">Connected</span>
                                    )}
                                </div>
                            </div>
                        </Card>

                        {/* Profile Details */}
                        <Card className="p-6 md:p-8 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-2xl" hover={false}>
                            <h2 className="text-xl font-bold text-white mb-6">Profile Details</h2>
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-400 mb-2">Display Name</label>
                                    <Input
                                        placeholder="Anonymous Investor"
                                        className="bg-slate-950/50"
                                    />
                                </div>
                                <div className="pt-2 flex items-center gap-4">
                                    <Button onClick={handleSave} isLoading={isSaving} className="shadow-indigo-500/20 shadow-lg px-8">
                                        Save Changes
                                    </Button>
                                    {saveSuccess && (
                                        <span className="text-sm font-bold text-emerald-400 animate-in fade-in flex items-center gap-2">
                                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            Saved
                                        </span>
                                    )}
                                </div>
                            </div>
                        </Card>

                        {/* Sign Out Card */}
                        <Card className="p-6 md:p-8 bg-slate-900/60 backdrop-blur-xl border border-red-500/10 shadow-2xl" hover={false}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-1">Sign Out</h2>
                                    <p className="text-sm text-slate-400">Log out of your current session on this device.</p>
                                </div>
                                <Button variant="secondary" onClick={logout} className="border-slate-700 hover:border-red-500 hover:text-red-400 whitespace-nowrap">
                                    Sign Out
                                </Button>
                            </div>
                        </Card>

                    </div>
                </div>
            </div>
        </div>
    );
}
