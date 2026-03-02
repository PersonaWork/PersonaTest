'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatWindowProps {
    slug: string;
    characterName: string;
}

export default function ChatWindow({ slug, characterName }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slug,
                    messages: [...messages, userMsg].slice(-10) // Keep last 10 messages for context
                }),
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting right now." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="glass-card flex flex-col h-[500px] overflow-hidden bg-white/80">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Chat with {characterName}</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth"
            >
                {messages.length === 0 && (
                    <div className="text-center py-10">
                        <div className="text-4xl mb-4">👋</div>
                        <p className="text-sm font-medium text-slate-400">Say hi to {characterName}!</p>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`
              max-w-[80%] p-4 rounded-2xl text-sm font-medium
              ${msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-100 shadow-lg'
                                : 'bg-slate-100 text-slate-700 rounded-tl-none'}
            `}>
                            {msg.content}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none animate-pulse space-x-1 flex">
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-4 bg-slate-50 border-t border-slate-100">
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Send a message..."
                        className="w-full h-12 pl-6 pr-14 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-indigo-400 transition-all font-medium text-slate-700"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
