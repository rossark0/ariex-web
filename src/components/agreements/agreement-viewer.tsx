'use client';

import { Badge } from '@/components/ui/badge';
import { X, FileText, Download } from '@phosphor-icons/react';

interface AgreementViewerProps {
  agreementId: string;
  onClose: () => void;
}

export function AgreementViewer({ agreementId, onClose }: AgreementViewerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative mx-4 flex h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
              <FileText className="h-5 w-5 text-zinc-600" weight="bold" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Service Agreement</h2>
              <p className="text-sm text-zinc-500">Updated 16 seconds ago</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-zinc-100">
              <Download className="h-5 w-5" weight="bold" />
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-zinc-100"
            >
              <X className="h-5 w-5" weight="bold" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-2xl">
            {/* Document Title */}
            <h1 className="mb-4 text-3xl font-bold text-zinc-900">
              Tax Strategy Services Agreement
            </h1>

            {/* Metadata */}
            <div className="mb-6 flex items-center gap-3 text-sm text-zinc-500">
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4" weight="bold" />
                Tax Advisory Services
              </span>
              <span>•</span>
              <span>Updated 16 seconds ago</span>
            </div>

            <div className="mb-8 h-px bg-zinc-200" />

            {/* Introduction */}
            <div className="mb-8">
              <p className="mb-4 text-zinc-700 leading-relaxed">
                This agreement outlines the <strong>terms and conditions</strong> for tax strategy
                services provided by Ariex Tax Advisory. Our services include comprehensive tax
                planning, <strong>strategy development</strong>, and ongoing consultation to{' '}
                <strong>minimize tax liability</strong> and maximize financial efficiency.
              </p>
              <p className="mb-4 text-zinc-700 leading-relaxed">
                By signing this agreement, you agree to engage our services for the{' '}
                <strong>2025 tax year</strong>. You can{' '}
                <a href="#" className="text-emerald-600 hover:underline font-medium">
                  review our full terms here
                </a>
                . Our team is also available for questions via email, phone, and secure messaging.
              </p>
            </div>

            {/* Services Included Section */}
            <div className="mb-8">
              <h2 className="mb-4 text-2xl font-bold text-zinc-900">Services Included</h2>
              <p className="mb-6 text-zinc-700">
                Below you can find a brief overview of the services included in your engagement.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Service Card 1 */}
                <div className="rounded-xl border border-zinc-200 p-5 transition-colors hover:bg-zinc-50">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
                    <FileText className="h-6 w-6 text-emerald-600" weight="bold" />
                  </div>
                  <h3 className="mb-2 font-semibold text-zinc-900">Tax Strategy Development</h3>
                  <p className="text-sm text-zinc-600 leading-relaxed">
                    Comprehensive analysis of your financial situation and development of a
                    customized tax optimization strategy tailored to your needs.
                  </p>
                </div>

                {/* Service Card 2 */}
                <div className="rounded-xl border border-zinc-200 p-5 transition-colors hover:bg-zinc-50">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                    <FileText className="h-6 w-6 text-blue-600" weight="bold" />
                  </div>
                  <h3 className="mb-2 font-semibold text-zinc-900">Quarterly Consultations</h3>
                  <p className="text-sm text-zinc-600 leading-relaxed">
                    Regular check-ins to review progress, adjust strategies, and ensure you&apos;re on
                    track to meet your financial and tax goals.
                  </p>
                </div>

                {/* Service Card 3 */}
                <div className="rounded-xl border border-zinc-200 p-5 transition-colors hover:bg-zinc-50">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100">
                    <FileText className="h-6 w-6 text-amber-600" weight="bold" />
                  </div>
                  <h3 className="mb-2 font-semibold text-zinc-900">Document Preparation</h3>
                  <p className="text-sm text-zinc-600 leading-relaxed">
                    Preparation of all necessary documentation including strategy memos, entity
                    formation documents, and tax planning guides.
                  </p>
                </div>

                {/* Service Card 4 */}
                <div className="rounded-xl border border-zinc-200 p-5 transition-colors hover:bg-zinc-50">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                    <FileText className="h-6 w-6 text-purple-600" weight="bold" />
                  </div>
                  <h3 className="mb-2 font-semibold text-zinc-900">Ongoing Support</h3>
                  <p className="text-sm text-zinc-600 leading-relaxed">
                    Year-round access to our team via email and phone for questions, updates, and
                    guidance on tax-related matters.
                  </p>
                </div>
              </div>
            </div>

            {/* Terms Section */}
            <div className="mb-8">
              <h2 className="mb-4 text-2xl font-bold text-zinc-900">Payment Terms</h2>
              <p className="mb-4 text-zinc-700 leading-relaxed">
                Services are provided on a retainer basis with the following payment structure:
              </p>
              <ul className="mb-4 list-disc space-y-2 pl-6 text-zinc-700">
                <li>Initial payment of $2,500 due upon signing this agreement</li>
                <li>Monthly payments of $500 for ongoing consultation and support</li>
                <li>Additional services billed separately at agreed-upon rates</li>
              </ul>
            </div>

            {/* Signature Section */}
            <div className="rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-6">
              <h3 className="mb-3 font-semibold text-zinc-900">Ready to proceed?</h3>
              <p className="mb-4 text-sm text-zinc-600">
                By clicking the button below, you agree to the terms outlined in this agreement.
              </p>
              <button className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
                Sign Agreement
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
