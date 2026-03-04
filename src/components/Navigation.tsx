'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui';
import WalletConnect from '@/components/wallet/WalletConnect';
import { useAuth } from '@/lib/auth/auth-context';

const Navigation = () => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <span className="text-white font-black text-xl">P</span>
            </div>
            <span className="text-xl font-black text-white">Persona</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/marketplace"
              className={`text-sm font-semibold transition-colors ${
                isActive('/marketplace') ? 'text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Marketplace
            </Link>
            <Link
              href="/portfolio"
              className={`text-sm font-semibold transition-colors ${
                isActive('/portfolio') ? 'text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Portfolio
            </Link>
            <Link
              href="/settings"
              className={`text-sm font-semibold transition-colors ${
                isActive('/settings') ? 'text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Settings
            </Link>
            <Link
              href="/fund"
              className={`text-sm font-semibold transition-colors ${
                isActive('/fund') ? 'text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Fund
            </Link>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:block">
              <WalletConnect compact />
            </div>
            <div className="hidden sm:flex items-center gap-2">
              {user ? (
                <Button variant="ghost" size="sm" onClick={signOut}>
                  Sign Out
                </Button>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button size="sm">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button variant="ghost" size="sm" onClick={() => setMobileOpen(v => !v)}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950/80 backdrop-blur-sm">
          <div className="px-6 py-4 space-y-3">
            <div className="pb-3 border-b border-slate-800">
              <WalletConnect />
            </div>
            <Link onClick={() => setMobileOpen(false)} href="/marketplace" className={`block text-sm font-semibold ${isActive('/marketplace') ? 'text-white' : 'text-slate-300'}`}>
              Marketplace
            </Link>
            <Link onClick={() => setMobileOpen(false)} href="/portfolio" className={`block text-sm font-semibold ${isActive('/portfolio') ? 'text-white' : 'text-slate-300'}`}>
              Portfolio
            </Link>
            <Link onClick={() => setMobileOpen(false)} href="/fund" className={`block text-sm font-semibold ${isActive('/fund') ? 'text-white' : 'text-slate-300'}`}>
              Fund
            </Link>
            <Link onClick={() => setMobileOpen(false)} href="/settings" className={`block text-sm font-semibold ${isActive('/settings') ? 'text-white' : 'text-slate-300'}`}>
              Settings
            </Link>
            <div className="pt-3 border-t border-slate-800 flex gap-2">
              {user ? (
                <Button variant="secondary" className="w-full" onClick={() => { signOut(); setMobileOpen(false); }}>
                  Sign Out
                </Button>
              ) : (
                <>
                  <Link onClick={() => setMobileOpen(false)} href="/login" className="flex-1">
                    <Button variant="secondary" className="w-full">Sign In</Button>
                  </Link>
                  <Link onClick={() => setMobileOpen(false)} href="/signup" className="flex-1">
                    <Button className="w-full">Sign Up</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
