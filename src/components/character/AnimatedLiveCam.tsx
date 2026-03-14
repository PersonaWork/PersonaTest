'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';

/* ─── Types ─── */

interface VoiceLineManifest {
  id: string;
  text: string;
  file: string;
}

interface AnimatedLiveCamProps {
  slug: string;
  characterName: string;
  personality: Record<string, unknown>;
  portraitUrl: string;
}

/* ─── Voice Line Defaults ─── */

const FALLBACK_VOICE_LINES: VoiceLineManifest[] = [
  { id: 'welcome', text: "Oh hey! Welcome to the stream, you're just in time because things are about to get chaotic.", file: '/audio/aria/welcome.mp3' },
  { id: 'charts-spicy', text: "The charts are looking absolutely spicy right now and I need everyone to act accordingly.", file: '/audio/aria/charts-spicy.mp3' },
  { id: 'gerald', text: "Gerald thinks he can out-trade me. Gerald. Please.", file: '/audio/aria/gerald.mp3' },
  { id: 'vibes', text: "The vibes in here are absolutely immaculate. We're so back.", file: '/audio/aria/vibes.mp3' },
  { id: 'prophecy', text: "This is not financial advice. This is financial prophecy. There's a difference.", file: '/audio/aria/prophecy.mp3' },
  { id: 'so-back', text: "We are so unbelievably back right now.", file: '/audio/aria/so-back.mp3' },
  { id: 'cat', text: "My cat just walked across my keyboard and somehow made a better trade than half of you.", file: '/audio/aria/cat.mp3' },
  { id: 'alpha-drop', text: "I just had the craziest alpha download and I literally cannot keep this to myself.", file: '/audio/aria/alpha-drop.mp3' },
  { id: 'main-character', text: "It's giving main character energy today and honestly? We deserve this.", file: '/audio/aria/main-character.mp3' },
  { id: 'buy-more', text: "What if we just... bought more? Revolutionary strategy, I know.", file: '/audio/aria/buy-more.mp3' },
  { id: 'staring', text: "I've been staring at this chart for three hours and I think I've achieved enlightenment.", file: '/audio/aria/staring.mp3' },
  { id: 'three-am', text: "What if money isn't even real? Anyway, we need more of it.", file: '/audio/aria/three-am.mp3' },
];

/* ─── Particles (computed once) ─── */

function generateParticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: 50 + Math.random() * 50,
    size: 1 + Math.random() * 2,
    duration: 4 + Math.random() * 6,
    delay: Math.random() * 8,
    hue: Math.random() > 0.5 ? 'bg-indigo-400/40' : 'bg-purple-400/30',
  }));
}

/* ─── Component ─── */

