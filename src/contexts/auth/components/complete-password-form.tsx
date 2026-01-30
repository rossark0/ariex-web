'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/contexts/auth/AuthStore';

interface PasswordChallenge {
  challenge: string;
  session: string;
  username: string;
}

export function CompletePasswordForm() {
  const router = useRouter();
  const {
    completePassword,
    isLoading,
    error: storeError,
    pendingPasswordChallenge,
  } = useAuthStore();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [challenge, setChallenge] = useState<PasswordChallenge | null>(pendingPasswordChallenge);

  // Load challenge from sessionStorage if not in store
  useEffect(() => {
    if (!challenge && typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('ariex_password_challenge');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          console.log('[CompletePasswordForm] Loaded challenge from sessionStorage:', parsed);
          setChallenge(parsed);
        } catch (e) {
          console.error('[CompletePasswordForm] Failed to parse stored challenge:', e);
        }
      }
    }
  }, [challenge]);

  // If no challenge pending, redirect to login
  if (!challenge) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
          <p className="font-medium">No password setup required</p>
          <p className="mt-1 text-amber-600">Please log in with your credentials first.</p>
        </div>
        <Button
          onClick={() => router.push('/login')}
          className="h-11 bg-emerald-600 text-white hover:bg-emerald-700"
        >
          Go to Login
        </Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password requirements
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    const result = await completePassword(newPassword);

    if (result.success && result.redirectTo) {
      console.log('[CompletePasswordForm] Password set successfully, redirecting to:', result.redirectTo);
      window.location.href = result.redirectTo;
    } else {
      setError(result.error || 'Failed to set password');
    }
  };

  const displayError = error || storeError;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">
        <p className="font-medium">Welcome to Ariex!</p>
        <p className="mt-1 text-emerald-600">
          Please set a new password for your account to continue.
        </p>
      </div>

      {displayError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{displayError}</div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="newPassword" className="text-sm font-medium text-zinc-700">
          New Password
        </label>
        <div className="relative">
          <input
            id="newPassword"
            type={showNewPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 pr-10 text-sm transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            required
            autoComplete="new-password"
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
          >
            {showNewPassword ? <EyeSlash className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        <p className="text-xs text-zinc-500">Must be at least 8 characters</p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-700">
          Confirm Password
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 pr-10 text-sm transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            required
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
          >
            {showConfirmPassword ? <EyeSlash className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="mt-2 h-11 bg-emerald-600 text-white hover:bg-emerald-700"
      >
        {isLoading ? 'Setting password...' : 'Set Password & Continue'}
      </Button>
    </form>
  );
}
