'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Count up from 0 (or `from`) to `target` over `duration` ms with linear easing.
 * Per ARIEX motion rules: 300ms by default, linear, no spring.
 *
 * Re-runs whenever `target` changes (animates the delta from current displayed
 * value, not from 0, so successive updates don't visually reset).
 */
export function useCountUp(target: number, duration = 300, from?: number): number {
  const [value, setValue] = useState<number>(from ?? target);
  const frameRef = useRef<number | null>(null);
  const startValueRef = useRef<number>(from ?? target);

  useEffect(() => {
    // Cancel any in-flight animation.
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }

    const startTime = performance.now();
    const startValue = startValueRef.current;
    const delta = target - startValue;

    if (delta === 0) {
      setValue(target);
      return;
    }

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // linear easing
      const next = startValue + delta * t;
      setValue(next);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        startValueRef.current = target;
        frameRef.current = null;
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      // Snapshot whatever was displayed so the next run can resume from there.
      startValueRef.current = value;
    };
    // We intentionally exclude `value` and `duration` from the deps to keep the
    // animation stable; updating `target` is the only signal that should restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}
