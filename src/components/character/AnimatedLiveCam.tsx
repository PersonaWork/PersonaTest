'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';

/* ─── Types ─── */

interface VoiceLineManifest {
  id: string;
  text: string;
  file: string;
}

interface AnimationClip {
  id: string;
  videoUrl: string;
  duration: number;
}

interface AnimatedLiveCamProps {
  slug: string;
  characterName: string;
  personality: Record<string, unknown>;
  portraitUrl: string;
}

/* ─── Constants ─── */

// Crossfade duration in ms — how long both videos overlap
const CROSSFADE_MS = 1200;
// How early (in seconds) before a video ends we start loading the next
const PRELOAD_BUFFER_S = 1.5;

/* ─── Voice Lines ─── */

const FALLBACK_VOICE_LINES: VoiceLineManifest[] = [
  { id: 'welcome', text: "Oh hey! Welcome to the stream, you're just in time because things are about to get chaotic.", file: '/audio/aria/welcome.mp3' },
  { id: 'charts-spicy', text: "The charts are looking absolutely spicy right now and I need everyone to act accordingly.", file: '/audio/aria/charts-spicy.mp3' },
  { id: 'gerald', text: "Gerald thinks he can out-trade me. Gerald. Please.", file: '/audio/aria/gerald.mp3' },
  { id: 'vibes', text: "The vibes in here are absolutely immaculate. We're so back.", file: '/audio/aria/vibes.mp3' },
  { id: 'prophecy', text: "This is not financial advice. This is financial prophecy.", file: '/audio/aria/prophecy.mp3' },
  { id: 'so-back', text: "We are so unbelievably back right now.", file: '/audio/aria/so-back.mp3' },
  { id: 'cat', text: "My cat just walked across my keyboard and somehow made a better trade than half of you.", file: '/audio/aria/cat.mp3' },
  { id: 'alpha-drop', text: "I just had the craziest alpha download and I literally cannot keep this to myself.", file: '/audio/aria/alpha-drop.mp3' },
  { id: 'main-character', text: "It's giving main character energy today and honestly? We deserve this.", file: '/audio/aria/main-character.mp3' },
  { id: 'buy-more', text: "What if we just... bought more? Revolutionary strategy, I know.", file: '/audio/aria/buy-more.mp3' },
  { id: 'staring', text: "I've been staring at this chart for three hours and I think I've achieved enlightenment.", file: '/audio/aria/staring.mp3' },
  { id: 'three-am', text: "What if money isn't even real? Anyway, we need more of it.", file: '/audio/aria/three-am.mp3' },
];

/* ─── Particles ─── */

function generateParticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: 30 + Math.random() * 60,
    size: 1 + Math.random() * 2,
    duration: 4 + Math.random() * 6,
    delay: Math.random() * 8,
    hue: Math.random() > 0.5 ? 'bg-indigo-400/30' : 'bg-purple-400/20',
  }));
}

/* ─── Component ─── */

