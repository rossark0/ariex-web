'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/auth/AuthStore';
import { useUiStore } from '@/contexts/ui/UiStore';
import { cn } from '@/lib/utils';
import { Buildings, CaretDown, Command, Icon, SignOut, User, Check } from '@phosphor-icons/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

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
  const { user, logout } = useAuth();
  const { isSidebarCollapsed } = useUiStore();
  const isClientRole = user?.role === 'CLIENT';
  const isStrategistRole = user?.role === 'STRATEGIST';
  const isComplianceRole = user?.role === 'COMPLIANCE';
  const [selectedYear, setSelectedYear] = useState(2025);

  const availableYears = [2025, 2024, 2023, 2022];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (isSidebarCollapsed) {
    return null;
  }

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className='flex pl-2 items-center gap-2 mb-8'>
        <span className="font-mono text-sm font-medium text-zinc-500 uppercase">ARIEX AI</span>
      </div>

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
        {!isClientRole && (
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
        )}

        {/* Free Trial Badge */}
        {!isClientRole && (
          <button className="w-full rounded-md border border-zinc-200 py-0.5 text-xs font-medium tracking-wide text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700">
            {isStrategistRole ? 'TAX STRATEGIST' : isComplianceRole ? 'COMPLIANCE' : 'ADMIN'}
          </button>
        )}

        {/* Year Selector for Clients */}
        {isClientRole && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="w-full cursor-pointer rounded-md border border-emerald-200 py-0.5 text-xs font-medium tracking-wide text-emerald-700 transition-colors duration-500 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900">
                {selectedYear} TAX YEAR
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-36 px-0.5 py-1" align="start" side="top">
              <div className="flex flex-col">
                {availableYears.map(year => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={cn(
                      'flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors',
                      selectedYear === year
                        ? 'bg-zinc-100 text-zinc-900'
                        : 'text-zinc-600 hover:bg-zinc-50'
                    )}
                  >
                    {year}
                    {selectedYear === year && (
                      <Check weight="bold" className="h-3.5 w-3.5 text-teal-600" />
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* User Profile */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex w-full cursor-pointer items-center gap-3 rounded-lg p-1 transition-colors hover:bg-zinc-50">
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
          <PopoverContent className="w-56 p-0.5" align="start" side="top">
            <div className="flex flex-col">
              {/* User Info */}
              <div className="flex items-center gap-3 rounded-md px-2 py-2">
                <div className="relative h-8 w-8 overflow-hidden rounded-md bg-zinc-200">
                  <div className="flex h-full w-full items-center justify-center text-xs font-medium text-zinc-600">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">{user?.name || 'User'}</p>
                  <p className="text-xs text-zinc-500">{user?.email || ''}</p>
                </div>
              </div>

              <div className="mb-2 px-2">
                {/* Sign Out */}
                <button
                  onClick={handleLogout}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-zinc-100 py-1.5 text-xs font-semibold text-zinc-500 transition-colors"
                >
                  <SignOut weight="bold" className="h-3.5 w-3.5 text-zinc-500" />
                  Sign out
                </button>
              </div>

              <div className="mx-2 h-px bg-zinc-200" />

              <button className="mt-2 flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100">
                <div className="flex items-center gap-2">
                  <Command weight="bold" className="h-4 w-4 text-zinc-400" />
                  Settings
                </div>
                <span className="text-xs text-zinc-400">⌘,</span>
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
