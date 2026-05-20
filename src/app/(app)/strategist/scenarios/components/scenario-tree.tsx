'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  STRATEGIES,
  STRATEGY_ORDER,
  type StrategyId,
  type Scenario,
} from '@/lib/tax/scenarios';
import type { ScenarioComputation } from '@/lib/tax/scenarios';

interface ScenarioTreeProps {
  scenario: Scenario;
  computation: ScenarioComputation;
  /** When true, applies the staggered reveal animation on the right children. */
  animated?: boolean;
  onToggleStrategy: (id: StrategyId) => void;
}

/**
 * Branching decision-tree visualization. One root "Baseline" node on the left,
 * a vertical column of strategy options on the right. Each strategy is
 * connected by a smooth cubic-Bezier path; the rendered SVG also overlays
 * positioned HTML for the node labels so they remain crisp + interactive.
 */
const NODE_WIDTH = 208;
const ROOT_NODE_WIDTH = 180;
const NODE_HEIGHT = 72;
const HORIZONTAL_GAP = 130;
const VERTICAL_STRIDE = 84;
const VERTICAL_PADDING = 20;
const SVG_LEFT_PADDING = 8;

export function ScenarioTree({
  scenario,
  computation,
  animated = true,
  onToggleStrategy,
}: ScenarioTreeProps) {
  const optionStrategies = STRATEGY_ORDER.filter(id => STRATEGIES[id]);

  const layout = useMemo(() => {
    const totalHeight = Math.max(
      optionStrategies.length * VERTICAL_STRIDE,
      NODE_HEIGHT * 2
    );
    const rootCenterY = totalHeight / 2 + VERTICAL_PADDING;
    const rootRight = SVG_LEFT_PADDING + ROOT_NODE_WIDTH;
    const optionLeft = rootRight + HORIZONTAL_GAP;

    const optionPositions = optionStrategies.map((id, i) => {
      const yCenter =
        VERTICAL_PADDING +
        (totalHeight - optionStrategies.length * VERTICAL_STRIDE) / 2 +
        VERTICAL_STRIDE * i +
        NODE_HEIGHT / 2;
      return { id, x: optionLeft, yCenter };
    });

    const svgHeight = totalHeight + VERTICAL_PADDING * 2;
    const svgWidth = optionLeft + NODE_WIDTH + SVG_LEFT_PADDING;

    return { rootCenterY, rootRight, optionPositions, svgWidth, svgHeight, totalHeight };
  }, [optionStrategies]);

  const baselineRate = (computation.baseline.effectiveRate * 100).toFixed(1);

  return (
    <section className="rounded-xl bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-steel-gray">
          Strategy paths
        </h3>
        <span className="text-[11px] text-steel-gray/60">Tap a strategy to toggle</span>
      </div>
      <div className="overflow-x-auto">
        <div
          className="relative mx-auto"
          style={{ width: layout.svgWidth, height: layout.svgHeight }}
        >
          <svg
        viewBox={`0 0 ${layout.svgWidth} ${layout.svgHeight}`}
        width={layout.svgWidth}
        height={layout.svgHeight}
        aria-hidden="true"
        className="absolute inset-0"
      >
        {layout.optionPositions.map((pos, i) => {
          const enabled = scenario.enabledStrategies.includes(pos.id);
          const startX = layout.rootRight;
          const startY = layout.rootCenterY;
          const endX = pos.x;
          const endY = pos.yCenter;
          const midX = (startX + endX) / 2;
          const path = `M ${startX} ${startY} C ${midX} ${startY} ${midX} ${endY} ${endX} ${endY}`;

          return (
            <g key={pos.id}>
              <path
                d={path}
                fill="none"
                stroke={enabled ? 'rgb(47 107 255)' : 'rgba(255,255,255,0.12)'}
                strokeWidth={enabled ? 2 : 1.25}
                style={
                  animated
                    ? {
                        opacity: 0,
                        animation: `ariex-edge-fade-in 200ms linear forwards`,
                        animationDelay: `${120 + i * 90}ms`,
                      }
                    : undefined
                }
              />
            </g>
          );
        })}
      </svg>

      <style>{`
        @keyframes ariex-edge-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Root node */}
      <div
        className="absolute"
        style={{
          left: SVG_LEFT_PADDING,
          top: layout.rootCenterY - NODE_HEIGHT / 2,
          width: ROOT_NODE_WIDTH,
          height: NODE_HEIGHT,
        }}
      >
        <div className="flex h-full flex-col justify-center rounded-xl bg-surface px-3 py-2">
          <span className="text-[10px] font-semibold tracking-wide text-steel-gray uppercase">
            Baseline
          </span>
          <p className="mt-0.5 text-sm font-medium text-soft-white">
            ${computation.baseline.totalTax.toLocaleString()} /yr
          </p>
          <p className="text-[11px] text-steel-gray">{baselineRate}% effective rate</p>
        </div>
      </div>

      {/* Option nodes */}
      {layout.optionPositions.map((pos, i) => {
        const strategy = STRATEGIES[pos.id];
        const enabled = scenario.enabledStrategies.includes(pos.id);
        const impact = computation.strategyImpacts.find(x => x.id === pos.id);
        const isApplicable = strategy.isApplicable(scenario.inputs);

        return (
          <button
            key={pos.id}
            type="button"
            onClick={() => onToggleStrategy(pos.id)}
            disabled={!isApplicable}
            data-focus-item
            className={cn(
              'absolute flex flex-col justify-center rounded-xl border px-3 py-2 text-left transition-all duration-200 ease-linear',
              'disabled:cursor-not-allowed disabled:opacity-40',
              enabled
                ? 'border-electric-blue bg-electric-blue/15 shadow-[0_0_0_1px_rgba(47,107,255,0.45)]'
                : 'border-white/10 bg-surface hover:border-white/20 hover:bg-white/5'
            )}
            style={{
              left: pos.x,
              top: pos.yCenter - NODE_HEIGHT / 2,
              width: NODE_WIDTH,
              height: NODE_HEIGHT,
              opacity: animated ? 0 : 1,
              animation: animated
                ? `ariex-node-reveal 240ms linear forwards`
                : undefined,
              animationDelay: animated ? `${200 + i * 90}ms` : undefined,
            }}
            title={
              isApplicable
                ? undefined
                : 'Not applicable based on current baseline (e.g., insufficient SE income).'
            }
          >
            <style>{`
              @keyframes ariex-node-reveal {
                from { opacity: 0; transform: translateY(-3px); }
                to   { opacity: 1; transform: translateY(0); }
              }
            `}</style>

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-wide text-steel-gray uppercase">
                {strategy.category}
              </span>
              {enabled && (
                <span className="rounded-full bg-electric-blue/30 px-1.5 text-[9px] font-semibold tracking-wide text-soft-white uppercase">
                  On
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-sm font-medium text-soft-white">
              {strategy.title}
            </p>
            <p className="text-[11px] tabular-nums">
              {enabled && impact ? (
                <span className="text-emerald-300">
                  -${Math.max(0, impact.annualSavings).toLocaleString()} /yr
                </span>
              ) : (
                <span className="text-steel-gray">Tap to evaluate</span>
              )}
            </p>
          </button>
        );
      })}
        </div>
      </div>
    </section>
  );
}
