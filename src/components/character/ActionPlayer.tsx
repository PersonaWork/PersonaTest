'use client';

import { useEffect, useRef, useState } from 'react';

interface ActionPlayerProps {
    clipUrl: string;
    audioUrl?: string;
    onComplete: () => void;
    isActive: boolean;
}

export default function ActionPlayer({
    clipUrl,
    audioUrl,
    onComplete,
    isActive
}: ActionPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isActive || !clipUrl) return;

        setIsLoading(true);
        setError(null);

        const video = videoRef.current;
        const audio = audioRef.current;

        if (!video) return;

        const handleCanPlay = () => {
            setIsLoading(false);
            video.play().catch(console.error);

            if (audio && audioUrl) {
                audio.play().catch(console.error);
            }
        };

        const handleEnded = () => {
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
            onComplete();
        };

        const handleError = () => {
            setError('Failed to load video');
            setIsLoading(false);
            // Still call onComplete so the state machine can continue
            onComplete();
        };

        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('ended', handleEnded);
        video.addEventListener('error', handleError);

        // Set video source
        video.src = clipUrl;
        video.load();

        if (audio && audioUrl) {
            audio.src = audioUrl;
            audio.load();
        }

        return () => {
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('ended', handleEnded);
            video.removeEventListener('error', handleError);

            video.pause();
            video.src = '';

            if (audio) {
                audio.pause();
                audio.src = '';
            }
        };
    }, [clipUrl, audioUrl, isActive, onComplete]);

    if (!isActive) return null;

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            {/* Loading state */}
            {isLoading && !error && (
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-white font-medium">Loading action...</p>
                </div>
            )}

            {/* Error state */}
            {error && (
                <div className="text-red-400">
                    <p>{error}</p>
                </div>
            )}

            {/* Video element - hidden, we show a preview */}
            <video
                ref={videoRef}
                className="hidden"
                playsInline
                muted
            />

            {/* Audio element - hidden */}
            {audioUrl && (
                <audio ref={audioRef} className="hidden" />
            )}

            {/* Action indicator */}
            <div className="absolute top-4 left-4 px-4 py-2 rounded-full bg-indigo-600/90 backdrop-blur-sm">
                <span className="text-white font-bold text-sm animate-pulse">
                    🎬 Action Playing
                </span>
            </div>
        </div>
    );
}
