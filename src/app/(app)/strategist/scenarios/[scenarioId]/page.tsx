'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Sparkle, Trash } from '@phosphor-icons/react';
import { Reveal } from '@/components/ui/reveal';
import {
  computeScenario,
  useScenarios,
  type Scenario,
  type StrategyId,
} from '@/lib/tax/scenarios';
import type { ScenarioInputs } from '@/lib/tax/calculator';
import { ScenarioTree } from '../components/scenario-tree';
import { ScenarioImpactPanel } from '../components/scenario-impact-panel';
import { ScenarioInputsEditor } from '../components/scenario-inputs-editor';

export default function ScenarioWorkspacePage() {
  const params = useParams<{ scenarioId: string }>();
  const router = useRouter();
  const { scenarios, hydrated, getScenario, updateScenario, deleteScenario } = useScenarios();
  const scenarioId = params.scenarioId;

  // Local working copy of the scenario for snappy editing without thrashing
  // localStorage on every keystroke. Persisted on debounced settles below.
  const [draft, setDraft] = useState<Scenario | null>(null);
  const [animateTree, setAnimateTree] = useState(true);

  // Hydrate the working copy when the scenario list resolves.
  useEffect(() => {
    if (!hydrated) return;
    const found = getScenario(scenarioId);
    if (found) {
      setDraft(found);
    }
  }, [hydrated, scenarioId, getScenario]);

  // Debounced persist whenever the draft changes.
  useEffect(() => {
    if (!draft) return;
    const handle = setTimeout(() => {
      updateScenario(draft.id, {
        name: draft.name,
        inputs: draft.inputs,
        enabledStrategies: draft.enabledStrategies,
        clientId: draft.clientId,
      });
    }, 300);
    return () => clearTimeout(handle);
    // We intentionally exclude updateScenario from deps to avoid storms during
    // its own state turnover; it's stable per the hook contract.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  // Disable the staggered reveal after first mount so toggling a strategy
  // doesn't replay the whole intro animation. Only re-triggers when the
  // scenario id changes (i.e., a different scenario is loaded).
  useEffect(() => {
    if (!draft) return;
    const t = setTimeout(() => setAnimateTree(false), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id]);

  const computation = useMemo(
    () => (draft ? computeScenario(draft) : null),
    [draft]
  );

  // ─── Loading & not-found ─────────────────────────────────────────────
  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center bg-graphite">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-electric-blue" />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-base font-medium text-soft-white">Scenario not found</p>
        <p className="text-sm text-steel-gray">
          It may have been deleted from this browser. Scenarios are saved locally for now.
        </p>
        <button
          onClick={() => router.push('/strategist/scenarios')}
          className="mt-2 rounded-md border border-white/10 bg-white/3 px-3 py-1.5 text-sm font-medium text-soft-white transition-colors duration-150 ease-linear hover:bg-white/8"
        >
          Back to scenarios
        </button>
      </div>
    );
  }

  // ─── Handlers ────────────────────────────────────────────────────────
  const handleInputsChange = (next: ScenarioInputs) => {
    setDraft(prev => (prev ? { ...prev, inputs: next } : prev));
  };

  const handleToggleStrategy = (id: StrategyId) => {
    setDraft(prev => {
      if (!prev) return prev;
      const enabled = prev.enabledStrategies.includes(id);
      const next = enabled
        ? prev.enabledStrategies.filter(x => x !== id)
        : [...prev.enabledStrategies, id];
      return { ...prev, enabledStrategies: next };
    });
  };

  const handleDelete = () => {
    if (!window.confirm('Delete this scenario? This cannot be undone.')) return;
    deleteScenario(draft.id);
    router.push('/strategist/scenarios');
  };

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col">
      {/* Top toolbar */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/8 px-6 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => router.push('/strategist/scenarios')}
            className="flex h-7 w-7 items-center justify-center rounded-md text-steel-gray transition-colors duration-150 ease-linear hover:bg-white/8 hover:text-soft-white"
            title="Back to scenarios"
          >
            <ArrowLeft weight="bold" className="h-4 w-4" />
          </button>
          <Sparkle weight="fill" className="h-4 w-4 shrink-0 text-electric-blue" />
          <input
            value={draft.name}
            onChange={e => setDraft({ ...draft, name: e.target.value })}
            className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-base font-medium text-soft-white focus:border-white/15 focus:bg-white/3 focus:outline-none"
          />
        </div>
        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300 transition-colors duration-150 ease-linear hover:bg-red-500/15"
        >
          <Trash weight="bold" className="h-3.5 w-3.5" />
          Delete
        </button>
      </header>

      {/* Body: tree on left, impact panel on right */}
      <div className="flex flex-1 min-h-0 gap-4 overflow-hidden p-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
          <Reveal>
            <ScenarioInputsEditor inputs={draft.inputs} onChange={handleInputsChange} />
          </Reveal>
          <Reveal delay={80}>
            {computation && (
              <ScenarioTree
                scenario={draft}
                computation={computation}
                animated={animateTree}
                onToggleStrategy={handleToggleStrategy}
              />
            )}
          </Reveal>
        </div>
        <aside className="hidden w-[340px] shrink-0 overflow-y-auto rounded-lg border border-white/8 bg-deep-navy p-4 lg:block">
          {computation && <ScenarioImpactPanel computation={computation} />}
        </aside>
      </div>
    </div>
  );
}
