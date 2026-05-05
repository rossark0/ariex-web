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
      <div className="relative mx-4 flex h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-deep-navy shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/8">
              <FileText className="h-5 w-5 text-steel-gray" weight="bold" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-soft-white">Service Agreement</h2>
              <p className="text-sm text-steel-gray">Updated 16 seconds ago</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-full p-2 text-steel-gray transition-colors hover:bg-white/8">
              <Download className="h-5 w-5" weight="bold" />
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-steel-gray transition-colors hover:bg-white/8"
            >
              <X className="h-5 w-5" weight="bold" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-2xl">
            {/* Document Title */}
            <h1 className="mb-4 text-3xl font-bold text-soft-white">
              Tax Strategy Services Agreement
            </h1>

            {/* Metadata */}
            <div className="mb-6 flex items-center gap-3 text-sm text-steel-gray">
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4" weight="bold" />
                Tax Advisory Services
              </span>
              <span>•</span>
              <span>Updated 16 seconds ago</span>
            </div>

            <div className="mb-8 h-px bg-white/10" />

            {/* Introduction */}
            <div className="mb-8">
              <p className="mb-4 text-steel-gray leading-relaxed">
                This agreement outlines the <strong className="text-soft-white">terms and conditions</strong> for tax strategy
                services provided by Ariex Tax Advisory. Our services include comprehensive tax
                planning, <strong className="text-soft-white">strategy development</strong>, and ongoing consultation to{' '}
                <strong className="text-soft-white">minimize tax liability</strong> and maximize financial efficiency.
              </p>
              <p className="mb-4 text-steel-gray leading-relaxed">
                By signing this agreement, you agree to engage our services for the{' '}
                <strong className="text-soft-white">2025 tax year</strong>. You can{' '}
                <a href="#" className="text-electric-blue hover:underline font-medium">
                  review our full terms here
                </a>
                . Our team is also available for questions via email, phone, and secure messaging.
              </p>
            </div>

            {/* Services Included Section */}
            <div className="mb-8">
              <h2 className="mb-4 text-2xl font-bold text-soft-white">Services Included</h2>
              <p className="mb-6 text-steel-gray">
                Below you can find a brief overview of the services included in your engagement.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Service Card 1 */}
                <div className="rounded-xl border border-white/10 p-5 transition-colors hover:bg-white/4">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/15">
                    <FileText className="h-6 w-6 text-emerald-400" weight="bold" />
                  </div>
                  <h3 className="mb-2 font-semibold text-soft-white">Tax Strategy Development</h3>
                  <p className="text-sm text-steel-gray leading-relaxed">
                    Comprehensive analysis of your financial situation and development of a
                    customized tax optimization strategy tailored to your needs.
                  </p>
                </div>

                {/* Service Card 2 */}
                <div className="rounded-xl border border-white/10 p-5 transition-colors hover:bg-white/4">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-electric-blue/15">
                    <FileText className="h-6 w-6 text-electric-blue" weight="bold" />
                  </div>
                  <h3 className="mb-2 font-semibold text-soft-white">Quarterly Consultations</h3>
                  <p className="text-sm text-steel-gray leading-relaxed">
                    Regular check-ins to review progress, adjust strategies, and ensure you&apos;re on
                    track to meet your financial and tax goals.
                  </p>
                </div>

                {/* Service Card 3 */}
                <div className="rounded-xl border border-white/10 p-5 transition-colors hover:bg-white/4">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/15">
                    <FileText className="h-6 w-6 text-amber-400" weight="bold" />
                  </div>
                  <h3 className="mb-2 font-semibold text-soft-white">Document Preparation</h3>
                  <p className="text-sm text-steel-gray leading-relaxed">
                    Preparation of all necessary documentation including strategy memos, entity
                    formation documents, and tax planning guides.
                  </p>
                </div>

                {/* Service Card 4 */}
                <div className="rounded-xl border border-white/10 p-5 transition-colors hover:bg-white/4">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/15">
                    <FileText className="h-6 w-6 text-purple-400" weight="bold" />
                  </div>
                  <h3 className="mb-2 font-semibold text-soft-white">Ongoing Support</h3>
                  <p className="text-sm text-steel-gray leading-relaxed">
                    Year-round access to our team via email and phone for questions, updates, and
                    guidance on tax-related matters.
                  </p>
                </div>
              </div>
            </div>

            {/* Terms Section */}
            <div className="mb-8">
              <h2 className="mb-4 text-2xl font-bold text-soft-white">Payment Terms</h2>
              <p className="mb-4 text-steel-gray leading-relaxed">
                Services are provided on a retainer basis with the following payment structure:
              </p>
              <ul className="mb-4 list-disc space-y-2 pl-6 text-steel-gray">
                <li>Initial payment of $2,500 due upon signing this agreement</li>
                <li>Monthly payments of $500 for ongoing consultation and support</li>
                <li>Additional services billed separately at agreed-upon rates</li>
              </ul>
            </div>

            {/* Signature Section */}
            <div className="rounded-xl border-2 border-dashed border-white/15 bg-white/4 p-6">
              <h3 className="mb-3 font-semibold text-soft-white">Ready to proceed?</h3>
              <p className="mb-4 text-sm text-steel-gray">
                By clicking the button below, you agree to the terms outlined in this agreement.
              </p>
              <button className="rounded-lg bg-electric-blue px-6 py-2.5 text-sm font-semibold text-soft-white duration-150 ease-linear transition-colors hover:bg-electric-blue/80">
                Sign Agreement
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
