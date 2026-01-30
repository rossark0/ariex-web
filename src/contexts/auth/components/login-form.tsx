'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/contexts/auth/AuthStore';

export function LoginForm() {
  const router = useRouter();
  const { login, isLoading, error: storeError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // console.log('[LoginForm] Starting login for:', email);
    const result = await login(email, password);
    // console.log('[LoginForm] Login result:', JSON.stringify(result));

    if (result.success && result.redirectTo) {
      // console.log('[LoginForm] Redirecting to:', result.redirectTo);
      window.location.href = result.redirectTo;
    } else if (result.needsPasswordChange) {
      // Redirect to complete password page for invited users
      // console.log('[LoginForm] Needs password change, redirecting to /complete-password');
      window.location.href = '/complete-password';
    } else if (result.needsConfirmation) {
      // Redirect to email confirmation page
      window.location.href = '/confirm-email';
    } else {
      // console.log('[LoginForm] Login failed, error:', storeError);
      setError(storeError || 'Failed to sign in');
    }
  };

  const displayError = error || storeError;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {displayError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{displayError}</div>
      )}

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

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-zinc-700">
            Password
          </label>
          <Link href="/forgot-password" className="text-sm text-emerald-600 hover:text-emerald-700">
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
          required
          autoComplete="current-password"
        />
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="mt-2 h-11 bg-emerald-600 text-white hover:bg-emerald-700"
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>

      <p className="text-center text-sm text-zinc-600">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-emerald-600 hover:text-emerald-700">
          Create one
        </Link>
      </p>
    </form>
  );
}
