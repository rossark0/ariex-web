'use client';

import { useRouter } from 'next/navigation';
import { User } from '@phosphor-icons/react';
import { FullClientMock } from '@/lib/mocks/client-full';
import { getClientStatus } from '@/lib/client-status';
import { getInitials, getClientDescription } from '../utils';

interface ClientItemProps {
  client: FullClientMock;
  basePath?: string;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // If today, show time
  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  // If yesterday
  if (diffDays === 1) {
    return 'Yesterday';
  }

  // If within a week
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  // Otherwise show date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function ClientItem({ client, basePath = '/compliance/clients' }: ClientItemProps) {
  const router = useRouter();
  const status = getClientStatus(client);

  return (
    <div className="group relative">
      {/* Client Row - clickable area */}
      <div
        onClick={() => router.push(`${basePath}/${client.user.id}`)}
        className="flex cursor-pointer items-center gap-4 rounded-none py-4 transition-colors hover:bg-zinc-50"
      >
        {/* Client Avatar */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
          <User className="h-5 w-5 text-zinc-400" />
        </div>

        {/* Client Info */}
        <div className="flex flex-1 flex-col">
          <span className="font-medium text-zinc-900">{client.user.name}</span>
          <span className="text-sm text-zinc-500">{getClientDescription(client)}</span>
        </div>

        {/* Status Badge */}
        <div className="flex flex-col items-end gap-1">
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.textClassName}`}
          >
            <div className={`h-1.5 w-1.5 rounded-full ${status.badgeColor}`} />
            {status.label.split(' ')[0]}
          </span>
          <span className="text-xs text-zinc-400">
            {formatRelativeTime(client.user.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
