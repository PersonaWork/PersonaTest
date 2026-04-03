'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const CONSENT_KEY = 'persona-cookie-consent';

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if user already consented
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      // Show after 1.5s so it doesn't flash on load
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = (analytics: boolean) => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({
      essential: true,
      analytics,
      timestamp: new Date().toISOString(),
    }));
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-0 left-0 right-0 z-50 p-4 sm:p-6 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="max-w-2xl mx-auto bg-[#12121a] border border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-300 leading-relaxed">
              We use essential cookies for authentication. By continuing, you agree to our{' '}
              <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300 font-medium">
                Privacy Policy
              </Link>{' '}
              and{' '}
              <Link href="/terms" className="text-indigo-400 hover:text-indigo-300 font-medium">
                Terms of Service
              </Link>.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => accept(false)}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white border border-white/[0.06] rounded-xl hover:bg-white/5 transition-all"
            >
              Essential Only
            </button>
            <button
              onClick={() => accept(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-all"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
