'use client';

import * as React from 'react';
import { ThemeProvider } from './theme-provider';
import { AuthProvider } from '@/contexts/auth/components/auth-provider';
import { ORPCProvider } from '@/orpc/react';

/**
 * Consolidated providers component
 * This must be a client component to properly wrap all context providers
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ORPCProvider>
        <AuthProvider>{children}</AuthProvider>
      </ORPCProvider>
    </ThemeProvider>
  );
}
