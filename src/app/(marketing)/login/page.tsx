'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth/AuthStore';
import { mockUsers, getRoleHomePath } from '@/contexts/auth/data/mock-users';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuth(state => state.login);
  const isLoading = useAuth(state => state.isLoading);
  const error = useAuth(state => state.error);
  const user = useAuth(state => state.user);
  const isAuthenticated = useAuth(state => state.isAuthenticated);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      router.push(getRoleHomePath(user.role));
    }
  }, [isAuthenticated, user, router]);

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
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mb-4 text-lg text-zinc-600">Redirecting to your dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-zinc-900">Ariex Platform</h1>
          <p className="mt-2 text-zinc-600">Tax Strategy Management System</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Login Form */}
          <div className="rounded-lg bg-white p-8 shadow-sm">
            <h2 className="mb-6 text-2xl font-semibold text-zinc-900">Sign In</h2>

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
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="user@ariex.ai"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="password"
                  required
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </div>

          {/* Quick Login Options */}
          <div className="rounded-lg bg-white p-8 shadow-sm">
            <h2 className="mb-6 text-2xl font-semibold text-zinc-900">Quick Login</h2>
            <p className="mb-6 text-sm text-zinc-600">
              Development environment: Click any role to sign in instantly
            </p>

            <div className="space-y-3">
              {mockUsers.map(mockUser => (
                <button
                  key={mockUser.user.id}
                  onClick={() => handleQuickLogin(mockUser.user.email, mockUser.password)}
                  disabled={isLoading}
                  className="w-full rounded-lg border border-zinc-200 bg-white p-4 text-left transition-all hover:border-emerald-500 hover:bg-emerald-50 disabled:opacity-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-900">{mockUser.displayName}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${getRoleBadgeColor(mockUser.user.role)}`}
                        >
                          {mockUser.user.role}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-500">{mockUser.description}</p>
                      <p className="mt-2 text-xs text-zinc-400">{mockUser.user.email}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-md bg-zinc-50 p-4">
              <p className="text-xs text-zinc-600">
                <strong>Default Password:</strong> password
              </p>
            </div>
          </div>
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
