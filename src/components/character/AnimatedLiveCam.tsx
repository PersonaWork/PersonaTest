'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Image from 'next/image';

/* --- Types --- */

interface LiveVideo {
  videoUrl: string;
  audioUrl: string;
  responseText: string;
  senderName: string;
  question: string;
}

interface AnimatedLiveCamProps {
  slug: string;
  characterName: string;
  personality: Record<string, unknown>;
  portraitUrl: string;
  liveVideo?: LiveVideo | null;
}

/* --- Particles --- */

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

/* =====================================================================
   AnimatedLiveCam — Seamless crossfade idle loop + audio-synced talking

   Idle mode:
     Two copies of the same video crossfade at the loop point.
     No visible cut — ever.

   Speaking mode:
     Web Audio API analyzes the response audio in real-time.
     A subtle mouth overlay pulses with actual audio levels.
     Audio plays over the looping idle video.
   ===================================================================== */

export default function AnimatedLiveCam({
  slug,
  characterName,
  personality: _personality,
  portraitUrl,
  liveVideo,
}: AnimatedLiveCamProps) {
  /* --- State --- */
  const [videoReady, setVideoReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [viewerCount, setViewerCount] = useState(1247);
  const [currentCaption, setCurrentCaption] = useState('');
  const [currentSender, setCurrentSender] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const audioEnabledRef = useRef(true);

  /* --- Refs --- */
  const vidA = useRef<HTMLVideoElement>(null);
  const vidB = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  // Live video queue
  const pendingLiveRef = useRef<LiveVideo | null>(null);
  const isTalkingRef = useRef(false);

  // Audio analysis
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  const captionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const particles = useMemo(() => generateParticles(12), []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => { audioEnabledRef.current = audioEnabled; }, [audioEnabled]);

  // Queue incoming live video
  useEffect(() => {
    if (liveVideo && !isTalkingRef.current) {
      pendingLiveRef.current = liveVideo;
    }
  }, [liveVideo]);

  /* --- Helper: load URL into video element --- */
  const loadInto = useCallback((video: HTMLVideoElement, url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!mountedRef.current) { resolve(false); return; }

      let resolved = false;
      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        video.removeEventListener('canplaythrough', onOk);
        video.removeEventListener('canplay', onOk);
        video.removeEventListener('loadeddata', onOk);
        video.removeEventListener('error', onFail);
        clearTimeout(timer);
      };
      const onOk = () => { cleanup(); resolve(true); };
      const onFail = () => {
        console.warn('[LiveCam] Video load error for', url.slice(0, 80), video.error?.message);
        cleanup();
        resolve(false);
      };
      const timer = setTimeout(() => {
        console.warn('[LiveCam] Video load timeout, readyState=', video.readyState);
        cleanup();
        resolve(video.readyState >= 2);
      }, 12000);

      video.addEventListener('canplaythrough', onOk, { once: true });
      video.addEventListener('canplay', onOk, { once: true });
      video.addEventListener('loadeddata', onOk, { once: true });
      video.addEventListener('error', onFail, { once: true });

      video.preload = 'auto';
      video.src = url;
      video.load();
    });
  }, []);

  /* --- Real-time audio analysis with Web Audio API --- */
  const startAudioAnalysis = useCallback((audioElement: HTMLAudioElement) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      analyserRef.current = analyser;

      const source = ctx.createMediaElementSource(audioElement);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      function tick() {
        if (!mountedRef.current || !isTalkingRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          return;
        }
        analyser.getByteFrequencyData(dataArray);
        // Focus on voice frequencies (roughly bins 2-20 for speech fundamentals)
        let sum = 0;
        const voiceStart = 2;
        const voiceEnd = 20;
        for (let i = voiceStart; i < voiceEnd; i++) {
          sum += dataArray[i];
        }
        const avg = sum / (voiceEnd - voiceStart) / 255;
        setAudioLevel(avg);
        animFrameRef.current = requestAnimationFrame(tick);
      }
      animFrameRef.current = requestAnimationFrame(tick);
    } catch {
      // Fallback: fake audio viz if Web Audio API fails (e.g. CORS)
      console.warn('[LiveCam] Web Audio API failed, using fake viz');
      startFakeAudioViz();
    }
  }, []);

  /* --- Fallback fake audio viz --- */
  const startFakeAudioViz = useCallback(() => {
    const interval = setInterval(() => {
      if (!mountedRef.current || !isTalkingRef.current) {
        clearInterval(interval);
        setAudioLevel(0);
        return;
      }
      setAudioLevel(0.15 + Math.random() * 0.55);
    }, 80);
  }, []);

  /* === Main engine === */
  useEffect(() => {
    mountedRef.current = true;
    let stopped = false;

    async function engine() {
      const a = vidA.current;
      const b = vidB.current;
      if (!a || !b) {
        console.warn('[LiveCam] Video elements not ready, retrying...');
        await new Promise(r => setTimeout(r, 500));
        if (!stopped) return engine();
        return;
      }

      /* -- Step 1: Fetch idle clip URL -- */
      let idleUrl = '';
      try {
        console.log('[LiveCam] Fetching clips...');
        const res = await fetch(`/api/characters/${slug}/animations`);
        if (!res.ok) { console.error('[LiveCam] animations API error', res.status); return; }
        const json = await res.json();
        const data = json.success ? json.data : json;
        if (!data?.clips) { console.error('[LiveCam] No clips in response'); return; }

        const prefs = ['idle-a', 'idle-breathe', 'idle-ambient', 'idle-blink', 'idle-look', 'idle-b', 'idle-c'];
        for (const pref of prefs) {
          const arr = data.clips[pref] as { videoUrl: string }[] | undefined;
          if (arr?.[0]) { idleUrl = arr[0].videoUrl; break; }
        }
        if (!idleUrl) {
          for (const [type, clips] of Object.entries(data.clips)) {
            if (type.startsWith('idle') && (clips as { videoUrl: string }[]).length > 0) {
              idleUrl = (clips as { videoUrl: string }[])[0].videoUrl;
              break;
            }
          }
        }
        if (!idleUrl) {
          for (const clips of Object.values(data.clips)) {
            if ((clips as { videoUrl: string }[]).length > 0) {
              idleUrl = (clips as { videoUrl: string }[])[0].videoUrl;
              break;
            }
          }
        }
      } catch (err) {
        console.error('[LiveCam] Failed to fetch clips:', err);
        return;
      }

      if (!idleUrl || stopped) {
        console.error('[LiveCam] No idle clip URL found');
        return;
      }

      // Proxy through our API to avoid CORS
      const proxyUrl = `/api/video-proxy?url=${encodeURIComponent(idleUrl)}`;
      console.log('[LiveCam] Idle clip found, loading...');

      /* -- Step 2: Load idle clip into BOTH video elements -- */
      const urlToUse = proxyUrl;

      // Configure both videos
      for (const vid of [a, b]) {
        vid.loop = false; // We handle looping ourselves with crossfade
        vid.muted = true;
        vid.playsInline = true;
      }

      const loadedA = await loadInto(a, urlToUse);
      if (stopped) return;
      if (!loadedA) {
        // Try direct URL
        console.warn('[LiveCam] Proxy failed, trying direct URL...');
        const directLoaded = await loadInto(a, idleUrl);
        if (stopped || !directLoaded) return;
        // Also load B with direct URL
        await loadInto(b, idleUrl);
      } else {
        await loadInto(b, urlToUse);
      }
      if (stopped) return;

      // Start video A visible
      a.style.opacity = '1';
      b.style.opacity = '0';
      a.currentTime = 0;
      try { await a.play(); } catch (e) { console.warn('[LiveCam] Autoplay blocked:', e); }
      setVideoReady(true);
      console.log('[LiveCam] Idle video playing with seamless crossfade loop!');

      /* -- Step 3: Seamless crossfade loop engine -- */
      let activeVid = a;
      let standbyVid = b;
      const CROSSFADE_DURATION = 0.8; // seconds before end to start crossfade

      while (!stopped && mountedRef.current) {
        await new Promise(r => setTimeout(r, 100));

        // Check for live response to play
        if (pendingLiveRef.current && !isTalkingRef.current) {
          const pending = pendingLiveRef.current;
          pendingLiveRef.current = null;

          isTalkingRef.current = true;
          setIsSpeaking(true);
          setCurrentCaption(pending.responseText);
          setCurrentSender(pending.senderName);
          setCurrentQuestion(pending.question);

          // Play audio over the looping idle video (no video swap needed)
          if (pending.audioUrl && audioEnabledRef.current) {
            const audio = new Audio(pending.audioUrl);
            audio.crossOrigin = 'anonymous';

            // Try to use Web Audio API for real audio-level tracking
            try {
              await audio.play();
              startAudioAnalysis(audio);
            } catch {
              // If play fails, try without crossOrigin
              audio.crossOrigin = '';
              try {
                await audio.play();
              } catch { /* ignore */ }
              startFakeAudioViz();
            }

            // Wait for audio to finish
            await new Promise<void>((resolve) => {
              audio.addEventListener('ended', () => resolve(), { once: true });
              // Safety timeout
              const safetyMs = Math.max(30000, (pending.responseText.split(/\s+/).length / 2) * 1000 + 5000);
              setTimeout(() => resolve(), safetyMs);
            });
          } else {
            // No audio — just show caption briefly
            startFakeAudioViz();
            await new Promise(r => setTimeout(r, 3000));
          }

          // Done talking
          isTalkingRef.current = false;
          setIsSpeaking(false);
          setAudioLevel(0);
          cancelAnimationFrame(animFrameRef.current);

          // Clear caption after delay
          if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current);
          captionTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              setCurrentCaption('');
              setCurrentSender('');
              setCurrentQuestion('');
            }
          }, 3000);
          continue;
        }

        // Seamless crossfade loop logic
        if (activeVid.duration && activeVid.currentTime > 0) {
          const timeLeft = activeVid.duration - activeVid.currentTime;

          if (timeLeft <= CROSSFADE_DURATION && timeLeft > 0) {
            // Start crossfade to standby video
            standbyVid.currentTime = 0;
            standbyVid.muted = true;
            try { await standbyVid.play(); } catch { /* ignore */ }

            // Smooth crossfade over remaining time
            const fadeMs = timeLeft * 1000;
            const start = performance.now();

            await new Promise<void>((resolve) => {
              function step() {
                if (!mountedRef.current || stopped) { resolve(); return; }
                const elapsed = performance.now() - start;
                const t = Math.min(elapsed / fadeMs, 1);
                // Smooth ease
                const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                standbyVid.style.opacity = String(ease);
                activeVid.style.opacity = String(1 - ease);
                if (t < 1) {
                  requestAnimationFrame(step);
                } else {
                  activeVid.pause();
                  activeVid.style.opacity = '0';
                  standbyVid.style.opacity = '1';
                  resolve();
                }
              }
              requestAnimationFrame(step);
            });

            // Swap active/standby
            const temp = activeVid;
            activeVid = standbyVid;
            standbyVid = temp;
          }
        }
      }
    }

    engine();

    return () => {
      stopped = true;
      mountedRef.current = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [slug, loadInto, startAudioAnalysis, startFakeAudioViz]);

  /* --- Viewer count ticker --- */
  useEffect(() => {
    const i = setInterval(() => {
      setViewerCount(p => Math.max(800, p + Math.floor(Math.random() * 21) - 10));
    }, 5000);
    return () => clearInterval(i);
  }, []);

  const handleToggleMute = () => {
    setAudioEnabled(prev => {
      const next = !prev;
      audioEnabledRef.current = next;
      return next;
    });
  };

  // Mouth overlay intensity based on audio level
  const mouthIntensity = isSpeaking ? audioLevel : 0;

  /* === Render === */
  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-slate-950">
      {/* Video layer — two videos for seamless crossfade loop */}
      <div className="absolute inset-0" style={{ visibility: videoReady ? 'visible' : 'hidden' }}>
        <video ref={vidA} muted playsInline preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0 }} />
        <video ref={vidB} muted playsInline preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0 }} />
      </div>

      {/* Talking mouth overlay — subtle light/shadow that pulses with audio */}
      {isSpeaking && videoReady && (
        <div className="absolute inset-0 pointer-events-none z-[1]">
          {/* Chin/jaw area glow that pulses with speech */}
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full"
            style={{
              bottom: '28%',
              width: '18%',
              height: '8%',
              background: `radial-gradient(ellipse, rgba(99,102,241,${0.04 + mouthIntensity * 0.12}) 0%, transparent 70%)`,
              filter: `blur(${8 + mouthIntensity * 4}px)`,
              transform: `translateX(-50%) scaleY(${0.8 + mouthIntensity * 0.5})`,
              transition: 'all 0.06s ease-out',
            }}
          />
          {/* Subtle shadow movement under the chin */}
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full"
            style={{
              bottom: '24%',
              width: '14%',
              height: '4%',
              background: `radial-gradient(ellipse, rgba(0,0,0,${mouthIntensity * 0.15}) 0%, transparent 70%)`,
              filter: 'blur(6px)',
              transform: `translateX(-50%) scaleY(${1 + mouthIntensity * 0.3})`,
              transition: 'all 0.06s ease-out',
            }}
          />
        </div>
      )}

      {/* Fallback portrait while loading */}
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
          {/* Loading indicator */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm border border-white/10">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-xs text-white/60 font-medium">Loading stream...</span>
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

      {/* Subtle ambient glow overlay on the video */}
      {videoReady && (
        <div className="absolute inset-0 pointer-events-none z-[1]">
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      )}

      {/* Caption + Q&A overlay */}
      {currentCaption && (
        <div className="absolute bottom-24 left-0 right-0 flex justify-center px-6 z-20" style={{ animation: 'cam-caption-in 0.4s ease-out' }}>
          <div className="bg-black/70 backdrop-blur-md rounded-2xl px-5 py-4 max-w-lg border border-white/10">
            {currentSender && currentQuestion && (
              <div className="mb-2 pb-2 border-b border-white/10">
                <p className="text-indigo-400 text-xs font-bold uppercase tracking-wider mb-0.5">
                  {currentSender} asked
                </p>
                <p className="text-white/70 text-sm italic">&ldquo;{currentQuestion}&rdquo;</p>
              </div>
            )}
            <div className="flex items-start gap-2">
              {isSpeaking && (
                <div className="flex items-center gap-0.5 mt-1 shrink-0">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="w-0.5 bg-indigo-400 rounded-full" style={{
                      height: `${6 + audioLevel * 14 + Math.random() * 4}px`, transition: 'height 0.08s ease-out',
                    }} />
                  ))}
                </div>
              )}
              <p className="text-white/90 text-sm font-medium leading-relaxed">{currentCaption}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stream chrome overlay */}
      <div className="absolute inset-0 p-4 md:p-6 pointer-events-none flex flex-col justify-between z-10">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-2">
            {/* LIVE badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 shadow-lg backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">Live</span>
            </div>
            {/* Speaking indicator */}
            {isSpeaking && (
              <div className="px-3 py-1 rounded-full bg-indigo-600/90 backdrop-blur-sm text-[10px] font-black text-white uppercase tracking-wider self-start shadow-lg shadow-indigo-500/30" style={{ animation: 'cam-caption-in 0.3s ease-out' }}>
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
              title={audioEnabled ? 'Mute' : 'Unmute'}>
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

      {/* Inner shadow vignette */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_80px_rgba(0,0,0,0.3)] z-[2]" />
    </div>
  );
}
