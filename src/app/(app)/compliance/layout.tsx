'use client';

import { useRoleRedirect } from '@/hooks/use-role-redirect';
import AppLayout from '@/components/layout/app-layout';
import { House, Users, Lifebuoy } from '@phosphor-icons/react';

const navItems = [
  // { href: '/compliance/home', label: 'Home', icon: House },
  { href: '/compliance/strategists', label: 'Strategists', icon: Users },
  { href: 'https://support.ariex.com', label: 'Support', icon: Lifebuoy },
];

export default function ComplianceLayout({ children }: { children: React.ReactNode }) {
  useRoleRedirect(['COMPLIANCE', 'ADMIN']);

  return <AppLayout navItems={navItems}>{children}</AppLayout>;
}
