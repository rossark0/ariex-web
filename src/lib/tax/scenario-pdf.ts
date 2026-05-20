/**
 * Client-side PDF generator for a tax strategy proposal.
 *
 * Builds a strategist deliverable from a Scenario + computed result, including
 * citations, deadlines, cash outlay, audit risk, and a per-strategy
 * implementation checklist. Designed to be handed to a client (or attached to
 * a CYA file) without further editing.
 */

import { jsPDF } from 'jspdf';
import type { Scenario, ScenarioComputation } from './scenarios';
import { TAX_YEAR_IS_PROJECTED } from './calculator';

interface GenerateScenarioPdfArgs {
  scenario: Scenario;
  computation: ScenarioComputation;
  clientName?: string;
  strategistName?: string;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function formatDate(d: Date = new Date()): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const M = { left: 48, right: 48, top: 56, bottom: 56 };
const COLOR = {
  ink: [17, 19, 21] as const, // Graphite text on white print
  muted: [110, 118, 130] as const,
  rule: [200, 205, 215] as const,
  accent: [47, 107, 255] as const, // Electric Blue
  emerald: [16, 130, 95] as const,
  amber: [180, 110, 0] as const,
  red: [180, 50, 50] as const,
};

const RISK_COLOR: Record<'low' | 'medium' | 'high', readonly [number, number, number]> = {
  low: COLOR.emerald,
  medium: COLOR.amber,
  high: COLOR.red,
};

/** Build the PDF and trigger a browser download. */
export function downloadScenarioPdf({
  scenario,
  computation,
  clientName,
  strategistName,
}: GenerateScenarioPdfArgs): void {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - M.left - M.right;
  let y = M.top;

  const newPageIfNeeded = (needed: number) => {
    if (y + needed > pageHeight - M.bottom) {
      doc.addPage();
      y = M.top;
    }
  };

  // ─── Header ──────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...COLOR.ink);
  doc.text('Tax Strategy Proposal', M.left, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLOR.muted);
  const subtitle = `Prepared ${formatDate()} · Tax year ${scenario.inputs.year ?? 2026}${
    scenario.inputs.year && TAX_YEAR_IS_PROJECTED[scenario.inputs.year] ? ' (projected)' : ''
  }`;
  doc.text(subtitle, M.left, y + 12);
  y += 28;

  // Rule
  doc.setDrawColor(...COLOR.rule);
  doc.setLineWidth(0.5);
  doc.line(M.left, y, pageWidth - M.right, y);
  y += 20;

  // ─── Client / scenario block ─────────────────────────────────────────
  const labelValuePairs: Array<[string, string]> = [
    ['Client', clientName || '—'],
    ['Scenario', scenario.name || 'Untitled scenario'],
    ['Filing status', humanFilingStatus(scenario.inputs.filingStatus)],
    ['State', scenario.inputs.state && scenario.inputs.state !== 'none' ? scenario.inputs.state.toUpperCase() : '—'],
  ];
  doc.setFontSize(9);
  for (const [label, value] of labelValuePairs) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR.muted);
    doc.text(label.toUpperCase(), M.left, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLOR.ink);
    doc.text(value, M.left + 90, y);
    y += 14;
  }
  y += 12;

  // ─── Executive summary (savings) ─────────────────────────────────────
  newPageIfNeeded(80);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLOR.ink);
  doc.text('Executive summary', M.left, y);
  y += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLOR.muted);
  doc.text('Estimated annual tax savings', M.left, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...COLOR.emerald);
  doc.text(formatCurrency(computation.totalAnnualSavings), pageWidth - M.right, y, { align: 'right' });
  y += 22;

  const summaryRows: Array<[string, string]> = [
    ['Baseline tax', formatCurrency(computation.baseline.totalTax)],
    ['Projected tax (with strategies)', formatCurrency(computation.projected.totalTax)],
    [
      'Effective rate change',
      `${(computation.baseline.effectiveRate * 100).toFixed(1)}% → ${(
        computation.projected.effectiveRate * 100
      ).toFixed(1)}%`,
    ],
    ['Cash deployed this year', formatCurrency(computation.totalCashOutlay)],
    ['Overall confidence', `${Math.round(computation.overallConfidence * 100)}%`],
  ];
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  for (const [label, value] of summaryRows) {
    doc.setTextColor(...COLOR.muted);
    doc.text(label, M.left, y);
    doc.setTextColor(...COLOR.ink);
    doc.text(value, pageWidth - M.right, y, { align: 'right' });
    y += 13;
  }
  y += 14;

  // ─── Strategies section ──────────────────────────────────────────────
  if (computation.strategyImpacts.length > 0) {
    newPageIfNeeded(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLOR.ink);
    doc.text('Strategies applied', M.left, y);
    y += 16;

    for (const strat of computation.strategyImpacts) {
      newPageIfNeeded(120);

      // Strategy header — title + savings
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...COLOR.ink);
      doc.text(strat.title, M.left, y);
      doc.setTextColor(...COLOR.emerald);
      doc.text(`-${formatCurrency(Math.max(0, strat.annualSavings))}`, pageWidth - M.right, y, {
        align: 'right',
      });
      y += 14;

      // Meta: category · confidence · risk
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...COLOR.muted);
      const metaParts = [
        strat.category.toUpperCase(),
        `${Math.round(strat.confidence * 100)}% confidence`,
        `${strat.auditRisk.toUpperCase()} audit risk`,
      ];
      const metaText = metaParts.join('   ·   ');
      doc.text(metaText, M.left, y);
      // Risk-colored bullet at end
      const riskColor = RISK_COLOR[strat.auditRisk];
      doc.setFillColor(...riskColor);
      doc.circle(M.left + doc.getTextWidth(metaText) + 6, y - 3, 2, 'F');
      y += 14;

      // Cash deployed (if any)
      if (strat.cashOutlay > 0) {
        doc.setTextColor(...COLOR.muted);
        doc.text('Cash deployed', M.left, y);
        doc.setTextColor(...COLOR.ink);
        doc.text(formatCurrency(strat.cashOutlay), pageWidth - M.right, y, { align: 'right' });
        y += 12;
      }

      // Authority
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...COLOR.muted);
      doc.text('AUTHORITY', M.left, y);
      y += 11;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLOR.ink);
      const authorityLines = doc.splitTextToSize(strat.authority.label, contentWidth);
      doc.text(authorityLines, M.left, y);
      y += authorityLines.length * 11;
      if (strat.authority.detail) {
        doc.setTextColor(...COLOR.muted);
        const detailLines = doc.splitTextToSize(strat.authority.detail, contentWidth);
        doc.text(detailLines, M.left, y);
        y += detailLines.length * 11;
      }
      y += 4;

      // Deadline
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLOR.muted);
      doc.text('DEADLINE', M.left, y);
      y += 11;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLOR.accent);
      const dlLines = doc.splitTextToSize(strat.deadline, contentWidth);
      doc.text(dlLines, M.left, y);
      y += dlLines.length * 11 + 4;

      // Next steps
      if (strat.nextSteps.length > 0) {
        newPageIfNeeded(40 + strat.nextSteps.length * 13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLOR.muted);
        doc.text('IMPLEMENTATION', M.left, y);
        y += 11;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLOR.ink);
        strat.nextSteps.forEach((step, i) => {
          const lines = doc.splitTextToSize(`${i + 1}. ${step}`, contentWidth - 12);
          newPageIfNeeded(lines.length * 11 + 4);
          doc.text(lines, M.left + 12, y);
          y += lines.length * 11 + 2;
        });
      }

      // Assumptions
      if (strat.dynamicAssumptions.length > 0) {
        newPageIfNeeded(30 + strat.dynamicAssumptions.length * 13);
        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLOR.muted);
        doc.text('ASSUMPTIONS', M.left, y);
        y += 11;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLOR.ink);
        for (const a of strat.dynamicAssumptions) {
          const lines = doc.splitTextToSize(`• ${a}`, contentWidth - 12);
          newPageIfNeeded(lines.length * 11 + 2);
          doc.text(lines, M.left + 12, y);
          y += lines.length * 11 + 2;
        }
      }

      // Separator
      y += 8;
      doc.setDrawColor(...COLOR.rule);
      doc.line(M.left, y, pageWidth - M.right, y);
      y += 14;
    }
  }

  // ─── Ineligible warnings ─────────────────────────────────────────────
  if (computation.ineligibleEnabled.length > 0) {
    newPageIfNeeded(60);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLOR.amber);
    doc.text('Strategies considered but not applied', M.left, y);
    y += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    for (const x of computation.ineligibleEnabled) {
      newPageIfNeeded(40);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLOR.ink);
      doc.text(x.title, M.left, y);
      y += 12;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLOR.muted);
      const lines = doc.splitTextToSize(x.reason, contentWidth);
      doc.text(lines, M.left, y);
      y += lines.length * 11 + 8;
    }
    y += 8;
  }

  // ─── Disclaimer ──────────────────────────────────────────────────────
  newPageIfNeeded(120);
  doc.setDrawColor(...COLOR.rule);
  doc.line(M.left, y, pageWidth - M.right, y);
  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR.muted);
  doc.text('DISCLAIMER', M.left, y);
  y += 11;
  doc.setFont('helvetica', 'normal');
  const disclaimer =
    'Estimates use federal brackets, standard deduction, simplified §199A QBI (20% of pass-through), SE tax, NIIT (3.8%), and Additional Medicare (0.9%). State tax (when modeled) is approximated at the top marginal rate × AGI and does not account for state-specific deductions, credits, or city add-ons. AMT, QBI phase-outs (SSTB / W-2 wage limits), and multi-year recapture are not modeled. This document is a planning illustration prepared by your tax strategist — it is not a tax opinion, accounting advice, or a substitute for professional review. Final positions should be confirmed with a licensed CPA or Enrolled Agent before execution.';
  const dLines = doc.splitTextToSize(disclaimer, contentWidth);
  doc.setTextColor(...COLOR.ink);
  doc.text(dLines, M.left, y);
  y += dLines.length * 11 + 24;

  // ─── Signature line ──────────────────────────────────────────────────
  newPageIfNeeded(60);
  doc.setDrawColor(...COLOR.ink);
  doc.line(M.left, y, M.left + 220, y);
  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR.muted);
  doc.text(strategistName ? `${strategistName} — Tax Strategist` : 'Tax Strategist', M.left, y);
  y += 22;
  doc.line(M.left, y, M.left + 220, y);
  y += 12;
  doc.text('Client — Acknowledged and approved', M.left, y);

  // ─── Save ────────────────────────────────────────────────────────────
  const safeClient = (clientName || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const safeName = (scenario.name || 'scenario')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  doc.save(`ariex-${safeClient}-${safeName}.pdf`);
}

function humanFilingStatus(s: string): string {
  switch (s) {
    case 'single':
      return 'Single';
    case 'married_filing_jointly':
      return 'Married filing jointly';
    case 'married_filing_separately':
      return 'Married filing separately';
    case 'head_of_household':
      return 'Head of household';
    default:
      return s;
  }
}
