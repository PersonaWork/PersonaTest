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

/** Near-instant swap — idle and talk clips share the same base video
 *  (body/background identical) so hard cuts are invisible. */
const SWAP_MS = 0;

/** Start preloading the next idle clip before current ends */
const PRELOAD_AHEAD_S = 3.0;

/** Max time to wait for video to buffer before forcing swap */
const PRELOAD_TIMEOUT_MS = 6000;

/* ─── Voice Lines ─── */

const FALLBACK_VOICE_LINES: VoiceLineManifest[] = [
  { id: 'welcome', text: "Welcome to the stream! I hope you brought snacks because we're gonna be here a while.", file: '/audio/aria/welcome.mp3' },
  { id: 'plot-twist', text: "Plot twist! Nobody saw that coming. Actually I did, because I'm literally psychic at this point.", file: '/audio/aria/plot-twist.mp3' },
  { id: 'bestie', text: "You are now my bestie. I don't make the rules. Actually I do make the rules. You're welcome.", file: '/audio/aria/bestie.mp3' },
  { id: 'sleep', text: "Sleep is for people who don't have a thousand tabs open and a dream. I have both.", file: '/audio/aria/sleep.mp3' },
  { id: 'brain', text: "My brain just had a thought so powerful it needs its own zip code. Hold on let me process.", file: '/audio/aria/brain.mp3' },
  { id: 'chaos', text: "The chaos levels in here are reaching critical mass and I am absolutely living for it.", file: '/audio/aria/chaos.mp3' },
  { id: 'snack', text: "I just realized I forgot to eat today. Someone remind me that food exists please and thank you.", file: '/audio/aria/snack.mp3' },
  { id: 'vibe-check', text: "Vibe check! If you're not smiling right now I'm taking it personally. Fix that immediately.", file: '/audio/aria/vibe-check.mp3' },
  { id: 'galaxy-brain', text: "That is the most galaxy brain take I have ever heard and I need you to say it again louder.", file: '/audio/aria/galaxy-brain.mp3' },
  { id: 'story', text: "Okay storytime! So this one time I accidentally went viral and my life has not been the same since.", file: '/audio/aria/story.mp3' },
  { id: 'legend', text: "If you just got here you're already a legend. Late arrivals get extra points in my book.", file: '/audio/aria/legend.mp3' },
  { id: 'slay', text: "Today's goal is to absolutely slay everything we touch. No pressure. Just pure unfiltered greatness.", file: '/audio/aria/slay.mp3' },
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

/* ═══════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════ */

export default function AnimatedLiveCam({
  slug,
  characterName,
  personality: _personality,
  portraitUrl,
}: AnimatedLiveCamProps) {
  /* ─── Clip data ─── */
  const [idleClips, setIdleClips] = useState<AnimationClip[]>([]);
  // Map: voiceLineId → AnimationClip (lip-synced talking clip)
  const [talkClips, setTalkClips] = useState<Map<string, AnimationClip>>(new Map());

  /* ─── UI state ─── */
  const [videoReady, setVideoReady] = useState(false);

  /* ─── Voice state ─── */
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [viewerCount, setViewerCount] = useState(1247);
  const [currentCaption, setCurrentCaption] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [voiceLines, setVoiceLines] = useState<VoiceLineManifest[]>(FALLBACK_VOICE_LINES);
  const [lastLineIndex, setLastLineIndex] = useState(-1);

  /* ─── Imperative refs ─── */
  const videoRefA = useRef<HTMLVideoElement>(null);
  const videoRefB = useRef<HTMLVideoElement>(null);
  const activeSlotRef = useRef<'A' | 'B'>('A');
  const swappingRef = useRef(false);
  const lastIdleIndexRef = useRef(-1);
  const mountedRef = useRef(true);
  const isTalkingRef = useRef(false); // true when a talk clip is playing

  const idleClipsRef = useRef<AnimationClip[]>([]);
  const talkClipsRef = useRef<Map<string, AnimationClip>>(new Map());
  useEffect(() => { idleClipsRef.current = idleClips; }, [idleClips]);
  useEffect(() => { talkClipsRef.current = talkClips; }, [talkClips]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const particles = useMemo(() => generateParticles(12), []);

  /* ─── Cleanup ─── */
  useEffect(() => () => { mountedRef.current = false; }, []);

  /* ─── Set initial opacity ─── */
  useEffect(() => {
    if (videoRefA.current) videoRefA.current.style.opacity = '0';
    if (videoRefB.current) videoRefB.current.style.opacity = '0';
  }, []);

  /* ─── Pick next idle clip (random, avoid repeat) ─── */
  const pickNextIdle = useCallback((): AnimationClip | null => {
    const idle = idleClipsRef.current;
    if (idle.length === 0) return null;
    let idx = Math.floor(Math.random() * idle.length);
    if (idx === lastIdleIndexRef.current && idle.length > 1)
      idx = (idx + 1) % idle.length;
    lastIdleIndexRef.current = idx;
    return idle[idx];
  }, []);

  /* ─── Swap to a clip on the inactive slot ─── */
  const swapToClip = useCallback((clip: AnimationClip, onSwapped?: () => void) => {
    if (swappingRef.current || !mountedRef.current) return;
    swappingRef.current = true;

    const isA = activeSlotRef.current === 'A';
    const incoming = isA ? videoRefB.current : videoRefA.current;
    const outgoing = isA ? videoRefA.current : videoRefB.current;
    if (!incoming || !outgoing) { swappingRef.current = false; return; }

    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const doSwap = () => {
      if (settled || !mountedRef.current) return;
      settled = true;
      clearTimeout(timeoutId);
      incoming.removeEventListener('canplay', doSwap);
      incoming.removeEventListener('error', onError);

      incoming.play().catch(() => {});

      // Instant swap — clips share same base so no visible cut
      requestAnimationFrame(() => {
        if (!mountedRef.current) return;
        incoming.style.opacity = '1';
        outgoing.style.opacity = '0';

        setTimeout(() => {
          if (!mountedRef.current) return;
          activeSlotRef.current = isA ? 'B' : 'A';
          outgoing.pause();
          swappingRef.current = false;
          onSwapped?.();
        }, SWAP_MS + 50);
      });
    };

    const onError = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      incoming.removeEventListener('canplay', doSwap);
      incoming.removeEventListener('error', onError);
      swappingRef.current = false;
    };

    incoming.addEventListener('canplay', doSwap, { once: true });
    incoming.addEventListener('error', onError, { once: true });
    timeoutId = setTimeout(() => { if (!settled) doSwap(); }, PRELOAD_TIMEOUT_MS);

    incoming.src = clip.videoUrl;
    incoming.load();
  }, []);

  /* ─── Swap to next idle clip ─── */
  const swapToNextIdle = useCallback(() => {
    if (isTalkingRef.current) return; // Don't interrupt talk clips
    const next = pickNextIdle();
    if (next) swapToClip(next);
  }, [pickNextIdle, swapToClip]);

  /* ─── Swap to a talk clip for a specific voice line ─── */
  const swapToTalkClip = useCallback((voiceLineId: string) => {
    const clip = talkClipsRef.current.get(voiceLineId);
    if (!clip) return false; // No matching lip-sync clip
    isTalkingRef.current = true;
    swapToClip(clip);
    return true;
  }, [swapToClip]);

  /* ─── Return to idle when talk ends ─── */
  const returnToIdle = useCallback(() => {
    isTalkingRef.current = false;
    const next = pickNextIdle();
    if (next) swapToClip(next);
  }, [pickNextIdle, swapToClip]);

  /* ─── Video event listeners ─── */
  useEffect(() => {
    const a = videoRefA.current;
    const b = videoRefB.current;
    if (!a || !b) return;

    const onTimeUpdate = (e: Event) => {
      const video = e.target as HTMLVideoElement;
      if (!video.duration || swappingRef.current) return;

      const isActive =
        (activeSlotRef.current === 'A' && video === a) ||
        (activeSlotRef.current === 'B' && video === b);
      if (!isActive) return;

      // Only auto-advance idle clips — talk clips play once then return to idle
      if (isTalkingRef.current) return;

      if (video.duration - video.currentTime <= PRELOAD_AHEAD_S) {
        swapToNextIdle();
      }
    };

    const onEnded = (e: Event) => {
      const video = e.target as HTMLVideoElement;

      if (isTalkingRef.current) {
        // Talk clip ended — return to idle
        returnToIdle();
        return;
      }

      const total = idleClipsRef.current.length;
      if (total < 2) {
        video.currentTime = 0;
        video.play().catch(() => {});
        return;
      }

      if (!swappingRef.current) swapToNextIdle();
    };

    a.addEventListener('timeupdate', onTimeUpdate);
    b.addEventListener('timeupdate', onTimeUpdate);
    a.addEventListener('ended', onEnded);
    b.addEventListener('ended', onEnded);

    return () => {
      a.removeEventListener('timeupdate', onTimeUpdate);
      b.removeEventListener('timeupdate', onTimeUpdate);
      a.removeEventListener('ended', onEnded);
      b.removeEventListener('ended', onEnded);
    };
  }, [swapToNextIdle, returnToIdle]);

  /* ─── Fetch clips on mount ─── */
  useEffect(() => {
    let cancelled = false;

    async function fetchClips() {
      try {
        const res = await fetch(`/api/characters/${slug}/animations`);
        if (!res.ok || cancelled) return;
        const json = await res.json();
        const data = json.success ? json.data : json;
        if (!data?.clips || cancelled) return;

        const idle: AnimationClip[] = [];
        const talk = new Map<string, AnimationClip>();

        for (const [type, clips] of Object.entries(data.clips)) {
          const clipArray = clips as AnimationClip[];
          if (type.startsWith('idle')) {
            idle.push(...clipArray);
          } else if (type.startsWith('talk-')) {
            // talk-{voiceLineId} → map to voice line ID
            const voiceLineId = type.replace('talk-', '');
            if (clipArray.length > 0) talk.set(voiceLineId, clipArray[0]);
          }
        }

        if (idle.length === 0 || cancelled) return;

        setIdleClips(idle);
        setTalkClips(talk);

        // Start the first clip on video A
        const first = idle[Math.floor(Math.random() * idle.length)];
        lastIdleIndexRef.current = idle.indexOf(first);

        const a = videoRefA.current;
        if (!a || cancelled) return;

        const onFirstReady = () => {
          if (cancelled) return;
          a.removeEventListener('canplay', onFirstReady);
          a.removeEventListener('error', onFirstError);
          a.style.opacity = '1';
          a.play().catch(() => {});
          setVideoReady(true);
        };

        const onFirstError = () => {
          a.removeEventListener('canplay', onFirstReady);
          a.removeEventListener('error', onFirstError);
        };

        a.addEventListener('canplay', onFirstReady, { once: true });
        a.addEventListener('error', onFirstError, { once: true });
        a.src = first.videoUrl;
        a.load();
      } catch {
        // Silently fail — portrait fallback stays visible
      }
    }

    fetchClips();
    return () => { cancelled = true; };
  }, [slug]);

  /* ─── Voice manifest ─── */
  useEffect(() => {
    fetch('/audio/aria/manifest.json')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data && Array.isArray(data)) setVoiceLines(data); })
      .catch(() => {});
  }, []);

  /* ─── Viewer count ─── */
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount((prev) => Math.max(100, prev + Math.floor(Math.random() * 21) - 10));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  /* ─── Play voice line + swap to matching lip-sync clip ─── */
  const playVoiceLine = useCallback(() => {
    if (isSpeaking || !audioEnabled || voiceLines.length === 0) return;

    let idx = Math.floor(Math.random() * voiceLines.length);
    if (idx === lastLineIndex && voiceLines.length > 1) idx = (idx + 1) % voiceLines.length;
    setLastLineIndex(idx);
    const line = voiceLines[idx];
    const audio = new Audio(line.file);
    audio.crossOrigin = 'anonymous';

    setIsSpeaking(true);
    setCurrentCaption(line.text);

    // Swap to matching lip-sync clip
    swapToTalkClip(line.id);

    try {
      if (!audioContextRef.current) audioContextRef.current = new AudioContext();
      const ctx = audioContextRef.current;
      const source = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      const updateLevel = () => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        setAudioLevel(data.reduce((a, b) => a + b, 0) / data.length / 255);
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch {
      const fake = setInterval(() => setAudioLevel(0.3 + Math.random() * 0.5), 100);
      audio.onended = () => clearInterval(fake);
    }

    audio.play().catch(() => {
      const fake = setInterval(() => setAudioLevel(0.2 + Math.random() * 0.6), 100);
      setTimeout(() => { clearInterval(fake); setIsSpeaking(false); setAudioLevel(0); setCurrentCaption(''); returnToIdle(); }, 6000);
    });

    audio.onended = () => {
      setIsSpeaking(false);
      setAudioLevel(0);
      cancelAnimationFrame(animFrameRef.current);
      speakingTimeoutRef.current = setTimeout(() => setCurrentCaption(''), 1500);
      // Return to idle after voice line ends
      returnToIdle();
    };

    audio.onerror = () => { setIsSpeaking(false); setAudioLevel(0); setCurrentCaption(''); returnToIdle(); };
  }, [isSpeaking, audioEnabled, voiceLines, lastLineIndex, swapToTalkClip, returnToIdle]);

  /* ─── Periodic voice lines ─── */
  useEffect(() => {
    if (!audioEnabled) return;
    const initial = setTimeout(() => playVoiceLine(), 8000);
    const interval = setInterval(() => {
      if (!isSpeaking) setTimeout(() => playVoiceLine(), Math.random() * 25000);
    }, 35000);
    return () => { clearTimeout(initial); clearInterval(interval); };
  }, [audioEnabled, playVoiceLine, isSpeaking]);

  const handleEnableAudio = () => {
    setAudioEnabled(true);
    setTimeout(() => playVoiceLine(), 500);
  };

  /* ═══════════════════ Render ═══════════════════ */

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">

      {/* ═══ Video Layer ═══ */}
      <div
        className="absolute inset-0"
        style={{ visibility: videoReady ? 'visible' : 'hidden' }}
      >
        <video
          ref={videoRefA}
          muted
          playsInline
          crossOrigin="anonymous"
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transition: `opacity ${SWAP_MS}ms linear` }}
        />
        <video
          ref={videoRefB}
          muted
          playsInline
          crossOrigin="anonymous"
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transition: `opacity ${SWAP_MS}ms linear` }}
        />
      </div>

      {/* ═══ Fallback: Animated Portrait ═══ */}
      {!videoReady && (
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-indigo-950/40 to-slate-950" />
          <div className="absolute bottom-0 left-0 right-0 h-1/2 opacity-15" style={{
            backgroundImage: 'linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)',
            backgroundSize: '50px 50px', transform: 'perspective(400px) rotateX(55deg)', transformOrigin: 'bottom center',
          }} />
          <div className="absolute top-[15%] left-[15%] w-80 h-80 bg-indigo-600/20 rounded-full blur-[100px]" style={{ animation: 'cam-glow-pulse 5s ease-in-out infinite' }} />
          <div className="absolute bottom-[20%] right-[10%] w-72 h-72 bg-purple-600/15 rounded-full blur-[80px]" style={{ animation: 'cam-glow-pulse 7s ease-in-out infinite 1s' }} />
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
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {particles.map((p) => (
              <div key={p.id} className={`absolute rounded-full ${p.hue}`} style={{
                left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size,
                animation: `cam-particle-drift ${p.duration}s ease-in-out infinite`, animationDelay: `${p.delay}s`,
              }} />
            ))}
          </div>
        </div>
      )}

      {/* ═══ Caption Overlay ═══ */}
      {currentCaption && (
        <div className="absolute bottom-24 left-0 right-0 flex justify-center px-6 z-20" style={{ animation: 'cam-caption-in 0.4s ease-out' }}>
          <div className="bg-black/60 backdrop-blur-md rounded-2xl px-5 py-3 max-w-md border border-white/5">
            <div className="flex items-start gap-2">
              {isSpeaking && (
                <div className="flex items-center gap-0.5 mt-1 shrink-0">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="w-0.5 bg-indigo-400 rounded-full" style={{
                      height: `${6 + audioLevel * 12 + Math.random() * 4}px`, transition: 'height 0.1s ease-out',
                    }} />
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

            {/* Speaking indicator */}
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
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
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
            <span className="text-white/40 text-[10px] font-bold tracking-widest uppercase bg-black/30 backdrop-blur-sm px-3 py-1 rounded-lg border border-white/5">HD</span>
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
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
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
