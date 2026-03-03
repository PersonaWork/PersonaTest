'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui';

const Navigation = () => {
  const pathname = usePathname();

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
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
            <Button size="sm">
              Sign Up
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button variant="ghost" size="sm">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
