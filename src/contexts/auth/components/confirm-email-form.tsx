'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/contexts/auth/AuthStore';

export function ConfirmEmailForm() {
  const { pendingEmail } = useAuthStore();

  if (!pendingEmail) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-zinc-600">No email pending confirmation.</p>
        <Link href="/register" className="font-medium text-emerald-600 hover:text-emerald-700">
          Create an account
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <p className="text-sm text-zinc-600">We sent a confirmation link to</p>
        <p className="font-medium text-zinc-900">{pendingEmail}</p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center text-sm text-zinc-600">
        <p>Open your email and click the <strong>&quot;Confirm email&quot;</strong> button to verify your account.</p>
      </div>

      <p className="text-center text-sm text-zinc-500">
        After confirming your email, you can sign in to your account.
      </p>

      <Link href="/login">
        <Button className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-700">
          Go to login
        </Button>
      </Link>

      <p className="text-center text-sm text-zinc-600">
        Didn&apos;t receive the email? Check your spam folder or{' '}
        <Link href="/register" className="font-medium text-emerald-600 hover:text-emerald-700">
          try again
        </Link>
      </p>
    </div>
  );
}
