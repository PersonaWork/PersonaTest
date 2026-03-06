'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { CharacterStateMachine } from '@/lib/character-engine/stateMachine';
import { CamState } from '@/lib/types';

interface LiveCamProps {
    slug: string;
    idleClipUrl: string;
}

export default function LiveCam({ slug, idleClipUrl }: LiveCamProps) {
    const [currentState, setCurrentState] = useState<CamState>('IDLE');
    const [currentClip, setCurrentClip] = useState(idleClipUrl);
    const videoRef = useRef<HTMLVideoElement>(null);
    const stateMachineRef = useRef<CharacterStateMachine | null>(null);

    useEffect(() => {
        // Initialize State Machine
        stateMachineRef.current = new CharacterStateMachine({
            characterSlug: slug,
            idleClipUrl: idleClipUrl,
            onStateChange: (state, clipUrl) => {
                setCurrentState(state);
                setCurrentClip(clipUrl);
            }
        });

        return () => {
            stateMachineRef.current = null;
        };
    }, [slug, idleClipUrl]);

    const handleClipEnd = () => {
        stateMachineRef.current?.onClipEnd();
    };

    return (
        <div className="relative w-full aspect-video rounded-3xl overflow-hidden glass-card shadow-2xl bg-slate-900 border-none">
            {/* Video layer */}
            <video
                ref={videoRef}
                key={currentClip}
                src={currentClip}
                autoPlay
                muted
                playsInline
                onEnded={handleClipEnd}
                className="w-full h-full object-cover"
            />

            {/* Overlay UI */}
            <div className="absolute inset-0 p-6 pointer-events-none flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-2">
                        <div className="live-badge shadow-lg bg-white/95 backdrop-blur-md">
                            <span className="live-dot"></span>
                            Live Feed
                        </div>
                        {currentState !== 'IDLE' && (
                            <div className="px-3 py-1 rounded-full bg-indigo-600/90 text-[10px] font-black text-white uppercase tracking-tighter self-start animate-bounce">
                                {currentState}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <div className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white pointer-events-auto cursor-pointer hover:bg-black/40 transition-colors">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
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
                            +1.2k
                        </div>
                    </div>

                    <div className="text-white/60 text-[10px] font-bold tracking-widest uppercase bg-black/20 backdrop-blur-sm px-3 py-1 rounded-lg">
                        Stream Quality: 4K High
                    </div>
                </div>
            </div>

            {/* Screen Glitch/Effect (optional premium feel) */}
            <div className="absolute inset-0 pointer-events-none border-[1.5rem] border-transparent shadow-[inset_0_0_100px_rgba(0,0,0,0.2)]"></div>
        </div>
    );
}
