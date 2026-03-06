'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import Link from 'next/link';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import { usePrivyAuthedFetch } from '@/lib/auth/privy-client';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: string;
}

interface Character {
  id: string;
  name: string;
  slug: string;
  thumbnailUrl?: string;
  personality: Record<string, unknown>;
}

export default function ChatPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { ready, authenticated, login } = usePrivy();
  const privyFetch = usePrivyAuthedFetch();

  const [character, setCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const checkAccess = useCallback(async () => {
    try {
      setCheckingAccess(true);
      if (!authenticated) {
        setHasAccess(false);
        return;
      }

      const response = await privyFetch(`/api/characters/${slug}/check-access`);
      if (response.ok) {
        const data = await response.json();
        setHasAccess(data.hasAccess);
      }
    } catch (error) {
      console.error('Failed to check access:', error);
    } finally {
      setCheckingAccess(false);
    }
  }, [authenticated, privyFetch, slug]);

  const fetchCharacter = useCallback(async () => {
    try {
      const response = await fetch(`/api/characters/${slug}`);
      if (!response.ok) throw new Error('Failed to fetch character');

      const json = await response.json();
      if (json.success && json.data) {
        setCharacter(json.data);
      } else {
        setCharacter(json);
      }
    } catch (error) {
      console.error('Failed to fetch character:', error);
    }
  }, [slug]);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/characters/${slug}/messages`);
      if (!response.ok) return;

      const json = await response.json();
      if (json.success && json.data) {
        setMessages(json.data);
      } else {
        setMessages(json);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, [slug]);

  useEffect(() => {
    if (slug) {
      if (ready) {
        checkAccess();
      }
      fetchCharacter();
      fetchMessages();
    }
  }, [slug, ready, authenticated, checkAccess, fetchCharacter, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !character) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    const tempUserMessage: Message = {
      id: 'temp-user',
      content: userMessage,
      role: 'user',
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      if (!authenticated) {
        await login();
      }

      const response = await privyFetch(`/api/characters/${slug}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();
      setMessages(data.messages || data.data?.messages || data);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.filter(msg => msg.id !== 'temp-user'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (checkingAccess) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-medium animate-pulse">Checking shareholder status...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center border-red-500/20 bg-red-950/20" hover={false}>
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-white mb-3">Shareholders Only</h2>
          <p className="text-slate-400 mb-8 leading-relaxed">
            You must own at least 1 share of <strong className="text-white">{character?.name || 'this character'}</strong> to access direct chat.
          </p>
          <Link href={`/character/${slug}/trade`} className="block w-full">
            <Button size="lg" className="w-full text-lg shadow-indigo-500/20 shadow-lg">
              Buy Shares to Unlock
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] max-w-5xl mx-auto p-4 flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between bg-slate-900/80 backdrop-blur-md rounded-t-3xl border border-slate-800 p-4 shadow-xl z-10 relative">
        <div className="flex items-center gap-4">
          <Link href={`/character/${slug}`} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden border-2 border-slate-700 relative">
                {character?.thumbnailUrl ? (
                  <Image src={character.thumbnailUrl} alt={character.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl font-bold text-white">
                    {character?.name?.[0]}
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-slate-900 rounded-full" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">{character?.name}</h1>
              <span className="text-xs font-semibold text-emerald-400">Online</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Top Right) */}
        <div className="hidden sm:flex border border-slate-800 rounded-lg overflow-hidden bg-slate-900/50">
          <Link href={`/character/${slug}`} className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            Overview
          </Link>
          <Link href={`/character/${slug}/trade`} className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border-l border-slate-800">
            Trade
          </Link>
          <div className="px-4 py-2 text-sm font-semibold bg-indigo-500/20 text-indigo-300 border-l border-slate-800">
            Chat
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden relative bg-slate-950/50 border-x border-slate-800 flex flex-col">
        {/* Background Logo watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
          <span className="text-[200px] font-black">P</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 animate-in fade-in duration-1000">
              <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Shareholder Chat</h3>
              <p className="text-slate-400 max-w-sm">
                Say hello to {character?.name}. They are ready to answer your questions and chat about their journey.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => {
                const isUser = message.role === 'user';
                return (
                  <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
                    {!isUser && (
                      <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden shrink-0 mr-3 mt-auto relative">
                        {character?.thumbnailUrl ? (
                          <Image src={character.thumbnailUrl} alt={character.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white bg-indigo-600">
                            {character?.name?.[0]}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex flex-col max-w-[75%]">
                      <div
                        className={`px-5 py-3.5 ${isUser
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl rounded-tr-sm shadow-indigo-500/20 shadow-lg'
                          : 'bg-slate-800 text-slate-200 rounded-2xl rounded-tl-sm border border-slate-700 shadow-xl'
                          }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{message.content}</p>
                      </div>
                      <span className={`text-[11px] font-medium mt-1.5 ${isUser ? 'text-right text-slate-500' : 'text-slate-500'}`}>
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {isLoading && (
            <div className="flex justify-start items-end animate-in fade-in">
              <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden shrink-0 mr-3 relative">
                {character?.thumbnailUrl ? (
                  <Image src={character.thumbnailUrl} alt={character.name} fill className="object-cover opacity-50" />
                ) : (
                  <div className="w-full h-full bg-indigo-600/50" />
                )}
              </div>
              <div className="bg-slate-800 rounded-2xl rounded-tl-sm border border-slate-700 px-5 py-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-1 text-transparent" />
        </div>
      </div>

      {/* Input Area */}
      <div className="shrink-0 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-b-3xl p-4 shadow-2xl relative z-10 text-white">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Message ${character?.name}...`}
            className="w-full bg-slate-950 border border-slate-700 rounded-2xl pl-5 pr-14 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none shadow-inner"
            rows={1}
            disabled={isLoading}
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className="absolute right-2.5 bottom-2.5 w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white flex items-center justify-center transition-all disabled:opacity-50"
          >
            <svg className="w-5 h-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-center text-[10px] uppercase font-bold tracking-widest text-slate-600 mt-3">Messages are generated by AI and may be inaccurate</p>
      </div>
    </div>
  );
}
