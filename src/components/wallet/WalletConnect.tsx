'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useState } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface WalletConnectProps {
    onConnect?: () => void;
    onDisconnect?: () => void;
    showBalance?: boolean;
    compact?: boolean;
}

export default function WalletConnect({
    onConnect,
    onDisconnect,
    showBalance = false,
    compact = false
}: WalletConnectProps) {
    const {
        ready,
        authenticated,
        user,
        login,
        logout
    } = usePrivy();

    const [isLoading, setIsLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    // Get wallet address
    const wallet = user?.wallet;
    const address = wallet?.address;
    const formattedAddress = address
        ? `${address.slice(0, 6)}...${address.slice(-4)}`
        : null;

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            await login();
            onConnect?.();
        } catch (error) {
            console.error('Login failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

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

    // Not ready yet - show loading state
    if (!ready) {
        return (
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-800 animate-pulse" />
                {!compact && <div className="h-4 w-20 bg-slate-800 rounded animate-pulse" />}
            </div>
        );
    }

    // Not authenticated - show connect button
    if (!authenticated) {
        return (
            <Button
                onClick={handleLogin}
                isLoading={isLoading}
                variant="primary"
                size={compact ? 'sm' : 'md'}
                leftIcon={
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path d="M9 12l2 2 4-4" />
                    </svg>
                }
            >
                {compact ? 'Connect' : 'Connect Wallet'}
            </Button>
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
                                Disconnect
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
    const { ready, authenticated, user } = usePrivy();
    const wallet = user?.wallet;
    const address = wallet?.address;

    if (!ready) {
        return (
            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 animate-pulse">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-700" />
                    <div className="h-3 w-16 bg-slate-700 rounded" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/30 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
                {authenticated ? (
                    <>
                        <div className="relative">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-50" />
                        </div>
                        <span className="text-xs font-medium text-slate-300">
                            {address?.slice(0, 6)}...{address?.slice(-4)}
                        </span>
                    </>
                ) : (
                    <>
                        <div className="w-2 h-2 rounded-full bg-slate-600" />
                        <span className="text-xs font-medium text-slate-500">Not connected</span>
                    </>
                )}
            </div>
        </div>
    );
}
