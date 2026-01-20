'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import { useAuth } from '@/contexts/auth/AuthStore';
import { mockUsers, getRoleHomePath } from '@/contexts/auth/data/mock-users';
import { Button } from '@/components/ui/button';

// Check if mock auth is enabled
const USE_MOCK_AUTH = process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, user, isAuthenticated, isHydrated, hydrate } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Hydrate auth state from localStorage on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isHydrated && isAuthenticated && user) {
      console.log('[LoginPage] User already authenticated, redirecting to:', getRoleHomePath(user.role));
      window.location.href = getRoleHomePath(user.role);
    }
  }, [isHydrated, isAuthenticated, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[LoginPage] Starting login for:', email);
    const result = await login(email, password);
    console.log('[LoginPage] Login result:', JSON.stringify(result));
    
    if (result.success && result.redirectTo) {
      window.location.href = result.redirectTo;
    } else if (result.needsPasswordChange) {
      // Redirect to complete password page for invited users
      console.log('[LoginPage] Needs password change, redirecting to /complete-password');
      window.location.href = '/complete-password';
    } else if (result.needsConfirmation) {
      window.location.href = '/confirm-email';
    }
  };

  const handleQuickLogin = async (userEmail: string, userPassword: string) => {
    const result = await login(userEmail, userPassword);
    if (result.success && result.redirectTo) {
      window.location.href = result.redirectTo;
    } else if (result.needsPasswordChange) {
      window.location.href = '/complete-password';
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
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Your tax workspace.
            </h1>
            <p className="text-2xl tracking-tight text-zinc-400">Sign in to your account</p>
          </div>

          {/* Quick Login Options (only in mock auth mode) */}
          {USE_MOCK_AUTH && (
            <>
              <div className="space-y-2">
                {mockUsers.map(mockUser => (
                  <button
                    key={mockUser.user.id}
                    onClick={() => handleQuickLogin(mockUser.user.email, mockUser.password)}
                    disabled={isLoading}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-md border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
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
              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-zinc-200" />
                <span className="text-xs text-zinc-400">or sign in manually</span>
                <div className="h-px flex-1 bg-zinc-200" />
              </div>
            </>
          )}

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-emerald-600 hover:text-emerald-700"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-zinc-300 px-4 py-2.5 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showPassword ? <EyeSlash className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>}

            <Button
              type="submit"
              disabled={isLoading}
              className="h-11 w-full rounded-lg bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Register Link */}
          <p className="mt-6 text-center text-sm text-zinc-600">
            Don't have an account?{' '}
            <Link href="/register" className="font-medium text-emerald-600 hover:text-emerald-700">
              Create one
            </Link>
          </p>

          {/* Terms */}
          <p className="mt-6 text-center text-xs text-zinc-500">
            By continuing, you acknowledge that you understand and agree to the{' '}
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
