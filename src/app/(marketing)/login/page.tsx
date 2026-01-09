'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth/AuthStore';
import { mockUsers, getRoleHomePath } from '@/contexts/auth/data/mock-users';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, user, isAuthenticated, isHydrated, hydrate } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success && result.redirectTo) {
      router.push(result.redirectTo);
    }
  };

  const handleQuickLogin = async (userEmail: string, userPassword: string) => {
    const result = await login(userEmail, userPassword);
    if (result.success && result.redirectTo) {
      router.push(result.redirectTo);
    }
  };

  // Don't render login form if already authenticated
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
        <span className="font-mono text-sm font-medium text-zinc-500 uppercase">ARIEX AI</span>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-2xl tracking-tight font-semibold text-zinc-900">Your tax workspace.</h1>
            <p className="text-2xl tracking-tight text-zinc-400">Sign in to your account</p>
          </div>

          {/* Quick Login Options */}
          <div className="space-y-2">
            {mockUsers.map(mockUser => (
              <button
                key={mockUser.user.id}
                onClick={() => handleQuickLogin(mockUser.user.email, mockUser.password)}
                disabled={isLoading}
                className="flex cursor-pointer w-full items-center gap-3 rounded-md border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${getRoleBadgeColor(mockUser.user.role)}`}
                >
                  {mockUser.user.role.charAt(0)}
                </span>
                <span>Continue as {mockUser.displayName}</span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="my-6 h-px bg-zinc-200" />

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs text-zinc-500">
                Work email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-none border-b-2 border-zinc-300 bg-transparent px-0 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-0"
                placeholder="user@ariex.ai"
                required
              />
              <p className="mt-1 text-xs text-zinc-400">
                Use an organization email to easily collaborate with teammates
              </p>
            </div>

            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="hidden"
              defaultValue="password"
            />

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              {isLoading ? 'Signing in...' : 'Continue'}
            </Button>
          </form>

          {/* Terms */}
          <p className="mt-6 text-center text-xs text-zinc-500">
            By continuing, you acknowledge that you understand and agree to the{' '}
            <a href="#" className="text-zinc-600 underline">Terms & Conditions</a> and{' '}
            <a href="#" className="text-zinc-600 underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}

function getRoleBadgeColor(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'bg-purple-100 text-purple-700';
    case 'COMPLIANCE':
      return 'bg-blue-100 text-blue-700';
    case 'STRATEGIST':
      return 'bg-emerald-100 text-emerald-700';
    case 'CLIENT':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-zinc-100 text-zinc-700';
  }
}
