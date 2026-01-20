'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth/AuthStore';
import { RegisterForm } from '@/contexts/auth/components/register-form';
import { getRoleHomePath } from '@/contexts/auth/data/mock-users';

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
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mb-4 text-lg text-zinc-600">Redirecting to your dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 p-6">
        <Link
          href="/"
          className="font-mono text-sm font-medium text-zinc-500 uppercase hover:text-zinc-700"
        >
          ARIEX AI
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Create your account
            </h1>
            <p className="text-2xl tracking-tight text-zinc-400">Get started with Ariex</p>
          </div>

          {/* Register Form */}
          <RegisterForm />

          {/* Terms */}
          <p className="mt-6 text-center text-xs text-zinc-500">
            By creating an account, you agree to the{' '}
            <Link href="/terms" className="text-zinc-600 underline">
              Terms & Conditions
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-zinc-600 underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
