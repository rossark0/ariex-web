import { getInitials } from '../../utils/formatters';

interface ClientAvatarProps {
  name: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-base',
};

/**
 * Client avatar component showing initials
 */
export function ClientAvatar({ name, size = 'md', className = '' }: ClientAvatarProps) {
  const initials = getInitials(name);

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-zinc-800 font-medium text-white ${sizeClasses[size]} ${className}`}
    >
      {initials}
    </div>
  );
}
