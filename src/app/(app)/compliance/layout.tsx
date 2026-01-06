'use client';

import { useRoleRedirect } from '@/hooks/use-role-redirect';
import AppLayout from '@/components/layout/app-layout';
import { Users, Gear } from '@phosphor-icons/react';

const navItems = [
  { href: '/compliance/strategists', label: 'My Strategists', icon: Users },
  { href: '/compliance/settings', label: 'Support', icon: Gear },
];

export default function ComplianceLayout({ children }: { children: React.ReactNode }) {
  useRoleRedirect(['COMPLIANCE', 'ADMIN']);

  return <AppLayout navItems={navItems}>{children}</AppLayout>;
}
