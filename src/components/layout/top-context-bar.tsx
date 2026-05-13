'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { CaretRight } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { useClientDetailStore } from '@/contexts/strategist-contexts/client-management/ClientDetailStore';
import { SidebarToggle } from './sidebar-toggle';

const SEGMENT_LABELS: Record<string, string> = {
  strategist: 'Strategist',
  client: 'Client',
  compliance: 'Compliance',
  home: 'Home',
  clients: 'Clients',
  strategists: 'Strategists',
  billing: 'Billing',
  payments: 'Payments',
  agreements: 'Agreements',
  documents: 'Documents',
  onboarding: 'Onboarding',
  scenarios: 'Scenarios',
};

interface Crumb {
  href: string;
  label: string;
  isLast: boolean;
}

function isLikelyId(segment: string): boolean {
  // UUIDs, cuid-like, or long hex/alphanumeric strings — never human-readable nav labels
  if (segment.length >= 16) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(segment)) return true;
  if (/^c[a-z0-9]{20,}$/i.test(segment)) return true;
  return false;
}

function humanize(segment: string): string {
  return segment
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Routes that ship their own top chrome (back button / fixed breadcrumb / hero header).
// We suppress the context bar there to avoid double headers.
const SUPPRESS_ON_PATTERNS: RegExp[] = [
  /^\/strategist\/clients\/[^/]+$/,
  /^\/strategist\/scenarios\/[^/]+$/,
  /^\/compliance\/clients\/[^/]+$/,
  /^\/compliance\/strategists\/[^/]+$/,
];

export function TopContextBar() {
  const pathname = usePathname();
  const clientInfo = useClientDetailStore(s => s.clientInfo);

  const suppressed = SUPPRESS_ON_PATTERNS.some(re => re.test(pathname));

  const crumbs = useMemo<Crumb[]>(() => {
    const segments = pathname.split('/').filter(Boolean);

    return segments.map((seg, idx) => {
      const href = '/' + segments.slice(0, idx + 1).join('/');
      const prevSeg = segments[idx - 1];
      const isLast = idx === segments.length - 1;

      let label: string;
      if (isLikelyId(seg)) {
        const isClientDetail = prevSeg === 'clients';
        const isStrategistDetail = prevSeg === 'strategists';
        if (isClientDetail) {
          label = clientInfo?.user.name || clientInfo?.user.email || 'Client';
        } else if (isStrategistDetail) {
          label = 'Strategist';
        } else {
          label = humanize(seg).slice(0, 16);
        }
      } else {
        label = SEGMENT_LABELS[seg] ?? humanize(seg);
      }

      return { href, label, isLast };
    });
  }, [pathname, clientInfo]);

  if (crumbs.length === 0) return null;

  // On routes that own their top chrome, render just an absolute-positioned
  // sidebar toggle to preserve the prior layout without doubling the header.
  if (suppressed) {
    return (
      <div className="absolute top-4 left-4 z-10 hidden md:block">
        <SidebarToggle />
      </div>
    );
  }

  return (
    <header
      className="sticky top-0 z-20 flex h-11 shrink-0 items-center justify-between gap-3 border-b border-white/8 bg-deep-navy/95 px-3 backdrop-blur-sm"
      aria-label="Page context"
    >
      <div className="flex items-center gap-3">
        <SidebarToggle />
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5">
          <ol className="flex items-center gap-1.5 text-xs">
            {crumbs.map((c, i) => (
              <li key={c.href} className="flex items-center gap-1.5">
                {i > 0 && (
                  <CaretRight
                    weight="bold"
                    aria-hidden="true"
                    className="h-3 w-3 text-steel-gray/40"
                  />
                )}
                {c.isLast ? (
                  <span
                    aria-current="page"
                    className="max-w-[280px] truncate font-medium text-soft-white"
                  >
                    {c.label}
                  </span>
                ) : (
                  <Link
                    href={c.href}
                    className={cn(
                      'max-w-[180px] truncate text-steel-gray transition-colors duration-150 ease-linear hover:text-soft-white'
                    )}
                  >
                    {c.label}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>
      <div className="flex items-center gap-2" />
    </header>
  );
}
