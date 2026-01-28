'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth/AuthStore';
import {
  Check,
  SpinnerGap,
  CreditCard,
  ArrowSquareOut,
  Warning,
  FilePdf,
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

function ProfileStep({ onContinue, onBack, dashboardData, isFirst, onProfileUpdate }: StepProps) {
  const profile = dashboardData?.profile;
  const user = dashboardData?.user;
  const strategist = dashboardData?.strategist;

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state - initialize with existing data (only fields the API supports)
  const [formData, setFormData] = useState({
    phoneNumber: profile?.phoneNumber || profile?.phone || '',
    address: profile?.address || '',
    businessName: profile?.businessName || '',
    businessType: profile?.businessType || '',
  });

  // Update form when profile data loads
  useEffect(() => {
    if (profile) {
      setFormData({
        phoneNumber: profile.phoneNumber || profile.phone || '',
        address: profile.address || '',
        businessName: profile.businessName || '',
        businessType: profile.businessType || '',
      });
    }
  }, [profile]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSaveAndContinue = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Build update payload - only include changed/filled fields
      const updateData: Record<string, unknown> = {};

      if (formData.phoneNumber) updateData.phoneNumber = formData.phoneNumber;
      if (formData.address) updateData.address = formData.address;
      if (formData.businessName) updateData.businessName = formData.businessName;
      if (formData.businessType) updateData.businessType = formData.businessType;

      // Only call API if there's data to update
      if (Object.keys(updateData).length > 0) {
        const updatedProfile = await updateClientProfile(updateData);

        if (updatedProfile && dashboardData && onProfileUpdate) {
          // Update the dashboard data with new profile
          onProfileUpdate({
            ...dashboardData,
            profile: updatedProfile,
          });
        }
      }

      onContinue();
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Account Info (Read-only) */}
      <div className="border-b border-zinc-200 pb-6">
        <h3 className="mb-4 text-xs font-medium text-zinc-400 uppercase">Account Information</h3>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600">
              {(user?.fullName || user?.name || user?.email)?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900">
                {user?.fullName || user?.name || 'N/A'}
              </p>
              <p className="text-xs text-zinc-500">{user?.email || 'N/A'}</p>
            </div>
          </div>

          {strategist && (
            <div className="flex justify-between pt-2">
              <span className="text-xs text-zinc-500">Your Strategist</span>
              <span className="text-xs font-medium text-zinc-900">{strategist.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Contact Information (Editable) */}
      <div className="py-6">
        <h3 className="mb-4 text-xs font-medium text-zinc-400 uppercase">Contact Information</h3>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Phone Number</label>
            <input
              type="tel"
              placeholder="(555) 000-0000"
              value={formData.phoneNumber}
              onChange={e => handleInputChange('phoneNumber', e.target.value)}
              className="w-full border-b border-zinc-200 bg-transparent py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Address</label>
            <input
              type="text"
              placeholder="City, State"
              value={formData.address}
              onChange={e => handleInputChange('address', e.target.value)}
              className="w-full border-b border-zinc-200 bg-transparent py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Business Information (Editable) */}
      <div className="pt-0">
        <h3 className="mb-4 text-xs font-medium text-zinc-400 uppercase">Business Information</h3>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Business Name</label>
            <input
              type="text"
              placeholder="Your business name"
              value={formData.businessName}
              onChange={e => handleInputChange('businessName', e.target.value)}
              className="w-full border-b border-zinc-200 bg-transparent py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Business Type</label>
            <select
              value={formData.businessType}
              onChange={e => handleInputChange('businessType', e.target.value)}
              className="w-full border-b border-zinc-200 bg-transparent py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
            >
              {BUSINESS_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {/* Navigation Buttons */}
      <div className="mt-8 flex gap-3">
        {!isFirst && (
          <button
            onClick={onBack}
            disabled={isSaving}
            className="flex-1 rounded-md border border-zinc-200 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40"
          >
            Back
          </button>
        )}
        <button
          onClick={handleSaveAndContinue}
          disabled={isSaving}
          className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:opacity-40"
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
        // Envelope is in progress - signing may still be happening
        setStatusMessage(
          'Signing in progress. If you completed signing, please wait a moment and try again.'
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
        <div className="border-b border-zinc-200 pb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
            <Check weight="bold" className="h-5 w-5 text-emerald-600" />
          </div>
          <h3 className="mb-1 text-sm font-medium text-zinc-900">Agreement Signed</h3>
          <p className="text-xs text-zinc-500">
            Signed
            {pendingAgreement?.signedAt
              ? ` on ${new Date(pendingAgreement.signedAt).toLocaleDateString()}`
              : ''}
          </p>
        </div>

        {/* Agreement Info */}
        <div className="py-4">
          <h3 className="mb-2 text-sm font-medium text-zinc-900">{agreementTitle}</h3>
          <div className="flex items-center justify-between border-t border-zinc-200 pt-4">
            <span className="text-xs text-zinc-500">Service Fee</span>
            <span className="text-sm font-medium text-zinc-900">{agreementPrice}</span>
          </div>
        </div>

        {/* Signed Document Preview */}
        <div className="py-4">
          <h4 className="mb-3 text-xs font-medium text-zinc-400 uppercase">Signed Document</h4>
          {isLoadingDocument ? (
            <div className="flex h-64 w-full items-center justify-center rounded-md border border-zinc-200 bg-zinc-50">
              <SpinnerGap weight="bold" className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          ) : signedDocumentUrl ? (
            <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
              <iframe
                src={signedDocumentUrl}
                className="h-80 w-full"
                title="Signed Agreement Document"
              />
              <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-4 py-2">
                <span className="text-xs text-zinc-500">Signed Agreement PDF</span>
                <a
                  href={signedDocumentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900"
                >
                  <ArrowSquareOut weight="bold" className="h-3.5 w-3.5" />
                  Open PDF
                </a>
              </div>
            </div>
          ) : documentUrl ? (
            <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
              <iframe src={documentUrl} className="h-80 w-full" title="Agreement Document" />
              <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-4 py-2">
                <span className="text-xs text-zinc-500">Agreement PDF</span>
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900"
                >
                  <ArrowSquareOut weight="bold" className="h-3.5 w-3.5" />
                  Open PDF
                </a>
              </div>
            </div>
          ) : (
            <div className="flex h-32 w-full flex-col items-center justify-center rounded-md border border-zinc-200 bg-zinc-50">
              <FilePdf weight="duotone" className="mb-2 h-8 w-8 text-emerald-500" />
              <p className="text-xs text-zinc-500">Agreement signed successfully</p>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="mt-4 flex gap-3">
          {!isFirst && (
            <button
              onClick={onBack}
              className="flex-1 rounded-md border border-zinc-200 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Back
            </button>
          )}
          <button
            onClick={onContinue}
            className="flex-1 cursor-pointer rounded-md bg-zinc-900 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
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
        <div className="border-b border-zinc-200 pb-6">
          <h3 className="mb-2 text-sm font-medium text-zinc-900">{agreementTitle}</h3>
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-zinc-500">Service Fee</span>
            <span className="text-sm font-medium text-zinc-900">{agreementPrice}</span>
          </div>
        </div>
      ) : (
        <div className="border-b border-zinc-200 pb-6 text-left">
          <p className="text-sm text-zinc-500">
            No agreement has been sent yet. Your strategist will send you an agreement to sign
            shortly.
          </p>
        </div>
      )}

      {/* Document Preview */}
      <div className="py-4">
        <h4 className="mb-3 text-xs font-medium text-zinc-400 uppercase">Document Preview</h4>
        {isLoadingDocument ? (
          <div className="flex h-64 w-full items-center justify-center rounded-md border border-zinc-200 bg-zinc-50">
            <SpinnerGap weight="bold" className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : documentUrl ? (
          <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
            <iframe src={documentUrl} className="h-80 w-full" title="Agreement Document" />
            <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-4 py-2">
              <span className="text-xs text-zinc-500">Agreement PDF</span>
              <a
                href={documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900"
              >
                <ArrowSquareOut weight="bold" className="h-3.5 w-3.5" />
                Open PDF
              </a>
            </div>
          </div>
        ) : (
          <div className="flex h-40 w-full flex-col items-center justify-center rounded-md border border-zinc-200 bg-zinc-50">
            <FilePdf weight="duotone" className="mb-3 h-10 w-10 text-zinc-300" />
            <p className="text-xs text-zinc-500">Service Agreement</p>
            <p className="mt-1 text-xs text-zinc-400">Click below to view and sign</p>
          </div>
        )}
      </div>

      {signingInProgress && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-center text-xs text-amber-700">
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
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border border-zinc-200 bg-zinc-50 text-zinc-600'
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
            className="flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-40"
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
              className="flex-1 rounded-md border border-zinc-200 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
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
              className="flex-1 rounded-md bg-zinc-900 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
            >
              Sign Agreement
            </button>
          ) : !signingInProgress ? (
            <div className="flex-1 py-3 text-center text-xs text-zinc-400">
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
}

function PaymentStep({
  onContinue,
  onBack,
  isFirst,
  pendingAgreement,
  dashboardData,
  autoVerify = false,
  setShouldAutoVerify,
}: PaymentStepProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [charge, setCharge] = useState<ClientCharge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
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

  const agreementPrice = pendingAgreement?.price
    ? typeof pendingAgreement.price === 'string'
      ? parseFloat(pendingAgreement.price)
      : pendingAgreement.price
    : 499;

  // Check if payment is already complete
  const isPaymentComplete = charge?.status === 'paid';

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
          <div className="h-16 w-16 rounded-full border-4 border-zinc-200"></div>
          <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-transparent border-t-emerald-500"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-zinc-700">
              {verifyCountdown > 0 ? verifyCountdown : <SpinnerGap weight="bold" className="h-6 w-6 animate-spin text-emerald-500" />}
            </span>
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-900">
            {verifyCountdown > 0 ? 'Confirming your payment...' : 'Verifying with payment system...'}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {verifyCountdown > 0 
              ? `Starting in ${verifyCountdown}s`
              : `Attempt ${verifyAttempts}/${MAX_VERIFY_ATTEMPTS}`}
          </p>
        </div>

        {/* Cancel auto-verify button */}
        <button
          onClick={() => setIsAutoVerifying(false)}
          className="text-xs text-zinc-400 hover:text-zinc-600 underline"
        >
          Cancel and verify manually
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-xs font-medium text-zinc-400 uppercase">
          Loading payment information...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Payment Summary */}
      <div className="border-b border-zinc-200 pb-6">
        <h3 className="mb-4 text-xs font-medium text-zinc-400 uppercase">Payment Summary</h3>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-xs text-zinc-500">
              {pendingAgreement?.title || pendingAgreement?.name || 'Tax Advisory Services'}
            </span>
            <span className="text-sm font-medium text-zinc-900">
              ${agreementPrice.toLocaleString()}
            </span>
          </div>
          <div className="h-px bg-zinc-100" />
          <div className="flex justify-between">
            <span className="text-xs font-medium text-zinc-900">Total</span>
            <span className="text-sm font-medium text-zinc-900">
              ${agreementPrice.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Status / Action */}
      {isPaymentComplete ? (
        // Payment already complete
        <div className="py-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
            <Check weight="bold" className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-sm font-medium text-zinc-900">Payment Complete</p>
          <p className="mt-1 text-xs text-zinc-500">
            Thank you for your payment. Click continue to finish onboarding.
          </p>
        </div>
      ) : charge || pendingAgreement?.paymentLink ? (
        // Has charge or payment link - show pay button
        <>
          <div className="py-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100">
                <CreditCard weight="duotone" className="h-4 w-4 text-zinc-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-zinc-900">Secure Payment</h4>
                <p className="text-xs text-zinc-400">Powered by Stripe</p>
              </div>
            </div>
            <p className="text-xs text-zinc-500">
              Click the button below to complete your payment securely via Stripe. You will be
              redirected to a secure checkout page.
            </p>
          </div>

          {/* Error Message */}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Pay Button */}
          <button
            onClick={handlePayNow}
            disabled={isGeneratingLink}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:opacity-40"
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
              className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-40"
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
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
            <Warning weight="duotone" className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-sm font-medium text-zinc-900">Waiting for payment link</p>
          <p className="mt-1 text-xs text-zinc-500">
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
              className="flex-1 rounded-md border border-zinc-200 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Back
            </button>
          )}
          {isPaymentComplete && (
            <button
              onClick={onContinue}
              className="flex-1 cursor-pointer rounded-md border border-zinc-200 bg-white py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
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
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
        <Check weight="bold" className="h-6 w-6 text-emerald-600" />
      </div>

      {/* Message */}
      <div>
        <h2 className="mb-2 text-lg font-medium text-zinc-900">Welcome to Ariex</h2>
        <p className="text-xs text-zinc-500">
          Your account is set up and ready to go.
          {strategist && ` ${strategist.name} will be your dedicated tax strategist.`}
        </p>
      </div>

      {/* Next Steps */}
      <div className="w-full border-t border-zinc-200 pt-6 text-left">
        <h3 className="mb-3 text-xs font-medium text-zinc-400 uppercase">What happens next</h3>
        <ul className="space-y-2 text-xs text-zinc-600">
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1 w-1 rounded-full bg-emerald-500" />
            <span>Check your email for the agreement signing link</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1 w-1 rounded-full bg-zinc-300" />
            <span>Upload your tax documents when requested</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1 w-1 rounded-full bg-zinc-300" />
            <span>Receive your personalized tax strategy</span>
          </li>
        </ul>
      </div>

      {/* Go to Dashboard Button */}
      <button
        onClick={() => router.push('/client/home')}
        disabled={isFinishing}
        className="w-full rounded-md border border-zinc-200 bg-white py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:opacity-40"
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
    <div className="flex -translate-y-5 items-center justify-center gap-1.5">
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={`h-1.5 w-1.5 rounded-full ${
            index <= currentStep ? 'bg-emerald-500' : 'bg-zinc-200'
          }`}
        />
      ))}
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
          // Get agreements to find the one that was just signed
          const data = await getClientDashboardData();
          const pendingAgreement = data?.agreements?.find(
            a => a.status === AgreementStatus.DRAFT && a.signatureCeremonyUrl
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
      console.log('[Onboarding] Payment success redirect - staying on payment step for auto-verification');
      
      cameFromPayment.current = true;
      setShouldAutoVerify(true); // Trigger auto-verification in PaymentStep
      setCurrentStep(2); // Stay on payment step (index 2) for auto-verification
      setIsLoading(false);
      // Remove the query param from URL
      window.history.replaceState({}, '', '/client/onboarding');
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

  // Find the most relevant agreement for onboarding:
  // 1. First, look for agreement awaiting payment (PENDING_PAYMENT)
  // 2. Then, look for agreement awaiting signature (PENDING_SIGNATURE)
  // 3. Finally, fallback to any signed agreement
  const pendingAgreement =
    // Priority 1: Agreement awaiting payment
    dashboardData?.agreements.find(a => a.status === AgreementStatus.PENDING_PAYMENT) ||
    // Priority 2: Agreement awaiting signature
    dashboardData?.agreements.find(a => a.status === AgreementStatus.PENDING_SIGNATURE) ||
    // Priority 3: Any agreement that's been signed (beyond PENDING_SIGNATURE)
    dashboardData?.agreements.find(a => isAgreementSigned(a.status)) ||
    null;

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
      <div className="flex min-h-screen flex-col items-center justify-center bg-white">
        <p className="text-xs font-medium text-zinc-400 uppercase">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium text-zinc-500 uppercase">ARIEX AI</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-500">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Progress dots */}
      <StepIndicator currentStep={currentStep} steps={STEPS} />

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Step Title */}
          <div className="mb-8">
            <h1 className="mb-2 text-xl font-medium text-zinc-900">{currentStepData.title}</h1>
            <p className="text-sm text-zinc-500">{currentStepData.description}</p>
          </div>

          {/* Step Content */}
          {currentStepData.id === 'profile' && (
            <ProfileStep
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
              onContinue={handleNext}
              onBack={handleBack}
              dashboardData={dashboardData}
              isFirst={currentStep === 0}
              isLast={currentStep === STEPS.length - 1}
              pendingAgreement={pendingAgreement}
              autoVerify={shouldAutoVerify}
              setShouldAutoVerify={setShouldAutoVerify}
            />
          )}
          {currentStepData.id === 'complete' && <CompleteStep dashboardData={dashboardData} />}
        </div>
      </main>

      {/* Footer */}
      {/* <footer className="flex items-center justify-between bg-zinc-900 px-6 py-4">
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
        <p className="text-xs text-zinc-400 uppercase">Secure onboarding</p>
      </footer> */}
    </div>
  );
}

// Wrap with Suspense for useSearchParams
export default function ClientOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-white">
          <p className="text-xs font-medium text-zinc-400 uppercase">Loading...</p>
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
