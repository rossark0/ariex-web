'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/contexts/auth/AuthStore';

export function RegisterForm() {
  const router = useRouter();
  const { register, isLoading, error: storeError } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    const result = await register({ email, password, name });

    if (result.success) {
      // Redirect to email confirmation page
      router.push('/confirm-email');
    } else {
      setError(result.error || storeError || 'Failed to create account');
    }
  };

  const displayError = error || storeError;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {displayError && (
        <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{displayError}</div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-sm font-medium text-soft-white">
          Full Name
        </label>
        <input
          id="name"
          type="text"
          placeholder="John Doe"
          value={name}
          onChange={e => setName(e.target.value)}
          className="rounded-lg border border-white/10 px-4 py-2.5 text-sm transition-colors focus:ring-2 focus:outline-none bg-deep-navy text-soft-white placeholder:text-steel-gray focus:border-electric-blue"
          required
          autoComplete="name"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium text-soft-white">
          Email
        </label>
        <input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="rounded-lg border border-white/10 px-4 py-2.5 text-sm transition-colors focus:ring-2 focus:outline-none bg-deep-navy text-soft-white placeholder:text-steel-gray focus:border-electric-blue"
          required
          autoComplete="email"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium text-soft-white">
          Password
        </label>
        <input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="rounded-lg border border-white/10 px-4 py-2.5 text-sm transition-colors focus:ring-2 focus:outline-none bg-deep-navy text-soft-white placeholder:text-steel-gray focus:border-electric-blue"
          required
          autoComplete="new-password"
          minLength={8}
        />
        <p className="text-xs text-steel-gray">Must be at least 8 characters</p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-soft-white">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          className="rounded-lg border border-white/10 px-4 py-2.5 text-sm transition-colors focus:ring-2 focus:outline-none bg-deep-navy text-soft-white placeholder:text-steel-gray focus:border-electric-blue"
          required
          autoComplete="new-password"
        />
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="mt-2 h-11 bg-electric-blue text-soft-white hover:bg-electric-blue/85"
      >
        {isLoading ? 'Creating account...' : 'Create Account'}
      </Button>

      <p className="text-center text-sm text-steel-gray">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-emerald-400 hover:text-emerald-300">
          Sign in
        </Link>
      </p>
    </form>
  );
}
