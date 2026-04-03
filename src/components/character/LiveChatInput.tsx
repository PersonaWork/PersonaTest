'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { usePrivy } from '@privy-io/react-auth';
// Fee constant inlined to avoid importing server-only wallet module
const LIVE_CHAT_FEE = 0.25;

interface LiveChatInputProps {
  slug: string;
  characterName: string;
  hasShares: boolean;
  shareCount: number;
}

function getPriorityTier(shares: number) {
  if (shares >= 1000) return { label: 'Diamond', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' };
  if (shares >= 100) return { label: 'Gold', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' };
  if (shares >= 10) return { label: 'Silver', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
  return { label: 'Bronze', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' };
}

export default function LiveChatInput({
  slug,
  characterName,
  hasShares,
  shareCount,
}: LiveChatInputProps) {
  const { isAuthenticated } = useAuth();
  const { getAccessToken } = usePrivy();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [error, setError] = useState('');

  const tier = getPriorityTier(shareCount);

  const handleSend = useCallback(async () => {
    if (!message.trim() || sending) return;
    setError('');
    setSending(true);

    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/characters/${slug}/live/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: message.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send');
        return;
      }

      setMessage('');

      // Check for processing error (OpenAI/TTS/upload failure)
      const processingError = data.data?.processingError ?? data.processingError;
      if (processingError) {
        setError(`Response failed: ${processingError}`);
        return;
      }

      setQueuePosition(data.data?.position ?? data.position ?? 1);

      // Clear position after 10 seconds
      setTimeout(() => setQueuePosition(null), 10000);
    } catch {
      setError('Network error');
    } finally {
      setSending(false);
    }
  }, [message, sending, slug, getAccessToken]);

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="p-4 bg-slate-900/60 backdrop-blur-sm rounded-xl border border-slate-800/80">
        <p className="text-slate-500 text-sm text-center">
          Sign in to chat live with {characterName}
        </p>
      </div>
    );
  }

  // No shares
  if (!hasShares) {
    return (
      <div className="p-4 bg-slate-900/60 backdrop-blur-sm rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <p className="text-white text-sm font-semibold">Hold shares to chat live</p>
            <p className="text-slate-500 text-xs">Buy shares of {characterName} to ask questions on the live stream</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 backdrop-blur-sm rounded-xl border border-slate-800/80 overflow-hidden">
      {/* Priority tier badge */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${tier.bg} ${tier.color}`}>
            {tier.label}
          </span>
          <span className="text-slate-500 text-xs">{shareCount} shares</span>
        </div>
        <span className="text-slate-600 text-xs font-mono">${LIVE_CHAT_FEE.toFixed(2)}/msg</span>
      </div>

      {/* Queue position notification */}
      {queuePosition !== null && (
        <div className="mx-4 mb-2 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
          <p className="text-indigo-300 text-xs font-medium">
            Your message is #{queuePosition} in queue
            {shareCount >= 100 && ' (priority)'}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center gap-2 p-3 pt-0">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={`Ask ${characterName} something...`}
          maxLength={500}
          disabled={sending}
          className="flex-1 bg-slate-950/50 border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {sending ? (
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Sending
            </span>
          ) : (
            'Send'
          )}
        </button>
      </div>
    </div>
  );
}
