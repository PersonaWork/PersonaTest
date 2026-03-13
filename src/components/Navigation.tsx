'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';

const Navigation = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, isLoading, login, logout, user, balance, portfolioValue, needsOnboarding } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  // Redirect to onboarding if user hasn't set username (but not if already there)
  useEffect(() => {
    if (isAuthenticated && needsOnboarding && pathname !== '/onboarding') {
      router.push('/onboarding');
    }
  }, [isAuthenticated, needsOnboarding, pathname, router]);

  const formatValue = (val: number) => {
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return val.toFixed(2);
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
              className={`text-sm font-semibold transition-colors ${isActive('/marketplace') ? 'text-white' : 'text-slate-400 hover:text-white'
                }`}
            >
              Marketplace
            </Link>
            <Link
              href="/users"
              className={`text-sm font-semibold transition-colors ${isActive('/users') || isActive('/user/') ? 'text-white' : 'text-slate-400 hover:text-white'
                }`}
            >
              Users
            </Link>
            {isAuthenticated && (
              <>
                <Link
                  href="/portfolio"
                  className={`text-sm font-semibold transition-colors ${isActive('/portfolio') ? 'text-white' : 'text-slate-400 hover:text-white'
                    }`}
                >
                  Portfolio
                </Link>
                <Link
                  href="/fund"
                  className={`text-sm font-semibold transition-colors ${isActive('/fund') ? 'text-white' : 'text-slate-400 hover:text-white'
                    }`}
                >
                  Fund
                </Link>
                <Link
                  href="/settings"
                  className={`text-sm font-semibold transition-colors ${isActive('/settings') ? 'text-white' : 'text-slate-400 hover:text-white'
                    }`}
                >
                  Settings
                </Link>
              </>
            )}
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              {isLoading ? (
                <div className="w-20 h-9 rounded-lg bg-slate-800 animate-pulse" />
              ) : isAuthenticated ? (
                <>
                  {/* Portfolio Value + Wallet Balance */}
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50">
                    {portfolioValue !== null && (
                      <Link href="/portfolio" className="flex items-center gap-1 pr-2 border-r border-slate-700/50 hover:text-indigo-300 transition-colors">
                        <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <span className="text-xs font-bold text-slate-400">${formatValue(portfolioValue)}</span>
                      </Link>
                    )}
                    {balance !== null && (
                      <Link href="/fund" className="flex items-center gap-1 pl-1 hover:text-emerald-300 transition-colors">
                        <span className="text-xs font-bold text-slate-500">$</span>
                        <span className="text-sm font-bold text-white">{balance.toFixed(2)}</span>
                      </Link>
                    )}
                  </div>
                  {user && (
                    <Link href={`/user/${user.username}`} className="text-sm text-slate-400 font-medium hover:text-white transition-colors">
                      {user.username}
                    </Link>
                  )}
                  <Button variant="ghost" size="sm" onClick={logout}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={login}>
                    Sign In
                  </Button>
                  <Link href="/signup">
                    <Button size="sm">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
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
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950/80 backdrop-blur-sm">
          <div className="px-6 py-4 space-y-3">
            {/* Mobile balance display */}
            {isAuthenticated && (
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                {portfolioValue !== null && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">Portfolio</span>
                    <span className="text-sm font-bold text-white">${formatValue(portfolioValue)}</span>
                  </div>
                )}
                {balance !== null && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">Wallet</span>
                    <span className="text-sm font-bold text-white">${balance.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
            <Link onClick={() => setMobileOpen(false)} href="/marketplace" className={`block text-sm font-semibold ${isActive('/marketplace') ? 'text-white' : 'text-slate-300'}`}>
              Marketplace
            </Link>
            <Link onClick={() => setMobileOpen(false)} href="/users" className={`block text-sm font-semibold ${isActive('/users') ? 'text-white' : 'text-slate-300'}`}>
              Users
            </Link>
            {isAuthenticated && (
              <>
                <Link onClick={() => setMobileOpen(false)} href="/portfolio" className={`block text-sm font-semibold ${isActive('/portfolio') ? 'text-white' : 'text-slate-300'}`}>
                  Portfolio
                </Link>
                <Link onClick={() => setMobileOpen(false)} href="/fund" className={`block text-sm font-semibold ${isActive('/fund') ? 'text-white' : 'text-slate-300'}`}>
                  Fund
                </Link>
                <Link onClick={() => setMobileOpen(false)} href="/settings" className={`block text-sm font-semibold ${isActive('/settings') ? 'text-white' : 'text-slate-300'}`}>
                  Settings
                </Link>
              </>
            )}
            <div className="pt-3 border-t border-slate-800 flex gap-2">
              {isAuthenticated ? (
                <Button variant="secondary" className="w-full" onClick={() => { logout(); setMobileOpen(false); }}>
                  Sign Out
                </Button>
              ) : (
                <>
                  <Button variant="ghost" className="flex-1" onClick={() => { login(); setMobileOpen(false); }}>
                    Sign In
                  </Button>
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
