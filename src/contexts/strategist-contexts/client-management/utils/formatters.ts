import type { ApiDocument } from '@/lib/api/strategist.api';

/**
 * Format a number as USD currency
 * @param amount - The amount to format, or null
 * @returns Formatted currency string or '—' if null
 */
export function formatCurrency(amount: number | null): string {
  if (amount === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a date as "Mon DD, YYYY"
 * @param date - The date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get initials from a name (max 2 characters)
 * @param name - Full name or null
 * @returns Two-letter initials or '??'
 */
export function getInitials(name: string | null): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Format a date as relative time (e.g., "2 days ago", "Yesterday", or time for today)
 * @param date - The date to format
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Handle future dates or same day
  if (diffDays < 0) {
    // Future date - just show the date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

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

/**
 * Group documents by date (Today, Yesterday, Earlier)
 * @param documents - Array of documents to group
 * @returns Array of groups with labels and documents
 */
export function groupDocumentsByDate(documents: ApiDocument[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; documents: ApiDocument[] }[] = [];

  const todayDocs = documents.filter(d => {
    const docDate = new Date(d.createdAt);
    docDate.setHours(0, 0, 0, 0);
    return docDate.getTime() === today.getTime();
  });

  const yesterdayDocs = documents.filter(d => {
    const docDate = new Date(d.createdAt);
    docDate.setHours(0, 0, 0, 0);
    return docDate.getTime() === yesterday.getTime();
  });

  const olderDocs = documents.filter(d => {
    const docDate = new Date(d.createdAt);
    docDate.setHours(0, 0, 0, 0);
    return docDate.getTime() < yesterday.getTime();
  });

  if (todayDocs.length > 0) {
    groups.push({ label: 'Today', documents: todayDocs });
  }
  if (yesterdayDocs.length > 0) {
    groups.push({ label: 'Yesterday', documents: yesterdayDocs });
  }
  if (olderDocs.length > 0) {
    groups.push({ label: 'Earlier', documents: olderDocs });
  }

  return groups;
}
