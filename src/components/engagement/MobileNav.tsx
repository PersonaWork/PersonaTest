'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

/* ── Custom mobile nav icons (filled when active, stroke when inactive) ── */
const NavIcon = {
  home: (active: boolean) => (
    <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {active ? (
        <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-4.5v-5.5a1 1 0 00-1-1h-3a1 1 0 00-1 1V21H6a1 1 0 01-1-1v-4.5H3V10.5z" fill="currentColor"/>
      ) : (
        <>
          <path d="M4 11.5l8-7 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 10v9a1 1 0 001 1h3v-5a1 1 0 011-1h2a1 1 0 011 1v5h3a1 1 0 001-1v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )}
    </svg>
  ),
  market: (active: boolean) => (
    <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {active ? (
        <>
          <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" opacity="0.15"/>
          <path d="M7 17l3.5-4.5L14 15l4-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="18" cy="9" r="1.5" fill="currentColor"/>
        </>
      ) : (
        <>
          <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M7 17l3.5-4.5L14 15l4-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )}
    </svg>
  ),
  portfolio: (active: boolean) => (
    <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {active ? (
        <>
          <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" opacity="0.15"/>
          <path d="M8 16V11m4 5V8m4 8v-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        </>
      ) : (
        <>
          <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M8 16V11m4 5V8m4 8v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </>
      )}
    </svg>
  ),
  people: (active: boolean) => (
    <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {active ? (
        <>
          <circle cx="9" cy="7" r="3.5" fill="currentColor"/>
          <path d="M2 20c0-3.3 3-6 7-6s7 2.7 7 6" fill="currentColor" opacity="0.3"/>
          <circle cx="17" cy="8" r="2.5" fill="currentColor" opacity="0.6"/>
          <path d="M18 14c2.2.5 4 2.2 4 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </>
      ) : (
        <>
          <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M2 20c0-3 2.7-5.5 7-5.5S16 17 16 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          <circle cx="17" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M18 14c2 .5 3.5 2 3.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </>
      )}
    </svg>
  ),
  profile: (active: boolean) => (
    <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {active ? (
        <>
          <circle cx="12" cy="8" r="4" fill="currentColor"/>
          <path d="M4 21c0-3.5 3.6-6.5 8-6.5s8 3 8 6.5" fill="currentColor" opacity="0.3"/>
        </>
      ) : (
        <>
          <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M4 21c0-3.5 3.6-6 8-6s8 2.5 8 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </>
      )}
    </svg>
  ),
  join: (active: boolean) => (
    <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {active ? (
        <>
          <circle cx="10" cy="8" r="4" fill="currentColor"/>
          <path d="M3 21c0-3.5 3-6 7-6s7 2.5 7 6" fill="currentColor" opacity="0.3"/>
          <path d="M19 8v5m-2.5-2.5h5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
        </>
      ) : (
        <>
          <circle cx="10" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M3 21c0-3 2.7-5.5 7-5.5s7 2.5 7 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          <path d="M19 8v5m-2.5-2.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </>
      )}
    </svg>
  ),
};

export default function MobileNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const navItems = [
    { href: '/', label: 'Home', icon: NavIcon.home },
    { href: '/marketplace', label: 'Market', icon: NavIcon.market },
    ...(isAuthenticated ? [{ href: '/portfolio', label: 'Portfolio', icon: NavIcon.portfolio, requiresAuth: true }] : []),
    { href: '/users', label: 'People', icon: NavIcon.people },
    {
      href: isAuthenticated ? '/settings' : '/signup',
      label: isAuthenticated ? 'Profile' : 'Join',
      icon: isAuthenticated ? NavIcon.profile : NavIcon.join,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
      {/* Gradient fade above */}
      <div className="h-8 bg-gradient-to-t from-[#0a0a0f] to-transparent pointer-events-none" />

      <nav className="bg-[#0a0a0f]/95 backdrop-blur-2xl border-t border-white/[0.06] px-1 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  relative flex flex-col items-center gap-0.5 py-2 px-3 min-w-[52px] transition-all duration-200
                  ${active ? 'text-indigo-400' : 'text-slate-500'}
                `}
              >
                {/* Active glow */}
                {active && (
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                )}

                <div className={`transition-transform duration-200 ${active ? 'scale-105' : ''}`}>
                  {item.icon(active)}
                </div>

                <span className={`text-[10px] font-bold leading-tight ${
                  active ? 'text-indigo-400' : 'text-slate-600'
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
