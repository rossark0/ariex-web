'use client';

import AppLayout from '@/components/layout/app-layout';
import { useAuth } from '@/contexts/auth/AuthStore';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import { getClientAgreements } from '@/lib/api/client.api';
import { isAgreementPaid, isAgreementSigned } from '@/types/agreement';
import { CreditCard, House } from '@phosphor-icons/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const navItems = [
  { href: '/client/home', label: 'Home', icon: House },
  // { href: '/client/documents', label: 'Documents', icon: Upload },
  // { href: '/client/agreements', label: 'Agreements', icon: FileText },
  { href: '/client/payments', label: 'Payments', icon: CreditCard },
];

export default function ClientAppLayout({ children }: { children: React.ReactNode }) {
  useRoleRedirect(['CLIENT', 'ADMIN']);
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const hasCheckedRef = useRef(false);
  const isOnboardingPage = pathname.startsWith('/client/onboarding');

  useEffect(() => {
    // Skip entirely for onboarding pages - they handle their own logic
    if (isOnboardingPage) {
      setIsChecking(false);
      return;
    }

    // Prevent multiple checks
    if (hasCheckedRef.current) {
      return;
    }

    // Wait for user to be available
    if (!user) {
      return;
    }

    // Only check onboarding for CLIENT role users
    if (user.role !== 'CLIENT') {
      setIsChecking(false);
      return;
    }

    // Mark as checked immediately to prevent re-runs
    hasCheckedRef.current = true;

    async function checkOnboardingStatus() {
      try {
        console.log('[ClientLayout] Checking onboarding status...');
        const agreements = await getClientAgreements();
        
        // No agreements = needs onboarding
        if (!agreements || agreements.length === 0) {
          console.log('[ClientLayout] No agreements found, redirecting to onboarding');
          router.replace('/client/onboarding');
          return;
        }

        const serviceAgreement = agreements[0];
        const isSigned = isAgreementSigned(serviceAgreement.status);
        const isPaid = isAgreementPaid(serviceAgreement.status);
        
        console.log('[ClientLayout] Agreement status:', serviceAgreement.status, '| Signed:', isSigned, '| Paid:', isPaid);
        
        // Redirect to onboarding if NOT signed OR NOT paid
        if (!isSigned || !isPaid) {
          console.log('[ClientLayout] Onboarding incomplete, redirecting');
          router.replace('/client/onboarding');
          return;
        }
        
        // All good, client can access the dashboard
        setIsChecking(false);
      } catch (error) {
        console.error('[ClientLayout] Failed to check onboarding status:', error);
        setIsChecking(false);
      }
    }
    
    checkOnboardingStatus();
  }, [user, isOnboardingPage, router]);

  // If on onboarding page, render children directly (layout handles itself)
  if (isOnboardingPage) {
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

  return (
    <AppLayout navItems={navItems}>{children}</AppLayout>
  );
}
