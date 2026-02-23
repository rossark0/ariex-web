'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth/AuthStore';
import { ConfirmEmailForm } from '@/contexts/auth/components/confirm-email-form';
import { getRoleHomePath } from '@/contexts/auth/data/mock-users';

export default function ConfirmEmailPage() {
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
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <svg
                className="h-8 w-8 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Check your email
            </h1>
            <p className="mt-2 text-zinc-500">Click the confirmation link we sent you</p>
          </div>

          {/* Confirm Email Form */}
          <ConfirmEmailForm />
        </div>
      </div>
    </div>
  );
}
