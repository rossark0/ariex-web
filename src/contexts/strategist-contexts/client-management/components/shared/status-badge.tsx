import { CLIENT_STATUS_CONFIG, type ClientStatusKey } from '@/lib/client-status';

interface StatusBadgeProps {
  status: ClientStatusKey;
  className?: string;
}

/**
 * Status badge showing client's current status with color coding
 */
export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = CLIENT_STATUS_CONFIG[status];

  if (!config) {
    return null;
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <div className={`h-2 w-2 rounded-full ${config.badgeColor}`} />
      <span className={`text-sm ${config.badgeClassName}`}>{config.label}</span>
    </span>
  );
}
