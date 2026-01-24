'use client';

import { ReactNode } from 'react';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import AppLayout from '@/components/layout/app-layout';

export default function AdminLayout({ children }: { children: ReactNode }) {
  useRoleRedirect('ADMIN');
  
  return children;
}