export default function AnimatedLiveCam({
  slug,
  characterName,
  personality: _personality,
  portraitUrl,
}: AnimatedLiveCamProps) {
  // ── Video state ──
  const [idleClips, setIdleClips] = useState<AnimationClip[]>([]);
  const [activeSlot, setActiveSlot] = useState<'A' | 'B'>('A');
  const [clipUrlA, setClipUrlA] = useState('');
  const [clipUrlB, setClipUrlB] = useState('');
  const [opacityA, setOpacityA] = useState(1);
  const [opacityB, setOpacityB] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const lastClipIndexRef = useRef(-1);
  const crossfadingRef = useRef(false);

  const videoRefA = useRef<HTMLVideoElement>(null);
  const videoRefB = useRef<HTMLVideoElement>(null);

  // ── Voice state ──
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [viewerCount, setViewerCount] = useState(1247);
  const [currentCaption, setCurrentCaption] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [voiceLines, setVoiceLines] = useState<VoiceLineManifest[]>(FALLBACK_VOICE_LINES);
  const [lastLineIndex, setLastLineIndex] = useState(-1);

  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const particles = useMemo(() => generateParticles(12), []);

  // ── Pick a random clip (different from last) ──
  const pickRandomClip = useCallback((): AnimationClip | null => {
    if (idleClips.length === 0) return null;
    let idx = Math.floor(Math.random() * idleClips.length);
    if (idx === lastClipIndexRef.current && idleClips.length > 1) {
      idx = (idx + 1) % idleClips.length;
    }
    lastClipIndexRef.current = idx;
    return idleClips[idx];
  }, [idleClips]);

  // ── Fetch idle clips on mount ──
  useEffect(() => {
    async function fetchClips() {
      try {
        const res = await fetch(`/api/characters/${slug}/animations`);
        if (!res.ok) return;
        const json = await res.json();
        const data = json.success ? json.data : json;
        if (!data?.clips) return;

        // Gather all idle-type clips (idle, idle-breathe-1, idle-breathe-2, etc.)
        const allIdle: AnimationClip[] = [];
        for (const [type, clips] of Object.entries(data.clips)) {
          if (type === 'idle' || type.startsWith('idle-')) {
            allIdle.push(...(clips as AnimationClip[]));
          }
        }

        if (allIdle.length > 0) {
          setIdleClips(allIdle);
          // Start first clip
          const first = allIdle[Math.floor(Math.random() * allIdle.length)];
          lastClipIndexRef.current = allIdle.indexOf(first);
          setClipUrlA(first.videoUrl);
          setVideoReady(true);
        }
      } catch {
        // Clips not available — show portrait fallback
      }
    }
    fetchClips();
  }, [slug]);

  // ── Crossfade Logic ──
  // When the active video nears its end, start the next clip in the other slot
  const startCrossfade = useCallback(() => {
    if (crossfadingRef.current || idleClips.length < 2) return;
    crossfadingRef.current = true;

    const nextClip = pickRandomClip();
    if (!nextClip) { crossfadingRef.current = false; return; }

    if (activeSlot === 'A') {
      // Load into B, fade B in
      setClipUrlB(nextClip.videoUrl);
      // Small delay for video to start loading
      setTimeout(() => {
        videoRefB.current?.play().catch(() => {});
        setOpacityB(1);
        setOpacityA(0);
        // After crossfade completes, switch active slot
        setTimeout(() => {
          setActiveSlot('B');
          crossfadingRef.current = false;
        }, CROSSFADE_MS);
      }, 100);
    } else {
      // Load into A, fade A in
      setClipUrlA(nextClip.videoUrl);
      setTimeout(() => {
        videoRefA.current?.play().catch(() => {});
        setOpacityA(1);
        setOpacityB(0);
        setTimeout(() => {
          setActiveSlot('A');
          crossfadingRef.current = false;
        }, CROSSFADE_MS);
      }, 100);
    }
  }, [activeSlot, idleClips, pickRandomClip]);

  // ── TimeUpdate handler — triggers crossfade before clip ends ──
  const handleTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (!video.duration || crossfadingRef.current) return;
    const remaining = video.duration - video.currentTime;
    if (remaining <= PRELOAD_BUFFER_S && idleClips.length >= 2) {
      startCrossfade();
    }
  }, [startCrossfade, idleClips]);

  // ── If only 1 clip, just loop it ──
  const handleVideoEnd = useCallback((slot: 'A' | 'B') => {
    if (idleClips.length < 2) {
      // Single clip — just loop
      const ref = slot === 'A' ? videoRefA : videoRefB;
      if (ref.current) {
        ref.current.currentTime = 0;
        ref.current.play().catch(() => {});
      }
    }
  }, [idleClips]);

  // ── Load voice line manifest ──
  useEffect(() => {
    fetch('/audio/aria/manifest.json')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data && Array.isArray(data)) setVoiceLines(data); })
      .catch(() => {});
  }, []);

  // ── Simulated viewer count ──
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount((prev) => Math.max(100, prev + Math.floor(Math.random() * 21) - 10));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // ── Play a voice line ──
  const playVoiceLine = useCallback(() => {
    if (isSpeaking || !audioEnabled || voiceLines.length === 0) return;

    let idx = Math.floor(Math.random() * voiceLines.length);
    if (idx === lastLineIndex && voiceLines.length > 1) {
      idx = (idx + 1) % voiceLines.length;
    }
    setLastLineIndex(idx);
    const line = voiceLines[idx];
    const audio = new Audio(line.file);
    audio.crossOrigin = 'anonymous';

    setIsSpeaking(true);
    setCurrentCaption(line.text);

    // Web Audio API for visualization
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
      // Fallback: simulate
      const fake = setInterval(() => setAudioLevel(0.3 + Math.random() * 0.5), 100);
      audio.onended = () => clearInterval(fake);
    }

    audio.play().catch(() => {
      // Autoplay blocked — simulate
      const fake = setInterval(() => setAudioLevel(0.2 + Math.random() * 0.6), 100);
      setTimeout(() => { clearInterval(fake); setIsSpeaking(false); setAudioLevel(0); setCurrentCaption(''); }, 6000);
    });

    audio.onended = () => {
      setIsSpeaking(false);
      setAudioLevel(0);
      cancelAnimationFrame(animFrameRef.current);
      speakingTimeoutRef.current = setTimeout(() => setCurrentCaption(''), 1500);
    };

    audio.onerror = () => {
      setIsSpeaking(false);
      setAudioLevel(0);
      setCurrentCaption('');
    };
  }, [isSpeaking, audioEnabled, voiceLines, lastLineIndex]);

  // ── Periodic voice lines ──
  useEffect(() => {
    if (!audioEnabled) return;
    const initial = setTimeout(() => playVoiceLine(), 8000);
    const interval = setInterval(() => {
      if (!isSpeaking) {
        const delay = Math.random() * 25000;
        setTimeout(() => playVoiceLine(), delay);
      }
    }, 35000);
    return () => { clearTimeout(initial); clearInterval(interval); };
  }, [audioEnabled, playVoiceLine, isSpeaking]);

  const handleEnableAudio = () => {
    setAudioEnabled(true);
    setTimeout(() => playVoiceLine(), 500);
  };

  /* ─── Render ─── */

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">

      {/* ═══ Video Layer: Crossfading Dual Player ═══ */}
      {videoReady ? (
        <div className="absolute inset-0">
          {/* Video A */}
          <video
            ref={videoRefA}
            key={`A-${clipUrlA}`}
            src={clipUrlA}
            autoPlay
            muted
            playsInline
            onTimeUpdate={activeSlot === 'A' ? handleTimeUpdate : undefined}
            onEnded={() => handleVideoEnd('A')}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: opacityA,
              transition: `opacity ${CROSSFADE_MS}ms ease-in-out`,
            }}
          />
          {/* Video B */}
          {clipUrlB && (
            <video
              ref={videoRefB}
              key={`B-${clipUrlB}`}
              src={clipUrlB}
              muted
              playsInline
              onTimeUpdate={activeSlot === 'B' ? handleTimeUpdate : undefined}
              onEnded={() => handleVideoEnd('B')}
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                opacity: opacityB,
                transition: `opacity ${CROSSFADE_MS}ms ease-in-out`,
              }}
            />
          )}
        </div>
      ) : (
        /* ═══ Fallback: Animated Portrait ═══ */
        <div className="absolute inset-0">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-indigo-950/40 to-slate-950" />
          <div
            className="absolute bottom-0 left-0 right-0 h-1/2 opacity-15"
            style={{
              backgroundImage: 'linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)',
              backgroundSize: '50px 50px',
              transform: 'perspective(400px) rotateX(55deg)',
              transformOrigin: 'bottom center',
            }}
          />
          <div className="absolute top-[15%] left-[15%] w-80 h-80 bg-indigo-600/20 rounded-full blur-[100px]" style={{ animation: 'cam-glow-pulse 5s ease-in-out infinite' }} />
          <div className="absolute bottom-[20%] right-[10%] w-72 h-72 bg-purple-600/15 rounded-full blur-[80px]" style={{ animation: 'cam-glow-pulse 7s ease-in-out infinite 1s' }} />

          {/* Portrait */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div style={{ animation: 'cam-breathe 5s ease-in-out infinite' }}>
              {portraitUrl ? (
                <div className="w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-full overflow-hidden relative shadow-2xl shadow-indigo-500/20 border-2 border-white/5">
                  <Image src={portraitUrl} alt={characterName} fill className="object-cover" priority sizes="384px" />
                </div>
              ) : (
                <div className="w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-full bg-slate-800/80 border-2 border-white/5 flex items-center justify-center text-8xl text-white font-black shadow-2xl">
                  {characterName[0]}
                </div>
              )}
            </div>
          </div>

          {/* Particles */}
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
        </div>
      )}

      {/* ═══ Caption Overlay (when speaking) ═══ */}
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

      {/* ═══ Stream Overlay UI ═══ */}
      <div className="absolute inset-0 p-4 md:p-6 pointer-events-none flex flex-col justify-between z-10">
        {/* Top bar */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 shadow-lg backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">Live</span>
            </div>
            {isSpeaking && (
              <div className="px-3 py-1 rounded-full bg-indigo-600/90 backdrop-blur-sm text-[10px] font-black text-white uppercase tracking-wider self-start shadow-lg shadow-indigo-500/30">
                <span className="flex items-center gap-1.5">
                  <span className="flex gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-0.5 inline-block bg-white rounded-full animate-pulse" style={{ height: '8px', animationDelay: `${i * 150}ms`, animationDuration: '0.6s' }} />
                    ))}
                  </span>
                  Speaking
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
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
            <button className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/50 transition-colors pointer-events-auto cursor-pointer border border-white/10">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex justify-between items-end">
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

      {/* ═══ Audio Enable Prompt ═══ */}
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

      {/* ═══ Vignette ═══ */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_80px_rgba(0,0,0,0.3)]" />
    </div>
  );
}
