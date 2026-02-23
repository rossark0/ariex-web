'use client';

import { cn } from '@/lib/utils';
import { ArrowLeft, Robot } from '@phosphor-icons/react';
import Image from 'next/image';

interface ChatHeaderProps {
  title?: string;
  subtitle?: string;
  avatarUrl?: string;
  isOnline?: boolean;
  onBack?: () => void;
  showBackButton?: boolean;
  className?: string;
}

export function ChatHeader({
  title = 'AI Tax Assistant',
  subtitle = 'Always here to help',
  avatarUrl,
  isOnline = true,
  onBack,
  showBackButton = false,
  className,
}: ChatHeaderProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header
      className={cn(
        'flex shrink-0 items-center gap-3 border-b border-zinc-100 px-0 py-3',
        className
      )}
    >
      {showBackButton && (
        <button
          onClick={onBack}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-700"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" weight="bold" />
        </button>
      )}

      {/* Avatar */}
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={title || ''}
          width={32}
          height={32}
          className="h-8 w-8 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-xs font-medium text-white">
          {title.includes(' ') ? getInitials(title) : <Robot weight="fill" className="h-4 w-4" />}
        </div>
      )}

      {/* Title and status */}
      <div className="flex-1">
        <p className="text-base font-medium text-zinc-900">{title}</p>
        <div className="flex items-center gap-1">
          <div className="relative flex h-1.5 w-1.5">
            {isOnline && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={cn(
                'relative inline-flex h-1.5 w-1.5 rounded-full',
                isOnline ? 'bg-emerald-500' : 'bg-zinc-300'
              )}
            />
          </div>
          <span className="text-xs text-zinc-500">{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>
    </header>
  );
}
