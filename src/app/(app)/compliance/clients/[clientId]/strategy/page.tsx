'use client';

import { useRoleRedirect } from '@/hooks/use-role-redirect';
import { useRouter } from 'next/navigation';
import { getFullClientById } from '@/lib/mocks/client-full';
import { ArrowLeft, Download, CheckCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

interface Props {
  params: { clientId: string };
}

export default function ComplianceClientStrategyPage({ params }: Props) {
  useRoleRedirect('COMPLIANCE');
  const router = useRouter();

  const client = getFullClientById(params.clientId);

  if (!client) {
    return (
      <section className="flex flex-col gap-4 p-6">
        <div>Client not found</div>
      </section>
    );
  }

  // Find strategy document
  const strategyDoc = client.documents.find(
    d => d.category === 'contract' && d.originalName.toLowerCase().includes('strategy')
  );

  if (!strategyDoc) {
    return (
      <section className="flex flex-col gap-6 p-6">
        <button
          onClick={() => router.back()}
          className="flex w-fit items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="text-zinc-600">No strategy document found for this client.</div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Client
        </button>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            Download
          </Button>
          <span
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
              strategyDoc.signatureStatus === 'SIGNED'
                ? 'bg-emerald-100 text-emerald-700'
                : strategyDoc.signatureStatus === 'SENT'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-zinc-100 text-zinc-700'
            }`}
          >
            {strategyDoc.signatureStatus === 'SIGNED' && <CheckCircle weight="fill" className="h-4 w-4" />}
            {strategyDoc.signatureStatus}
          </span>
        </div>
      </div>

      {/* Document Viewer */}
      <div className="rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-6 py-4">
          <h1 className="text-xl font-bold text-zinc-900">{strategyDoc.originalName}</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {/* Client: {client.user.name} • {strategyDoc.signedAt ? `Signed ${strategyDoc.signedAt.toLocaleDateString()}` : strategyDoc.sentAt ? `Sent ${strategyDoc.sentAt.toLocaleDateString()}` : 'Draft'} */}
          </p>
        </div>

        {/* Document Content */}
        <div className="p-8">
          <div className="prose max-w-none">
            <h2 className="text-2xl font-bold text-zinc-900">
              2025 Tax Strategy Plan for {client.user.name}
            </h2>

            <div className="mt-6 space-y-6">
              <section>
                <h3 className="text-lg font-semibold text-zinc-900">Executive Summary</h3>
                <p className="mt-2 text-zinc-700">
                  This comprehensive tax strategy document outlines personalized recommendations to
                  optimize your tax position for the 2025 fiscal year. Our analysis of your
                  financial situation has identified several key opportunities for tax savings and
                  efficient wealth management.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-zinc-900">Key Recommendations</h3>
                <ul className="mt-2 list-disc space-y-2 pl-6 text-zinc-700">
                  <li>
                    <strong>Maximize Retirement Contributions:</strong> Increase 401(k)
                    contributions to $23,000 limit for 2025
                  </li>
                  <li>
                    <strong>HSA Strategy:</strong> Fully fund Health Savings Account ($4,150 for
                    2025)
                  </li>
                  <li>
                    <strong>Estimated Tax Payments:</strong> Quarterly payments of $12,500 to avoid
                    underpayment penalties
                  </li>
                  <li>
                    <strong>Business Entity Structure:</strong> Consider S-Corp election to reduce
                    self-employment tax
                  </li>
                  <li>
                    <strong>Home Office Deduction:</strong> Claim 300 sq ft dedicated workspace
                    ($7,500 annual deduction)
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-zinc-900">Estimated Tax Savings</h3>
                <div className="mt-2 rounded-lg bg-emerald-50 p-4">
                  <div className="text-2xl font-bold text-emerald-700">$28,400</div>
                  <div className="text-sm text-emerald-600">
                    Projected annual tax savings through implementation
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-zinc-900">Implementation Timeline</h3>
                <div className="mt-2 space-y-2 text-zinc-700">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-emerald-600"></div>
                    <div>
                      <strong>Q1 2025:</strong> Adjust payroll withholdings, set up quarterly
                      payment schedule
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-emerald-600"></div>
                    <div>
                      <strong>Q2 2025:</strong> File S-Corp election with IRS, implement payroll
                      system
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-emerald-600"></div>
                    <div>
                      <strong>Throughout 2025:</strong> Track business expenses, maintain home
                      office documentation
                    </div>
                  </div>
                </div>
              </section>

              <section className="border-t border-zinc-200 pt-6">
                <p className="text-sm text-zinc-500">
                  This strategy has been prepared by Alex Morgan, CPA and reviewed for compliance.
                  All recommendations are based on current tax law as of January 2025.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
