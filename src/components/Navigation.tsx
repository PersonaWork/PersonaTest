'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';

/* ────────────────────────────────────────────────────
   Custom SVG Icons – crisp, consistent 20×20 viewBox
   ──────────────────────────────────────────────────── */
const Icons = {
  chart: (cls: string) => (
    <svg className={cls} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 17V10l4 3 4-7 3 4 3-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  wallet: (cls: string) => (
    <svg className={cls} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="5" width="16" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M2 8.5h16" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="14" cy="12" r="1.2" fill="currentColor"/>
    </svg>
  ),
  portfolio: (cls: string) => (
    <svg className={cls} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M7 13V9m3 4V7m3 6v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  people: (cls: string) => (
    <svg className={cls} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7.5" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M2 16c0-2.5 2.2-4.5 5.5-4.5S13 13.5 13 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="14" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M15 11.5c1.8.4 3 1.8 3 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  settings: (cls: string) => (
    <svg className={cls} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M10 2v2m0 12v2M2 10h2m12 0h2M4.2 4.2l1.5 1.5m8.6 8.6l1.5 1.5M4.2 15.8l1.5-1.5m8.6-8.6l1.5-1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  fund: (cls: string) => (
    <svg className={cls} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M10 6v8m-2.5-2.5c0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5S11.4 9 10 9 7.5 7.9 7.5 6.5 8.6 4 10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  logout: (cls: string) => (
    <svg className={cls} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 3h3a2 2 0 012 2v10a2 2 0 01-2 2h-3m-4-5l5-5m0 0l-5-5m5 5H6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  menu: (cls: string) => (
    <svg className={cls} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  close: (cls: string) => (
    <svg className={cls} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
};

const Navigation = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, isLoading, login, logout, user, balance, portfolioValue, needsOnboarding } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  // Track scroll for nav glassmorphism
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (isAuthenticated && needsOnboarding && pathname !== '/onboarding') {
      router.push('/onboarding');
    }
  }, [isAuthenticated, needsOnboarding, pathname, router]);

  const formatValue = (val: number) => {
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return val.toFixed(2);
  };

  const navLinks = [
    { href: '/marketplace', label: 'Marketplace', icon: Icons.chart },
    { href: '/users', label: 'Community', icon: Icons.people, activeCheck: (p: string) => p.startsWith('/users') || p.startsWith('/user/') },
    ...(isAuthenticated ? [
      { href: '/portfolio', label: 'Portfolio', icon: Icons.portfolio },
      { href: '/fund', label: 'Fund', icon: Icons.fund },
      { href: '/settings', label: 'Settings', icon: Icons.settings },
    ] : []),
  ];

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-white/[0.06] shadow-lg shadow-black/20'
        : 'bg-transparent border-b border-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-[60px]">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-9 h-9">
              {/* Shadow / glow layer */}
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-xl rotate-3 opacity-60 blur-[6px] group-hover:opacity-80 transition-opacity duration-300" />
              {/* Main icon */}
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-black text-lg leading-none font-display">P</span>
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-white tracking-tight font-display">
                Persona
              </span>
              <span className="hidden lg:inline text-[9px] font-bold text-indigo-400/70 uppercase tracking-[0.15em]">beta</span>
            </div>
          </Link>

          {/* ── Desktop Nav Links ── */}
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link) => {
              const active = link.activeCheck ? link.activeCheck(pathname) : isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200
                    ${active
                      ? 'text-white bg-white/[0.08]'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    }
                  `}
                >
                  {link.icon(`w-[18px] h-[18px] ${active ? 'text-indigo-400' : ''}`)}
                  {link.label}
                  {active && (
                    <div className="absolute -bottom-[13px] left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* ── Right Section ── */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              {isLoading ? (
                <div className="w-28 h-8 rounded-xl bg-white/5 animate-pulse" />
              ) : isAuthenticated ? (
                <>
                  {/* Balance Pill */}
                  <div className="flex items-center rounded-xl bg-white/[0.05] border border-white/[0.06] overflow-hidden">
                    {portfolioValue !== null && (
                      <Link
                        href="/portfolio"
                        className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/[0.05] transition-colors border-r border-white/[0.06]"
                      >
                        {Icons.portfolio('w-3.5 h-3.5 text-indigo-400')}
                        <span className="text-[12px] font-bold text-slate-300 font-mono tabular-nums">
                          ${formatValue(portfolioValue)}
                        </span>
                      </Link>
                    )}
                    {balance !== null && (
                      <Link
                        href="/fund"
                        className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/[0.05] transition-colors"
                      >
                        {Icons.wallet('w-3.5 h-3.5 text-emerald-400')}
                        <span className="text-[12px] font-bold text-white font-mono tabular-nums">
                          ${balance.toFixed(2)}
                        </span>
                      </Link>
                    )}
                  </div>

                  {/* User avatar */}
                  {user && (
                    <Link
                      href={`/user/${user.username}`}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center ring-1 ring-white/10">
                        <span className="text-[11px] font-black text-white uppercase">
                          {user.username?.charAt(0) || '?'}
                        </span>
                      </div>
                      <span className="text-[13px] font-semibold text-slate-300 hidden lg:block max-w-[80px] truncate">
                        {user.username}
                      </span>
                    </Link>
                  )}

                  <button
                    onClick={logout}
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] transition-all"
                    title="Sign Out"
                  >
                    {Icons.logout('w-4 h-4')}
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={login}
                    className="px-4 py-2 rounded-xl text-[13px] font-semibold text-slate-300 hover:text-white hover:bg-white/[0.05] transition-all"
                  >
                    Sign In
                  </button>
                  <Link href="/signup">
                    <button className="group/btn relative px-5 py-2 rounded-xl text-[13px] font-bold text-white overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 group-hover/btn:from-indigo-500 group-hover/btn:to-purple-500 transition-all" />
                      <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity bg-gradient-to-r from-indigo-500 to-pink-500" />
                      <span className="relative">Get Started</span>
                    </button>
                  </Link>
                </div>
              )}
            </div>

            {/* ── Mobile Menu Toggle ── */}
            <button
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
              onClick={() => setMobileOpen(v => !v)}
            >
              {mobileOpen ? Icons.close('w-5 h-5') : Icons.menu('w-5 h-5')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/[0.06]">
          <div className="px-4 py-4 space-y-1">
            {/* Balance bar */}
            {isAuthenticated && (
              <div className="flex items-center gap-3 p-3 mb-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                {portfolioValue !== null && (
                  <div className="flex items-center gap-2 flex-1">
                    {Icons.portfolio('w-4 h-4 text-indigo-400')}
                    <div>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Portfolio</p>
                      <p className="text-sm font-bold text-white font-mono">${formatValue(portfolioValue)}</p>
                    </div>
                  </div>
                )}
                {balance !== null && (
                  <div className="flex items-center gap-2 flex-1">
                    {Icons.wallet('w-4 h-4 text-emerald-400')}
                    <div>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Wallet</p>
                      <p className="text-sm font-bold text-white font-mono">${balance.toFixed(2)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Nav links */}
            {navLinks.map((link) => {
              const active = link.activeCheck ? link.activeCheck(pathname) : isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-3 rounded-xl transition-all
                    ${active
                      ? 'text-white bg-white/[0.08]'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                    }
                  `}
                >
                  {link.icon(`w-5 h-5 ${active ? 'text-indigo-400' : ''}`)}
                  <span className="text-sm font-semibold">{link.label}</span>
                  {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                </Link>
              );
            })}

            {/* Auth actions */}
            <div className="pt-3 mt-2 border-t border-white/[0.06] flex gap-2">
              {isAuthenticated ? (
                <button
                  onClick={() => { logout(); setMobileOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-slate-400 bg-white/[0.04] border border-white/[0.06] hover:text-white transition-all"
                >
                  {Icons.logout('w-4 h-4')}
                  Sign Out
                </button>
              ) : (
                <>
                  <button
                    onClick={() => { login(); setMobileOpen(false); }}
                    className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-slate-300 bg-white/[0.04] border border-white/[0.06] transition-all"
                  >
                    Sign In
                  </button>
                  <Link onClick={() => setMobileOpen(false)} href="/signup" className="flex-1">
                    <button className="w-full px-4 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/25 transition-all">
                      Get Started
                    </button>
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
