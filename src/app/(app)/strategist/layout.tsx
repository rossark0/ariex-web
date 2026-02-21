'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import AppLayout from '@/components/layout/app-layout';
import { getPaymentIntegration } from '@/lib/api/strategist.api';
import {
  ChartBar,
  AddressBook,
  ListChecks,
  ChartLineUp,
  Lifebuoy,
  House,
  Upload,
  FileText,
  CreditCard,
  ShieldCheck,
} from '@phosphor-icons/react';

const navItems = [
  { href: '/strategist/home', label: 'Home', icon: House },
  { href: '/strategist/clients', label: 'Clients', icon: AddressBook },
  { href: '/strategist/compliance', label: 'Compliance', icon: ShieldCheck },
  // { href: '/strategist/agreements', label: 'Agreements', icon: FileText },
  { href: '/strategist/documents', label: 'Documents', icon: Upload },
  // { href: '/strategist/payments', label: 'Payments', icon: CreditCard },
  // { href: 'https://support.ariex.com', label: 'Support', icon: Lifebuoy },
];

export default function StrategistLayout({ children }: { children: React.ReactNode }) {
  useRoleRedirect(['STRATEGIST', 'COMPLIANCE', 'ADMIN']);
  
  const pathname = usePathname();
  const router = useRouter();
  const [isCheckingIntegration, setIsCheckingIntegration] = useState(true);
  const [hasIntegration, setHasIntegration] = useState<boolean | null>(null);

  // Check for payment integration on mount
  useEffect(() => {
    async function checkIntegration() {
      // Skip check if already on onboarding page
      if (pathname === '/strategist/onboarding') {
        setIsCheckingIntegration(false);
        return;
      }

      try {
        const integration = await getPaymentIntegration();
        setHasIntegration(!!integration);
        
        // If no integration, redirect to onboarding
        if (!integration) {
          router.push('/strategist/onboarding');
        }
      } catch (error) {
        console.error('Failed to check payment integration:', error);
        // On error, assume no integration and redirect
        setHasIntegration(false);
        router.push('/strategist/onboarding');
      } finally {
        setIsCheckingIntegration(false);
      }
    }

    checkIntegration();
  }, [pathname, router]);

  // Show loading while checking integration
  if (isCheckingIntegration) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="flex items-center gap-2 text-zinc-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
          {/* <span className="text-sm">Loading...</span> */}
        </div>
      </div>
    );
  }

  // If on onboarding page, render without AppLayout
  if (pathname === '/strategist/onboarding') {
    return <>{children}</>;
  }

  // If no integration and not on onboarding, don't render (redirect will happen)
  if (!hasIntegration && pathname !== '/strategist/onboarding') {
    return null;
  }

  return <AppLayout navItems={navItems}>{children}</AppLayout>;
}
