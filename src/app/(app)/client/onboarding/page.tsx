'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth/AuthStore';
import { getFullUserProfile } from '@/contexts/auth/data/mock-users';
import type { FullClientMock } from '@/lib/mocks/client-full';
import { Check } from '@phosphor-icons/react';

// ============================================================================
// ONBOARDING STEPS
// ============================================================================

type OnboardingStep = 'profile' | 'agreement' | 'payment';

const STEPS: { id: OnboardingStep; title: string; description: string }[] = [
  {
    id: 'profile',
    title: 'Set up your account',
    description: 'Tell us about yourself and your business',
  },
  {
    id: 'agreement',
    title: 'Sign agreement',
    description: 'Review and sign the service agreement',
  },
  {
    id: 'payment',
    title: 'Complete payment',
    description: 'Pay the onboarding fee to get started',
  },
];

// ============================================================================
// PROFILE STEP COMPONENT
// ============================================================================

interface StepProps {
  onContinue: () => void;
  onBack: () => void;
  clientData: FullClientMock | null;
  isFirst: boolean;
  isLast: boolean;
}

function ProfileStep({ onContinue, onBack, clientData, isFirst }: StepProps) {
  const profile = clientData?.profile;
  const user = clientData?.user;

  return (
    <div className="flex flex-col gap-6">
      {/* Account Summary Card */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6">
        <h3 className="mb-4 text-sm font-medium text-zinc-500">Account Information</h3>
        
        <div className="space-y-4">
          {/* Name & Email */}
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200 text-lg font-semibold text-zinc-600">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="font-medium text-zinc-900">{user?.name || 'N/A'}</p>
              <p className="text-sm text-zinc-500">{user?.email || 'N/A'}</p>
            </div>
          </div>

          <div className="h-px bg-zinc-200" />

          {/* Contact */}
          <div className="flex justify-between">
            <span className="text-sm text-zinc-500">Phone</span>
            <span className="text-sm font-medium text-zinc-900">{profile?.phoneNumber || 'Not provided'}</span>
          </div>
        </div>
      </div>

      {/* Business Summary Card */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6">
        <h3 className="mb-4 text-sm font-medium text-zinc-500">Business Information</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-zinc-500">Business name</span>
            <span className="text-sm font-medium text-zinc-900">{profile?.businessName || 'Not provided'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-zinc-500">Business type</span>
            <span className="text-sm font-medium text-zinc-900">{profile?.businessType || 'Not provided'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-zinc-500">Location</span>
            <span className="text-sm font-medium text-zinc-900">
              {profile?.city && profile?.state ? `${profile.city}, ${profile.state}` : 'Not provided'}
            </span>
          </div>
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

function AgreementStep({ onContinue, onBack, isFirst }: StepProps) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Agreement Preview */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">Ariex Service Agreement</h3>
        <div className="max-h-64 overflow-y-auto text-sm text-zinc-600">
          <p className="mb-4">
            This Service Agreement (&quot;Agreement&quot;) is entered into between Ariex Tax
            Services (&quot;Company&quot;) and the undersigned client (&quot;Client&quot;).
          </p>
          <p className="mb-4">
            <strong>1. Services</strong>
            <br />
            Company agrees to provide tax strategy and planning services to Client, including but
            not limited to tax optimization recommendations, document preparation assistance, and
            ongoing tax advisory support.
          </p>
          <p className="mb-4">
            <strong>2. Client Responsibilities</strong>
            <br />
            Client agrees to provide accurate and complete information, respond to requests in a
            timely manner, and upload all required tax documents.
          </p>
          <p className="mb-4">
            <strong>3. Fees</strong>
            <br />
            Client agrees to pay an onboarding fee of $499 and any additional fees for services
            rendered as outlined in the fee schedule.
          </p>
          <p className="mb-4">
            <strong>4. Confidentiality</strong>
            <br />
            Both parties agree to maintain the confidentiality of all information shared during the
            course of this engagement.
          </p>
          <p>
            <strong>5. Term</strong>
            <br />
            This Agreement shall remain in effect until terminated by either party with 30 days
            written notice.
          </p>
        </div>
      </div>

      {/* Checkbox */}
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={agreed}
          onChange={e => setAgreed(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-zinc-300"
        />
        <span className="text-sm text-zinc-600">
          I have read and agree to the Ariex Service Agreement. I understand the terms and
          conditions outlined above.
        </span>
      </label>

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
          Sign Agreement
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// PAYMENT STEP COMPONENT
// ============================================================================

function PaymentStep({ onContinue, onBack, clientData, isFirst, isLast }: StepProps) {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'crypto' | null>(null);
  const [processing, setProcessing] = useState(false);

  const handlePayment = () => {
    setProcessing(true);
    // Simulate payment processing
    setTimeout(() => {
      setProcessing(false);
      onContinue();
    }, 1000);
  };

  const amount = clientData?.payments[0]?.amount || 499;

  return (
    <div className="flex flex-col gap-6">
      {/* Payment Summary */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500">Onboarding Fee</p>
            <p className="text-2xl font-semibold text-zinc-900">${amount}</p>
          </div>
          <div className="rounded-lg bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
            One-time payment
          </div>
        </div>
        <p className="mt-4 text-sm text-zinc-500">
          This fee covers your initial tax strategy consultation and personalized tax optimization
          plan.
        </p>
      </div>

      {/* Payment Method Selection */}
      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium text-zinc-700">Select payment method</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setPaymentMethod('card')}
            className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors ${
              paymentMethod === 'card'
                ? 'border-zinc-900 bg-zinc-50'
                : 'border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <span className="text-2xl">💳</span>
            <span className="text-sm font-medium text-zinc-700">Credit/Debit Card</span>
            <span className="text-xs text-zinc-500">Via Stripe</span>
          </button>
          <button
            onClick={() => setPaymentMethod('crypto')}
            className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors ${
              paymentMethod === 'crypto'
                ? 'border-zinc-900 bg-zinc-50'
                : 'border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <span className="text-2xl">₿</span>
            <span className="text-sm font-medium text-zinc-700">Cryptocurrency</span>
            <span className="text-xs text-zinc-500">Via Coinbase</span>
          </button>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="mt-4 flex gap-3">
        {!isFirst && (
          <button
            onClick={onBack}
            disabled={processing}
            className="flex-1 rounded-lg border border-zinc-200 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
          >
            Back
          </button>
        )}
        <button
          onClick={handlePayment}
          disabled={processing}
          className="flex-1 cursor-pointer rounded-lg bg-zinc-900 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
        >
          {processing ? 'Processing...' : `Pay $${amount}`}
        </button>
      </div>

      <p className="text-center text-xs text-zinc-400">
        Your payment is secure and encrypted. By proceeding, you agree to our payment terms.
      </p>
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
            <div
              className={`h-px w-8 ${index < currentStep ? 'bg-emerald-500' : 'bg-zinc-200'}`}
            />
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
  const user = useAuth(state => state.user);
  const [currentStep, setCurrentStep] = useState(0);

  // Get client data
  const clientData = user ? (getFullUserProfile(user) as FullClientMock | null) : null;

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Mark onboarding as complete in localStorage (for mock purposes)
      localStorage.setItem('ariex_onboarding_complete', 'true');
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

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="border-b border-zinc-100 px-6 py-4">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="text-xl font-semibold tracking-tight">Ariex</div>
          <StepIndicator currentStep={currentStep} steps={STEPS} />
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
              clientData={clientData}
              isFirst={currentStep === 0}
              isLast={currentStep === STEPS.length - 1}
            />
          )}
          {currentStepData.id === 'agreement' && (
            <AgreementStep
              onContinue={handleNext}
              onBack={handleBack}
              clientData={clientData}
              isFirst={currentStep === 0}
              isLast={currentStep === STEPS.length - 1}
            />
          )}
          {currentStepData.id === 'payment' && (
            <PaymentStep
              onContinue={handleNext}
              onBack={handleBack}
              clientData={clientData}
              isFirst={currentStep === 0}
              isLast={currentStep === STEPS.length - 1}
            />
          )}
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
