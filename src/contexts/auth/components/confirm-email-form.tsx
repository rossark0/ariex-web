'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/contexts/auth/AuthStore';

export function ConfirmEmailForm() {
  const router = useRouter();
  const { confirmEmail, pendingEmail, isLoading, error: storeError } = useAuthStore();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);

    if (/^\d+$/.test(pastedData)) {
      const newCode = pastedData.split('').slice(0, 6);
      while (newCode.length < 6) newCode.push('');
      setCode(newCode);

      // Focus last filled input or first empty
      const lastFilledIndex = Math.min(pastedData.length, 5);
      inputRefs.current[lastFilledIndex]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    const result = await confirmEmail(fullCode);

    if (result.success) {
      setSuccess(true);
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } else {
      setError(result.error || 'Invalid confirmation code');
    }
  };

  const displayError = error || storeError;

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

  if (success) {
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
        <h2 className="text-xl font-semibold text-zinc-900">Email Confirmed!</h2>
        <p className="text-zinc-600">Redirecting you to sign in...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="text-center">
        <p className="text-sm text-zinc-600">We sent a 6-digit code to</p>
        <p className="font-medium text-zinc-900">{pendingEmail}</p>
      </div>

      {displayError && (
        <div className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
          {displayError}
        </div>
      )}

      <div className="flex justify-center gap-2" onPaste={handlePaste}>
        {code.map((digit, index) => (
          <input
            key={index}
            ref={el => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(index, e.target.value)}
            onKeyDown={e => handleKeyDown(index, e)}
            className="h-12 w-12 rounded-lg border border-zinc-300 text-center text-xl font-semibold transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            autoComplete="one-time-code"
          />
        ))}
      </div>

      <Button
        type="submit"
        disabled={isLoading || code.some(d => !d)}
        className="h-11 bg-emerald-600 text-white hover:bg-emerald-700"
      >
        {isLoading ? 'Verifying...' : 'Verify Email'}
      </Button>

      <p className="text-center text-sm text-zinc-600">
        Didn't receive the code?{' '}
        <button
          type="button"
          className="font-medium text-emerald-600 hover:text-emerald-700"
          onClick={() => {
            // TODO: Implement resend code functionality
          }}
        >
          Resend
        </button>
      </p>
    </form>
  );
}
