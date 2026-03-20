'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';

/* ─── Types ─── */

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

interface VoiceLine {
  id: string;
  text: string;
}

/* ─── Voice Lines (day-trader Aria) ─── */

const VOICE_LINES: VoiceLine[] = [
  { id: 'welcome', text: "Welcome to the stream! Charts are looking spicy today and I am ready to make some moves." },
  { id: 'green', text: "Oh we are so green right now. I told you. I literally told all of you this was the play." },
  { id: 'dip', text: "Buy the dip they said. It'll be fun they said. And you know what? They were right. Again." },
  { id: 'candles', text: "These candles are beautiful. I could stare at a green candle all day. It's literally art." },
  { id: 'calls', text: "My calls have been hitting different lately. I'm not saying I'm a genius but I'm not not saying it." },
  { id: 'chart', text: "Hold on let me pull up this chart real quick because what I'm about to show you is insane." },
  { id: 'diamond', text: "Diamond hands don't even begin to describe it. I have diamond everything at this point." },
  { id: 'morning', text: "Pre-market looking absolutely gorgeous today. I woke up and chose profits apparently." },
  { id: 'moon', text: "We are going to the moon. Actually forget the moon we're going past it. Next stop Mars." },
  { id: 'setup', text: "The setup is literally perfect right now. If you're not paying attention you're missing out." },
  { id: 'vibes', text: "The vibes in here are immaculate. Good trades, good people, good energy. This is what we do." },
  { id: 'legend', text: "If you just joined, welcome legend. Pull up a chart and get comfortable because we're just getting started." },
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
   AnimatedLiveCam — PERFECT seamless playback

   Architecture:
   ─────────────
   • 3 idle clips play in FIXED order: A → B → C → A → B → C …
   • All clips start & end at the EXACT same neutral pose
   • Swap = instant opacity toggle (no crossfade needed)
   • Talk clip ONLY replaces idle-C in the cycle
     ─ idle-B ends → talk clip plays (same start frame as idle-C)
     ─ talk ends → idle-A resumes (same end frame = seamless)
   • Audio comes ONLY from the lip-sync video (baked in by Kling)
     ─ No separate mp3, no echo, no duplication
   • Two <video> elements (A/B) — preload next into inactive,
     then instant opacity swap when current ends
   ═══════════════════════════════════════════════════════════════ */

export default function AnimatedLiveCam({
  slug,
  characterName,
  personality: _personality,
  portraitUrl,
}: AnimatedLiveCamProps) {
  /* ─── State ─── */
  const [videoReady, setVideoReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [viewerCount, setViewerCount] = useState(1247);
  const [currentCaption, setCurrentCaption] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(false);

  /* ─── Refs ─── */
  const vidA = useRef<HTMLVideoElement>(null);
  const vidB = useRef<HTMLVideoElement>(null);
  const activeSlotRef = useRef<'A' | 'B'>('A'); // Which is currently visible
  const mountedRef = useRef(true);
  const isTalkingRef = useRef(false);
  const cycleRunningRef = useRef(false);

  // Clip data
  const idleClipsRef = useRef<AnimationClip[]>([]); // [idle-a, idle-b, idle-c] in order
  const talkClipsRef = useRef<Map<string, AnimationClip>>(new Map());

  // Cycle state: 0=idle-a, 1=idle-b, 2=idle-c
  const cycleIndexRef = useRef(0);
  const lastLineIndexRef = useRef(-1);
  const pendingTalkRef = useRef<{ clip: AnimationClip; line: VoiceLine } | null>(null);

  // Audio viz
  const fakeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const captionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const particles = useMemo(() => generateParticles(12), []);

  useEffect(() => () => { mountedRef.current = false; }, []);

  /* ─── Get active/inactive video elements ─── */
  const getVideos = useCallback(() => {
    const a = vidA.current;
    const b = vidB.current;
    if (!a || !b) return null;
    const isA = activeSlotRef.current === 'A';
    return { active: isA ? a : b, inactive: isA ? b : a };
  }, []);

  /* ─── Load a clip into a video element and wait until ready ─── */
  const loadClip = useCallback((video: HTMLVideoElement, clip: AnimationClip): Promise<void> => {
    return new Promise((resolve) => {
      const cleanup = () => {
        video.removeEventListener('canplay', onReady);
        video.removeEventListener('error', onErr);
        clearTimeout(timer);
      };
      const onReady = () => { cleanup(); resolve(); };
      const onErr = () => { cleanup(); resolve(); }; // Resolve anyway — play attempt will handle
      const timer = setTimeout(() => { cleanup(); resolve(); }, 8000);

      video.addEventListener('canplay', onReady, { once: true });
      video.addEventListener('error', onErr, { once: true });
      video.muted = true;
      video.src = clip.videoUrl;
      video.load();
    });
  }, []);

  /* ─── Swap: start playing inactive video, hide active ─── */
  const swapToInactive = useCallback((unmuted: boolean): Promise<void> => {
    return new Promise((resolve) => {
      const vids = getVideos();
      if (!vids) { resolve(); return; }
      const { active, inactive } = vids;

      inactive.muted = true;
      inactive.currentTime = 0;
      inactive.play()
        .then(() => {
          // Unmute AFTER play() succeeds (browser autoplay policy safe)
          if (unmuted) inactive.muted = false;
          // Instant opacity swap
          inactive.style.opacity = '1';
          active.style.opacity = '0';
          active.pause();
          active.muted = true;
          // Flip the active slot
          activeSlotRef.current = activeSlotRef.current === 'A' ? 'B' : 'A';
          resolve();
        })
        .catch(() => {
          // If play failed, try muted
          inactive.muted = true;
          inactive.play()
            .then(() => {
              inactive.style.opacity = '1';
              active.style.opacity = '0';
              active.pause();
              activeSlotRef.current = activeSlotRef.current === 'A' ? 'B' : 'A';
              resolve();
            })
            .catch(() => resolve());
        });
    });
  }, [getVideos]);

  /* ─── Wait for active video to end ─── */
  const waitForEnd = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const vids = getVideos();
      if (!vids) { resolve(); return; }
      const { active } = vids;

      const onEnded = () => {
        active.removeEventListener('ended', onEnded);
        clearTimeout(timer);
        resolve();
      };
      // Safety timeout — 15s for 10s clips
      const timer = setTimeout(() => {
        active.removeEventListener('ended', onEnded);
        resolve();
      }, 15000);

      active.addEventListener('ended', onEnded, { once: true });
    });
  }, [getVideos]);

  /* ─── Core cycle: A → B → C → A → B → C … with talk at C ─── */
  const runCycle = useCallback(async () => {
    if (cycleRunningRef.current) return;
    cycleRunningRef.current = true;

    while (mountedRef.current) {
      const idles = idleClipsRef.current;
      if (idles.length < 3) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      const idx = cycleIndexRef.current;

      // At position 2 (idle-C), check if we should play a talk clip instead
      if (idx === 2 && pendingTalkRef.current && !isTalkingRef.current) {
        const { clip: talkClip, line } = pendingTalkRef.current;
        pendingTalkRef.current = null;

        console.log(`[LiveCam] 🗣️ Talk: ${line.id}`);
        isTalkingRef.current = true;
        setIsSpeaking(true);
        setCurrentCaption(line.text);

        // Audio level visualizer
        fakeIntervalRef.current = setInterval(() => {
          if (mountedRef.current && isTalkingRef.current) {
            setAudioLevel(0.25 + Math.random() * 0.55);
          }
        }, 100);

        // Load talk clip into inactive element, swap unmuted
        const vids = getVideos();
        if (vids) {
          await loadClip(vids.inactive, talkClip);
          if (mountedRef.current) {
            await swapToInactive(true); // UNMUTED — talk has audio
            await waitForEnd();
          }
        }

        // Done talking — clean up
        isTalkingRef.current = false;
        setIsSpeaking(false);
        if (fakeIntervalRef.current) {
          clearInterval(fakeIntervalRef.current);
          fakeIntervalRef.current = null;
        }
        setAudioLevel(0);
        if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current);
        captionTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) setCurrentCaption('');
        }, 2000);

        // After talk, restart cycle at idle-A
        cycleIndexRef.current = 0;
        continue;
      }

      // Regular idle clip
      const idleClip = idles[idx];

      const vids = getVideos();
      if (vids) {
        await loadClip(vids.inactive, idleClip);
        if (mountedRef.current) {
          await swapToInactive(false); // MUTED — idle is silent
          // Advance cycle index
          cycleIndexRef.current = (idx + 1) % 3;
          await waitForEnd();
        }
      } else {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    cycleRunningRef.current = false;
  }, [getVideos, loadClip, swapToInactive, waitForEnd]);

  /* ─── Queue a voice line (will play at next idle-C slot) ─── */
  const queueVoiceLine = useCallback(() => {
    if (isTalkingRef.current || pendingTalkRef.current) return;
    if (talkClipsRef.current.size === 0) return;

    const available = VOICE_LINES.filter(v => talkClipsRef.current.has(v.id));
    if (available.length === 0) return;

    let idx = Math.floor(Math.random() * available.length);
    if (idx === lastLineIndexRef.current && available.length > 1) {
      idx = (idx + 1) % available.length;
    }
    lastLineIndexRef.current = idx;

    const line = available[idx];
    const talkClip = talkClipsRef.current.get(line.id)!;

    console.log(`[LiveCam] 📝 Queued: ${line.id}`);
    pendingTalkRef.current = { clip: talkClip, line };
  }, []);

  /* ─── Fetch clips from API and start cycle ─── */
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const res = await fetch(`/api/characters/${slug}/animations`);
        if (!res.ok || cancelled) return;
        const json = await res.json();
        const data = json.success ? json.data : json;
        if (!data?.clips || cancelled) return;

        const idleMap: Record<string, AnimationClip> = {};
        const talk = new Map<string, AnimationClip>();

        for (const [type, clips] of Object.entries(data.clips)) {
          const arr = clips as AnimationClip[];
          if (arr.length === 0) continue;

          if (type === 'idle-a' || type === 'idle-b' || type === 'idle-c') {
            idleMap[type] = arr[0];
          } else if (type.startsWith('talk-')) {
            talk.set(type.replace('talk-', ''), arr[0]);
          }
        }

        // Need all 3 in order
        if (!idleMap['idle-a'] || !idleMap['idle-b'] || !idleMap['idle-c']) {
          console.error('[LiveCam] Missing idle clips. Need idle-a, idle-b, idle-c.');
          const avail = Object.values(idleMap);
          if (avail.length === 0) return;
          while (avail.length < 3) avail.push(avail[0]);
          idleClipsRef.current = avail;
        } else {
          idleClipsRef.current = [idleMap['idle-a'], idleMap['idle-b'], idleMap['idle-c']];
        }

        talkClipsRef.current = talk;
        console.log(`[LiveCam] ✅ ${idleClipsRef.current.length} idle, ${talk.size} talk. IDs:`, Array.from(talk.keys()));

        if (cancelled) return;

        // Play first idle clip directly on video A
        const first = idleClipsRef.current[0];
        const a = vidA.current;
        if (!a) return;

        a.muted = true;
        a.src = first.videoUrl;
        a.load();

        const onReady = () => {
          if (cancelled) return;
          a.removeEventListener('canplay', onReady);
          a.style.opacity = '1';
          a.currentTime = 0;
          a.play().catch(() => {});
          setVideoReady(true);
          activeSlotRef.current = 'A';
          cycleIndexRef.current = 1; // Next will be idle-B

          // When this first clip ends, start the continuous cycle
          a.addEventListener('ended', () => {
            if (!cancelled && mountedRef.current) runCycle();
          }, { once: true });
        };
        a.addEventListener('canplay', onReady, { once: true });
      } catch (err) {
        console.error('[LiveCam] Init error:', err);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [slug, runCycle]);

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
    const t = setTimeout(() => queueVoiceLine(), 4000);
    const i = setInterval(() => {
      if (!isTalkingRef.current && !pendingTalkRef.current) queueVoiceLine();
    }, 35000);
    return () => { clearTimeout(t); clearInterval(i); };
  }, [audioEnabled, queueVoiceLine]);

  const handleEnableAudio = () => {
    setAudioEnabled(true);
    setTimeout(() => queueVoiceLine(), 300);
  };

  const handleToggleMute = () => {
    if (audioEnabled) {
      setAudioEnabled(false);
      pendingTalkRef.current = null;
      if (vidA.current) vidA.current.muted = true;
      if (vidB.current) vidB.current.muted = true;
      if (isTalkingRef.current) {
        isTalkingRef.current = false;
        setIsSpeaking(false);
        if (fakeIntervalRef.current) { clearInterval(fakeIntervalRef.current); fakeIntervalRef.current = null; }
        setAudioLevel(0);
        setCurrentCaption('');
      }
    } else {
      handleEnableAudio();
    }
  };

  /* ═══ Render ═══ */
  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      {/* Video layer — two stacked videos for seamless A/B swapping */}
      <div className="absolute inset-0" style={{ visibility: videoReady ? 'visible' : 'hidden' }}>
        <video ref={vidA} muted playsInline preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0 }} />
        <video ref={vidB} muted playsInline preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0 }} />
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
