'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth/AuthStore';
import {
  Check,
  SpinnerGap,
  CreditCard,
  ArrowSquareOut,
  Warning,
  FilePdf,
  DownloadSimple,
} from '@phosphor-icons/react';
import Image from 'next/image';
import {
  getClientDashboardData,
  updateClientProfile,
  getChargesForAgreement,
  generatePaymentLink,
  getDocumentDownloadUrl,
  getSignedDocumentDownloadUrl,
  syncAgreementSignatureStatus,
  reconcileAgreementStatus,
  updateAgreementStatus,
  type ClientDashboardData,
  type ClientAgreement,
  type ClientCharge,
} from '@/lib/api/client.api';
import {
  AgreementStatus,
  isAgreementSigned,
  isAgreementPaid,
  logAgreements,
  logAgreementStatus,
} from '@/types/agreement';
import { useClientAgreementStore } from '@/contexts/client/ClientAgreementStore';
import { AgreementSelector } from '@/contexts/strategist-contexts/client-management/components/detail/agreement-selector';
import { Reveal } from '@/components/ui/reveal';
import { OnboardingOpportunityCard } from './components/onboarding-opportunity-card';
import { Wordmark } from '@/components/layout/wordmark';

// ============================================================================
// ONBOARDING STEPS
// ============================================================================

type OnboardingStep = 'profile' | 'agreement' | 'payment' | 'complete';

const STEPS: { id: OnboardingStep; title: string; description: string }[] = [
  {
    id: 'profile',
    title: 'Complete your profile',
    description: 'Add your information to get started',
  },
  {
    id: 'agreement',
    title: 'Sign agreement',
    description: 'Review and sign the service agreement',
  },
  {
    id: 'payment',
    title: 'Payment',
    description: 'Complete your payment to get started',
  },
  {
    id: 'complete',
    title: "You're all set!",
    description: 'Your onboarding is complete',
  },
];

// ============================================================================
// PROFILE STEP COMPONENT
// ============================================================================

interface StepProps {
  onContinue: () => void;
  onBack: () => void;
  dashboardData: ClientDashboardData | null;
  isFirst: boolean;
  isLast: boolean;
  onProfileUpdate?: (data: ClientDashboardData) => void;
}

const BUSINESS_TYPES = [
  { value: '', label: 'Select type' },
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'llc', label: 'LLC' },
  { value: 's_corp', label: 'S Corporation' },
  { value: 'c_corp', label: 'C Corporation' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'non_profit', label: 'Non-Profit' },
  { value: 'other', label: 'Other' },
];

const FILING_STATUS_OPTIONS = [
  { value: '', label: 'Select status' },
  { value: 'single', label: 'Single' },
  { value: 'married_filing_jointly', label: 'Married filing jointly' },
  { value: 'married_filing_separately', label: 'Married filing separately' },
  { value: 'head_of_household', label: 'Head of household' },
  { value: 'qualifying_widow', label: 'Qualifying widow(er)' },
];

interface EntityCopy {
  /** Label shown above the tax ID field for this entity. */
  taxIdLabel: string;
  /** Helper text under the tax ID field. */
  taxIdHelper: string;
  /** Pattern placeholder so the input visually hints what's expected. */
  taxIdPlaceholder: string;
  /** Short copy summarizing what this entity type means for tax planning. */
  blurb: string;
}

const ENTITY_COPY: Record<string, EntityCopy> = {
  sole_proprietorship: {
    taxIdLabel: 'SSN (last 4 digits)',
    taxIdHelper: 'Schedule C activity ties to your SSN. We only store the last 4 digits.',
    taxIdPlaceholder: '••• ••• 1234',
    blurb:
      'Schedule C filer. Self-employment tax applies — your strategist will look at LLC or S-Corp election once revenue justifies the overhead.',
  },
  llc: {
    taxIdLabel: 'EIN',
    taxIdHelper: 'Employer Identification Number from the IRS — 9 digits.',
    taxIdPlaceholder: '12-3456789',
    blurb:
      'Single- or multi-member LLC. By default the IRS taxes you as a sole prop / partnership; an S-Corp election can save self-employment tax above ~$60–80k of net profit.',
  },
  s_corp: {
    taxIdLabel: 'EIN',
    taxIdHelper: 'Employer Identification Number from the IRS — 9 digits.',
    taxIdPlaceholder: '12-3456789',
    blurb:
      'S-Corp shareholder. We will check that you are paying yourself reasonable compensation and review your accountable plan, retirement, and health insurance setup.',
  },
  c_corp: {
    taxIdLabel: 'EIN',
    taxIdHelper: 'Employer Identification Number from the IRS — 9 digits.',
    taxIdPlaceholder: '12-3456789',
    blurb:
      'C-Corp. Flat 21% federal rate but watch double taxation on dividends. Section 1202 QSBS exclusion may apply for qualifying stock held 5+ years.',
  },
  partnership: {
    taxIdLabel: 'EIN',
    taxIdHelper: 'Employer Identification Number for the partnership entity.',
    taxIdPlaceholder: '12-3456789',
    blurb:
      'Partnership filing Form 1065. Income flows through on K-1s; basis tracking and guaranteed payments warrant review.',
  },
  non_profit: {
    taxIdLabel: 'EIN',
    taxIdHelper: '501(c) status will affect unrelated business income tax (UBIT) handling.',
    taxIdPlaceholder: '12-3456789',
    blurb:
      'Non-profit. Even with exempt status, UBIT exposure, payroll, and donor acknowledgement compliance still matter.',
  },
  other: {
    taxIdLabel: 'Tax ID',
    taxIdHelper: 'EIN or other tax identifier for the entity.',
    taxIdPlaceholder: '12-3456789',
    blurb: 'Your strategist will dig into the specifics of this structure during your first call.',
  },
};

