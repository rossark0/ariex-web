'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowsClockwise, Check, Copy, Info, MagicWand, Trash } from '@phosphor-icons/react';
import { Reveal } from '@/components/ui/reveal';
import {
  computeScenario,
  useScenarios,
  type Scenario,
  type StrategyId,
} from '@/lib/tax/scenarios';
import { DEFAULT_TAX_YEAR, type ScenarioInputs } from '@/lib/tax/calculator';
import { getClientById } from '@/lib/api/strategist.api';
import { clientProfileToScenarioInputs } from '@/lib/tax/from-client-profile';
import { fetchClientAggregate } from '@/lib/tax/client-aggregate';
import { sanitizePageContext } from '@/lib/ai/sanitize-pii';
import { SidebarToggle } from '@/components/layout/sidebar-toggle';
import { ScenarioTree } from '../components/scenario-tree';
import { ScenarioImpactPanel } from '../components/scenario-impact-panel';
import { ScenarioInputsEditor } from '../components/scenario-inputs-editor';
import { ScenarioClientPicker } from '../components/scenario-client-picker';

export default function ScenarioWorkspacePage() {
  const params = useParams<{ scenarioId: string }>();
  const router = useRouter();
  const { scenarios, hydrated, getScenario, updateScenario, deleteScenario } = useScenarios();
  const scenarioId = params.scenarioId;

  // Local working copy of the scenario for snappy editing without thrashing
  // localStorage on every keystroke. Persisted on debounced settles below.
  const [draft, setDraft] = useState<Scenario | null>(null);
  const [animateTree, setAnimateTree] = useState(true);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Client-profile sync state: when the strategist links a scenario to a
  // client, we pull that client's stored profile and merge baseline values
  // (filing status, state, income split) into the scenario inputs.
  const [profileSync, setProfileSync] = useState<{
    clientId: string;
    clientName: string;
    filledFields: string[];
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // AI scenario-generation state.
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<{
    rationale: string;
    notes: string[];
    enabledStrategies: StrategyId[];
  } | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

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

  const handleClientChange = async (clientId: string | undefined) => {
    setDraft(prev => (prev ? { ...prev, clientId } : prev));

    if (!clientId) {
      setProfileSync(null);
      return;
    }

    // Fetch the client's profile + merge the derivable baseline values into
    // the scenario inputs. Fields the profile doesn't supply are left alone
    // so any manual edits the strategist already made are preserved.
    setIsSyncing(true);
    try {
      const client = await getClientById(clientId);
      if (!client) return;
      const { patch, filledFields } = clientProfileToScenarioInputs(client);
      if (filledFields.length > 0) {
        setDraft(prev =>
          prev ? { ...prev, inputs: { ...prev.inputs, ...patch } } : prev
        );
        setProfileSync({
          clientId,
          clientName: client.name || client.email,
          filledFields,
        });
      } else {
        setProfileSync({
          clientId,
          clientName: client.name || client.email,
          filledFields: [],
        });
      }
    } catch (err) {
      console.error('[Scenario] Failed to load client profile:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResyncFromClient = async () => {
    if (!draft?.clientId) return;
    await handleClientChange(draft.clientId);
  };

  /**
   * Pull the full client picture (profile + documents + agreements) and
   * ask the AI to propose a scenario blueprint — inputs to refine + which
   * strategies to enable + planning notes. Applies the result to the
   * current scenario in one shot.
   */
  const handleGenerateFromClient = async () => {
    if (!draft?.clientId) return;
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationResult(null);
    try {
      const aggregate = await fetchClientAggregate(draft.clientId);
      const seed = draft.inputs;

      // Sanitize PII out of everything before it leaves the browser.
      const sanitizedContext = sanitizePageContext({
        client: aggregate.client
          ? {
              id: aggregate.client.id,
              name: aggregate.client.name,
              email: aggregate.client.email,
              status: aggregate.client.status,
              role: aggregate.client.role,
              createdAt: aggregate.client.createdAt,
            }
          : null,
        profile: aggregate.client?.clientProfile ?? null,
        documents: aggregate.documents.map(d => ({
          name: d.name,
          type: d.type,
          status: d.status,
          category: d.category,
          uploadedBy: d.uploadedByName || d.uploadedBy,
          createdAt: d.createdAt,
        })),
        agreements: aggregate.agreements.map(a => ({
          id: a.id,
          name: a.name,
          status: a.status,
          price: a.price,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        })),
      });

      const res = await fetch('/api/ai/generate-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: sanitizedContext,
          currentInputs: seed,
          year: seed.year ?? DEFAULT_TAX_YEAR,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Generation failed (${res.status})`);
      }
      const blueprint = (await res.json()) as {
        name: string;
        rationale: string;
        inputs: ScenarioInputs;
        enabledStrategies: StrategyId[];
        notes: string[];
      };

      setDraft(prev =>
        prev
          ? {
              ...prev,
              name: blueprint.name || prev.name,
              inputs: { ...prev.inputs, ...blueprint.inputs },
              enabledStrategies: blueprint.enabledStrategies,
            }
          : prev
      );
      setGenerationResult({
        rationale: blueprint.rationale,
        notes: blueprint.notes,
        enabledStrategies: blueprint.enabledStrategies,
      });
    } catch (err) {
      console.error('[Scenario] AI generation failed:', err);
      setGenerationError(err instanceof Error ? err.message : 'Failed to generate scenario');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = () => {
    if (!window.confirm('Delete this scenario? This cannot be undone.')) return;
    deleteScenario(draft.id);
    router.push('/strategist/scenarios');
  };

  const handleCopySummary = async () => {
    if (!computation) return;
    const lines: string[] = [];
    lines.push(`Tax Scenario: ${draft.name}`);
    lines.push(`Tax year: ${computation.baseline.year}`);
    if (computation.baseline.state !== 'none') {
      lines.push(`State: ${computation.baseline.state}`);
    }
    lines.push('');
    lines.push(`Baseline tax: $${computation.baseline.totalTax.toLocaleString()}/yr (${(computation.baseline.effectiveRate * 100).toFixed(1)}% effective)`);
    if (computation.baseline.stateTax > 0) {
      lines.push(`  • Federal: $${computation.baseline.federalIncomeTax.toLocaleString()} · SE: $${computation.baseline.selfEmploymentTax.toLocaleString()} · State: $${computation.baseline.stateTax.toLocaleString()}`);
    }
    lines.push(`Projected tax: $${computation.projected.totalTax.toLocaleString()}/yr (${(computation.projected.effectiveRate * 100).toFixed(1)}% effective)`);
    lines.push(`Estimated annual savings: $${Math.max(0, computation.totalAnnualSavings).toLocaleString()}`);
    lines.push(`Overall confidence: ${Math.round(computation.overallConfidence * 100)}%`);
    if (computation.strategyImpacts.length > 0) {
      lines.push('');
      lines.push('Strategies applied:');
      for (const s of computation.strategyImpacts) {
        lines.push(`  • ${s.title} (${s.category}): -$${Math.max(0, s.annualSavings).toLocaleString()}/yr at ${Math.round(s.confidence * 100)}% confidence`);
      }
    }
    if (computation.allAssumptions.length > 0) {
      lines.push('');
      lines.push('Assumptions:');
      for (const a of computation.allAssumptions) {
        lines.push(`  - ${a}`);
      }
    }
    lines.push('');
    lines.push(`Estimates use ${computation.baseline.year} federal brackets; state tax not modeled. Verify with a CPA/EA before acting.`);

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error('[Scenario] Copy failed:', err);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col">
      {/* Top toolbar — three regions: nav · identity · actions */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/8 px-4">
        {/* ── Region 1: Nav ─────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center">
            <SidebarToggle />
          </div>
          <span aria-hidden="true" className="h-5 w-px shrink-0 bg-white/10" />
          <button
            type="button"
            onClick={() => router.push('/strategist/scenarios')}
            className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-steel-gray transition-colors duration-150 ease-linear hover:bg-white/8 hover:text-soft-white"
          >
            <ArrowLeft weight="bold" className="h-3.5 w-3.5" />
            Scenarios
          </button>
        </div>

        <span aria-hidden="true" className="h-5 w-px shrink-0 bg-white/10" />

        {/* ── Region 2: Identity (editable title) ───────────────────── */}
        <div className="flex min-w-0 flex-1 items-center">
          <input
            value={draft.name}
            onChange={e => setDraft({ ...draft, name: e.target.value })}
            placeholder="Untitled scenario"
            aria-label="Scenario name"
            className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-soft-white placeholder:text-steel-gray/50 transition-colors duration-150 ease-linear hover:border-white/10 hover:bg-white/3 focus:border-electric-blue/40 focus:bg-white/3 focus:outline-none"
          />
        </div>

        {/* ── Region 3: Actions (client · primary · secondary · destr.) */}
        <div className="flex shrink-0 items-center gap-2">
          <ScenarioClientPicker
            selectedClientId={draft.clientId}
            onSelect={clientId => handleClientChange(clientId)}
          />

          <span aria-hidden="true" className="h-5 w-px shrink-0 bg-white/10" />

          {/* Primary action — filled, prominent */}
          <button
            type="button"
            onClick={handleGenerateFromClient}
            disabled={!draft.clientId || isGenerating}
            title={
              draft.clientId
                ? "Pull this client's profile, documents, and agreements, then ask ARIEX to propose a tailored scenario."
                : 'Link a client first to generate a scenario from their data.'
            }
            className="flex h-7 items-center gap-1.5 rounded-md bg-electric-blue px-3 text-xs font-medium text-soft-white shadow-sm transition-colors duration-150 ease-linear hover:bg-electric-blue/85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isGenerating ? (
              <ArrowsClockwise weight="bold" className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <MagicWand weight="fill" className="h-3.5 w-3.5" />
            )}
            <span>{isGenerating ? 'Generating' : 'Generate'}</span>
          </button>

          {/* Secondary action — ghost */}
          <button
            type="button"
            onClick={handleCopySummary}
            disabled={!computation}
            title="Copy a paste-ready summary to your clipboard — useful when drafting the strategy document for this client."
            className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-steel-gray transition-colors duration-150 ease-linear hover:bg-white/8 hover:text-soft-white disabled:opacity-40"
          >
            {copied ? (
              <Check weight="bold" className="h-3.5 w-3.5 text-emerald-300" />
            ) : (
              <Copy weight="bold" className="h-3.5 w-3.5" />
            )}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Destructive action — icon-only, isolated by border */}
          <button
            type="button"
            onClick={handleDelete}
            title="Delete this scenario"
            aria-label="Delete scenario"
            className="flex h-7 w-7 items-center justify-center rounded-md text-steel-gray transition-colors duration-150 ease-linear hover:bg-red-500/15 hover:text-red-300"
          >
            <Trash weight="bold" className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Body: tree on left, impact panel on right */}
      <div className="flex flex-1 min-h-0 gap-4 overflow-hidden p-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
          {generationError && (
            <Reveal>
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
                <p className="text-xs font-medium text-red-300">
                  Couldn&apos;t generate a scenario
                </p>
                <p className="mt-0.5 text-[11px] text-red-300/80">{generationError}</p>
              </div>
            </Reveal>
          )}

          {generationResult && (
            <Reveal>
              <div className="rounded-lg border border-electric-blue/30 bg-electric-blue/10 px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <MagicWand weight="fill" className="mt-0.5 h-4 w-4 shrink-0 text-electric-blue" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-soft-white">
                      ARIEX generated this scenario from the client&apos;s data
                    </p>
                    {generationResult.rationale && (
                      <p className="mt-0.5 text-[11px] leading-relaxed text-soft-white/85">
                        {generationResult.rationale}
                      </p>
                    )}
                    {generationResult.enabledStrategies.length > 0 && (
                      <p className="mt-1 text-[11px] text-steel-gray">
                        Enabled: {generationResult.enabledStrategies.length} strateg
                        {generationResult.enabledStrategies.length === 1 ? 'y' : 'ies'}.
                      </p>
                    )}
                    {generationResult.notes.length > 0 && (
                      <ul className="mt-2 flex flex-col gap-1">
                        {generationResult.notes.map((note, i) => (
                          <li
                            key={i}
                            className="flex gap-1.5 text-[11px] leading-relaxed text-steel-gray"
                          >
                            <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-electric-blue" />
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setGenerationResult(null)}
                    className="flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium text-steel-gray transition-colors duration-150 ease-linear hover:bg-white/8 hover:text-soft-white"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </Reveal>
          )}

          {draft.clientId && (
            <Reveal>
              <div className="flex items-start justify-between gap-3 rounded-lg border border-electric-blue/25 bg-electric-blue/8 px-3 py-2">
                <div className="flex items-start gap-2">
                  <Info weight="fill" className="mt-0.5 h-4 w-4 shrink-0 text-electric-blue" />
                  <div>
                    <p className="text-xs font-medium text-soft-white">
                      {profileSync
                        ? `Synced from ${profileSync.clientName}'s profile`
                        : 'Linked to a client'}
                    </p>
                    {profileSync && profileSync.filledFields.length > 0 ? (
                      <p className="mt-0.5 text-[11px] text-steel-gray">
                        Pre-filled: {profileSync.filledFields.join(' · ')}. Edit any field to
                        override.
                      </p>
                    ) : profileSync ? (
                      <p className="mt-0.5 text-[11px] text-steel-gray">
                        Client&apos;s profile has no tax-planning fields filled yet. Edit inputs
                        manually below.
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[11px] text-steel-gray">
                        Hit Re-sync to pull the latest profile values from this client.
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResyncFromClient}
                  disabled={isSyncing}
                  title="Re-pull the latest profile values from this client"
                  className="flex shrink-0 items-center gap-1 rounded-md border border-white/10 bg-deep-navy/40 px-2 py-1 text-[11px] font-medium text-steel-gray transition-colors duration-150 ease-linear hover:bg-white/8 hover:text-soft-white disabled:opacity-40"
                >
                  <ArrowsClockwise
                    weight="bold"
                    className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`}
                  />
                  Re-sync
                </button>
              </div>
            </Reveal>
          )}
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
