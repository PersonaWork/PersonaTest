'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { shouldTriggerAction } from '@/lib/character-engine/actionWeights';
import type { CharacterAction } from '@/lib/types';

interface AnimationClip {
  id: string;
  videoUrl: string;
  duration: number;
}

interface AnimatedLiveCamProps {
  slug: string;
  characterName: string;
  personality: Record<string, unknown>;
  idleClipUrl: string;
}

type AnimationType = 'idle' | 'greeting' | 'talking' | 'excited' | 'celebrating' | 'thinking' | 'laughing' | 'scheming' | 'meditating' | 'teaching' | 'hyping' | 'dancing';

const ANIMATION_LABELS: Record<AnimationType, string> = {
  idle: 'Idle',
  greeting: 'Greeting',
  talking: 'Chatting',
  excited: 'Excited',
  celebrating: 'Celebrating',
  thinking: 'Thinking',
  laughing: 'Laughing',
  scheming: 'Scheming',
  meditating: 'Meditating',
  teaching: 'Teaching',
  hyping: 'Hyping',
  dancing: 'Dancing',
};

export default function AnimatedLiveCam({
  slug,
  characterName: _characterName,
  personality: _personality,
  idleClipUrl,
}: AnimatedLiveCamProps) {
  const [clips, setClips] = useState<Record<string, AnimationClip[]>>({});
  const [currentClipUrl, setCurrentClipUrl] = useState(idleClipUrl);
  const [currentType, setCurrentType] = useState<AnimationType>('idle');
  const [viewerCount, setViewerCount] = useState(1247);
  const [isLoaded, setIsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch pre-made animation clips on mount
  useEffect(() => {
    async function fetchClips() {
      try {
        const res = await fetch(`/api/characters/${slug}/animations`);
        if (!res.ok) return;
        const json = await res.json();
        const data = json.success ? json.data : json;
        if (data?.clips) {
          setClips(data.clips);
          // Use first idle clip if available
          if (data.clips.idle?.length > 0) {
            setCurrentClipUrl(data.clips.idle[0].videoUrl);
          }
        }
        setIsLoaded(true);
      } catch {
        setIsLoaded(true);
      }
    }
    fetchClips();
  }, [slug]);

  // Pick a random clip from a given type
  const pickRandomClip = useCallback(
    (type: string): string | null => {
      const typeClips = clips[type];
      if (!typeClips || typeClips.length === 0) return null;
      const randomIndex = Math.floor(Math.random() * typeClips.length);
      return typeClips[randomIndex].videoUrl;
    },
    [clips]
  );

  // Random action trigger — checks every 30 seconds
  useEffect(() => {
    if (!isLoaded || Object.keys(clips).length === 0) return;

    const interval = setInterval(() => {
      if (currentType !== 'idle') return;

      const availableTypes = Object.keys(clips).filter((t) => t !== 'idle');
      if (availableTypes.length === 0) return;

      const actions: CharacterAction[] = availableTypes.map((type) => ({
        id: type,
        name: type,
        weight: type === 'talking' ? 40 : type === 'excited' ? 20 : 10,
        clipUrl: '',
        rarity: 'common' as const,
        duration: 5,
      }));

      const triggered = shouldTriggerAction(actions, 0.15);
      if (triggered) {
        const clipUrl = pickRandomClip(triggered.id);
        if (clipUrl) {
          setCurrentType(triggered.id as AnimationType);
          setCurrentClipUrl(clipUrl);
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isLoaded, clips, currentType, pickRandomClip]);

  // Simulated viewer count
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount((prev) => {
        const change = Math.floor(Math.random() * 21) - 10;
        return Math.max(100, prev + change);
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Return to idle when a non-idle clip finishes
  const handleVideoEnd = () => {
    if (currentType !== 'idle') {
      setCurrentType('idle');
      const idleClip = pickRandomClip('idle');
      setCurrentClipUrl(idleClip || idleClipUrl);
    }
  };

  const hasVideo = currentClipUrl && currentClipUrl.length > 0;

  return (
    <div className="relative w-full aspect-video rounded-3xl overflow-hidden glass-card shadow-2xl bg-slate-900 border-none">
      {hasVideo ? (
        <video
          ref={videoRef}
          key={currentClipUrl}
          src={currentClipUrl}
          autoPlay
          muted
          loop={currentType === 'idle'}
          playsInline
          onEnded={handleVideoEnd}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950 relative overflow-hidden">
          {/* Animated grid */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />
          <div className="absolute w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl animate-pulse" />
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-indigo-500/20 border-2 border-indigo-500/40 flex items-center justify-center animate-pulse">
              <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <p className="text-white/80 font-bold text-lg">Camera Initializing...</p>
            <p className="text-indigo-400/60 text-sm">Live feed coming soon</p>
          </div>
        </div>
      )}

      {/* Overlay UI */}
      <div className="absolute inset-0 p-6 pointer-events-none flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-2">
            <div className="live-badge shadow-lg bg-white/95 backdrop-blur-md">
              <span className="live-dot"></span>
              Live Feed
            </div>
            {currentType !== 'idle' && (
              <div className="px-3 py-1 rounded-full bg-indigo-600/90 text-[10px] font-black text-white uppercase tracking-tighter self-start animate-bounce">
                {ANIMATION_LABELS[currentType] || currentType}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <div className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white pointer-events-auto cursor-pointer hover:bg-black/40 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-end">
          <div className="flex -space-x-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-indigo-600 bg-slate-200 overflow-hidden shadow-lg relative">
                <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=watcher${i}`} alt="watcher" fill className="object-cover" />
              </div>
            ))}
            <div className="h-8 px-3 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg border-2 border-indigo-600">
              +{viewerCount.toLocaleString()}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-white/60 text-[10px] font-bold tracking-widest uppercase bg-black/20 backdrop-blur-sm px-3 py-1 rounded-lg">
              Stream Quality: 4K High
            </div>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse delay-75"></div>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse delay-150"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Screen effect */}
      <div className="absolute inset-0 pointer-events-none border-[1.5rem] border-transparent shadow-[inset_0_0_100px_rgba(0,0,0,0.2)]"></div>
    </div>
  );
}
