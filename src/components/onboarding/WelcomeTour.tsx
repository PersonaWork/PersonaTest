'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

interface TourStep {
  title: string;
  description: string;
  icon: string;
  action?: string;
  actionHref?: string;
}

const tourSteps: TourStep[] = [
  {
    title: 'Welcome to Persona!',
    description: 'Persona lets you invest in AI characters. Buy shares, unlock exclusive chat access, and earn revenue from their social media content.',
    icon: '👋',
  },
  {
    title: 'Browse the Marketplace',
    description: 'Discover AI characters in the marketplace. Each character has a price, market cap, and holder count. Find one you believe in!',
    icon: '🏪',
  },
  {
    title: 'Buy & Sell Shares',
    description: 'Characters start with a bonding curve — the more people buy, the higher the price goes. Once all shares are sold, trading moves to a peer-to-peer order book.',
    icon: '📈',
  },
  {
    title: 'Chat with Characters',
    description: 'Own at least 1 share to unlock private chat with any character. The more shares you hold, the more influence you have.',
    icon: '💬',
  },
  {
    title: 'Track Your Portfolio',
    description: 'Monitor your holdings, P&L, and trade history in your portfolio. Set limit orders to buy or sell at specific prices.',
    icon: '💼',
  },
  {
    title: 'Invite Friends',
    description: 'Share your referral link from Settings to invite friends and grow the community. Check the Leaderboard to see top traders!',
    icon: '🚀',
    action: 'Start Trading',
    actionHref: '/marketplace',
  },
];

const TOUR_STORAGE_KEY = 'persona_tour_completed';

export default function WelcomeTour() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    try {
      const completed = localStorage.getItem(TOUR_STORAGE_KEY);
      if (!completed) {
        // Small delay to let the page render first
        const timer = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage not available
    }
  }, [isAuthenticated, user]);

  const completeTour = () => {
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
    setVisible(false);
  };

  const handleNext = () => {
    if (step < tourSteps.length - 1) {
      setStep(step + 1);
    } else {
      completeTour();
      if (tourSteps[step].actionHref) {
        router.push(tourSteps[step].actionHref!);
      }
    }
  };

  const handleSkip = () => {
    completeTour();
  };

  if (!visible) return null;

  const current = tourSteps[step];
  const isLast = step === tourSteps.length - 1;
  const progress = ((step + 1) / tourSteps.length) * 100;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleSkip}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="bg-slate-900/95 border border-slate-700/60 rounded-2xl shadow-2xl shadow-indigo-500/10 overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8">
            {/* Icon */}
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
                <span className="text-3xl">{current.icon}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mb-2">{current.title}</h2>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed">{current.description}</p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-1.5 mb-6">
              {tourSteps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step
                      ? 'w-6 bg-indigo-500'
                      : i < step
                      ? 'w-1.5 bg-indigo-500/40'
                      : 'w-1.5 bg-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSkip}
                className="flex-1 px-4 py-3 text-sm font-semibold text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-slate-800/50"
              >
                Skip tour
              </button>
              <button
                onClick={handleNext}
                className="flex-1 px-4 py-3 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/20"
              >
                {isLast ? (current.action || 'Done') : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
