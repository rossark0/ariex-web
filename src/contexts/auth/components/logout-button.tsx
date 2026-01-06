'use client';

import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/firebase-client';
import { signOutCleanup } from '@/contexts/auth/services/auth.services';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut();
      await signOutCleanup();
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/');
    }
  };

  return (
    <Button onClick={handleLogout} variant="outline">
      Log Out
    </Button>
  );
}