export default function AnimatedLiveCam({
  slug: _slug,
  characterName,
  personality: _personality,
  portraitUrl,
}: AnimatedLiveCamProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [viewerCount, setViewerCount] = useState(1247);
  const [currentCaption, setCurrentCaption] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [voiceLines, setVoiceLines] = useState<VoiceLineManifest[]>(FALLBACK_VOICE_LINES);
  const [lastPlayedIndex, setLastPlayedIndex] = useState(-1);

  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const particles = useMemo(() => generateParticles(15), []);

  // Load voice line manifest
  useEffect(() => {
    fetch('/audio/aria/manifest.json')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data && Array.isArray(data)) setVoiceLines(data); })
      .catch(() => { /* use fallback */ });
  }, []);

  // Simulated viewer count
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount((prev) => Math.max(100, prev + Math.floor(Math.random() * 21) - 10));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Play a voice line
  const playVoiceLine = useCallback(() => {
    if (isSpeaking || !audioEnabled || voiceLines.length === 0) return;

    // Pick a random line (different from last)
    let idx = Math.floor(Math.random() * voiceLines.length);
    if (idx === lastPlayedIndex && voiceLines.length > 1) {
      idx = (idx + 1) % voiceLines.length;
    }
    setLastPlayedIndex(idx);

    const line = voiceLines[idx];
    const audio = new Audio(line.file);
    audio.crossOrigin = 'anonymous';

    setIsSpeaking(true);
    setCurrentCaption(line.text);

    // Try Web Audio API for visualization
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      const source = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyser.connect(ctx.destination);

      const updateLevel = () => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioLevel(avg / 255);
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch {
      // Fallback: simulate audio level
      const fakeLevel = setInterval(() => {
        setAudioLevel(0.3 + Math.random() * 0.5);
      }, 100);
      audio.onended = () => clearInterval(fakeLevel);
    }

    audio.play().catch(() => {
      // Autoplay blocked — simulate speaking visually
      const fakeInterval = setInterval(() => {
        setAudioLevel(0.2 + Math.random() * 0.6);
      }, 100);
      // End after estimated duration (5-8 seconds)
      setTimeout(() => {
        clearInterval(fakeInterval);
        setIsSpeaking(false);
        setAudioLevel(0);
        setCurrentCaption('');
      }, 6000);
    });

    audio.onended = () => {
      setIsSpeaking(false);
      setAudioLevel(0);
      cancelAnimationFrame(animFrameRef.current);
      // Fade out caption after a moment
      speakingTimeoutRef.current = setTimeout(() => setCurrentCaption(''), 1500);
    };

    audio.onerror = () => {
      setIsSpeaking(false);
      setAudioLevel(0);
      setCurrentCaption('');
    };
  }, [isSpeaking, audioEnabled, voiceLines, lastPlayedIndex]);

  // Periodic voice line playback
  useEffect(() => {
    if (!audioEnabled) return;

    // First line after 8 seconds
    const initialTimeout = setTimeout(() => playVoiceLine(), 8000);

    // Then every 35-70 seconds
    intervalRef.current = setInterval(() => {
      if (!isSpeaking) {
        const extraDelay = Math.random() * 25000;
        setTimeout(() => playVoiceLine(), extraDelay);
      }
    }, 35000);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
    };
  }, [audioEnabled, playVoiceLine, isSpeaking]);

  // Enable audio on user interaction
  const handleEnableAudio = () => {
    setAudioEnabled(true);
    // Play immediately on click
    setTimeout(() => playVoiceLine(), 500);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">

      {/* ─── Layer 0: Background Environment ─── */}
      <div className="absolute inset-0">
        {/* Deep gradient base */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-indigo-950/40 to-slate-950" />

        {/* Neon grid floor (perspective) */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1/2 opacity-15"
          style={{
            backgroundImage: 'linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
            transform: 'perspective(400px) rotateX(55deg)',
            transformOrigin: 'bottom center',
          }}
        />

        {/* Ambient neon glow blobs */}
        <div
          className="absolute top-[15%] left-[15%] w-80 h-80 bg-indigo-600/20 rounded-full blur-[100px]"
          style={{ animation: 'cam-glow-pulse 5s ease-in-out infinite' }}
        />
        <div
          className="absolute bottom-[20%] right-[10%] w-72 h-72 bg-purple-600/15 rounded-full blur-[80px]"
          style={{ animation: 'cam-glow-pulse 7s ease-in-out infinite 1s' }}
        />
        <div
          className="absolute top-[40%] right-[30%] w-48 h-48 bg-pink-500/10 rounded-full blur-[60px]"
          style={{ animation: 'cam-glow-pulse 6s ease-in-out infinite 2s' }}
        />
      </div>

      {/* ─── Layer 1: Holographic Screens ─── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Left floating screen */}
        <div
          className="absolute left-[5%] top-[20%] w-24 h-36 md:w-32 md:h-48 rounded-lg border border-indigo-500/20 bg-indigo-900/10 backdrop-blur-[2px] opacity-30"
          style={{ animation: 'cam-float-slow 8s ease-in-out infinite' }}
        >
          <div className="p-2 space-y-1.5">
            <div className="h-0.5 w-full bg-emerald-400/40 rounded" />
            <div className="h-0.5 w-3/4 bg-emerald-400/25 rounded" />
            <div className="h-0.5 w-1/2 bg-red-400/25 rounded" />
            <div className="h-0.5 w-5/6 bg-emerald-400/30 rounded" />
            <div className="h-0.5 w-2/3 bg-indigo-400/20 rounded" />
          </div>
        </div>

        {/* Right floating screen */}
        <div
          className="absolute right-[6%] top-[25%] w-20 h-32 md:w-28 md:h-40 rounded-lg border border-purple-500/15 bg-purple-900/10 backdrop-blur-[2px] opacity-25"
          style={{ animation: 'cam-float-reverse 9s ease-in-out infinite' }}
        >
          <div className="p-2 space-y-1.5">
            <div className="h-0.5 w-full bg-indigo-400/30 rounded" />
            <div className="h-0.5 w-2/3 bg-indigo-400/20 rounded" />
            <div className="h-0.5 w-4/5 bg-purple-400/20 rounded" />
          </div>
        </div>

        {/* Small floating element */}
        <div
          className="absolute left-[12%] bottom-[30%] w-16 h-12 rounded border border-cyan-500/15 bg-cyan-900/5 opacity-20"
          style={{ animation: 'cam-float-slow 10s ease-in-out infinite 3s' }}
        />
      </div>

      {/* ─── Layer 2: Character Portrait ─── */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative"
          style={{ animation: 'cam-breathe 5s ease-in-out infinite' }}
        >
          {/* Audio-reactive glow rings (when speaking) */}
          {isSpeaking && (
            <>
              <div
                className="absolute inset-[-16px] rounded-full border border-indigo-400/40 pointer-events-none"
                style={{
                  transform: `scale(${1 + audioLevel * 0.12})`,
                  opacity: 0.2 + audioLevel * 0.6,
                  boxShadow: `0 0 ${15 + audioLevel * 35}px rgba(99,102,241,${audioLevel * 0.5}), inset 0 0 ${10 + audioLevel * 20}px rgba(99,102,241,${audioLevel * 0.2})`,
                  transition: 'all 0.08s ease-out',
                }}
              />
              <div
                className="absolute inset-[-32px] rounded-full border border-purple-400/20 pointer-events-none"
                style={{
                  transform: `scale(${1 + audioLevel * 0.08})`,
                  opacity: audioLevel * 0.4,
                  transition: 'all 0.12s ease-out',
                }}
              />
            </>
          )}

          {/* Ambient portrait glow (always on) */}
          <div
            className="absolute inset-[-8px] rounded-full pointer-events-none"
            style={{
              background: isSpeaking
                ? `radial-gradient(circle, rgba(99,102,241,${0.15 + audioLevel * 0.25}) 0%, transparent 70%)`
                : 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
              transition: 'all 0.3s ease-out',
            }}
          />

          {/* The portrait image */}
          {portraitUrl ? (
            <div className="w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-full overflow-hidden relative shadow-2xl shadow-indigo-500/20 border-2 border-white/5">
              <Image
                src={portraitUrl}
                alt={characterName}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 640px) 256px, (max-width: 768px) 288px, (max-width: 1024px) 320px, 384px"
              />
            </div>
          ) : (
            <div className="w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-full bg-slate-800/80 border-2 border-white/5 flex items-center justify-center text-8xl text-white font-black shadow-2xl">
              {characterName[0]}
            </div>
          )}
        </div>
      </div>

      {/* ─── Layer 3: Floating Particles ─── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <div
            key={p.id}
            className={`absolute rounded-full ${p.hue}`}
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              animation: `cam-particle-drift ${p.duration}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* ─── Layer 4: Caption Overlay ─── */}
      {currentCaption && (
        <div
          className="absolute bottom-24 left-0 right-0 flex justify-center px-6 z-20"
          style={{ animation: 'cam-caption-in 0.4s ease-out' }}
        >
          <div className="bg-black/60 backdrop-blur-md rounded-2xl px-5 py-3 max-w-md border border-white/5">
            <div className="flex items-start gap-2">
              {isSpeaking && (
                <div className="flex items-center gap-0.5 mt-1 shrink-0">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-0.5 bg-indigo-400 rounded-full"
                      style={{
                        height: `${6 + audioLevel * 12 + Math.random() * 4}px`,
                        transition: 'height 0.1s ease-out',
                      }}
                    />
                  ))}
                </div>
              )}
              <p className="text-white/90 text-sm font-medium leading-relaxed">{currentCaption}</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Layer 5: Stream Overlay UI ─── */}
      <div className="absolute inset-0 p-4 md:p-6 pointer-events-none flex flex-col justify-between z-10">
        {/* Top bar */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-2">
            {/* Live badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 shadow-lg backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">Live</span>
            </div>

            {/* Speaking indicator */}
            {isSpeaking && (
              <div className="px-3 py-1 rounded-full bg-indigo-600/90 backdrop-blur-sm text-[10px] font-black text-white uppercase tracking-wider self-start shadow-lg shadow-indigo-500/30">
                <span className="flex items-center gap-1.5">
                  <span className="flex gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-0.5 inline-block bg-white rounded-full animate-pulse"
                        style={{
                          height: '8px',
                          animationDelay: `${i * 150}ms`,
                          animationDuration: '0.6s',
                        }}
                      />
                    ))}
                  </span>
                  Speaking
                </span>
              </div>
            )}
          </div>

          {/* Audio toggle + fullscreen */}
          <div className="flex gap-2">
            {/* Audio toggle button */}
            <button
              onClick={audioEnabled ? () => setAudioEnabled(false) : handleEnableAudio}
              className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/50 transition-colors pointer-events-auto cursor-pointer border border-white/10"
              title={audioEnabled ? 'Mute' : 'Enable audio'}
            >
              {audioEnabled ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              )}
            </button>

            {/* Fullscreen button */}
            <button className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/50 transition-colors pointer-events-auto cursor-pointer border border-white/10">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex justify-between items-end">
          {/* Viewers */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-7 h-7 rounded-full border-2 border-slate-900 bg-slate-700 overflow-hidden relative shadow-md">
                  <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=viewer${i}`} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
            <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm text-xs font-bold text-white border border-white/5">
              {viewerCount.toLocaleString()} watching
            </span>
          </div>

          {/* Stream quality + signal */}
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-[10px] font-bold tracking-widest uppercase bg-black/30 backdrop-blur-sm px-3 py-1 rounded-lg border border-white/5">
              HD
            </span>
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Audio Enable Prompt (when audio is off) ─── */}
      {!audioEnabled && (
        <div className="absolute inset-0 flex items-end justify-center pb-32 z-30 pointer-events-none">
          <button
            onClick={handleEnableAudio}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600/80 backdrop-blur-md text-white text-sm font-semibold hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/30 border border-indigo-400/20 animate-pulse"
            style={{ animationDuration: '2s' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
            Tap to hear {characterName} speak
          </button>
        </div>
      )}

      {/* ─── Vignette ─── */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_120px_rgba(0,0,0,0.4)]" />
    </div>
  );
}
