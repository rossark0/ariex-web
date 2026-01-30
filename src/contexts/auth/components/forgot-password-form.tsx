'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/contexts/auth/AuthStore';

type Step = 'email' | 'code' | 'success';

export function ForgotPasswordForm() {
  const router = useRouter();
  const {
    forgotPassword,
    resetPassword,
    pendingEmail,
    isLoading,
    error: storeError,
  } = useAuthStore();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = await forgotPassword(email);

    if (result.success) {
      setStep('code');
    } else {
      setError(result.error || 'Failed to send reset email');
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    const result = await resetPassword(code, newPassword);

    if (result.success) {
      setStep('success');
    } else {
      setError(result.error || 'Failed to reset password');
    }
  };

  const displayError = error || storeError;

  if (step === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <svg
            className="h-8 w-8 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-zinc-900">Password Reset!</h2>
        <p className="text-zinc-600">Your password has been successfully reset.</p>
        <Link
          href="/login"
          className="mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-emerald-600 px-6 font-medium text-white hover:bg-emerald-700"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (step === 'code') {
    return (
      <form onSubmit={handleResetSubmit} className="flex flex-col gap-4">
        <div className="text-center">
          <p className="text-sm text-zinc-600">We sent a reset code to</p>
          <p className="font-medium text-zinc-900">{pendingEmail || email}</p>
        </div>

        {displayError && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{displayError}</div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="code" className="text-sm font-medium text-zinc-700">
            Reset Code
          </label>
          <input
            id="code"
            type="text"
            placeholder="Enter 6-digit code"
            value={code}
            onChange={e => setCode(e.target.value)}
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            required
            autoComplete="one-time-code"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="newPassword" className="text-sm font-medium text-zinc-700">
            New Password
          </label>
          <input
            id="newPassword"
            type="password"
            placeholder="••••••••"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            required
            autoComplete="new-password"
            minLength={8}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-700">
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            required
            autoComplete="new-password"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="mt-2 h-11 bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {isLoading ? 'Resetting...' : 'Reset Password'}
        </Button>

        <button
          type="button"
          onClick={() => setStep('email')}
          className="text-center text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to email
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
      {displayError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{displayError}</div>
      )}

      <p className="text-sm text-zinc-600">
        Enter your email address and we&apos;ll send you a code to reset your password.
      </p>

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
          required
          autoComplete="email"
        />
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="mt-2 h-11 bg-emerald-600 text-white hover:bg-emerald-700"
      >
        {isLoading ? 'Sending...' : 'Send Reset Code'}
      </Button>

      <p className="text-center text-sm text-zinc-600">
        Remember your password?{' '}
        <Link href="/login" className="font-medium text-emerald-600 hover:text-emerald-700">
          Sign in
        </Link>
      </p>
    </form>
  );
}
