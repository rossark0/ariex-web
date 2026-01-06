'use client';

import { useRoleRedirect } from '@/hooks/use-role-redirect';
import { useRouter } from 'next/navigation';
import { getFullClientById } from '@/lib/mocks/client-full';
import { getClientStatus } from '@/lib/client-status';
import { ArrowLeft, FileText, ChatCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

interface Props {
  params: { clientId: string };
}

export default function ComplianceClientDetailPage({ params }: Props) {
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

  const status = getClientStatus(client);
  const initials = client.user.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '??';

  // Find strategy document
  const strategyDoc = client.documents.find(
    d => d.category === 'contract' && d.originalName.toLowerCase().includes('strategy')
  );

  return (
    <section className="flex flex-col gap-6 p-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex w-fit items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Client Header Card */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-xl font-semibold text-white">
              {initials}
            </div>

            {/* Info */}
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">{client.user.name}</h1>
              <p className="text-sm text-zinc-600">{client.user.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${status.badgeColor} ${status.textClassName}`}
                >
                  {status.label}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/compliance/clients/${params.clientId}/comments`)}
            >
              <ChatCircle className="h-4 w-4" />
              Comments
            </Button>
          </div>
        </div>

        {/* Client Details */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-zinc-200 pt-6">
          <div>
            <div className="text-sm text-zinc-500">Phone Number</div>
            <div className="font-medium text-zinc-900">
              {client.profile.phoneNumber || 'Not provided'}
            </div>
          </div>
          <div>
            <div className="text-sm text-zinc-500">Estimated Income</div>
            <div className="font-medium text-zinc-900">
              ${client.profile.estimatedIncome?.toLocaleString() || 'Not provided'}
            </div>
          </div>
          <div>
            <div className="text-sm text-zinc-500">Business Type</div>
            <div className="font-medium text-zinc-900">
              {client.profile.businessType || 'Not provided'}
            </div>
          </div>
          <div>
            <div className="text-sm text-zinc-500">Onboarding Status</div>
            <div className="font-medium text-zinc-900">
              {client.profile.onboardingComplete ? 'Complete' : 'In Progress'}
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Document */}
      {strategyDoc && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">Tax Strategy Document</h2>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                strategyDoc.signatureStatus === 'SIGNED'
                  ? 'bg-emerald-100 text-emerald-700'
                  : strategyDoc.signatureStatus === 'SENT'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-zinc-100 text-zinc-700'
              }`}
            >
              {strategyDoc.signatureStatus}
            </span>
          </div>

          <div className="flex items-center gap-4 rounded-lg border border-zinc-200 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50">
              <FileText className="h-6 w-6 text-emerald-600" weight="fill" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-zinc-900">{strategyDoc.originalName}</div>
              <div className="text-sm text-zinc-500">
                {/* {strategyDoc.signedAt
                  ? `Signed on ${strategyDoc.signedAt.toLocaleDateString()}`
                  : strategyDoc?.sentAt
                    ? `Sent on ${strategyDoc?.sentAt.toLocaleDateString()}`
                    : 'Draft'} */}
              </div>
            </div>
            <Button
              onClick={() => router.push(`/compliance/clients/${params.clientId}/strategy`)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Open Strategy
            </Button>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QuickLinkCard
          title="Documents"
          description="View uploaded documents"
          onClick={() => router.push(`/compliance/clients/${params.clientId}/documents`)}
        />
        <QuickLinkCard
          title="Payments"
          description="Payment history and invoices"
          onClick={() => router.push(`/compliance/clients/${params.clientId}/payments`)}
        />
        <QuickLinkCard
          title="Onboarding"
          description="Onboarding progress"
          onClick={() => router.push(`/compliance/clients/${params.clientId}/onboarding`)}
        />
      </div>
    </section>
  );
}

function QuickLinkCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-zinc-200 bg-white p-4 text-left transition-colors hover:border-emerald-500 hover:bg-emerald-50"
    >
      <div className="font-semibold text-zinc-900">{title}</div>
      <div className="mt-1 text-sm text-zinc-600">{description}</div>
    </button>
  );
}
