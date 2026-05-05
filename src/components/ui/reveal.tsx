'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface RevealProps {
  children: React.ReactNode;
  /** Delay before reveal begins, in ms. Use to stagger sequential reveals. */
  delay?: number;
  /** Reveal duration in ms. Defaults to 200ms (ARIEX motion rule). */
  duration?: number;
  className?: string;
  /** When true, the element is mounted but invisible until reveal triggers. */
  active?: boolean;
}

/**
 * Subtle opacity + 4px translate-Y reveal, linear easing, ≤200ms by default.
 * Used for sequential card/node/field reveals across ARIEX surfaces.
 */
export function Reveal({
  children,
  delay = 0,
  duration = 200,
  className,
  active = true,
}: RevealProps) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!active) {
      setShown(false);
      return;
    }
    const id = window.setTimeout(() => setShown(true), delay);
    return () => window.clearTimeout(id);
  }, [active, delay]);

  return (
    <div
      className={cn('will-change-[opacity,transform]', className)}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateY(0)' : 'translateY(4px)',
        transition: `opacity ${duration}ms linear, transform ${duration}ms linear`,
      }}
    >
      {children}
    </div>
  );
}
