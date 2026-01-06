'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import AppLayout from '@/components/layout/app-layout';
import { House, Upload, FileText, CreditCard } from '@phosphor-icons/react';
import { useAuth } from '@/contexts/auth/AuthStore';
import { getFullUserProfile } from '@/contexts/auth/data/mock-users';
import type { FullClientMock } from '@/lib/mocks/client-full';

const navItems = [
  { href: '/client/home', label: 'Home', icon: House },
  { href: '/client/uploads', label: 'Uploads', icon: Upload },
  { href: '/client/agreements', label: 'Agreements', icon: FileText },
  { href: '/client/payments', label: 'Payments', icon: CreditCard },
];

/**
 * Check if client needs to complete onboarding
 * Returns true if any of these steps are incomplete:
 * - Sign agreement
 * - Payment
 */
function needsOnboarding(clientData: FullClientMock | null): boolean {
  // Check if onboarding was already completed (mock localStorage flag)
  if (typeof window !== 'undefined' && localStorage.getItem('ariex_onboarding_complete') === 'true') {
    return false;
  }

  if (!clientData) return true;

  const agreementTask = clientData.onboardingTasks.find(t => t.type === 'sign_agreement');
  const paymentTask = clientData.onboardingTasks.find(t => t.type === 'pay_initial');

  // Check if agreement is not signed
  const agreementNotSigned = agreementTask?.status !== 'completed';
  
  // Check if payment is not completed
  const paymentNotCompleted = paymentTask?.status !== 'completed';

  return agreementNotSigned || paymentNotCompleted;
}

export default function ClientAppLayout({ children }: { children: React.ReactNode }) {
  useRoleRedirect('CLIENT');
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuth(state => state.user);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsChecking(false);
      return;
    }

    // Skip redirect if already on onboarding page
    if (pathname.startsWith('/client/onboarding')) {
      setIsChecking(false);
      return;
    }

    const clientData = getFullUserProfile(user) as FullClientMock | null;

    if (needsOnboarding(clientData)) {
      router.replace('/client/onboarding');
    } else {
      setIsChecking(false);
    }
  }, [user, pathname, router]);

  // If on onboarding page, render children directly (layout handles itself)
  if (pathname.startsWith('/client/onboarding')) {
    return <>{children}</>;
  }

  // Show loading while checking onboarding status
  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
      </div>
    );
  }

  return <AppLayout navItems={navItems}>{children}</AppLayout>;
}
