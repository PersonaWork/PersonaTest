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

const PRELOAD_AHEAD_S = 2.5;
const PRELOAD_TIMEOUT_MS = 8000;

/* ─── Voice Lines (day trader Aria) ─── */

const FALLBACK_VOICE_LINES: VoiceLineManifest[] = [
  { id: 'welcome', text: "Welcome to the stream! Charts are looking spicy today and I am ready to make some moves.", file: '/audio/aria/welcome.mp3' },
  { id: 'green', text: "Oh we are so green right now. I told you. I literally told all of you this was the play.", file: '/audio/aria/green.mp3' },
  { id: 'dip', text: "Buy the dip they said. It'll be fun they said. And you know what? They were right. Again.", file: '/audio/aria/dip.mp3' },
  { id: 'candles', text: "These candles are beautiful. I could stare at a green candle all day. It's literally art.", file: '/audio/aria/candles.mp3' },
  { id: 'calls', text: "My calls have been hitting different lately. I'm not saying I'm a genius but I'm not not saying it.", file: '/audio/aria/calls.mp3' },
  { id: 'chart', text: "Hold on let me pull up this chart real quick because what I'm about to show you is insane.", file: '/audio/aria/chart.mp3' },
  { id: 'diamond', text: "Diamond hands don't even begin to describe it. I have diamond everything at this point.", file: '/audio/aria/diamond.mp3' },
  { id: 'morning', text: "Pre-market looking absolutely gorgeous today. I woke up and chose profits apparently.", file: '/audio/aria/morning.mp3' },
  { id: 'moon', text: "We are going to the moon. Actually forget the moon we're going past it. Next stop Mars.", file: '/audio/aria/moon.mp3' },
  { id: 'setup', text: "The setup is literally perfect right now. If you're not paying attention you're missing out.", file: '/audio/aria/setup.mp3' },
  { id: 'vibes', text: "The vibes in here are immaculate. Good trades, good people, good energy. This is what we do.", file: '/audio/aria/vibes.mp3' },
  { id: 'legend', text: "If you just joined, welcome legend. Pull up a chart and get comfortable because we're just getting started.", file: '/audio/aria/legend.mp3' },
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

   Architecture:
   - Two <video> elements (A & B), idle clips always muted
   - Idle clips loop seamlessly (all start/end at same pose)
   - Talk clips ARE the audio source — Kling lip-sync bakes the
     audio into the video, so we just unmute the video element.
     This guarantees PERFECT audio-lip sync (no separate mp3).
   - Talk clip force-interrupts any in-progress idle swap
   ═══════════════════════════════════════════════════════════════ */

export default function AnimatedLiveCam({
  slug,
  characterName,
  personality: _personality,
  portraitUrl,
}: AnimatedLiveCamProps) {
  const [idleClips, setIdleClips] = useState<AnimationClip[]>([]);
  const [talkClips, setTalkClips] = useState<Map<string, AnimationClip>>(new Map());
  const [videoReady, setVideoReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [viewerCount, setViewerCount] = useState(1247);
  const [currentCaption, setCurrentCaption] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [lastLineIndex, setLastLineIndex] = useState(-1);

  const videoRefA = useRef<HTMLVideoElement>(null);
  const videoRefB = useRef<HTMLVideoElement>(null);
  const activeSlotRef = useRef<'A' | 'B'>('A');
  const lastIdleIndexRef = useRef(-1);
  const mountedRef = useRef(true);
  const isTalkingRef = useRef(false);
  const swapCancelRef = useRef<(() => void) | null>(null);

  const idleClipsRef = useRef<AnimationClip[]>([]);
  const talkClipsRef = useRef<Map<string, AnimationClip>>(new Map());
  useEffect(() => { idleClipsRef.current = idleClips; }, [idleClips]);
  useEffect(() => { talkClipsRef.current = talkClips; }, [talkClips]);

  const fakeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const preloadedIdleRef = useRef<AnimationClip | null>(null);
  const preloadingRef = useRef(false);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const particles = useMemo(() => generateParticles(12), []);

  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    if (videoRefA.current) videoRefA.current.style.opacity = '0';
    if (videoRefB.current) videoRefB.current.style.opacity = '0';
  }, []);

  /* ─── Pick next idle ─── */
  const pickNextIdle = useCallback((): AnimationClip | null => {
    const idle = idleClipsRef.current;
    if (idle.length === 0) return null;
    let idx = Math.floor(Math.random() * idle.length);
    if (idx === lastIdleIndexRef.current && idle.length > 1)
      idx = (idx + 1) % idle.length;
    lastIdleIndexRef.current = idx;
    return idle[idx];
  }, []);

  /* ─── Swap video to a clip ───
   * Loads clip into inactive element, waits until playable, starts MUTED
   * (browsers always allow muted autoplay), then unmutes after playback
   * begins if unmuted=true. This bypasses autoplay restrictions. */
  const swapToClip = useCallback((clip: AnimationClip, force = false, unmuted = false) => {
    if (!mountedRef.current) return;

    if (swapCancelRef.current) {
      if (force) {
        swapCancelRef.current();
        swapCancelRef.current = null;
      } else {
        return;
      }
    }

    const isA = activeSlotRef.current === 'A';
    const incoming = isA ? videoRefB.current : videoRefA.current;
    const outgoing = isA ? videoRefA.current : videoRefB.current;
    if (!incoming || !outgoing) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    swapCancelRef.current = () => {
      cancelled = true;
      clearTimeout(timeoutId);
      incoming.removeEventListener('canplaythrough', onCanPlay);
      incoming.removeEventListener('canplay', onCanPlay);
      incoming.removeEventListener('error', onErr);
    };

    const finishSwap = () => {
      if (cancelled || !mountedRef.current) return;
      // Video is playing (muted) — now unmute if requested
      if (unmuted) incoming.muted = false;
      incoming.style.opacity = '1';
      outgoing.style.opacity = '0';
      outgoing.muted = true;
      outgoing.pause();
      activeSlotRef.current = isA ? 'B' : 'A';
      swapCancelRef.current = null;
    };

    const onCanPlay = () => {
      if (cancelled || !mountedRef.current) return;
      clearTimeout(timeoutId);
      incoming.removeEventListener('canplaythrough', onCanPlay);
      incoming.removeEventListener('canplay', onCanPlay);
      incoming.removeEventListener('error', onErr);

      // ALWAYS start muted — browsers allow muted autoplay
      incoming.muted = true;
      incoming.currentTime = 0;
      incoming.play().then(() => finishSwap()).catch(() => finishSwap());
    };

    const onErr = () => {
      if (cancelled) return;
      clearTimeout(timeoutId);
      incoming.removeEventListener('canplaythrough', onCanPlay);
      incoming.removeEventListener('canplay', onCanPlay);
      incoming.removeEventListener('error', onErr);
      swapCancelRef.current = null;
    };

    incoming.addEventListener('canplaythrough', onCanPlay, { once: true });
    incoming.addEventListener('canplay', onCanPlay, { once: true });
    incoming.addEventListener('error', onErr, { once: true });
    timeoutId = setTimeout(() => {
      if (!cancelled) {
        incoming.removeEventListener('canplaythrough', onCanPlay);
        incoming.removeEventListener('canplay', onCanPlay);
        incoming.removeEventListener('error', onErr);
        incoming.muted = true;
        incoming.currentTime = 0;
        incoming.play().then(() => finishSwap()).catch(() => finishSwap());
      }
    }, PRELOAD_TIMEOUT_MS);

    // Always load muted — unmuting happens in finishSwap after play() succeeds
    incoming.muted = true;
    incoming.src = clip.videoUrl;
    incoming.load();
  }, []);

  /* ─── Preload next idle into inactive element ─── */
  const preloadNextIdle = useCallback(() => {
    if (preloadingRef.current || isTalkingRef.current) return;
    const next = pickNextIdle();
    if (!next) return;
    preloadedIdleRef.current = next;
    preloadingRef.current = true;

    const isA = activeSlotRef.current === 'A';
    const inactive = isA ? videoRefB.current : videoRefA.current;
    if (!inactive) { preloadingRef.current = false; return; }

    inactive.muted = true;
    inactive.src = next.videoUrl;
    inactive.load();

    const onLoaded = () => {
      inactive.removeEventListener('canplaythrough', onLoaded);
      inactive.removeEventListener('canplay', onLoaded);
      preloadingRef.current = false;
    };
    inactive.addEventListener('canplaythrough', onLoaded, { once: true });
    inactive.addEventListener('canplay', onLoaded, { once: true });
  }, [pickNextIdle]);

  /* ─── Instant swap to preloaded idle (no loading delay) ─── */
  const swapToPreloadedIdle = useCallback(() => {
    if (isTalkingRef.current) return;
    const clip = preloadedIdleRef.current;
    preloadedIdleRef.current = null;

    const isA = activeSlotRef.current === 'A';
    const incoming = isA ? videoRefB.current : videoRefA.current;
    const outgoing = isA ? videoRefA.current : videoRefB.current;
    if (!incoming || !outgoing) return;

    // If we have a preloaded clip and it's already in the inactive element, instant swap
    if (clip && incoming.src && incoming.src.includes(clip.videoUrl.split('/').pop() || '__none__')) {
      incoming.muted = true;
      incoming.currentTime = 0;
      incoming.play().then(() => {
        incoming.style.opacity = '1';
        outgoing.style.opacity = '0';
        outgoing.pause();
        activeSlotRef.current = isA ? 'B' : 'A';
      }).catch(() => {
        // Fallback to regular swap
        if (clip) swapToClip(clip, false);
      });
      return;
    }

    // Not preloaded — fall back to regular swap
    const next = clip || pickNextIdle();
    if (next) swapToClip(next, false);
  }, [pickNextIdle, swapToClip]);

  /* ─── Idle management ─── */
  const swapToNextIdle = useCallback(() => {
    if (isTalkingRef.current) return;
    swapToPreloadedIdle();
  }, [swapToPreloadedIdle]);

  /* ─── Stop audio ─── */
  const stopAudio = useCallback(() => {
    // Mute video elements
    if (videoRefA.current) videoRefA.current.muted = true;
    if (videoRefB.current) videoRefB.current.muted = true;
    // Stop mp3 fallback
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.removeAttribute('src');
      activeAudioRef.current.load();
      activeAudioRef.current = null;
    }
    if (fakeIntervalRef.current) {
      clearInterval(fakeIntervalRef.current);
      fakeIntervalRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  /* ─── Return to idle ─── */
  const returnToIdle = useCallback(() => {
    isTalkingRef.current = false;
    setIsSpeaking(false);
    stopAudio();
    if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
    speakingTimeoutRef.current = setTimeout(() => setCurrentCaption(''), 1500);
    const next = pickNextIdle();
    if (next) swapToClip(next, true, false); // muted idle
  }, [pickNextIdle, swapToClip, stopAudio]);

  /* ─── Play voice line ───
   * Dual audio strategy for maximum reliability:
   * 1. Play the mp3 IMMEDIATELY (best chance of browser autoplay approval)
   * 2. Swap to the lip-sync video clip (unmuted — has audio baked in)
   * 3. Once the video is playing unmuted, mute the mp3 backup
   * This guarantees: audio plays (mp3 fallback), lip sync shows (video),
   * and if the video has audio, it takes over seamlessly. */
  const playVoiceLine = useCallback(() => {
    if (isSpeaking || !audioEnabled || FALLBACK_VOICE_LINES.length === 0) return;

    let idx = Math.floor(Math.random() * FALLBACK_VOICE_LINES.length);
    if (idx === lastLineIndex && FALLBACK_VOICE_LINES.length > 1) idx = (idx + 1) % FALLBACK_VOICE_LINES.length;
    setLastLineIndex(idx);
    let line = FALLBACK_VOICE_LINES[idx];

    let talkClip = talkClipsRef.current.get(line.id);
    if (!talkClip) {
      console.warn(`[LiveCam] No talk clip for "${line.id}", trying others...`);
      // Try to find ANY voice line that has a matching talk clip
      const available = FALLBACK_VOICE_LINES.filter(v => talkClipsRef.current.has(v.id));
      if (available.length === 0) {
        console.error('[LiveCam] No talk clips available at all!');
        return;
      }
      line = available[Math.floor(Math.random() * available.length)];
      talkClip = talkClipsRef.current.get(line.id)!;
      console.log(`[LiveCam] Falling back to: ${line.id}`);
    }

    console.log(`[LiveCam] Playing voice line: ${line.id}`);
    setIsSpeaking(true);
    setCurrentCaption(line.text);
    isTalkingRef.current = true;
    preloadedIdleRef.current = null;

    // Fake audio level visualizer
    fakeIntervalRef.current = setInterval(() => {
      if (mountedRef.current && isTalkingRef.current) {
        setAudioLevel(0.25 + Math.random() * 0.55);
      }
    }, 100);

    // Play mp3 IMMEDIATELY — this is the most reliable way to get audio
    // playing since we're closest to the user gesture context here.
    const audio = new Audio(line.file);
    activeAudioRef.current = audio;
    audio.play().then(() => {
      console.log(`[LiveCam] mp3 playing: ${line.id}`);
    }).catch((err) => {
      console.warn(`[LiveCam] mp3 play failed:`, err);
    });

    audio.addEventListener('ended', () => {
      if (mountedRef.current) returnToIdle();
    }, { once: true });

    audio.addEventListener('error', () => {
      console.error(`[LiveCam] mp3 error: ${line.id}`);
    }, { once: true });

    // Force-swap to lip-sync clip WITH AUDIO (unmuted=true).
    // The video plays muted first (autoplay safe), then unmutes in finishSwap.
    // Once the video is unmuted and has audio, we mute the mp3 to avoid echo.
    swapToClip(talkClip, true, true);

    // After a short delay, check if the video has audio — if so, mute the mp3
    setTimeout(() => {
      if (!mountedRef.current || !isTalkingRef.current) return;
      const isA = activeSlotRef.current === 'A';
      const activeVid = isA ? videoRefA.current : videoRefB.current;
      if (activeVid && !activeVid.muted && !activeVid.paused) {
        // Video is playing unmuted — it likely has audio, so mute the mp3
        // to prevent echo. But resync the video to match the mp3 position.
        const audioTime = audio.currentTime;
        if (audioTime > 0 && activeVid.duration > 0) {
          activeVid.currentTime = Math.min(audioTime, activeVid.duration - 0.1);
        }
        audio.muted = true;
        console.log(`[LiveCam] Video has audio, muted mp3 fallback`);
      }
    }, 1500);
  }, [isSpeaking, audioEnabled, lastLineIndex, swapToClip, returnToIdle]);

  /* ─── Video event listeners ─── */
  useEffect(() => {
    const a = videoRefA.current;
    const b = videoRefB.current;
    if (!a || !b) return;

    const onTimeUpdate = (e: Event) => {
      const v = e.target as HTMLVideoElement;
      if (!v.duration) return;
      const isActive =
        (activeSlotRef.current === 'A' && v === a) ||
        (activeSlotRef.current === 'B' && v === b);
      if (!isActive || isTalkingRef.current) return;

      const remaining = v.duration - v.currentTime;

      // Preload next idle into inactive element ahead of time
      if (remaining <= PRELOAD_AHEAD_S && !preloadedIdleRef.current && !preloadingRef.current) {
        preloadNextIdle();
      }

      // When very close to end, do the swap (clip is already preloaded)
      if (remaining <= 0.15) {
        swapToNextIdle();
      }
    };

    const onEnded = (e: Event) => {
      const v = e.target as HTMLVideoElement;
      const isActive =
        (activeSlotRef.current === 'A' && v === a) ||
        (activeSlotRef.current === 'B' && v === b);
      if (!isActive) return;

      if (isTalkingRef.current) {
        // Talk clip video ended. If mp3 fallback is still playing,
        // loop the video to keep lip-sync going. Otherwise return to idle.
        if (activeAudioRef.current && !activeAudioRef.current.ended && !activeAudioRef.current.paused) {
          v.currentTime = 0;
          v.play().catch(() => {});
        } else {
          returnToIdle();
        }
        return;
      }

      // Idle ended — swap to preloaded or loop current
      if (preloadedIdleRef.current) {
        swapToNextIdle();
      } else {
        // No preloaded clip — seamlessly loop current one
        v.currentTime = 0;
        v.play().catch(() => {});
      }
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
  }, [swapToNextIdle, preloadNextIdle, returnToIdle]);

  /* ─── Fetch clips ─── */
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
          const arr = clips as AnimationClip[];
          if (type.startsWith('idle')) {
            idle.push(...arr);
          } else if (type.startsWith('talk-')) {
            const voiceId = type.replace('talk-', '');
            if (arr.length > 0) talk.set(voiceId, arr[0]);
          }
        }

        if (idle.length === 0 || cancelled) return;
        setIdleClips(idle);
        setTalkClips(talk);
        console.log(`[LiveCam] ${idle.length} idle, ${talk.size} talk clips. Talk IDs:`, Array.from(talk.keys()));

        const first = idle[0];
        lastIdleIndexRef.current = 0;
        const a = videoRefA.current;
        if (!a || cancelled) return;

        const onReady = () => {
          if (cancelled) return;
          a.removeEventListener('canplay', onReady);
          a.removeEventListener('error', onFail);
          a.style.opacity = '1';
          a.play().catch(() => {});
          setVideoReady(true);
        };
        const onFail = () => {
          a.removeEventListener('canplay', onReady);
          a.removeEventListener('error', onFail);
        };
        a.addEventListener('canplay', onReady, { once: true });
        a.addEventListener('error', onFail, { once: true });
        a.src = first.videoUrl;
        a.load();
      } catch { /* silent */ }
    }
    fetchClips();
    return () => { cancelled = true; };
  }, [slug]);

  /* ─── Voice lines are hardcoded — no manifest.json dependency.
   * The deployed manifest may have stale IDs that don't match
   * the database talk clips. FALLBACK_VOICE_LINES is always
   * the single source of truth. ─── */

  /* ─── Viewer count ─── */
  useEffect(() => {
    const i = setInterval(() => {
      setViewerCount(p => Math.max(100, p + Math.floor(Math.random() * 21) - 10));
    }, 5000);
    return () => clearInterval(i);
  }, []);

  /* ─── Periodic voice lines ─── */
  useEffect(() => {
    if (!audioEnabled) return;
    const t = setTimeout(() => playVoiceLine(), 6000);
    const i = setInterval(() => {
      if (!isSpeaking) setTimeout(() => playVoiceLine(), Math.random() * 20000);
    }, 30000);
    return () => { clearTimeout(t); clearInterval(i); };
  }, [audioEnabled, playVoiceLine, isSpeaking]);

  const handleEnableAudio = () => {
    setAudioEnabled(true);
    setTimeout(() => playVoiceLine(), 500);
  };

  const handleToggleMute = () => {
    if (audioEnabled) {
      setAudioEnabled(false);
      stopAudio();
      // If currently talking, stop the talk and go back to idle
      if (isTalkingRef.current) {
        returnToIdle();
      }
    } else {
      handleEnableAudio();
    }
  };

  /* ═══ Render ═══ */

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">

      {/* Video layer — always muted, audio from Audio() */}
      <div className="absolute inset-0" style={{ visibility: videoReady ? 'visible' : 'hidden' }}>
        <video ref={videoRefA} muted playsInline preload="auto"
          className="absolute inset-0 w-full h-full object-cover" />
        <video ref={videoRefB} muted playsInline preload="auto"
          className="absolute inset-0 w-full h-full object-cover" />
      </div>

      {/* Fallback portrait */}
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
            {particles.map(p => (
              <div key={p.id} className={`absolute rounded-full ${p.hue}`} style={{
                left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size,
                animation: `cam-particle-drift ${p.duration}s ease-in-out infinite`, animationDelay: `${p.delay}s`,
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Caption */}
      {currentCaption && (
        <div className="absolute bottom-24 left-0 right-0 flex justify-center px-6 z-20" style={{ animation: 'cam-caption-in 0.4s ease-out' }}>
          <div className="bg-black/60 backdrop-blur-md rounded-2xl px-5 py-3 max-w-md border border-white/5">
            <div className="flex items-start gap-2">
              {isSpeaking && (
                <div className="flex items-center gap-0.5 mt-1 shrink-0">
                  {[0, 1, 2, 3].map(i => (
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

      {/* Stream overlay */}
      <div className="absolute inset-0 p-4 md:p-6 pointer-events-none flex flex-col justify-between z-10">
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
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-0.5 inline-block bg-white rounded-full animate-pulse" style={{ height: '8px', animationDelay: `${i * 150}ms`, animationDuration: '0.6s' }} />
                    ))}
                  </span>
                  Speaking
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleToggleMute}
              className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/50 transition-colors pointer-events-auto cursor-pointer border border-white/10"
              title={audioEnabled ? 'Mute' : 'Enable audio'}>
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

        <div className="flex justify-between items-end">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
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
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Audio enable prompt */}
      {!audioEnabled && (
        <div className="absolute inset-0 flex items-end justify-center pb-32 z-30 pointer-events-none">
          <button onClick={handleEnableAudio}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600/80 backdrop-blur-md text-white text-sm font-semibold hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/30 border border-indigo-400/20 animate-pulse"
            style={{ animationDuration: '2s' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
            </svg>
            Tap to hear {characterName} speak
          </button>
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_80px_rgba(0,0,0,0.3)]" />
    </div>
  );
}
