/**
 * Activity Models
 *
 * Type definitions for client activity timeline
 */

export type ActivityType =
  | 'account_created'
  | 'agreement_sent'
  | 'agreement_signed'
  | 'payment_completed'
  | 'document_uploaded'
  | 'document_requested'
  | 'strategy_sent'
  | 'strategy_signed'
  | 'note_added';

export interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Group activities by date label (Today, Yesterday, Earlier)
 */
export interface ActivityGroup {
  label: 'Today' | 'Yesterday' | 'Earlier';
  activities: Activity[];
}

/**
 * Helper to group activities by date
 */
export function groupActivitiesByDate(activities: Activity[]): ActivityGroup[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: ActivityGroup[] = [];

  const todayActivities = activities.filter(a => {
    const activityDate = new Date(a.timestamp);
    activityDate.setHours(0, 0, 0, 0);
    return activityDate.getTime() === today.getTime();
  });

  const yesterdayActivities = activities.filter(a => {
    const activityDate = new Date(a.timestamp);
    activityDate.setHours(0, 0, 0, 0);
    return activityDate.getTime() === yesterday.getTime();
  });

  const olderActivities = activities.filter(a => {
    const activityDate = new Date(a.timestamp);
    activityDate.setHours(0, 0, 0, 0);
    return activityDate.getTime() < yesterday.getTime();
  });

  if (todayActivities.length > 0) {
    groups.push({ label: 'Today', activities: todayActivities });
  }
  if (yesterdayActivities.length > 0) {
    groups.push({ label: 'Yesterday', activities: yesterdayActivities });
  }
  if (olderActivities.length > 0) {
    groups.push({ label: 'Earlier', activities: olderActivities });
  }

  return groups;
}