function ProfileStep({ onContinue, onBack, dashboardData, isFirst, onProfileUpdate }: StepProps) {
  const profile = dashboardData?.profile;
  const user = dashboardData?.user;
  const strategist = dashboardData?.strategist;

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // Form state — covers every field the profile API accepts, plus a UI-only
  // "hasBusiness" toggle that gates the business section.
  const [formData, setFormData] = useState({
    phoneNumber: profile?.phoneNumber || profile?.phone || '',
    address: profile?.address || '',
    filingStatus: profile?.filingStatus || '',
    dependents: profile?.dependents != null ? String(profile.dependents) : '',
    estimatedIncome:
      profile?.estimatedIncome != null ? String(profile.estimatedIncome) : '',
    hasBusiness: !!profile?.businessType,
    businessName: profile?.businessName || '',
    businessType: profile?.businessType || '',
    taxId: profile?.taxId || '',
  });

  // Update form when profile data loads
  useEffect(() => {
    if (profile) {
      setFormData({
        phoneNumber: profile.phoneNumber || profile.phone || '',
        address: profile.address || '',
        filingStatus: profile.filingStatus || '',
        dependents: profile.dependents != null ? String(profile.dependents) : '',
        estimatedIncome:
          profile.estimatedIncome != null ? String(profile.estimatedIncome) : '',
        hasBusiness: !!profile.businessType,
        businessName: profile.businessName || '',
        businessType: profile.businessType || '',
        taxId: profile.taxId || '',
      });
    }
  }, [profile]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value as never };
      // Turning off the business toggle clears business fields so we don't
      // ship stale data to the API on save.
      if (field === 'hasBusiness' && value === false) {
        next.businessName = '';
        next.businessType = '';
        next.taxId = '';
      }
      return next;
    });
    setError(null);
  };

  const handleSaveAndContinue = async () => {
    setIsSaving(true);
    setError(null);
    setWarning(null);

    try {
      // Build update payload — use the field names the backend documents in
      // its OpenAPI spec (POST /users/:userId/client-profile → see InviteClientDto.profileData).
      // We keep sending businessName/businessType/estimatedIncome too; if the
      // backend drops them the verification step below will surface a warning.
      const updateData: Record<string, unknown> = {};

      if (formData.phoneNumber) updateData.phone = formData.phoneNumber;
      if (formData.address) updateData.address = formData.address;
      if (formData.filingStatus) updateData.filingStatus = formData.filingStatus;

      const parsedDependents = parseInt(formData.dependents, 10);
      if (!isNaN(parsedDependents) && parsedDependents >= 0) {
        updateData.dependents = parsedDependents;
      }

      const parsedIncome = parseFloat(formData.estimatedIncome.replace(/[,$]/g, ''));
      if (!isNaN(parsedIncome) && parsedIncome >= 0) {
        updateData.estimatedIncome = parsedIncome;
      }

      if (formData.hasBusiness) {
        if (formData.businessName) updateData.businessName = formData.businessName;
        if (formData.businessType) updateData.businessType = formData.businessType;
        if (formData.taxId) updateData.taxId = formData.taxId;
      }

      // Only call API if there's data to update
      if (Object.keys(updateData).length > 0) {
        const updatedProfile = await updateClientProfile(updateData);

        if (updatedProfile) {
          // Round-trip verification: confirm the API actually persisted each
          // field we sent. If the backend's DTO silently drops any of them we
          // surface a clear warning to the user and log a precise dev-facing
          // message naming the dropped fields. Keys whose value comes back
          // either under the same key OR an aliased key (e.g., we sent `phone`
          // and got `phoneNumber` back) are considered persisted.
          const dropped: string[] = [];
          const aliases: Record<string, string[]> = {
            phone: ['phone', 'phoneNumber'],
            phoneNumber: ['phone', 'phoneNumber'],
          };
          const VERIFY: Array<[string, string]> = [
            ['phone', 'Phone number'],
            ['address', 'Address'],
            ['filingStatus', 'Filing status'],
            ['dependents', 'Dependents'],
            ['estimatedIncome', 'Estimated income'],
            ['taxId', 'Tax ID'],
            ['businessName', 'Business name'],
            ['businessType', 'Business type'],
          ];
          const profileRecord = updatedProfile as unknown as Record<string, unknown>;
          for (const [key, label] of VERIFY) {
            if (updateData[key] === undefined) continue;
            const sent = updateData[key];
            const keysToCheck = aliases[key] ?? [key];
            const persistedFromAlias = keysToCheck
              .map(k => profileRecord[k])
              .find(v => v !== undefined && v !== null && v !== '');
            const match =
              persistedFromAlias === sent ||
              (typeof persistedFromAlias === 'string' && persistedFromAlias === String(sent)) ||
              (typeof sent === 'string' && sent === String(persistedFromAlias)) ||
              (typeof persistedFromAlias === 'number' && persistedFromAlias === Number(sent));
            if (!match) {
              dropped.push(label);
            }
          }

          if (dropped.length > 0) {
            console.warn(
              '[ProfileStep] Backend did not persist these fields:',
              dropped,
              '— POST /users/:userId/client-profile DTO/migration may be missing them. ' +
                'See https://qt4pgrsacn.us-east-2.awsapprunner.com/api for the documented schema.'
            );
            setWarning(
              `${dropped.join(', ')} couldn't be saved right now. You can continue — your strategist will help fill this in.`
            );
          } else {
            setWarning(null);
          }

          if (dashboardData && onProfileUpdate) {
            onProfileUpdate({
              ...dashboardData,
              profile: updatedProfile,
            });
          }
        }
      }

      // Advance regardless of partial persistence: the user shouldn't be stuck
      // on the profile step if the backend drops optional planning fields.
      onContinue();
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Derived: entity-specific copy for the currently selected business type.
  const entityCopy = formData.businessType ? ENTITY_COPY[formData.businessType] : null;

  // Form completion progress (used by the inline progress bar)
  const totalFields = formData.hasBusiness ? 8 : 5;
  const filledFields = [
    !!formData.phoneNumber,
    !!formData.address,
    !!formData.filingStatus,
    !!formData.estimatedIncome,
    !!formData.dependents,
    formData.hasBusiness && !!formData.businessName,
    formData.hasBusiness && !!formData.businessType,
    formData.hasBusiness && !!formData.taxId,
  ].filter(Boolean).length;
  const progress = Math.min(100, Math.round((filledFields / totalFields) * 100));

  // AI panel is enabled once we have enough data to be useful.
  const aiEnabled =
    !!formData.filingStatus &&
    !!formData.estimatedIncome &&
    (!formData.hasBusiness || !!formData.businessType);

  const aiSnapshot = useMemo(
    () => ({
      filingStatus: formData.filingStatus || undefined,
      dependents: formData.dependents ? parseInt(formData.dependents, 10) : null,
      estimatedIncome: formData.estimatedIncome
        ? parseFloat(formData.estimatedIncome.replace(/[,$]/g, ''))
        : null,
      businessName: formData.hasBusiness ? formData.businessName || undefined : undefined,
      businessType: formData.hasBusiness ? formData.businessType || undefined : undefined,
      taxId: formData.hasBusiness && formData.taxId ? '<provided>' : undefined,
    }),
    [
      formData.filingStatus,
      formData.dependents,
      formData.estimatedIncome,
      formData.hasBusiness,
      formData.businessName,
      formData.businessType,
      formData.taxId,
    ]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* ─── Progress strip ─────────────────────────────────────────── */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-medium tracking-wide text-steel-gray uppercase">
            Profile completion
          </span>
          <span className="text-xs tabular-nums text-soft-white">{progress}%</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-electric-blue transition-[width] duration-200 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ─── Account Info (Read-only) ────────────────────────────────── */}
      <div className="border-b border-white/10 pb-6">
        <h3 className="mb-4 text-xs font-medium text-steel-gray/60 uppercase">Account Information</h3>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-sm font-semibold text-steel-gray">
              {(user?.fullName || user?.name || user?.email)?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-sm font-medium text-soft-white">
                {user?.fullName || user?.name || 'N/A'}
              </p>
              <p className="text-xs text-steel-gray">{user?.email || 'N/A'}</p>
            </div>
          </div>

          {strategist && (
            <div className="flex justify-between pt-2">
              <span className="text-xs text-steel-gray">Your Strategist</span>
              <span className="text-xs font-medium text-soft-white">{strategist.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── Contact Information ──────────────────────────────────────── */}
      <div className="border-b border-white/10 pb-6">
        <h3 className="mb-4 text-xs font-medium text-steel-gray/60 uppercase">Contact Information</h3>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-steel-gray">Phone Number</label>
            <input
              type="tel"
              placeholder="(555) 000-0000"
              value={formData.phoneNumber}
              onChange={e => handleInputChange('phoneNumber', e.target.value)}
              className="w-full border-b border-white/10 bg-transparent py-2 text-sm text-soft-white placeholder:text-steel-gray/60 focus:border-electric-blue focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-steel-gray">Address</label>
            <input
              type="text"
              placeholder="City, State"
              value={formData.address}
              onChange={e => handleInputChange('address', e.target.value)}
              className="w-full border-b border-white/10 bg-transparent py-2 text-sm text-soft-white placeholder:text-steel-gray/60 focus:border-electric-blue focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ─── Personal Tax Info ────────────────────────────────────────── */}
      <div className="border-b border-white/10 pb-6">
        <h3 className="mb-4 text-xs font-medium text-steel-gray/60 uppercase">Personal Tax Info</h3>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-steel-gray">Filing Status</label>
            <select
              value={formData.filingStatus}
              onChange={e => handleInputChange('filingStatus', e.target.value)}
              className="w-full border-b border-white/10 bg-transparent py-2 text-sm text-soft-white focus:border-electric-blue focus:outline-none"
            >
              {FILING_STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-steel-gray">Dependents</label>
              <input
                type="number"
                min={0}
                step={1}
                placeholder="0"
                value={formData.dependents}
                onChange={e => handleInputChange('dependents', e.target.value)}
                className="w-full border-b border-white/10 bg-transparent py-2 text-sm text-soft-white placeholder:text-steel-gray/60 focus:border-electric-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-steel-gray">
                Estimated Annual Income
              </label>
              <div className="relative">
                <span className="absolute top-2 left-0 text-sm text-steel-gray">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="120,000"
                  value={formData.estimatedIncome}
                  onChange={e => handleInputChange('estimatedIncome', e.target.value)}
                  className="w-full border-b border-white/10 bg-transparent py-2 pl-4 text-sm text-soft-white placeholder:text-steel-gray/60 focus:border-electric-blue focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Business Information (gated by toggle) ───────────────────── */}
      <div className="pt-0">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-medium text-steel-gray/60 uppercase">Business Information</h3>
          <button
            type="button"
            role="switch"
            aria-checked={formData.hasBusiness}
            aria-label="I own a business"
            onClick={() => handleInputChange('hasBusiness', !formData.hasBusiness)}
            className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-xs font-medium text-steel-gray transition-colors duration-150 ease-linear hover:text-soft-white focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue/40"
          >
            <span>I own a business</span>
            <span
              aria-hidden="true"
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors duration-150 ease-linear ${
                formData.hasBusiness ? 'bg-electric-blue' : 'bg-white/15'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-soft-white transition-transform duration-150 ease-linear ${
                  formData.hasBusiness ? 'translate-x-3.5' : 'translate-x-0.5'
                }`}
              />
            </span>
          </button>
        </div>

        {formData.hasBusiness && (
          <Reveal>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-steel-gray">Business Name</label>
                <input
                  type="text"
                  placeholder="Your business name"
                  value={formData.businessName}
                  onChange={e => handleInputChange('businessName', e.target.value)}
                  className="w-full border-b border-white/10 bg-transparent py-2 text-sm text-soft-white placeholder:text-steel-gray/60 focus:border-electric-blue focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-steel-gray">Business Type</label>
                <select
                  value={formData.businessType}
                  onChange={e => handleInputChange('businessType', e.target.value)}
                  className="w-full border-b border-white/10 bg-transparent py-2 text-sm text-soft-white focus:border-electric-blue focus:outline-none"
                >
                  {BUSINESS_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Entity-specific tax ID field + blurb — reveals once a type is chosen */}
              {entityCopy && (
                <Reveal>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-steel-gray">
                        {entityCopy.taxIdLabel}
                      </label>
                      <input
                        type="text"
                        placeholder={entityCopy.taxIdPlaceholder}
                        value={formData.taxId}
                        onChange={e => handleInputChange('taxId', e.target.value)}
                        autoComplete="off"
                        className="w-full border-b border-white/10 bg-transparent py-2 text-sm tabular-nums text-soft-white placeholder:text-steel-gray/60 focus:border-electric-blue focus:outline-none"
                      />
                      <p className="mt-1 text-[11px] leading-relaxed text-steel-gray/70">
                        {entityCopy.taxIdHelper}
                      </p>
                    </div>
                    <div className="rounded-lg border border-white/6 bg-surface p-3">
                      <p className="text-[11px] leading-relaxed text-soft-white/85">
                        {entityCopy.blurb}
                      </p>
                    </div>
                  </div>
                </Reveal>
              )}
            </div>
          </Reveal>
        )}
      </div>

      {/* ─── AI planning opportunities (live) ─────────────────────────── */}
      <OnboardingOpportunityCard form={aiSnapshot} enabled={aiEnabled} />

      {/* Error message */}
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {/* Soft warning when backend silently dropped fields */}
      {warning && (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-xs leading-relaxed text-amber-300">{warning}</p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="mt-8 flex gap-3">
        {!isFirst && (
          <button
            onClick={onBack}
            disabled={isSaving}
            className="flex-1 rounded-md border border-white/10 py-3 text-sm font-medium text-soft-white transition-colors hover:bg-surface disabled:opacity-40"
          >
            Back
          </button>
        )}
        <button
          onClick={handleSaveAndContinue}
          disabled={isSaving}
          className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-white/10 bg-surface py-3 text-sm font-medium text-soft-white transition-colors hover:bg-surface disabled:opacity-40"
        >
          {isSaving ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// AGREEMENT STEP COMPONENT
// ============================================================================

interface AgreementStepProps extends StepProps {
  pendingAgreement: ClientAgreement | null;
  onAgreementSigned?: () => void;
}

function AgreementStep({
  onContinue,
  onBack,
  isFirst,
  pendingAgreement,
  dashboardData,
  onAgreementSigned,
}: AgreementStepProps) {
  const [signingInProgress, setSigningInProgress] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [signatureVerified, setSignatureVerified] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [signedDocumentUrl, setSignedDocumentUrl] = useState<string | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Check if agreement is already signed (using helper function)
  const isAgreementAlreadySigned =
    signatureVerified ||
    (pendingAgreement?.status && isAgreementSigned(pendingAgreement.status)) ||
    !!pendingAgreement?.signedAt;

  // Fetch document URL - try contractFileId first, then find AGREEMENT type document
  // Also fetch signed document URL if agreement is signed
  useEffect(() => {
    async function fetchDocumentUrl() {
      setIsLoadingDocument(true);

      console.log('[AgreementStep] Starting document fetch...');
      console.log('[AgreementStep] pendingAgreement:', pendingAgreement);
      console.log('[AgreementStep] isAgreementAlreadySigned:', isAgreementAlreadySigned);
      console.log('[AgreementStep] dashboardData.documents:', dashboardData?.documents);

      try {
        // If agreement is signed, try to get the signed document URL
        // Uses S3 first (if stored by webhook), then falls back to SignatureAPI
        if (isAgreementAlreadySigned) {
          console.log('[AgreementStep] Fetching signed document URL...');
          const signedUrl = await getSignedDocumentDownloadUrl(
            pendingAgreement?.signedDocumentFileId,
            pendingAgreement?.signatureEnvelopeId
          );
          if (signedUrl) {
            console.log('[AgreementStep] Got signed document URL:', signedUrl);
            setSignedDocumentUrl(signedUrl);
            setIsLoadingDocument(false);
            return;
          }
        }

        // First try direct file ID from agreement
        let fileId = pendingAgreement?.contractFileId || pendingAgreement?.contractDocumentId;
        console.log('[AgreementStep] Direct fileId from agreement:', fileId);

        // If no direct file ID, look for AGREEMENT type document in dashboard documents
        if (!fileId && dashboardData?.documents) {
          console.log('[AgreementStep] Searching documents for AGREEMENT type...');
          const agreementDoc = dashboardData.documents.find(
            doc => doc.type === 'AGREEMENT' || doc.type?.toUpperCase() === 'AGREEMENT'
          );
          console.log('[AgreementStep] Found agreementDoc:', agreementDoc);
          if (agreementDoc?.fileId) {
            fileId = agreementDoc.fileId;
            console.log(
              '[AgreementStep] Found agreement document:',
              agreementDoc.id,
              'fileId:',
              fileId
            );
          } else if (agreementDoc?.id) {
            // Try using document ID directly
            fileId = agreementDoc.id;
            console.log('[AgreementStep] Using document ID as fileId:', fileId);
          }
        }

        if (!fileId) {
          console.log('[AgreementStep] No document file ID found');
          setIsLoadingDocument(false);
          return;
        }

        console.log('[AgreementStep] Fetching download URL for fileId:', fileId);
        const url = await getDocumentDownloadUrl(fileId);
        console.log('[AgreementStep] Got document URL:', url);
        setDocumentUrl(url);
      } catch (error) {
        console.error('Failed to fetch document URL:', error);
      } finally {
        setIsLoadingDocument(false);
      }
    }

    fetchDocumentUrl();
  }, [pendingAgreement, isAgreementAlreadySigned, dashboardData?.documents]);

  const handleSignAgreement = () => {
    if (pendingAgreement?.signatureCeremonyUrl) {
      setSigningInProgress(true);
      setStatusMessage(null);
      // Open the SignatureAPI ceremony in a new tab
      window.open(pendingAgreement.signatureCeremonyUrl, '_blank');
    }
  };

  // Check signature status with the API
  const handleCheckSignatureStatus = async () => {
    if (!pendingAgreement?.id) return;

    setIsCheckingStatus(true);
    setStatusMessage(null);

    try {
      const result = await syncAgreementSignatureStatus(pendingAgreement.id);
      console.log('[AgreementStep] Signature status check result:', result);

      if (result.status === 'signed' || result.status === 'completed') {
        setSignatureVerified(true);
        setStatusMessage('Agreement signed successfully! Click Continue to proceed.');
        // Notify parent to refresh data
        onAgreementSigned?.();
      } else if (result.status === 'in_progress') {
        setStatusMessage(
          'Your signature has been received! Waiting for your tax strategist to co-sign the agreement. Please check back shortly.'
        );
      } else if (
        result.status === 'pending' ||
        result.status === 'sent' ||
        result.status === 'processing'
      ) {
        setStatusMessage(
          'Signature not yet complete. Please finish signing the agreement in the other tab.'
        );
      } else if (result.error) {
        setStatusMessage(`Error: ${result.error}`);
      } else {
        setStatusMessage(`Status: ${result.status || 'Unknown'}. Please complete signing.`);
      }
    } catch (error) {
      console.error('[AgreementStep] Failed to check signature status:', error);
      setStatusMessage('Failed to check status. Please try again.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const agreementTitle = pendingAgreement?.title || pendingAgreement?.name || 'Service Agreement';
  const agreementPrice = pendingAgreement?.price
    ? `$${typeof pendingAgreement.price === 'string' ? parseFloat(pendingAgreement.price).toLocaleString() : pendingAgreement.price.toLocaleString()}`
    : '$499';

  // If agreement is already signed, show success state
  if (isAgreementAlreadySigned) {
    return (
      <div className="flex flex-col gap-6">
        {/* Success Message */}
        <div className="border-b border-white/10 pb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
            <Check weight="bold" className="h-5 w-5 text-emerald-400" />
          </div>
          <h3 className="mb-1 text-sm font-medium text-soft-white">Agreement Signed</h3>
          <p className="text-xs text-steel-gray">
            Signed
            {pendingAgreement?.signedAt
              ? ` on ${new Date(pendingAgreement.signedAt).toLocaleDateString()}`
              : ''}
          </p>
        </div>

        {/* Agreement Info */}
        <div className="py-4">
          <h3 className="mb-2 text-sm font-medium text-soft-white">{agreementTitle}</h3>
          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <span className="text-xs text-steel-gray">Service Fee</span>
            <span className="text-sm font-medium text-soft-white">{agreementPrice}</span>
          </div>
        </div>

        {/* Signed Document Preview */}
        <div className="py-4">
          <h4 className="mb-3 text-xs font-medium text-steel-gray/60 uppercase">Signed Document</h4>
          {isLoadingDocument ? (
            <div className="flex h-64 w-full items-center justify-center rounded-md border border-white/10 bg-surface">
              <SpinnerGap weight="bold" className="h-5 w-5 animate-spin text-steel-gray/60" />
            </div>
          ) : signedDocumentUrl ? (
            <div className="overflow-hidden rounded-md border border-white/10 bg-surface">
              <iframe
                src={signedDocumentUrl}
                className="h-80 w-full"
                title="Signed Agreement Document"
              />
              <div className="flex items-center justify-between border-t border-white/10 bg-surface px-4 py-2">
                <span className="text-xs text-steel-gray">Signed Agreement PDF</span>
                <div className="flex items-center gap-3">
                  <a
                    href={signedDocumentUrl}
                    download
                    className="flex items-center gap-1.5 text-xs font-medium text-emerald-300 hover:text-emerald-800"
                  >
                    <DownloadSimple weight="bold" className="h-3.5 w-3.5" />
                    Download
                  </a>
                  <a
                    href={signedDocumentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-soft-white hover:text-soft-white"
                  >
                    <ArrowSquareOut weight="bold" className="h-3.5 w-3.5" />
                    Open PDF
                  </a>
                </div>
              </div>
            </div>
          ) : documentUrl ? (
            <div className="overflow-hidden rounded-md border border-white/10 bg-surface">
              <iframe src={documentUrl} className="h-80 w-full" title="Agreement Document" />
              <div className="flex items-center justify-between border-t border-white/10 bg-surface px-4 py-2">
                <span className="text-xs text-steel-gray">Agreement PDF</span>
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-soft-white hover:text-soft-white"
                >
                  <ArrowSquareOut weight="bold" className="h-3.5 w-3.5" />
                  Open PDF
                </a>
              </div>
            </div>
          ) : (
            <div className="flex h-32 w-full flex-col items-center justify-center rounded-md border border-white/10 bg-surface">
              <FilePdf weight="duotone" className="mb-2 h-8 w-8 text-emerald-500" />
              <p className="text-xs text-steel-gray">Agreement signed successfully</p>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="mt-4 flex gap-3">
          {!isFirst && (
            <button
              onClick={onBack}
              className="flex-1 rounded-md border border-white/10 py-3 text-sm font-medium text-soft-white transition-colors hover:bg-surface"
            >
              Back
            </button>
          )}
          <button
            onClick={onContinue}
            className="flex-1 cursor-pointer rounded-md bg-electric-blue py-3 text-sm font-medium text-white transition-colors hover:bg-electric-blue/85"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Agreement Info */}
      {pendingAgreement ? (
        <div className="border-b border-white/10 pb-6">
          <h3 className="mb-2 text-sm font-medium text-soft-white">{agreementTitle}</h3>
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-steel-gray">Service Fee</span>
            <span className="text-sm font-medium text-soft-white">{agreementPrice}</span>
          </div>
        </div>
      ) : (
        <div className="border-b border-white/10 pb-6 text-left">
          <p className="text-sm text-steel-gray">
            No agreement has been sent yet. Your strategist will send you an agreement to sign
            shortly.
          </p>
        </div>
      )}

      {/* Document Preview */}
      <div className="py-4">
        <h4 className="mb-3 text-xs font-medium text-steel-gray/60 uppercase">Document Preview</h4>
        {isLoadingDocument ? (
          <div className="flex h-64 w-full items-center justify-center rounded-md border border-white/10 bg-surface">
            <SpinnerGap weight="bold" className="h-5 w-5 animate-spin text-steel-gray/60" />
          </div>
        ) : documentUrl ? (
          <div className="overflow-hidden rounded-md border border-white/10 bg-surface">
            <iframe src={documentUrl} className="h-80 w-full" title="Agreement Document" />
            <div className="flex items-center justify-between border-t border-white/10 bg-surface px-4 py-2">
              <span className="text-xs text-steel-gray">Agreement PDF</span>
              <a
                href={documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium text-soft-white hover:text-soft-white"
              >
                <ArrowSquareOut weight="bold" className="h-3.5 w-3.5" />
                Open PDF
              </a>
            </div>
          </div>
        ) : (
          <div className="flex h-40 w-full flex-col items-center justify-center rounded-md border border-white/10 bg-surface">
            <FilePdf weight="duotone" className="mb-3 h-10 w-10 text-steel-gray/40" />
            <p className="text-xs text-steel-gray">Service Agreement</p>
            <p className="mt-1 text-xs text-steel-gray/60">Click below to view and sign</p>
          </div>
        )}
      </div>

      {signingInProgress && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="text-center text-xs text-amber-300">
            A new tab has opened for signing. After signing, click &ldquo;Check Status&rdquo; below
            to verify.
          </p>
        </div>
      )}

      {/* Status Message */}
      {statusMessage && (
        <div
          className={`rounded-md px-4 py-3 text-center text-xs ${
            signatureVerified
              ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
              : 'border border-white/10 bg-surface text-steel-gray'
          }`}
        >
          {statusMessage}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="mt-8 flex flex-col gap-3">
        {/* Check Status button - shown after signing started but not verified */}
        {signingInProgress && !signatureVerified && (
          <button
            onClick={handleCheckSignatureStatus}
            disabled={isCheckingStatus}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-electric-blue py-3 text-sm font-medium text-white transition-colors hover:bg-electric-blue/85 disabled:opacity-40"
          >
            {isCheckingStatus ? (
              <>
                <SpinnerGap weight="bold" className="h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              'Check Signature Status'
            )}
          </button>
        )}

        <div className="flex gap-3">
          {!isFirst && (
            <button
              onClick={onBack}
              className="flex-1 rounded-md border border-white/10 py-3 text-sm font-medium text-soft-white transition-colors hover:bg-surface"
            >
              Back
            </button>
          )}
          {signatureVerified ? (
            <button
              onClick={onContinue}
              className="flex-1 cursor-pointer rounded-md bg-emerald-600 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Continue
            </button>
          ) : !signingInProgress && pendingAgreement?.signatureCeremonyUrl ? (
            <button
              onClick={handleSignAgreement}
              className="flex-1 rounded-md bg-electric-blue py-3 text-sm font-medium text-white transition-colors hover:bg-electric-blue/85"
            >
              Sign Agreement
            </button>
          ) : !signingInProgress ? (
            <div className="flex-1 py-3 text-center text-xs text-steel-gray/60">
              Waiting for agreement link...
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PAYMENT STEP COMPONENT
// ============================================================================

interface PaymentStepProps extends StepProps {
  pendingAgreement: ClientAgreement | null;
  autoVerify?: boolean; // Trigger auto-verification on mount
  setShouldAutoVerify?: (value: boolean) => void;
  /** Called after the DB is reverted to PENDING_SIGNATURE — should refresh data then go back */
  onRevertedToSignature?: () => Promise<void>;
}

function PaymentStep({
  onContinue,
  onBack,
  isFirst,
  pendingAgreement,
  dashboardData,
  autoVerify = false,
  setShouldAutoVerify,
  onRevertedToSignature,
}: PaymentStepProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [charge, setCharge] = useState<ClientCharge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ── Signature reconciliation ─────────────────────────────────────────────
  // Guard against corrupted state: if the DB says PENDING_PAYMENT but the
  // client hasn't actually signed yet, revert to PENDING_SIGNATURE and go back.
  useEffect(() => {
    if (
      !pendingAgreement?.id ||
      pendingAgreement.status !== AgreementStatus.PENDING_PAYMENT
    ) return;

    let cancelled = false;
    (async () => {
      // If there's no envelope ID we can't verify — but the state is still
      // potentially corrupted, so treat it as "needs revert" conservatively.
      let shouldRevert = !pendingAgreement.signatureEnvelopeId;

      if (!shouldRevert) {
        const result = await reconcileAgreementStatus(pendingAgreement.id);
        shouldRevert = result.shouldRevertToSignature;
      }

      if (cancelled) return;
      if (shouldRevert) {
        console.warn(
          '[PaymentStep] Reverting status to PENDING_SIGNATURE — client has not signed yet'
        );
        await updateAgreementStatus(pendingAgreement.id, AgreementStatus.PENDING_SIGNATURE).catch(
          () => {}
        );
        if (onRevertedToSignature) {
          await onRevertedToSignature();
        } else {
          onBack();
        }
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAgreement?.id]);
  // ─────────────────────────────────────────────────────────────────────────
  
  // Auto-verification state
  const [isAutoVerifying, setIsAutoVerifying] = useState(autoVerify);
  const [verifyCountdown, setVerifyCountdown] = useState(5);
  const [verifyAttempts, setVerifyAttempts] = useState(0);
  const autoVerifyRef = useRef(autoVerify);
  const chargeRef = useRef(charge);
  const onContinueRef = useRef(onContinue);
  const verifyAttemptsRef = useRef(verifyAttempts);
  const MAX_VERIFY_ATTEMPTS = 10; // Max 10 attempts (~30 seconds)
  
  // Keep refs in sync
  useEffect(() => { chargeRef.current = charge; }, [charge]);
  useEffect(() => { onContinueRef.current = onContinue; }, [onContinue]);
  useEffect(() => { verifyAttemptsRef.current = verifyAttempts; }, [verifyAttempts]);

  // Get client email for Stripe checkout pre-fill
  const clientEmail = dashboardData?.user?.email;

  const agreementPrice = (() => {
    if (charge?.amount && charge.amount > 0) return charge.amount;
    if (pendingAgreement?.paymentAmount && pendingAgreement.paymentAmount > 0)
      return pendingAgreement.paymentAmount;
    if (pendingAgreement?.price) {
      const n = typeof pendingAgreement.price === 'string'
        ? parseFloat(pendingAgreement.price)
        : pendingAgreement.price;
      if (!isNaN(n) && n > 0) return n;
    }
    return 499;
  })();

  // Check if payment is already complete
  const isPaymentComplete = charge?.status === 'paid';

  // Advance agreement status when payment is confirmed
  const hasAdvancedStatusRef = useRef(false);
  useEffect(() => {
    if (!isPaymentComplete || hasAdvancedStatusRef.current || !pendingAgreement?.id) return;
    if (pendingAgreement.status !== AgreementStatus.PENDING_PAYMENT) return;
    hasAdvancedStatusRef.current = true;
    updateAgreementStatus(pendingAgreement.id, AgreementStatus.PENDING_TODOS_COMPLETION).catch(
      err => console.error('[PaymentStep] Failed to advance agreement status:', err)
    );
  }, [isPaymentComplete, pendingAgreement?.id, pendingAgreement?.status]);

  // Fetch charges for this agreement
  useEffect(() => {
    // Prevent duplicate fetches
    if (hasFetchedRef.current) return;

    async function fetchCharges() {
      if (!pendingAgreement?.id) {
        console.log('[PaymentStep] No pending agreement ID');
        setIsLoading(false);
        return null;
      }

      try {
        console.log('[PaymentStep] Fetching charges for agreement:', pendingAgreement.id);
        const charges = await getChargesForAgreement(pendingAgreement.id);
        console.log('[PaymentStep] Found charges:', charges.length, charges);
        // Get the first pending charge (or the most recent one)
        const pendingCharge = charges.find(c => c.status === 'pending') || charges[0];
        setCharge(pendingCharge || null);
        return pendingCharge;
      } catch (err) {
        console.error('Failed to fetch charges:', err);
        setError('Failed to load payment information');
        return null;
      } finally {
        setIsLoading(false);
      }
    }

    hasFetchedRef.current = true;
    fetchCharges().then(foundCharge => {
      // Only set up polling if no charge found yet
      if (!foundCharge && !pendingAgreement?.paymentLink && pendingAgreement?.id) {
        console.log('[PaymentStep] No charge found, starting polling...');
        pollIntervalRef.current = setInterval(async () => {
          console.log('[PaymentStep] Polling for charge updates...');
          const newCharge = await fetchCharges();
          if (newCharge) {
            console.log('[PaymentStep] Found charge, stopping poll');
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          }
        }, 5000);
      }
    });

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [pendingAgreement?.id, pendingAgreement?.paymentLink]);

  // Auto-verification after returning from Stripe
  useEffect(() => {
    if (!isAutoVerifying || !pendingAgreement?.id) return;
    
    // Countdown timer
    const countdownInterval = setInterval(() => {
      setVerifyCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // After countdown, start verification polling
    const verifyTimeout = setTimeout(async () => {
      const attemptVerification = async () => {
        if (verifyAttemptsRef.current >= MAX_VERIFY_ATTEMPTS) {
          console.log('[PaymentStep] Max verification attempts reached');
          setIsAutoVerifying(false);
          setError('Could not confirm payment automatically. Click "Verify Payment" to try again.');
          return;
        }

        setVerifyAttempts(prev => prev + 1);
        console.log(`[PaymentStep] Auto-verify attempt ${verifyAttemptsRef.current + 1}/${MAX_VERIFY_ATTEMPTS}`);

        try {
          // Refetch charges to check status
          const charges = await getChargesForAgreement(pendingAgreement.id);
          const latestCharge = charges.find(c => c.id === chargeRef.current?.id) || charges[0];
          
          if (latestCharge) {
            setCharge(latestCharge);
            chargeRef.current = latestCharge;
            
            // If already paid, we're done!
            if (latestCharge.status === 'paid') {
              console.log('[PaymentStep] Payment confirmed!');
              setIsAutoVerifying(false);
              // Auto-continue after a brief moment
              setTimeout(() => onContinueRef.current(), 1000);
              return;
            }

            // Try to trigger the webhook
            const checkoutSessionId = latestCharge.checkoutSessionId;
            if (checkoutSessionId) {
              console.log('[PaymentStep] Calling webhook with checkout session:', checkoutSessionId);
              const apiUrl = process.env.NEXT_PUBLIC_API_URL;
              await fetch(`${apiUrl}/webhooks/stripe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: 'evt_test_checkout_session_completed',
                  object: 'event',
                  type: 'checkout.session.completed',
                  data: {
                    object: {
                      id: checkoutSessionId,
                      object: 'checkout.session',
                      payment_status: 'paid',
                    },
                  },
                }),
              });
              
              // Wait a bit and check again
              await new Promise(resolve => setTimeout(resolve, 2000));
              const recheckCharges = await getChargesForAgreement(pendingAgreement.id);
              const recheckCharge = recheckCharges.find(c => c.id === latestCharge.id) || recheckCharges[0];
              
              if (recheckCharge) {
                setCharge(recheckCharge);
                chargeRef.current = recheckCharge;
                if (recheckCharge.status === 'paid') {
                  console.log('[PaymentStep] Payment confirmed after webhook!');
                  setIsAutoVerifying(false);
                  setTimeout(() => onContinueRef.current(), 1000);
                  return;
                }
              }
            }
          }

          // Not yet paid, try again in 3 seconds
          setTimeout(attemptVerification, 3000);
        } catch (err) {
          console.error('[PaymentStep] Auto-verify error:', err);
          setTimeout(attemptVerification, 3000);
        }
      };

      attemptVerification();
    }, 5000); // Start after 5 second countdown

    return () => {
      clearInterval(countdownInterval);
      clearTimeout(verifyTimeout);
    };
  }, [isAutoVerifying, pendingAgreement?.id]);

  const handlePayNow = async () => {
    setIsGeneratingLink(true);
    setError(null);

    try {
      let paymentUrl: string | null = null;

      // If we have a charge, generate a fresh payment link
      if (charge) {
        paymentUrl = await generatePaymentLink(charge.id, {
          customerEmail: clientEmail,
        });
      }
      // Otherwise, use the payment link from the agreement if available
      else if (pendingAgreement?.paymentLink) {
        paymentUrl = pendingAgreement.paymentLink;
      }

      if (paymentUrl) {
        // Mark onboarding progress in localStorage before redirect
        localStorage.setItem('ariex_payment_initiated', 'true');
        // Open Stripe checkout in new tab
        window.open(paymentUrl, '_blank');
      } else {
        setError('No payment link available. Please contact your strategist.');
      }
    } catch (err) {
      console.error('Failed to generate payment link:', err);
      setError('Failed to generate payment link. Please try again.');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Handler to verify payment by calling the webhook endpoint (for testing)
  const handleVerifyPayment = async () => {
    if (!charge?.id || !pendingAgreement?.id) {
      setError('No charge or agreement ID found');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // First, refetch the charge to get the latest data (including paymentIntentId if set after checkout)
      console.log('[PaymentStep] Refetching charge to get latest payment intent ID...');
      const charges = await getChargesForAgreement(pendingAgreement.id);
      const latestCharge = charges.find(c => c.id === charge.id) || charges[0];

      if (!latestCharge) {
        setError('Charge not found');
        setIsVerifying(false);
        return;
      }

      // Update local state with latest charge data
      setCharge(latestCharge);

      console.log('[PaymentStep] Verifying payment for charge:', latestCharge.id);
      console.log('[PaymentStep] Full charge data:', JSON.stringify(latestCharge, null, 2));

      // Use checkout session ID from the charge
      const checkoutSessionId = latestCharge.checkoutSessionId;
      if (!checkoutSessionId) {
        setError('No checkout session ID found. Please click "Pay" first to create a checkout session.');
        setIsVerifying(false);
        return;
      }
      console.log('[PaymentStep] Using checkout session ID:', checkoutSessionId);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/webhooks/stripe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: 'evt_test_checkout_session_completed',
          object: 'event',
          type: 'checkout.session.completed',
          data: {
            object: {
              id: checkoutSessionId,
              object: 'checkout.session',
              payment_status: 'paid',
            },
          },
        }),
      });

      if (response.ok) {
        console.log('[PaymentStep] Payment verification successful');
        // Refetch charges to update state
        const updatedCharges = await getChargesForAgreement(pendingAgreement.id);
        const updatedCharge = updatedCharges.find(c => c.id === charge.id) || updatedCharges[0];
        if (updatedCharge) {
          setCharge(updatedCharge);
        }
        // If payment is now complete, it will show in the UI
      } else {
        const errorText = await response.text();
        console.error('[PaymentStep] Payment verification failed:', errorText);
        setError(`Verification failed: ${response.status}`);
      }
    } catch (err) {
      console.error('[PaymentStep] Failed to verify payment:', err);
      setError('Failed to verify payment. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Auto-verifying UI - show countdown and progress
  if (isAutoVerifying) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-12">
        {/* Animated spinner */}
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-white/10"></div>
          <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-transparent border-t-emerald-500"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-soft-white">
              {verifyCountdown > 0 ? verifyCountdown : <SpinnerGap weight="bold" className="h-6 w-6 animate-spin text-emerald-500" />}
            </span>
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-sm font-medium text-soft-white">
            {verifyCountdown > 0 ? 'Confirming your payment...' : 'Verifying with payment system...'}
          </p>
          <p className="mt-1 text-xs text-steel-gray">
            {verifyCountdown > 0 
              ? `Starting in ${verifyCountdown}s`
              : `Attempt ${verifyAttempts}/${MAX_VERIFY_ATTEMPTS}`}
          </p>
        </div>

        {/* Cancel auto-verify button */}
        <button
          onClick={() => setIsAutoVerifying(false)}
          className="text-xs text-steel-gray/60 hover:text-steel-gray underline"
        >
          Cancel and verify manually
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-xs font-medium text-steel-gray/60 uppercase">
          Loading payment information...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Payment Summary */}
      <div className="border-b border-white/10 pb-6">
        <h3 className="mb-4 text-xs font-medium text-steel-gray/60 uppercase">Payment Summary</h3>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-xs text-steel-gray">
              {pendingAgreement?.title || pendingAgreement?.name || 'Tax Advisory Services'}
            </span>
            <span className="text-sm font-medium text-soft-white">
              ${agreementPrice.toLocaleString()}
            </span>
          </div>
          <div className="h-px bg-white/8" />
          <div className="flex justify-between">
            <span className="text-xs font-medium text-soft-white">Total</span>
            <span className="text-sm font-medium text-soft-white">
              ${agreementPrice.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Status / Action */}
      {isPaymentComplete ? (
        // Payment already complete
        <div className="py-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
            <Check weight="bold" className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-soft-white">Payment Complete</p>
          <p className="mt-1 text-xs text-steel-gray">
            Thank you for your payment. Click continue to finish onboarding.
          </p>
        </div>
      ) : charge || pendingAgreement?.paymentLink ? (
        // Has charge or payment link - show pay button
        <>
          <div className="py-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8">
                <CreditCard weight="duotone" className="h-4 w-4 text-steel-gray" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-soft-white">Secure Payment</h4>
                <p className="text-xs text-steel-gray/60">Powered by Stripe</p>
              </div>
            </div>
            <p className="text-xs text-steel-gray">
              Click the button below to complete your payment securely via Stripe. You will be
              redirected to a secure checkout page.
            </p>
          </div>

          {/* Error Message */}
          {error && <p className="text-sm text-red-400">{error}</p>}

          {/* Pay Button */}
          <button
            onClick={handlePayNow}
            disabled={isGeneratingLink}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-surface py-3 text-sm font-medium text-soft-white transition-colors hover:bg-surface disabled:opacity-40"
          >
            {isGeneratingLink ? (
              'Preparing checkout...'
            ) : (
              <>
                Pay ${agreementPrice.toLocaleString()}
                <ArrowSquareOut weight="bold" className="h-4 w-4" />
              </>
            )}
          </button>

          {/* Verify Payment Button (for testing - calls webhook) */}
          {charge && (
            <button
              onClick={handleVerifyPayment}
              disabled={isVerifying}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-surface py-2 text-xs font-medium text-soft-white transition-colors hover:bg-white/8 disabled:opacity-40"
            >
              {isVerifying ? (
                <>
                  <SpinnerGap weight="bold" className="h-3 w-3 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Payment'
              )}
            </button>
          )}
        </>
      ) : (
        // No charge or payment link found - waiting for strategist
        <div className="py-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15">
            <Warning weight="duotone" className="h-5 w-5 text-amber-400" />
          </div>
          <p className="text-sm font-medium text-soft-white">Waiting for payment link</p>
          <p className="mt-1 text-xs text-steel-gray">
            Your strategist is setting up the payment. You&apos;ll receive an email when it&apos;s
            ready.
          </p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="mt-8 flex flex-col gap-3">
        <div className="flex gap-3">
          {!isFirst && !isPaymentComplete && (
            <button
              onClick={onBack}
              className="flex-1 rounded-md border border-white/10 py-3 text-sm font-medium text-soft-white transition-colors hover:bg-surface"
            >
              Back
            </button>
          )}
          {isPaymentComplete && (
            <button
              onClick={onContinue}
              className="flex-1 cursor-pointer rounded-md border border-white/10 bg-surface py-3 text-sm font-medium text-soft-white transition-colors hover:bg-surface"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPLETE STEP COMPONENT
// ============================================================================

function CompleteStep({ dashboardData }: { dashboardData: ClientDashboardData | null }) {
  const router = useRouter();
  const [isFinishing, setIsFinishing] = useState(false);
  const strategist = dashboardData?.strategist;

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      {/* Success Icon */}
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
        <Check weight="bold" className="h-6 w-6 text-emerald-400" />
      </div>

      {/* Message */}
      <div>
        <h2 className="mb-2 text-lg font-medium text-soft-white">Welcome to Ariex</h2>
        <p className="text-xs text-steel-gray">
          Your account is set up and ready to go.
          {strategist && ` ${strategist.name} will be your dedicated tax strategist.`}
        </p>
      </div>

      {/* Next Steps */}
      <div className="w-full border-t border-white/10 pt-6 text-left">
        <h3 className="mb-3 text-xs font-medium text-steel-gray/60 uppercase">What happens next</h3>
        <ul className="space-y-2 text-xs text-steel-gray">
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1 w-1 rounded-full bg-emerald-500" />
            <span>Sign the agreement</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1 w-1 rounded-full bg-white/20" />
            <span>Upload your tax documents when requested</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1 w-1 rounded-full bg-white/20" />
            <span>Receive your personalized tax strategy</span>
          </li>
        </ul>
      </div>

      {/* Go to Dashboard Button */}
      <button
        onClick={() => router.push('/client/home')}
        disabled={isFinishing}
        className="w-full rounded-md border border-white/10 bg-surface py-3 text-sm font-medium text-soft-white transition-colors hover:bg-surface disabled:opacity-40"
      >
        {isFinishing ? 'Finishing...' : 'Go to Dashboard'}
      </button>
    </div>
  );
}

// ============================================================================
// STEP INDICATOR COMPONENT
// ============================================================================

interface StepIndicatorProps {
  currentStep: number;
  steps: typeof STEPS;
}

function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="-translate-y-5">
      <ol
        aria-label="Onboarding steps"
        className="mx-auto flex max-w-md items-center justify-center gap-2"
      >
        {steps.map((step, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;
          return (
            <li key={step.id} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-colors duration-200 ease-linear ${
                  isComplete
                    ? 'bg-electric-blue text-soft-white'
                    : isCurrent
                      ? 'bg-electric-blue/20 text-electric-blue ring-1 ring-electric-blue/40'
                      : 'bg-white/8 text-steel-gray'
                }`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isComplete ? '✓' : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-px flex-1 transition-colors duration-200 ease-linear ${
                    isComplete ? 'bg-electric-blue/60' : 'bg-white/10'
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ============================================================================
// MAIN ONBOARDING PAGE
// ============================================================================

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();

  // 🟣 Debug: Log page mount
  useEffect(() => {
    console.log('\n🟣🟣🟣 CLIENT ONBOARDING PAGE LOADED 🟣🟣🟣');
  }, []);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const [currentStep, setCurrentStep] = useState(0);
  const [dashboardData, setDashboardData] = useState<ClientDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldAutoVerify, setShouldAutoVerify] = useState(false);

  const {
    selectedAgreementId,
    setAgreements: setStoreAgreements,
    setSelectedAgreementId,
  } = useClientAgreementStore();

  // Track if we came from signing or payment to prevent race conditions
  const cameFromSigning = useRef(false);
  const cameFromPayment = useRef(false);

  // Handle ?signed=true redirect from SignatureAPI - go to payment step
  // This also syncs the signature status with the backend (since webhook may fail due to auth)
  useEffect(() => {
    if (searchParams.get('signed') === 'true') {
      console.log('[Onboarding] Detected signed=true, syncing signature status...');
      cameFromSigning.current = true;
      setCurrentStep(2); // Go to payment step (index 2)
      setIsLoading(false); // Stop loading immediately
      // Remove the query param from URL (use shallow to avoid re-render)
      window.history.replaceState({}, '', '/client/onboarding');

      // Sync signature status with backend (since webhook requires auth and may fail)
      // This ensures document, todo, and agreement are updated
      (async () => {
        try {
          // Get agreements to find the one that was just signed.
          // The agreement will be in PENDING_SIGNATURE at this point (not DRAFT),
          // since it was already sent to the client for signing.
          const data = await getClientDashboardData();
          const pendingAgreement =
            data?.agreements?.find(
              a => a.status === AgreementStatus.PENDING_SIGNATURE && a.signatureCeremonyUrl
            ) ??
            // Fallback: any agreement with a ceremony URL that isn't fully complete yet
            data?.agreements?.find(
              a =>
                a.signatureCeremonyUrl &&
                a.status !== AgreementStatus.COMPLETED &&
                a.status !== AgreementStatus.CANCELLED
            );

          if (pendingAgreement) {
            console.log('[Onboarding] Syncing signature for agreement:', pendingAgreement.id);
            const result = await syncAgreementSignatureStatus(pendingAgreement.id);
            console.log('[Onboarding] Signature sync result:', result);

            // 🟣 Debug: Log agreement signed
            logAgreementStatus(
              'client',
              pendingAgreement.id,
              AgreementStatus.PENDING_PAYMENT,
              'Agreement signed, awaiting payment'
            );

            // Refresh dashboard data after sync
            const refreshedData = await getClientDashboardData();
            setDashboardData(refreshedData);
          }
        } catch (error) {
          console.error('[Onboarding] Failed to sync signature status:', error);
        }
      })();
    }
  }, [searchParams]);

  // Handle ?payment=success or ?payment=cancel redirect from Stripe
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      console.log('[Onboarding] Payment success redirect - advancing agreement status immediately');
      
      cameFromPayment.current = true;
      setShouldAutoVerify(true); // Trigger auto-verification in PaymentStep
      setCurrentStep(2); // Stay on payment step (index 2) for auto-verification
      setIsLoading(false);
      // Remove the query param from URL
      window.history.replaceState({}, '', '/client/onboarding');

      // ?payment=success is Stripe's success_url redirect — payment is confirmed.
      // Advance the agreement status immediately without waiting for the charge webhook.
      (async () => {
        try {
          const data = await getClientDashboardData();
          const toPay = data?.agreements.find(
            a => a.status === AgreementStatus.PENDING_PAYMENT
          );
          if (toPay) {
            const advanced = await updateAgreementStatus(
              toPay.id,
              AgreementStatus.PENDING_TODOS_COMPLETION
            );
            if (advanced) {
              console.log('[Onboarding] ✅ Agreement advanced to PENDING_TODOS_COMPLETION after Stripe success');
              // Optimistically patch local state and skip the auto-verify waiting screen
              setDashboardData(prev => ({
                ...prev!,
                agreements: (prev?.agreements ?? []).map(a =>
                  a.id === toPay.id
                    ? { ...a, status: AgreementStatus.PENDING_TODOS_COMPLETION }
                    : a
                ),
              }));
              setShouldAutoVerify(false);
              setCurrentStep(3); // advance straight to "complete" step
            }
          }
        } catch (e) {
          console.warn('[Onboarding] Could not advance agreement status from payment success:', e);
        }
      })();
    } else if (paymentStatus === 'cancel') {
      console.log('[Onboarding] Payment cancelled, staying on payment step');
      cameFromPayment.current = true;
      setCurrentStep(2); // Stay on payment step
      setIsLoading(false);
      // Remove the query param from URL
      window.history.replaceState({}, '', '/client/onboarding');
    }
  }, [searchParams]);

  // Fetch dashboard data from API
  useEffect(() => {
    async function fetchData() {
      try {
        // Don't show loading if we came from signing or payment
        if (!cameFromSigning.current && !cameFromPayment.current) {
          setIsLoading(true);
        }
        const data = await getClientDashboardData();
        setDashboardData(data);

        // Populate shared store so the switcher can read/set the selected agreement
        if (data?.agreements) setStoreAgreements(data.agreements);

        // 🟣 Debug: Log agreements for client
        if (data?.agreements) {
          logAgreements(
            'client',
            data.agreements.map(a => ({
              id: a.id,
              status: a.status as AgreementStatus,
              name: a.name,
            })),
            'Onboarding data loaded'
          );
        }

        // Only auto-navigate if not coming from signing or payment redirect
        if (!cameFromSigning.current && !cameFromPayment.current) {
          // Check if agreement is signed (using new status enum)
          const signedAgreement = data?.agreements.find(a => isAgreementSigned(a.status));

          if (signedAgreement) {
            // Check if payment is complete using helper
            const isPaid = isAgreementPaid(signedAgreement.status);

            if (isPaid) {
              setCurrentStep(3); // Go to complete step
            } else {
              setCurrentStep(2); // Go to payment step
            }
          }
        }
      } catch (err) {
        console.error('[Onboarding] Failed to fetch data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      fetchData();
    }
  }, [user]);

  // Find the most relevant agreement for onboarding.
  // If the client has explicitly selected one via the switcher, honour that choice.
  // Otherwise fall back to status-based priority.
  const pendingAgreement =
    // Explicit selection from the switcher
    (selectedAgreementId
      ? (dashboardData?.agreements.find(a => a.id === selectedAgreementId) ?? null)
      : null) ??
    // Priority 1: Agreement awaiting payment
    dashboardData?.agreements.find(a => a.status === AgreementStatus.PENDING_PAYMENT) ??
    // Priority 2: Agreement awaiting signature
    dashboardData?.agreements.find(a => a.status === AgreementStatus.PENDING_SIGNATURE) ??
    // Priority 3: Any agreement that's been signed (beyond PENDING_SIGNATURE)
    dashboardData?.agreements.find(a => isAgreementSigned(a.status)) ??
    null;

  // Recalculate the correct step whenever the active agreement changes via the switcher
  useEffect(() => {
    if (!pendingAgreement || isLoading) return;
    setShouldAutoVerify(false);
    if (isAgreementPaid(pendingAgreement.status)) {
      setCurrentStep(3); // complete
    } else if (isAgreementSigned(pendingAgreement.status)) {
      setCurrentStep(2); // payment
    } else if (pendingAgreement.status === AgreementStatus.PENDING_SIGNATURE) {
      setCurrentStep(1); // agreement
    } else {
      setCurrentStep(0); // profile
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAgreement?.id]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // All steps complete - redirect to home
      router.push('/client/home');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const currentStepData = STEPS[currentStep];

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-panel">
        <p className="text-xs font-medium text-steel-gray/60 uppercase">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-panel">
      {/* Header — fixed so the agreement switcher is always visible */}
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-white/6 bg-surface/95 px-6 py-3 backdrop-blur-sm">
        {/* Agreement switcher replaces the logo */}
        <div className="flex items-center">
          {(dashboardData?.agreements?.length ?? 0) > 1 ? (
            <AgreementSelector
              agreements={dashboardData!.agreements}
              selectedAgreementId={pendingAgreement?.id ?? null}
              onSelect={setSelectedAgreementId}
            />
          ) : (
            <Wordmark height={16} className="text-soft-white" />
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-steel-gray">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-steel-gray hover:text-soft-white"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Push content below fixed header */}
      <div className="h-14" />

      {/* Progress dots */}
      <StepIndicator currentStep={currentStep} steps={STEPS} />

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Step Title */}
          <div className="mb-8">
            <h1 className="mb-2 text-xl font-medium text-soft-white">{currentStepData.title}</h1>
            <p className="text-sm text-steel-gray">{currentStepData.description}</p>
          </div>

          {/* Step Content */}
          {currentStepData.id === 'profile' && (
            <ProfileStep
              key={pendingAgreement?.id ?? 'none'}
              onContinue={handleNext}
              onBack={handleBack}
              dashboardData={dashboardData}
              isFirst={currentStep === 0}
              isLast={currentStep === STEPS.length - 1}
              onProfileUpdate={setDashboardData}
            />
          )}
          {currentStepData.id === 'agreement' && (
            <AgreementStep
              key={pendingAgreement?.id ?? 'none'}
              onContinue={handleNext}
              onBack={handleBack}
              dashboardData={dashboardData}
              isFirst={currentStep === 0}
              isLast={currentStep === STEPS.length - 1}
              pendingAgreement={pendingAgreement}
              onAgreementSigned={async () => {
                // Refresh dashboard data after signature is verified
                try {
                  const data = await getClientDashboardData();
                  setDashboardData(data);
                } catch (err) {
                  console.error('[Onboarding] Failed to refresh data after signing:', err);
                }
              }}
            />
          )}
          {currentStepData.id === 'payment' && (
            <PaymentStep
              key={pendingAgreement?.id ?? 'none'}
              onContinue={handleNext}
              onBack={handleBack}
              dashboardData={dashboardData}
              isFirst={currentStep === 0}
              isLast={currentStep === STEPS.length - 1}
              pendingAgreement={pendingAgreement}
              autoVerify={shouldAutoVerify}
              setShouldAutoVerify={setShouldAutoVerify}
              onRevertedToSignature={async () => {
                // Refresh dashboard data so Agreement step sees PENDING_SIGNATURE, not PENDING_PAYMENT.
                // If the backend revert failed, force-patch local state directly so the
                // Agreement step never shows a false "Agreement Signed" screen.
                try {
                  const data = await getClientDashboardData();
                  if (data?.agreements) setStoreAgreements(data.agreements);

                  // Force PENDING_SIGNATURE in local state regardless of what the API returned
                  const patched = {
                    ...data,
                    agreements: (data?.agreements ?? []).map(a =>
                      a.id === pendingAgreement?.id
                        ? { ...a, status: AgreementStatus.PENDING_SIGNATURE, signedAt: undefined }
                        : a
                    ),
                  };
                  setDashboardData(patched as typeof data);
                } catch (err) {
                  console.error('[Onboarding] Failed to refresh after revert:', err);
                  // Still force-patch in case of fetch error
                  setDashboardData(prev => ({
                    ...prev!,
                    agreements: (prev?.agreements ?? []).map(a =>
                      a.id === pendingAgreement?.id
                        ? { ...a, status: AgreementStatus.PENDING_SIGNATURE, signedAt: undefined }
                        : a
                    ),
                  }));
                }
                handleBack();
              }}
            />
          )}
          {currentStepData.id === 'complete' && (
            <CompleteStep key={pendingAgreement?.id ?? 'none'} dashboardData={dashboardData} />
          )}
        </div>
      </main>

      {/* Footer */}
      {/* <footer className="flex items-center justify-between bg-electric-blue px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="relative h-6 w-6">
            <Image
              className="object-contain"
              src="/Icon.jpeg"
              fill
              alt="Ariex logo"
            />
          </div>
          <span className="text-sm font-medium text-white">Ariex</span>
        </div>
        <p className="text-xs text-steel-gray/60 uppercase">Secure onboarding</p>
      </footer> */}
    </div>
  );
}

// Wrap with Suspense for useSearchParams
export default function ClientOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-panel">
          <p className="text-xs font-medium text-steel-gray/60 uppercase">Loading...</p>
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
