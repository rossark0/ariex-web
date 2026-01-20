'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth/AuthStore';
import { ForgotPasswordForm } from '@/contexts/auth/components/forgot-password-form';
import { getRoleHomePath } from '@/contexts/auth/data/mock-users';

export default function ForgotPasswordPage() {
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
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Reset your password
            </h1>
            <p className="text-zinc-400">We'll help you get back in</p>
          </div>

          {/* Forgot Password Form */}
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
