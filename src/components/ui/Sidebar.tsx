'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/marketplace', label: 'Marketplace', icon: '🛒' },
  { href: '/portfolio', label: 'Portfolio', icon: '💼' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-white/70 backdrop-blur-xl border-r border-indigo-50 flex flex-col p-6 z-50 max-md:w-16 max-md:p-2">
      {/* Logo */}
      <div className="mb-10 px-2 max-md:px-0">
        <Link href="/" className="flex items-center gap-3 no-underline group">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-cyber-blue rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
            <span className="text-white font-black text-xl">P</span>
          </div>
          <span className="font-display text-2xl font-black tracking-tighter text-slate-900 max-md:hidden">
            PERSONA
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-2 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 p-3 rounded-2xl font-bold text-sm transition-all duration-200 no-underline ${isActive
                  ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                }`}
            >
              <span className="text-xl w-8 text-center">{item.icon}</span>
              <span className="max-md:hidden">{item.label}</span>
              {isActive && (
                <div className="absolute left-0 w-1 h-6 bg-indigo-500 rounded-r-full max-md:hidden"></div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="pt-6 border-t border-slate-100">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3 group cursor-pointer hover:bg-white hover:border-indigo-100 transition-all">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse"></div>
          <div className="flex flex-col max-md:hidden">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
            <span className="text-xs font-bold text-slate-600">Secure Wallet</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
