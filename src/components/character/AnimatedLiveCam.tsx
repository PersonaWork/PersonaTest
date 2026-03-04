'use client';

import { useEffect, useRef, useState } from 'react';
import { generateCharacterAnimation, selectAnimationFromMessage, AnimationType } from '@/lib/ai/character-animations';

interface AnimatedLiveCamProps {
    slug: string;
    characterName: string;
    personality: Record<string, unknown>;
    idleClipUrl: string;
    message?: string;
    onAnimationGenerated?: (animationUrl: string) => void;
}

export default function AnimatedLiveCam({ 
    slug, 
    characterName, 
    personality, 
    idleClipUrl,
    message,
    onAnimationGenerated
}: AnimatedLiveCamProps) {
    const [currentAnimation, setCurrentAnimation] = useState<string>(idleClipUrl);
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentAnimationType, setCurrentAnimationType] = useState<AnimationType>('idle');
    const [viewerCount, setViewerCount] = useState(1247);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Generate animation based on message
    useEffect(() => {
        if (message && personality) {
            const animationType = selectAnimationFromMessage(characterName, personality, message);
            generateNewAnimation(animationType);
        }
    }, [message, characterName, personality]);

    // Generate idle animation periodically
    useEffect(() => {
        const interval = setInterval(() => {
            if (!isGenerating && currentAnimationType === 'idle') {
                generateNewAnimation('idle');
            }
        }, 15000); // Every 15 seconds

        return () => clearInterval(interval);
    }, [currentAnimationType, isGenerating]);

    // Simulate viewer count changes
    useEffect(() => {
        const interval = setInterval(() => {
            setViewerCount(prev => {
                const change = Math.floor(Math.random() * 21) - 10; // -10 to +10
                return Math.max(100, prev + change);
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const generateNewAnimation = async (animationType: AnimationType) => {
        setIsGenerating(true);
        setCurrentAnimationType(animationType);

        try {
            const animationUrls = await generateCharacterAnimation(characterName, animationType, 3);
            if (animationUrls.length > 0) {
                const newAnimationUrl = animationUrls[0];
                setCurrentAnimation(newAnimationUrl);
                onAnimationGenerated?.(newAnimationUrl);
            }
        } catch (error) {
            console.error('Failed to generate animation:', error);
            // Keep current animation if generation fails
        } finally {
            setIsGenerating(false);
        }
    };

    const handleVideoEnd = () => {
        // Return to idle after animation completes
        if (currentAnimationType !== 'idle') {
            generateNewAnimation('idle');
        }
    };

    const getAnimationLabel = (type: AnimationType): string => {
        const labels: Record<AnimationType, string> = {
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
            dancing: 'Dancing'
        };
        return labels[type] || 'Live';
    };

    return (
        <div className="relative w-full aspect-video rounded-3xl overflow-hidden glass-card shadow-2xl bg-slate-900 border-none">
            {/* Video layer */}
            <video
                ref={videoRef}
                key={currentAnimation}
                src={currentAnimation}
                autoPlay
                muted
                playsInline
                onEnded={handleVideoEnd}
                className="w-full h-full object-cover"
            />

            {/* Loading overlay when generating new animation */}
            {isGenerating && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-white text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                        <div className="text-sm font-medium">Generating {getAnimationLabel(currentAnimationType)} Animation...</div>
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
                        {currentAnimationType !== 'idle' && (
                            <div className="px-3 py-1 rounded-full bg-indigo-600/90 text-[10px] font-black text-white uppercase tracking-tighter self-start animate-bounce">
                                {getAnimationLabel(currentAnimationType)}
                            </div>
                        )}
                        {isGenerating && (
                            <div className="px-3 py-1 rounded-full bg-yellow-600/90 text-[10px] font-black text-white uppercase tracking-tighter self-start">
                                Generating...
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <div className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white pointer-events-auto cursor-pointer hover:bg-black/40 transition-colors">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                            </svg>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white pointer-events-auto cursor-pointer hover:bg-black/40 transition-colors">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-end">
                    <div className="flex -space-x-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="w-8 h-8 rounded-full border-2 border-indigo-600 bg-slate-200 overflow-hidden shadow-lg">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=watcher${i}`} alt="watcher" />
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

            {/* Screen Glitch/Effect */}
            <div className="absolute inset-0 pointer-events-none border-[1.5rem] border-transparent shadow-[inset_0_0_100px_rgba(0,0,0,0.2)]"></div>

            {/* Animation Controls (for development) */}
            {process.env.NODE_ENV === 'development' && (
                <div className="absolute bottom-20 left-6 flex gap-2 pointer-events-auto">
                    {(['idle', 'greeting', 'talking', 'excited', 'celebrating'] as AnimationType[]).map((type) => (
                        <button
                            key={type}
                            onClick={() => generateNewAnimation(type)}
                            className="px-2 py-1 text-xs bg-black/50 text-white rounded hover:bg-black/70 transition-colors"
                        >
                            {type}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
