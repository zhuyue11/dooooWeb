import type { Repeat } from '@/types/api';
import type { TFunction } from 'i18next';

const JS_TO_SHORT_KEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export function getRepeatDisplayText(
  repeat: Repeat,
  selectedDate: Date | null,
  t: TFunction,
): string {
  const interval = repeat.interval || 1;

  if (repeat.type === 'daily') {
    if (interval === 1) return t('tasks.input.everyDay');
    return t('tasks.input.everyInterval', { interval, period: t('tasks.input.repeatPicker.days') });
  }

  if (repeat.type === 'weekly') {
    if (repeat.weekdays && repeat.weekdays.length > 0) {
      const dayNames = repeat.weekdays
        .sort((a, b) => a - b)
        .map((d) => t(`tasks.input.weekdays.${JS_TO_SHORT_KEY[d]}`))
        .join(', ');
      if (interval === 1) return t('tasks.input.everyWeekOn', { days: dayNames });
      return t('tasks.input.everyIntervalOn', { interval, period: t('tasks.input.repeatPicker.weeks'), days: dayNames });
    }
    if (interval === 1) return t('tasks.input.everyWeek');
    return t('tasks.input.everyInterval', { interval, period: t('tasks.input.repeatPicker.weeks') });
  }

  if (repeat.type === 'monthly') {
    if (repeat.weekdayPattern) {
      const ordinal = t(`tasks.input.repeatPicker.${repeat.weekdayPattern.week}`);
      const weekday = t(`tasks.input.weekdays.${JS_TO_SHORT_KEY[repeat.weekdayPattern.weekday]}`);
      if (interval === 1) return t('tasks.input.onThe', { ordinal, weekday });
      return t('tasks.input.everyIntervalOnThe', { interval, period: t('tasks.input.repeatPicker.months'), ordinal, weekday });
    }
    const dateNum = selectedDate?.getDate() || 1;
    if (interval === 1) return t('tasks.input.everyMonthOnThe', { date: dateNum });
    return t('tasks.input.everyInterval', { interval, period: t('tasks.input.repeatPicker.months') });
  }

  if (repeat.type === 'yearly') {
    if (interval === 1) return t('tasks.input.everyYear');
    return t('tasks.input.everyInterval', { interval, period: t('tasks.input.repeatPicker.years') });
  }

  // Custom type
  if (repeat.type === 'custom') {
    return t('tasks.input.everyInterval', { interval, period: t('tasks.input.repeatPicker.days') });
  }

  return t('tasks.input.repeat');
}
