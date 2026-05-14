'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth/AuthStore';
import { RegisterForm } from '@/contexts/auth/components/register-form';
import { getRoleHomePath } from '@/contexts/auth/data/mock-users';
import { Wordmark } from '@/components/layout/wordmark';

export default function RegisterPage() {
  const router = useRouter();
  const { user, isAuthenticated, isHydrated, hydrate } = useAuth();

  // Hydrate auth state from localStorage on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isHydrated && isAuthenticated && user) {
      router.push(getRoleHomePath(user.role));
    }
  }, [isHydrated, isAuthenticated, user, router]);

  // Don't render form if already authenticated
  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-graphite">
        <div className="text-center">
          <div className="mb-4 text-lg text-steel-gray">Redirecting to your dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-graphite">
      {/* Header */}
      <div className="flex items-center gap-2 p-6">
        <Link href="/" aria-label="ARIEX home" className="text-soft-white transition-colors duration-150 ease-linear hover:text-electric-blue">
          <Wordmark height={16} />
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-soft-white">
              Create your account
            </h1>
            <p className="text-2xl tracking-tight text-steel-gray">Get started with Ariex</p>
          </div>

          {/* Register Form */}
          <RegisterForm />

          {/* Terms */}
          <p className="mt-6 text-center text-xs text-steel-gray">
            By creating an account, you agree to the{' '}
            <Link href="/terms" className="text-steel-gray underline hover:text-soft-white">
              Terms & Conditions
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-steel-gray underline hover:text-soft-white">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
