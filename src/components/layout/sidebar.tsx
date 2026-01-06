'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Icon, Command, User, Buildings, CaretDown, SignOut } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth/AuthStore';
import { useUiStore } from '@/contexts/ui/UiStore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface SidebarItem {
  href: string;
  label: string;
  icon: Icon;
}

interface SidebarProps {
  items: SidebarItem[];
  className?: string;
}

export default function Sidebar({ items, className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuth(state => state.user);
  const logout = useAuth(state => state.logout);
  const { isSidebarCollapsed } = useUiStore();
  const isClientRole = user?.role === 'CLIENT';
  const isStrategistRole = user?.role === 'STRATEGIST';
  const isComplianceRole = user?.role === 'COMPLIANCE';

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (isSidebarCollapsed) {
    return null;
  }

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Navigation Items */}
      <nav className="flex flex-col gap-1">
        {items.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-2 py-1 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
              )}
            >
              <Icon weight="fill" className={cn('h-4 w-4 text-zinc-500')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="mt-auto flex flex-col gap-3">
        {/* Icon Buttons */}
        <div className="flex items-center gap-2">
          <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200">
            <Command weight="bold" className="h-4 w-4" />
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-600">
            <User weight="fill" className="h-4 w-4" />
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-600">
            <Buildings weight="fill" className="h-4 w-4" />
          </button>
        </div>

        {/* Free Trial Badge */}
        <button className="w-full rounded-md border border-zinc-200 py-0.5 text-xs font-medium tracking-wide text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700">
          {isClientRole
            ? 'CLIENT'
            : isStrategistRole
              ? 'TAX STRATEGIST'
              : isComplianceRole
                ? 'COMPLIANCE'
                : 'ADMIN'}
        </button>

        {/* User Profile */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-1 transition-colors hover:bg-zinc-50">
              <div className="relative h-8 w-8 overflow-hidden rounded-md bg-zinc-200">
                <div className="flex h-full w-full items-center justify-center text-xs font-medium text-zinc-600">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              </div>
              <span className="flex-1 truncate text-left text-sm font-medium text-zinc-900">
                {user?.name || 'User'}
              </span>
              <CaretDown weight="bold" className="h-3 w-3 text-zinc-400" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="end" side="top">
            <div className="flex flex-col gap-1">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-zinc-900">{user?.name || 'User'}</p>
                <p className="text-xs text-zinc-500">{user?.email || ''}</p>
              </div>
              <div className="h-px bg-zinc-200" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                <SignOut weight="bold" className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
