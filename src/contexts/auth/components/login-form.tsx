'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { signIn } from '@/lib/firebase-client';
import { setAuthTokens } from '@/contexts/auth/services/auth.services';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const userCredential = await signIn(email, password);
      const token = await userCredential.user.getIdToken();

      // Store token in cookies via server action
      await setAuthTokens(token);

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <div className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="rounded border px-4 py-2"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="rounded border px-4 py-2"
        required
      />
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Log In'}
      </Button>
    </form>
  );
}
