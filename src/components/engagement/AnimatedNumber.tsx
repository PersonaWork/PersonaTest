'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
  flashOnChange?: boolean;
}

export default function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 2,
  duration = 800,
  className = '',
  flashOnChange = true,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const prevValue = useRef(value);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = prevValue.current;
    const endValue = value;
    const startTime = performance.now();

    // Detect change direction for flash
    if (flashOnChange && startValue !== endValue) {
      setFlash(endValue > startValue ? 'up' : 'down');
      const flashTimer = setTimeout(() => setFlash(null), 600);
      // cleanup in return
      const cleanup = () => clearTimeout(flashTimer);
      // We'll handle this in the main cleanup
      prevValue.current = value;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = startValue + (endValue - startValue) * eased;
        setDisplayValue(current);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
      return () => {
        cleanup();
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
    }

    prevValue.current = value;
    setDisplayValue(value);
  }, [value, duration, flashOnChange]);

  const formatted = `${prefix}${displayValue.toFixed(decimals)}${suffix}`;

  return (
    <span
      className={`
        transition-colors duration-300 tabular-nums font-mono
        ${flash === 'up' ? 'text-emerald-400' : ''}
        ${flash === 'down' ? 'text-red-400' : ''}
        ${className}
      `}
    >
      {formatted}
    </span>
  );
}
