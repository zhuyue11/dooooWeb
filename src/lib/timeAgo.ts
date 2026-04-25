import type { TFunction } from 'i18next';

export function formatTimeAgo(dateString: string, t: TFunction): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) return t('notifications.timeAgo.monthsAgo', { count: months });
  if (weeks > 0) return t('notifications.timeAgo.weeksAgo', { count: weeks });
  if (days > 0) return t('notifications.timeAgo.daysAgo', { count: days });
  if (hours > 0) return t('notifications.timeAgo.hoursAgo', { count: hours });
  if (minutes > 0) return t('notifications.timeAgo.minutesAgo', { count: minutes });
  return t('notifications.timeAgo.justNow');
}
