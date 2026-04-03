'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { usePrivy } from '@privy-io/react-auth';

const STREAK_REWARDS = [0.01, 0.02, 0.03, 0.05, 0.08, 0.12, 0.25];

export default function DailyRewardPopup() {
  const { isAuthenticated, user } = useAuth();
  const { getAccessToken } = usePrivy();
  const [show, setShow] = useState(false);
  const [streak, setStreak] = useState(0);
  const [canClaim, setCanClaim] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState(0);
  const [isWeeklyBonus, setIsWeeklyBonus] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch('/api/rewards/daily', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.data) {
        setStreak(data.data.streak);
        setCanClaim(data.data.canClaim);
        if (data.data.canClaim) {
          // Show popup after a brief delay
          setTimeout(() => setShow(true), 2000);
        }
      }
    } catch {
      // Silent
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchStatus();
    }
  }, [isAuthenticated, user, fetchStatus]);

  const claimReward = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch('/api/rewards/daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.data) {
        setClaimedAmount(data.data.reward);
        setStreak(data.data.streak);
        setIsWeeklyBonus(data.data.isWeeklyBonus);
        setClaimed(true);
        setCanClaim(false);
      }
    } catch {
      // Silent
    }
    setClaiming(false);
  };

  if (!show || !isAuthenticated) return null;

  const nextDay = canClaim ? streak + 1 : streak;
  const dayInCycle = ((nextDay - 1) % 7) + 1;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => { if (claimed || !canClaim) setShow(false); }}
      />

      {/* Popup */}
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-[#12121a] border border-white/[0.08] rounded-3xl p-6 w-full max-w-sm shadow-2xl shadow-indigo-500/10 pointer-events-auto animate-in zoom-in-95 fade-in duration-300">
          {!claimed ? (
            <>
              {/* Header */}
              <div className="text-center mb-5">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center">
                  <span className="text-3xl">🔥</span>
                </div>
                <h3 className="text-xl font-black text-white">Daily Reward</h3>
                <p className="text-sm text-slate-400 mt-1">
                  {streak > 0
                    ? `${streak} day streak! Keep it going.`
                    : 'Start your streak today!'}
                </p>
              </div>

              {/* Streak calendar */}
              <div className="grid grid-cols-7 gap-1.5 mb-5">
                {STREAK_REWARDS.map((reward, i) => {
                  const day = i + 1;
                  const isPast = day <= (streak % 7 || (streak > 0 ? 7 : 0));
                  const isCurrent = day === dayInCycle && canClaim;
                  const isNext = day === dayInCycle && !canClaim;

                  return (
                    <div
                      key={i}
                      className={`flex flex-col items-center py-2 px-1 rounded-xl text-center transition-all ${
                        isCurrent
                          ? 'bg-gradient-to-b from-amber-500/20 to-amber-500/5 border border-amber-500/30 scale-105'
                          : isPast
                            ? 'bg-emerald-500/10 border border-emerald-500/20'
                            : isNext
                              ? 'bg-slate-800/50 border border-indigo-500/20'
                              : 'bg-slate-900/50 border border-white/[0.04]'
                      }`}
                    >
                      <span className="text-[9px] font-bold text-slate-500 uppercase">D{day}</span>
                      <span className={`text-[11px] font-black mt-0.5 ${
                        isCurrent ? 'text-amber-400' : isPast ? 'text-emerald-400' : 'text-slate-500'
                      }`}>
                        {day === 7 ? '🎁' : `$${reward}`}
                      </span>
                      {isPast && (
                        <svg className="w-3 h-3 text-emerald-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Claim button */}
              {canClaim ? (
                <button
                  onClick={claimReward}
                  disabled={claiming}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-sm hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 transition-all animate-cta-breathe"
                  style={{ '--tw-shadow-color': 'rgba(245, 158, 11, 0.3)' } as React.CSSProperties}
                >
                  {claiming ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Claiming...
                    </span>
                  ) : (
                    `Claim $${STREAK_REWARDS[dayInCycle - 1]?.toFixed(2) || '0.01'} Reward`
                  )}
                </button>
              ) : (
                <div className="w-full py-3.5 rounded-2xl bg-slate-800/50 border border-white/[0.06] text-center text-sm font-bold text-slate-500">
                  Come back tomorrow!
                </div>
              )}

              <button
                onClick={() => setShow(false)}
                className="w-full mt-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-400 transition-colors"
              >
                Dismiss
              </button>
            </>
          ) : (
            /* Claimed state */
            <>
              <div className="text-center py-4">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center">
                  <span className="text-4xl">{isWeeklyBonus ? '🎉' : '✅'}</span>
                </div>
                <h3 className="text-2xl font-black text-white mb-1">
                  {isWeeklyBonus ? 'Weekly Bonus!' : 'Claimed!'}
                </h3>
                <p className="text-3xl font-black text-emerald-400 mb-2 font-mono">
                  +${claimedAmount.toFixed(2)}
                </p>
                <p className="text-sm text-slate-400">
                  {streak} day streak 🔥 — come back tomorrow for more!
                </p>
              </div>

              <button
                onClick={() => setShow(false)}
                className="w-full py-3 rounded-2xl bg-slate-800 border border-white/[0.06] text-sm font-bold text-white hover:bg-slate-700 transition-colors mt-2"
              >
                Nice!
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
