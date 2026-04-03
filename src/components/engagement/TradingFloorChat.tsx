'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';

interface ChatMsg {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
  };
}

// Generate consistent color from username
function userColor(name: string): string {
  const colors = [
    'text-indigo-400', 'text-emerald-400', 'text-amber-400', 'text-pink-400',
    'text-cyan-400', 'text-purple-400', 'text-rose-400', 'text-teal-400',
    'text-orange-400', 'text-sky-400', 'text-lime-400', 'text-fuchsia-400',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export default function TradingFloorChat({ collapsed = false }: { collapsed?: boolean }) {
  const { isAuthenticated } = useAuth();
  const { getAccessToken } = usePrivy();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isOpen, setIsOpen] = useState(!collapsed);
  const [unread, setUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageId = useRef<string | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/chat?room=trading-floor&limit=50');
      const data = await res.json();
      if (data.data?.messages) {
        const newMsgs = data.data.messages;
        setMessages(newMsgs);

        // Track unread if collapsed
        if (!isOpen && lastMessageId.current) {
          const newCount = newMsgs.filter(
            (m: ChatMsg) => m.id !== lastMessageId.current &&
            new Date(m.createdAt) > new Date(newMsgs.find((x: ChatMsg) => x.id === lastMessageId.current)?.createdAt || 0)
          ).length;
          if (newCount > 0) setUnread((prev) => prev + newCount);
        }

        if (newMsgs.length > 0) {
          lastMessageId.current = newMsgs[newMsgs.length - 1].id;
        }
      }
    } catch {
      // Silently fail
    }
  }, [isOpen]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Poll every 5s for chat
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Auto-scroll on new messages when open
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, scrollToBottom]);

  // Clear unread when opening
  useEffect(() => {
    if (isOpen) setUnread(0);
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    const token = await getAccessToken();
    if (!token) return;

    setSending(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: input.trim(), room: 'trading-floor' }),
      });

      if (res.ok) {
        setInput('');
        fetchMessages();
      }
    } catch {
      // Silently fail
    }
    setSending(false);
  };

  return (
    <div className="fixed bottom-20 sm:bottom-4 right-4 z-40 flex flex-col items-end">
      {/* Chat toggle button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-white/10 backdrop-blur-xl shadow-2xl shadow-indigo-500/10 hover:border-indigo-500/30 transition-all group"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm font-bold text-white">Trading Floor</span>
          </div>
          {/* Pulse dot */}
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {/* Unread badge */}
          {unread > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full bg-indigo-600 text-[11px] font-black text-white">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="w-[340px] sm:w-[380px] h-[420px] rounded-2xl bg-[#0d0d15]/98 border border-white/[0.08] backdrop-blur-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-gradient-to-r from-indigo-500/5 to-purple-500/5">
            <div className="flex items-center gap-2">
              <div className="relative">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <span className="text-sm font-bold text-white">Trading Floor</span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-400">LIVE</span>
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-slate-500 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10"
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-white mb-1">Trading Floor is empty</p>
                <p className="text-xs text-slate-500">Be the first to say something!</p>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className="group flex gap-2 py-1 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                {/* Avatar initial */}
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center mt-0.5">
                  <span className={`text-[10px] font-bold ${userColor(msg.user.username)}`}>
                    {msg.user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-xs font-bold ${userColor(msg.user.username)} truncate max-w-[120px]`}>
                      {msg.user.displayName || msg.user.username}
                    </span>
                    <span className="text-[10px] text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      {timeAgo(msg.createdAt)}
                    </span>
                  </div>
                  <p className="text-[13px] text-slate-300 leading-snug break-words">
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-white/[0.06]">
            {isAuthenticated ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Say something..."
                  maxLength={500}
                  className="flex-1 bg-slate-900/60 border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/30 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 transition-all text-white"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              </form>
            ) : (
              <Link
                href="/signup"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/20 text-sm font-bold text-indigo-400 hover:bg-indigo-600/30 transition-all no-underline"
              >
                Sign in to chat
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
