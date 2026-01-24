'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth/AuthStore';
import { Check, SpinnerGap } from '@phosphor-icons/react';
import {
  getClientDashboardData,
  type ClientDashboardData,
  type ClientAgreement,
} from '@/lib/api/client.api';

// ============================================================================
// ONBOARDING STEPS
// ============================================================================

type OnboardingStep = 'profile' | 'agreement' | 'complete';

const STEPS: { id: OnboardingStep; title: string; description: string }[] = [
  {
    id: 'profile',
    title: 'Review your profile',
    description: 'Make sure your information is correct',
  },
  {
    id: 'agreement',
    title: 'Sign agreement',
    description: 'Review and sign the service agreement',
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
}

function ProfileStep({ onContinue, onBack, dashboardData, isFirst }: StepProps) {
  const profile = dashboardData?.profile;
  const user = dashboardData?.user;
  const strategist = dashboardData?.strategist;

  return (
    <div className="flex flex-col gap-6">
      {/* Account Summary Card */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6">
        <h3 className="mb-4 text-sm font-medium text-zinc-500">Account Information</h3>

        <div className="space-y-4">
          {/* Name & Email */}
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200 text-lg font-semibold text-zinc-600">
              {(user?.fullName || user?.name || user?.email)?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <p className="font-medium text-zinc-900">{user?.fullName || user?.name || 'N/A'}</p>
              <p className="text-sm text-zinc-500">{user?.email || 'N/A'}</p>
            </div>
          </div>

          <div className="h-px bg-zinc-200" />

          {/* Contact */}
          <div className="flex justify-between">
            <span className="text-sm text-zinc-500">Phone</span>
            <span className="text-sm font-medium text-zinc-900">
              {profile?.phoneNumber || profile?.phone || 'Not provided'}
            </span>
          </div>

          {/* Strategist */}
          {strategist && (
            <div className="flex justify-between">
              <span className="text-sm text-zinc-500">Your Strategist</span>
              <span className="text-sm font-medium text-zinc-900">{strategist.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Business Summary Card */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6">
        <h3 className="mb-4 text-sm font-medium text-zinc-500">Business Information</h3>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-zinc-500">Business name</span>
            <span className="text-sm font-medium text-zinc-900">
              {profile?.businessName || 'Not provided'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-zinc-500">Business type</span>
            <span className="text-sm font-medium text-zinc-900">
              {profile?.businessType || 'Not provided'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-zinc-500">Location</span>
            <span className="text-sm font-medium text-zinc-900">
              {profile?.city && profile?.state
                ? `${profile.city}, ${profile.state}`
                : profile?.address || 'Not provided'}
            </span>
          </div>
          {profile?.filingStatus && (
            <div className="flex justify-between">
              <span className="text-sm text-zinc-500">Filing status</span>
              <span className="text-sm font-medium text-zinc-900">
                {profile.filingStatus.replace('_', ' ')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="mt-4 flex gap-3">
        {!isFirst && (
          <button
            onClick={onBack}
            className="flex-1 rounded-lg border border-zinc-200 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Back
          </button>
        )}
        <button
          onClick={onContinue}
          className="flex-1 cursor-pointer rounded-lg bg-zinc-900 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          Continue
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
}

function AgreementStep({ onContinue, onBack, isFirst, pendingAgreement }: AgreementStepProps) {
  const [signingInProgress, setSigningInProgress] = useState(false);

  const handleSignAgreement = () => {
    if (pendingAgreement?.signatureCeremonyUrl) {
      setSigningInProgress(true);
      // Open the SignatureAPI ceremony in a new tab
      window.open(pendingAgreement.signatureCeremonyUrl, '_blank');
    }
  };

  const agreementTitle = pendingAgreement?.title || pendingAgreement?.name || 'Service Agreement';
  const agreementPrice = pendingAgreement?.price
    ? `$${typeof pendingAgreement.price === 'string' ? parseFloat(pendingAgreement.price).toLocaleString() : pendingAgreement.price.toLocaleString()}`
    : '$499';

  return (
    <div className="flex flex-col gap-6">
      {/* Agreement Info */}
      {pendingAgreement ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6">
          <h3 className="mb-2 text-lg font-semibold text-zinc-900">{agreementTitle}</h3>
          {pendingAgreement.description && (
            <p className="mb-4 text-sm text-zinc-600">{pendingAgreement.description}</p>
          )}
          <div className="flex items-center justify-between border-t border-zinc-200 pt-4">
            <span className="text-sm text-zinc-500">Service Fee</span>
            <span className="text-lg font-semibold text-zinc-900">{agreementPrice}</span>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-sm text-amber-800">
            No agreement has been sent yet. Your strategist will send you an agreement to sign
            shortly.
          </p>
        </div>
      )}

      {/* Agreement Preview */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h4 className="mb-4 text-sm font-medium text-zinc-700">Agreement Summary</h4>
        <div className="max-h-48 overflow-y-auto text-sm text-zinc-600">
          <p className="mb-3">By signing this agreement, you agree to:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Receive tax strategy and planning services from Ariex Tax Advisory</li>
            <li>Provide accurate and complete tax information</li>
            <li>Upload all required tax documents in a timely manner</li>
            <li>Pay the agreed service fee</li>
            <li>Maintain confidentiality of strategy recommendations</li>
          </ul>
        </div>
      </div>

      {/* Sign Button */}
      {pendingAgreement?.signatureCeremonyUrl ? (
        <div className="flex flex-col gap-3">
          <button
            onClick={handleSignAgreement}
            className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            Sign Agreement Electronically
          </button>
          {signingInProgress && (
            <p className="text-center text-xs text-zinc-500">
              A new tab has opened for signing. Once complete, click &quot;Continue&quot; below.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-zinc-100 py-3 text-center text-sm text-zinc-500">
          Waiting for agreement link from your strategist...
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="mt-4 flex gap-3">
        {!isFirst && (
          <button
            onClick={onBack}
            className="flex-1 rounded-lg border border-zinc-200 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Back
          </button>
        )}
        <button
          onClick={onContinue}
          disabled={!signingInProgress && !pendingAgreement?.signatureCeremonyUrl}
          className="flex-1 cursor-pointer rounded-lg bg-zinc-900 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {signingInProgress ? 'Continue' : 'Skip for now'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// COMPLETE STEP COMPONENT
// ============================================================================

function CompleteStep({ dashboardData }: { dashboardData: ClientDashboardData | null }) {
  const router = useRouter();
  const strategist = dashboardData?.strategist;

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      {/* Success Icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
        <Check weight="bold" className="h-10 w-10 text-emerald-600" />
      </div>

      {/* Message */}
      <div>
        <h2 className="mb-2 text-xl font-semibold text-zinc-900">Welcome to Ariex!</h2>
        <p className="text-sm text-zinc-600">
          Your account is set up and ready to go.
          {strategist && ` ${strategist.name} will be your dedicated tax strategist.`}
        </p>
      </div>

      {/* Next Steps */}
      <div className="w-full rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-left">
        <h3 className="mb-3 text-sm font-medium text-zinc-700">What happens next?</h3>
        <ul className="space-y-2 text-sm text-zinc-600">
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Check your email for the agreement signing link</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-300" />
            <span>Upload your tax documents when requested</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-300" />
            <span>Receive your personalized tax strategy</span>
          </li>
        </ul>
      </div>

      {/* Go to Dashboard Button */}
      <button
        onClick={() => router.push('/client/home')}
        className="w-full rounded-lg bg-zinc-900 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
      >
        Go to Dashboard
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
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
              index < currentStep
                ? 'bg-emerald-500 text-white'
                : index === currentStep
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-400'
            }`}
          >
            {index < currentStep ? <Check weight="bold" className="h-4 w-4" /> : index + 1}
          </div>
          {index < steps.length - 1 && (
            <div className={`h-px w-8 ${index < currentStep ? 'bg-emerald-500' : 'bg-zinc-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN ONBOARDING PAGE
// ============================================================================

export default function ClientOnboardingPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const [currentStep, setCurrentStep] = useState(0);
  const [dashboardData, setDashboardData] = useState<ClientDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch dashboard data from API
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const data = await getClientDashboardData();
        setDashboardData(data);

        // If user already has a signed agreement, skip to complete
        if (data?.agreements.some(a => a.status === 'signed' || a.status === 'completed')) {
          setCurrentStep(2); // Go to complete step
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

  // Find pending agreement (needs signing)
  const pendingAgreement =
    dashboardData?.agreements.find(
      a => a.status === 'pending' || a.status === 'sent' || a.status === 'draft'
    ) || null;

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
        <SpinnerGap className="h-8 w-8 animate-spin text-zinc-400" />
        <p className="mt-4 text-sm text-zinc-500">Loading your information...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="border-b border-zinc-100 px-6 py-4">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="text-xl font-semibold tracking-tight">Ariex</div>
          <StepIndicator currentStep={currentStep} steps={STEPS} />
          <button
            onClick={handleLogout}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          {/* Step Title */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-2xl font-semibold text-zinc-900">{currentStepData.title}</h1>
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
            />
          )}
          {currentStepData.id === 'complete' && <CompleteStep dashboardData={dashboardData} />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-100 px-6 py-4">
        <div className="mx-auto max-w-lg text-center text-xs text-zinc-400">
          Need help?{' '}
          <a href="mailto:support@ariex.ai" className="underline hover:text-zinc-600">
            Contact support
          </a>
        </div>
      </footer>
    </div>
  );
}
