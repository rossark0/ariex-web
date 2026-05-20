'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/contexts/auth/AuthStore';

export function ConfirmEmailForm() {
  const { pendingEmail } = useAuthStore();

  if (!pendingEmail) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-steel-gray">No email pending confirmation.</p>
        <Link href="/register" className="font-medium text-emerald-400 hover:text-emerald-300">
          Create an account
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <p className="text-sm text-steel-gray">We sent a confirmation link to</p>
        <p className="font-medium text-soft-white">{pendingEmail}</p>
      </div>

      <div className="rounded-lg border border-white/10 bg-surface p-4 text-center text-sm text-steel-gray">
        <p>Open your email and click the <strong>&quot;Confirm email&quot;</strong> button to verify your account.</p>
      </div>

      <p className="text-center text-sm text-steel-gray">
        After confirming your email, you can sign in to your account.
      </p>

      <Link href="/login">
        <Button className="h-11 w-full bg-electric-blue text-soft-white hover:bg-electric-blue/85">
          Go to login
        </Button>
      </Link>

      <p className="text-center text-sm text-steel-gray">
        Didn&apos;t receive the email? Check your spam folder or{' '}
        <Link href="/register" className="font-medium text-emerald-400 hover:text-emerald-300">
          try again
        </Link>
      </p>
    </div>
  );
}
