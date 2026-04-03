'use client';

import { useEffect, useState, useCallback } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  velocityX: number;
  velocityY: number;
  opacity: number;
  shape: 'square' | 'circle' | 'triangle';
}

const COLORS = [
  '#6366f1', '#818cf8', '#a855f7', '#c084fc',
  '#ec4899', '#f472b6', '#10b981', '#34d399',
  '#f97316', '#fb923c', '#eab308', '#facc15',
];

interface ConfettiProps {
  active: boolean;
  onComplete?: () => void;
  duration?: number;
}

export default function Confetti({ active, onComplete, duration = 3000 }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  const createParticles = useCallback(() => {
    const newParticles: Particle[] = [];
    const count = 60;
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: i,
        x: 50 + (Math.random() - 0.5) * 30,
        y: 40 + (Math.random() - 0.5) * 20,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 6 + Math.random() * 8,
        rotation: Math.random() * 360,
        velocityX: (Math.random() - 0.5) * 8,
        velocityY: -4 - Math.random() * 8,
        opacity: 1,
        shape: (['square', 'circle', 'triangle'] as const)[Math.floor(Math.random() * 3)],
      });
    }
    return newParticles;
  }, []);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    const newParticles = createParticles();
    setParticles(newParticles);

    const timer = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [active, createParticles, duration, onComplete]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.shape !== 'triangle' ? p.color : 'transparent',
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
            borderLeft: p.shape === 'triangle' ? `${p.size / 2}px solid transparent` : undefined,
            borderRight: p.shape === 'triangle' ? `${p.size / 2}px solid transparent` : undefined,
            borderBottom: p.shape === 'triangle' ? `${p.size}px solid ${p.color}` : undefined,
            transform: `rotate(${p.rotation}deg)`,
            '--vx': `${p.velocityX * 40}px`,
            '--vy': `${p.velocityY * 60}px`,
            animationDuration: `${1.5 + Math.random() * 1.5}s`,
            animationDelay: `${Math.random() * 0.3}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
