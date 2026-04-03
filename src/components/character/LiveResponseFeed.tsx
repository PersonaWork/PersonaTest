'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface LiveResponseData {
  id: string;
  senderName: string;
  questionText: string;
  responseText: string;
  audioUrl: string;
  videoUrl: string | null;
  audioDuration: number;
  createdAt: string;
}

interface LiveVideo {
  videoUrl: string;
  audioUrl: string;
  responseText: string;
  senderName: string;
  question: string;
}

interface LiveResponseFeedProps {
  slug: string;
  onLiveVideo: (video: LiveVideo | null) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function LiveResponseFeed({ slug, onLiveVideo }: LiveResponseFeedProps) {
  const [responses, setResponses] = useState<LiveResponseData[]>([]);
  const [queueDepth, setQueueDepth] = useState(0);
  const [processing, setProcessing] = useState<{ senderName: string; question: string } | null>(null);
  const lastSeenRef = useRef<string | null>(null);
  const playingRef = useRef(false);
  const queueRef = useRef<LiveResponseData[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  // Play next response from queue
  const playNext = useCallback(() => {
    if (playingRef.current || queueRef.current.length === 0) return;

    const next = queueRef.current.shift()!;
    playingRef.current = true;

    // Dispatch to AnimatedLiveCam
    onLiveVideo({
      videoUrl: next.videoUrl || '',
      audioUrl: next.audioUrl,
      responseText: next.responseText,
      senderName: next.senderName,
      question: next.questionText,
    });

    // Estimate when this response finishes playing
    const duration = Math.max(next.audioDuration, 5) * 1000 + 3000;
    setTimeout(() => {
      playingRef.current = false;
      onLiveVideo(null);
      playNext();
    }, duration);
  }, [onLiveVideo]);

  // Poll for new responses every 3 seconds
  useEffect(() => {
    let active = true;

    const poll = async () => {
      try {
        const afterParam = lastSeenRef.current ? `?after=${encodeURIComponent(lastSeenRef.current)}` : '';
        const res = await fetch(`/api/characters/${slug}/live/poll${afterParam}`);
        if (!res.ok || !active) return;

        const json = await res.json();
        const data = json.data || json;

        if (data.responses?.length > 0) {
          // Deduplicate — never show the same response twice
          const newResponses = (data.responses as LiveResponseData[]).filter(r => {
            if (seenIdsRef.current.has(r.id)) return false;
            seenIdsRef.current.add(r.id);
            return true;
          });

          if (newResponses.length > 0) {
            // Update last seen timestamp
            const latest = newResponses[newResponses.length - 1];
            lastSeenRef.current = latest.createdAt;

            // Add to display feed (keep last 30)
            setResponses(prev => [...prev, ...newResponses].slice(-30));

            // Queue for playback
            queueRef.current.push(...newResponses);
            playNext();
          }
        }

        setQueueDepth(data.queueDepth || 0);
        setProcessing(data.processing || null);
      } catch (err) {
        console.error('[LiveFeed] Poll error:', err);
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => { active = false; clearInterval(interval); };
  }, [slug, playNext]);

  // Auto-scroll feed
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [responses]);

  return (
    <div className="bg-slate-900/40 backdrop-blur-sm rounded-xl border border-slate-800/80 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <h3 className="text-sm font-bold text-white">Live Q&A</h3>
        </div>
        <div className="flex items-center gap-3">
          {queueDepth > 0 && (
            <span className="text-xs text-indigo-400 font-semibold px-2 py-0.5 bg-indigo-500/10 rounded-full border border-indigo-500/20">
              {queueDepth} in queue
            </span>
          )}
          {responses.length > 0 && (
            <span className="text-slate-600 text-[10px]">
              {responses.length} response{responses.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Processing indicator */}
      {processing && (
        <div className="px-4 py-2.5 bg-indigo-500/5 border-b border-indigo-500/10 flex items-center gap-2">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
          <p className="text-xs text-indigo-300">
            <span className="font-semibold">{processing.senderName}</span> is getting a response...
          </p>
        </div>
      )}

      {/* Response feed */}
      <div ref={feedRef} className="max-h-80 overflow-y-auto scrollbar-thin">
        {responses.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-slate-500 text-sm font-medium">No responses yet</p>
            <p className="text-slate-600 text-xs mt-1">Send a message to start the conversation</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/40">
            {responses.map((r) => (
              <div key={r.id} className="p-4 hover:bg-slate-800/20 transition-colors group">
                {/* Question header */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-white uppercase">{r.senderName[0]}</span>
                    </div>
                    <span className="text-indigo-400 text-xs font-bold">{r.senderName}</span>
                    <span className="text-slate-600 text-xs">asked</span>
                  </div>
                  <span className="text-slate-600 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                    {timeAgo(r.createdAt)}
                  </span>
                </div>
                <p className="text-slate-400 text-xs italic mb-2 pl-6">&ldquo;{r.questionText}&rdquo;</p>
                {/* Response */}
                <p className="text-white/90 text-sm leading-relaxed pl-6">{r.responseText}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
