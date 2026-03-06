'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useState } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useAuth } from '@/lib/auth/auth-context';
import Link from 'next/link';

interface WalletConnectProps {
    onConnect?: () => void;
    onDisconnect?: () => void;
    showBalance?: boolean;
    compact?: boolean;
}

export default function WalletConnect({
    onConnect: _onConnect,
    onDisconnect,
    showBalance: _showBalance = false,
    compact = false
}: WalletConnectProps) {
    const { user: authUser } = useAuth();
    const {
        ready,
        user: privyUser,
        logout
    } = usePrivy();

    const [isLoading, setIsLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    // Get wallet address from Privy (only if user has created a wallet)
    const wallet = privyUser?.wallet;
    const address = wallet?.address;
    const formattedAddress = address
        ? `${address.slice(0, 6)}...${address.slice(-4)}`
        : null;

    // If not logged in with Supabase, show login button
    if (!authUser) {
        return (
            <Link href="/login">
                <Button
                    variant="primary"
                    size={compact ? 'sm' : 'md'}
                    leftIcon={
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            <path d="M9 12l2 2 4-4" />
                        </svg>
                    }
                >
                    {compact ? 'Sign In' : 'Sign In'}
                </Button>
            </Link>
        );
    }

    // User is logged in but no wallet yet - show create wallet button
    if (!address) {
        return (
            <Link href="/fund">
                <Button
                    variant="secondary"
                    size={compact ? 'sm' : 'md'}
                    leftIcon={
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    }
                >
                    {compact ? 'Add Wallet' : 'Create Wallet'}
                </Button>
            </Link>
        );
    }

    const handleLogout = async () => {
        setIsLoading(true);
        try {
            await logout();
            onDisconnect?.();
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            setIsLoading(false);
            setShowDropdown(false);
        }
    };

    // Loading state while checking Privy
    if (!ready) {
        return (
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-800 animate-pulse" />
                {!compact && <div className="h-4 w-20 bg-slate-800 rounded animate-pulse" />}
            </div>
        );
    }

    // Connected - show wallet info
    return (
        <div className="relative">
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className={`
                    flex items-center gap-3 rounded-xl transition-all duration-200
                    ${compact
                        ? 'p-2 bg-slate-800/50 hover:bg-slate-800'
                        : 'px-4 py-2.5 bg-slate-800/80 border border-slate-700 hover:border-indigo-500/30'
                    }
                `}
            >
                {/* Status indicator */}
                <div className="relative">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-50" />
                </div>

                {!compact && (
                    <span className="text-sm font-medium text-slate-200">
                        {formattedAddress}
                    </span>
                )}

                {/* Dropdown arrow */}
                <svg
                    className={`w-4 h-4 text-slate-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown menu */}
            {showDropdown && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowDropdown(false)}
                    />
                    <Card
                        className="absolute right-0 top-full mt-2 w-64 z-50 p-0 overflow-hidden"
                        padding="none"
                        hover={false}
                    >
                        <div className="p-4 border-b border-slate-800">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Connected Wallet</p>
                            <p className="text-sm font-mono text-white break-all">{address}</p>
                        </div>

                        <div className="p-2">
                            <button
                                onClick={handleLogout}
                                disabled={isLoading}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Disconnect Wallet
                            </button>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}

// Compact version for sidebar
export function WalletIndicator() {
    const { user: authUser } = useAuth();
    const { user: privyUser } = usePrivy();
    const address = privyUser?.wallet?.address;

    if (!authUser) {
        return (
            <Link href="/login">
                <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/30 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-600" />
                        <span className="text-xs font-medium text-slate-500">Sign in</span>
                    </div>
                </div>
            </Link>
        );
    }

    if (!address) {
        return (
            <Link href="/fund">
                <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/30 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-xs font-medium text-slate-300">Create wallet</span>
                    </div>
                </div>
            </Link>
        );
    }

    return (
        <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/30 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
                <div className="relative">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-50" />
                </div>
                <span className="text-xs font-medium text-slate-300">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
            </div>
        </div>
    );
}
