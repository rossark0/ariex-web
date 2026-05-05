'use client';

import { cn } from '@/lib/utils';

interface WordmarkProps {
  className?: string;
  /** Override the foreground color. Defaults to currentColor. */
  color?: string;
  /** Pixel height of the wordmark; width scales proportionally. */
  height?: number;
}

/**
 * ARIEX wordmark. Inline SVG so it survives font fallback and lets us strip the
 * crossbar from the A. Geometry approximates Neue Haas Grotesk Display Pro
 * Medium with optical kerning and +45 tracking.
 *
 * Each glyph is hand-shaped; the A intentionally has no crossbar per brand.
 * The "X" uses straight diagonals; the "R" leg follows a Helvetica/Haas curve.
 */
export function Wordmark({ className, color = 'currentColor', height = 14 }: WordmarkProps) {
  // viewBox tuned so x-height and stem widths read as Medium at small sizes.
  // Width 142, height 24 → aspect ratio ~5.92:1. Tracking baked into glyph spacing.
  const width = (height * 142) / 24;

  return (
    <svg
      role="img"
      aria-label="ARIEX"
      viewBox="0 0 142 24"
      width={width}
      height={height}
      className={cn('shrink-0 select-none', className)}
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="geometricPrecision"
    >
      {/* A — no crossbar */}
      <path d="M0 23 L7.6 1 H12.4 L20 23 H16.2 L14.5 17.8 H5.5 L3.8 23 H0 Z M6.5 14.6 H13.5 L10 4.2 L6.5 14.6 Z" />
      {/* R */}
      <path d="M28 1 H37.4 C41.7 1 44.5 3.6 44.5 7.4 C44.5 10.1 43 12.2 40.5 13.1 L45 23 H40.9 L36.9 13.8 H31.6 V23 H28 V1 Z M31.6 4.3 V10.6 H37 C39.2 10.6 40.7 9.3 40.7 7.4 C40.7 5.5 39.2 4.3 37 4.3 H31.6 Z" />
      {/* I */}
      <rect x="53" y="1" width="3.6" height="22" />
      {/* E */}
      <path d="M65 1 H80 V4.3 H68.6 V10.1 H78.8 V13.4 H68.6 V19.7 H80.3 V23 H65 V1 Z" />
      {/* X */}
      <path d="M88 23 L95.6 11.6 L88.4 1 H92.7 L97.9 8.9 L103 1 H107.3 L100.1 11.6 L107.7 23 H103.3 L97.8 14.3 L92.3 23 H88 Z" />
    </svg>
  );
}

interface WordmarkTextProps {
  className?: string;
}

/**
 * Text-based wordmark fallback. Uses Neue Haas Grotesk Display Pro Medium with
 * +45 tracking. Prefer <Wordmark /> (SVG) for the canonical brand mark since
 * the A in that variant has no crossbar.
 */
export function WordmarkText({ className }: WordmarkTextProps) {
  return (
    <span
      className={cn(
        'font-display font-medium text-graphite tracking-wordmark uppercase',
        className
      )}
      style={{ fontFeatureSettings: '"kern" 1', fontKerning: 'normal' }}
    >
      Ariex
    </span>
  );
}
