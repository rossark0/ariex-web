'use client';

import { useRoleRedirect } from '@/hooks/use-role-redirect';
import AppLayout from '@/components/layout/app-layout';
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
} from '@phosphor-icons/react';

const navItems = [
  { href: '/strategist/home', label: 'Home', icon: House },
  { href: '/strategist/clients', label: 'Clients', icon: AddressBook },
  { href: '/strategist/agreements', label: 'Agreements', icon: FileText },
  // { href: '/strategist/documents', label: 'Documents', icon: Upload },
  // { href: '/strategist/payments', label: 'Payments', icon: CreditCard },
  // { href: 'https://support.ariex.com', label: 'Support', icon: Lifebuoy },
];

export default function StrategistLayout({ children }: { children: React.ReactNode }) {
  useRoleRedirect(['STRATEGIST', 'COMPLIANCE', 'ADMIN']);

  return <AppLayout navItems={navItems}>{children}</AppLayout>;
}
