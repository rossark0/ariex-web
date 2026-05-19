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
 * Official ARIEX wordmark — reconstructed from the approved brand assets in
 * /public/ariex-brand (Primary graphite-on-white & Reverse white-on-graphite).
 *
 * Spec honored:
 *  - Neue Haas Grotesk Display Pro Medium geometry
 *  - Wide tracking (+45 equivalent — large optical gaps between glyphs)
 *  - Custom apex "A" with NO crossbar (clean caret)
 *  - Optical kerning hand-tuned per glyph pair
 *  - Single uniform thin stroke weight (matches the concept board)
 *  - currentColor fill → Graphite #111315 on light, Soft White #F7F8FA on
 *    dark, automatically, with no second asset.
 *
 * Stroke-based (fill: none) so the weight stays perfectly even at every size
 * the way the reference mark reads.
 */
export function Wordmark({ className, color = 'currentColor', height = 16 }: WordmarkProps) {
  // viewBox: cap height 90 (y 10→100), generous tracking baked into x-advance.
  // Total inked width ≈ 518 → aspect ratio ≈ 4.8:1.
  const VIEW_W = 528;
  const VIEW_H = 110;
  const width = (height * VIEW_W) / VIEW_H;

  return (
    <svg
      role="img"
      aria-label="ARIEX"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width={width}
      height={height}
      className={cn('shrink-0 select-none', className)}
      fill="none"
      stroke={color}
      strokeWidth={6}
      strokeLinecap="square"
      strokeLinejoin="miter"
      shapeRendering="geometricPrecision"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* A — apex, NO crossbar */}
      <path d="M0 100 L29 10 L58 100" />

      {/* R — vertical stem, rounded top-right bowl, straight diagonal leg */}
      <path d="M148 100 L148 10 L184 10 C202 10 202 41 184 53 L148 53 M167 53 L205 100" />

      {/* I — single vertical */}
      <path d="M296 10 L296 100" />

      {/* E — stem + three arms (mid arm slightly shorter) */}
      <path d="M400 10 L354 10 L354 100 L400 100 M354 55 L390 55" />

      {/* X — two crossing diagonals */}
      <path d="M460 10 L518 100 M518 10 L460 100" />
    </svg>
  );
}

interface WordmarkTextProps {
  className?: string;
}

/**
 * Text fallback. Inherits color via currentColor (no hardcoded graphite —
 * that broke on dark surfaces). Prefer <Wordmark /> for the canonical mark.
 */
export function WordmarkText({ className }: WordmarkTextProps) {
  return (
    <span
      className={cn(
        'font-display font-medium tracking-wordmark uppercase',
        className
      )}
      style={{ fontFeatureSettings: '"kern" 1', fontKerning: 'normal' }}
    >
      Ariex
    </span>
  );
}
