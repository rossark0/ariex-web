'use client';

import { useEffect } from 'react';
import { useAuthStore } from '../AuthStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore(state => state.hydrate);
  const isHydrated = useAuthStore(state => state.isHydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Optionally show a loading state while hydrating
  if (!isHydrated) {
    return null; // Or a loading spinner
  }

  return <>{children}</>;
}
