'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPaymentIntegration, getPaymentIntegration } from '@/lib/api/strategist.api';
import { useAuth } from '@/contexts/auth/AuthStore';
import Image from 'next/image';

export default function StrategistOnboardingPage() {
  const router = useRouter();
  const user = useAuth();
  const [stripeKey, setStripeKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isValidStripeKey = stripeKey.startsWith('sk_') && stripeKey.length > 20;

  // Check if integration already exists
  useEffect(() => {
    async function checkExisting() {
      try {
        const existing = await getPaymentIntegration();
        if (existing) {
          router.push('/strategist/home');
        }
      } catch {
        // No integration, stay on page
      } finally {
        setIsChecking(false);
      }
    }
    checkExisting();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidStripeKey) {
      setError('Please enter a valid Stripe secret key (starts with sk_)');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createPaymentIntegration(stripeKey);
      setSuccess(true);
      setTimeout(() => {
        router.push('/strategist/home');
      }, 1500);
    } catch (err: unknown) {
      console.error('Failed to save Stripe integration:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('already has active integration')) {
        setError('You already have a Stripe integration set up. Redirecting...');
        setTimeout(() => router.push('/strategist/home'), 2000);
      } else if (errorMessage.includes('Invalid key')) {
        setError(
          'Invalid Stripe key. Please check that you copied the correct secret key from your Stripe dashboard.'
        );
      } else {
        setError(`Failed to save Stripe integration: ${errorMessage}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-zinc-400 uppercase font-semibold">Loading...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="mb-2 text-xl font-semibold uppercase text-zinc-900">Setup Complete</h1>
          <p className="text-sm text-zinc-500 uppercase font-medium">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-white overflow-hidden md:overflow-hidden overflow-y-auto">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between px-6 py-4">
        <div className="flex w-full items-center gap-2">
          <div className="mb-8 flex items-center gap-2 pl-2">
            <span className="font-mono text-sm font-medium text-zinc-500 uppercase">ARIEX AI</span>
          </div>
        </div>
        <div className="flex w-full items-center justify-end gap-4">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            {user.user?.email}
            <div onClick={user.logout} className="font-semibold text-zinc-600">
              Logout
            </div>{' '}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center px-6 overflow-y-auto md:overflow-hidden">
        <div className="w-full max-w-sm py-8 md:py-0">
          <div className="mb-8 flex flex-col justify-start items-start">
            <div className="relative h-6 w-6 mb-4">
              <Image
                className="object-contain text-black"
                src={'/Icon.jpeg'}
                fill
                alt="stripe logo"
              />
            </div>
            <h1 className="mb-2 text-xl font-medium text-zinc-900">To receive payment clients, please connect your Stripe account</h1>
            <p className="text-sm text-zinc-500">
              Enter your Stripe secret key to enable payment processing for your clients.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <input
                type="password"
                value={stripeKey}
                onChange={e => {
                  setStripeKey(e.target.value);
                  setError(null);
                }}
                placeholder="sk_live_..."
                className="w-full border-b border-zinc-200 bg-transparent py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
              />
            </div>

            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={!isValidStripeKey || isSubmitting}
              className="w-full rounded-md border border-zinc-200 bg-white py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? 'Connecting...' : 'Continue'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-400">
            Find your key at{' '}
            <a
              href="https://dashboard.stripe.com/apikeys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 underline hover:text-zinc-700"
            >
              dashboard.stripe.com/apikeys
            </a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex shrink-0 items-center justify-between bg-zinc-900 px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="relative h-12 w-25">
            <Image
              className="object-contain"
              src={'/stripewhite.svg'}
              fill
              alt="stripe logo"
            />
          </div>
        </div>
        <p className="text-xs text-white uppercase font-semibold">Secure payment integration.</p>
      </footer>
    </div>
  );
}
