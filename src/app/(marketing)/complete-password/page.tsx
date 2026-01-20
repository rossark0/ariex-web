'use client';

import { CompletePasswordForm } from '@/contexts/auth/components/complete-password-form';
import { useAuthStore } from '@/contexts/auth/AuthStore';
import { SignOut } from '@phosphor-icons/react';

export default function CompletePasswordPage() {
  const { logout } = useAuthStore();

  const handleSignOut = async () => {
    // Clear the password challenge cookie
    document.cookie = 'ariex_password_challenge=; path=/; max-age=0';
    sessionStorage.removeItem('ariex_password_challenge');
    await logout();
    window.location.href = '/login';
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4">
      {/* Sign Out Button */}
      <button
        onClick={handleSignOut}
        className="absolute top-4 right-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-700"
      >
        <SignOut className="h-4 w-4" />
        <span>Sign out</span>
      </button>

      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Set Your Password</h1>
          <p className="mt-2 text-sm text-zinc-600">Create a secure password for your account</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <CompletePasswordForm />
        </div>
      </div>
    </div>
  );
}
