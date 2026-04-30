import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { useDisplay } from '@/lib/contexts/display-context';
import { formatFullDate, formatTime, formatReminder, formatDuration, formatCompletionTime, formatRepeatDisplay, formatTimeRange, isTaskTimeInPast } from '@/utils/date';
import type { TimeFormat } from '@/utils/date';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';

interface ItemDetailCardProps {
  // Data
  date: string | null;
  hasTime: boolean;
  duration?: number | null;
  endDate?: string | null;
  dateType?: 'SCHEDULED' | 'DUE';
  timeOfDay?: string | null;
  timeZone?: string | null;
  repeat?: unknown;
  firstReminderMinutes?: number | null;
  secondReminderMinutes?: number | null;
  location?: string | null;
  guests?: Array<{ email: string; name?: string }> | null;
  meetingLink?: string | null;
  createdAt?: string | null;
  isCompleted?: boolean;
  completedAt?: string | null;
  activityEnded?: boolean;
  organizerName?: string | null;
  isForAllMembers?: boolean;
  priority?: string | null;
  // Theming — CSS variable names for border/separator/label/value colors
  borderColor?: string;
  separatorColor?: string;
  labelColor?: string;
  valueColor?: string;
  // Size
  iconSize?: number;
  textClass?: string;
}

const TIME_OF_DAY_META: Record<string, { icon: string; i18nKey: string }> = {
  MORNING: { icon: 'wb_sunny', i18nKey: 'tasks.timeOfDay.morning' },
  AFTERNOON: { icon: 'wb_cloudy', i18nKey: 'tasks.timeOfDay.afternoon' },
  EVENING: { icon: 'nightlight', i18nKey: 'tasks.timeOfDay.evening' },
};

function Row({ icon, label, value, iconSize, labelColor, valueColor, textClass }: {
  icon: string; label: string; value: string;
  iconSize: number; labelColor: string; valueColor: string; textClass: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon name={icon} size={iconSize} color={`var(${labelColor})`} />
      <span className={`w-20 shrink-0 ${textClass}`} style={{ color: `var(${labelColor})` }}>{label}</span>
      <span className={`${textClass} font-medium`} style={{ color: `var(${valueColor})` }}>{value}</span>
    </div>
  );
}

function Separator({ color }: { color: string }) {
  return <div className="mx-4 border-t" style={{ borderColor: `var(${color})` }} />;
}

export function ItemDetailCard({
  date, hasTime, duration, endDate, dateType, timeOfDay, timeZone,
  repeat, firstReminderMinutes, secondReminderMinutes,
  location, guests, meetingLink, createdAt,
  isCompleted, completedAt, activityEnded, organizerName, isForAllMembers,
  priority,
  borderColor = '--el-panel-border',
  separatorColor = '--el-panel-separator',
  labelColor = '--el-panel-detail-label',
  valueColor = '--el-panel-detail-value',
  iconSize = 18,
  textClass = 'text-[13px]',
}: ItemDetailCardProps) {
  const { t } = useTranslation();
  const { timeFormat } = useDisplay();

  // Date display with dateType prefix
  const datePrefix = dateType === 'DUE' ? `${t('itemView.due')} · ` : '';
  const dateDisplay = (() => {
    if (!date) return null;
    const startStr = formatFullDate(new Date(date));
    if (endDate && endDate.slice(0, 10) !== date.slice(0, 10)) {
      const endStr = formatFullDate(new Date(endDate));
      return `${datePrefix}${startStr} — ${endStr}`;
    }
    return `${datePrefix}${startStr}`;
  })();

  // Time display (includes date when crossing midnight)
  const timeDisplay = (() => {
    if (!hasTime || !date) return null;
    if (duration) {
      return formatTimeRange(date, duration, timeFormat as TimeFormat);
    }
    return formatTime(date, timeFormat as TimeFormat);
  })();

  const timeOfDayDisplay = !hasTime && timeOfDay ? timeOfDay : null;

  // Timezone display
  const deviceTz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : null;
  const tzDisplay = hasTime && timeZone && timeZone !== deviceTz
    ? (() => {
        try {
          const parts = new Intl.DateTimeFormat(i18n.language, { timeZone, timeZoneName: 'long' }).formatToParts(new Date());
          return parts.find(p => p.type === 'timeZoneName')?.value || timeZone;
        } catch { return timeZone; }
      })()
    : null;

  const repeatDisplay = formatRepeatDisplay(repeat, t);
  const durationDisplay = formatDuration(duration ?? null, t);

  // Hide reminders for past/completed
  const taskTimePast = isTaskTimeInPast(date, hasTime);
  const showReminders = !isCompleted && !taskTimePast;
  const reminderDisplay = showReminders ? formatReminder(firstReminderMinutes) : null;
  const secondReminderDisplay = showReminders ? formatReminder(secondReminderMinutes) : null;

  const completionDisplay = isCompleted ? formatCompletionTime(completedAt, isForAllMembers, t) : null;
  const guestsDisplay = guests && guests.length > 0 ? guests : null;

  const rowProps = { iconSize, labelColor, valueColor, textClass };

  // Build rows array — separators are inserted between items, never before the first
  const rows: React.ReactNode[] = [];

  if (dateDisplay) rows.push(<Row key="date" icon="calendar_today" label={t('itemView.date')} value={dateDisplay} {...rowProps} />);
  if (timeDisplay) rows.push(<Row key="time" icon="schedule" label={t('itemView.time')} value={timeDisplay} {...rowProps} />);
  if (timeOfDayDisplay && TIME_OF_DAY_META[timeOfDayDisplay]) {
    rows.push(<Row key="tod" icon={TIME_OF_DAY_META[timeOfDayDisplay].icon} label={t('itemView.time')} value={t(TIME_OF_DAY_META[timeOfDayDisplay].i18nKey)} {...rowProps} />);
  }
  if (durationDisplay) rows.push(<Row key="dur" icon="timer" label={t('itemView.duration')} value={durationDisplay} {...rowProps} />);
  if (reminderDisplay) rows.push(<Row key="rem1" icon="notifications" label={t('itemView.reminder')} value={reminderDisplay} {...rowProps} />);
  if (secondReminderDisplay) rows.push(<Row key="rem2" icon="notifications" label={t('itemView.reminder')} value={secondReminderDisplay} {...rowProps} />);
  if (completionDisplay) rows.push(<Row key="comp" icon="check_circle" label={t('itemView.completedAt')} value={completionDisplay} {...rowProps} />);
  if (activityEnded) {
    rows.push(
      <div key="ended" className="flex items-center gap-3 px-4 py-3">
        <Icon name="event_busy" size={iconSize} color="var(--el-dialog-confirm-bg)" />
        <span className={`${textClass} font-medium`} style={{ color: 'var(--el-dialog-confirm-bg)' }}>{t('itemView.activityEnded')}</span>
      </div>,
    );
  }
  if (location) {
    rows.push(
      <div key="loc" className="flex items-center gap-3 px-4 py-3">
        <Icon name="location_on" size={iconSize} color={`var(${labelColor})`} />
        <span className={`w-20 shrink-0 ${textClass}`} style={{ color: `var(${labelColor})` }}>{t('itemView.location')}</span>
        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`} target="_blank" rel="noopener noreferrer" className={`truncate ${textClass} font-medium hover:underline`} style={{ color: `var(${valueColor})` }}>{location}</a>
      </div>,
    );
  }
  if (guestsDisplay) {
    rows.push(
      <div key="guests" className="flex items-start gap-3 px-4 py-3">
        <Icon name="group" size={iconSize} color={`var(${labelColor})`} className="mt-0.5" />
        <div className="flex-1">
          <span className={textClass} style={{ color: `var(${labelColor})` }}>{t('itemView.guests')}</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {guestsDisplay.map((g) => (
              <span key={g.email} className="inline-flex items-center rounded-(--radius-btn) bg-(--el-panel-guest-bg) px-(--spacing-btn-x-sm) py-0.5 text-xs font-medium text-(--el-panel-guest-text)">{g.email}</span>
            ))}
          </div>
        </div>
      </div>,
    );
  }
  if (meetingLink) {
    rows.push(
      <div key="meet" className="flex items-center gap-3 px-4 py-3">
        <Icon name="videocam" size={iconSize} color={`var(${labelColor})`} />
        <span className={`w-20 shrink-0 ${textClass}`} style={{ color: `var(${labelColor})` }}>{t('itemView.meetingLink')}</span>
        <a href={meetingLink} target="_blank" rel="noopener noreferrer" className={`truncate ${textClass} font-medium hover:underline`} style={{ color: `var(${valueColor})` }}>{meetingLink}</a>
      </div>,
    );
  }
  if (tzDisplay) rows.push(<Row key="tz" icon="public" label={t('itemView.timeZone')} value={tzDisplay} {...rowProps} />);
  if (priority) rows.push(<Row key="pri" icon="flag" label={t('itemView.priority')} value={t(`tasks.priorities.${priority.toLowerCase()}`)} {...rowProps} />);
  if (repeatDisplay) rows.push(<Row key="rep" icon="repeat" label={t('itemView.repeat')} value={repeatDisplay} {...rowProps} />);
  if (organizerName) rows.push(<Row key="org" icon="person" label={t('itemView.organizer')} value={organizerName} {...rowProps} />);
  if (createdAt) {
    rows.push(<Row key="created" icon="event_available" label={t('itemView.createdAt')} value={new Date(createdAt).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })} {...rowProps} />);
  }

  if (rows.length === 0) return null;

  return (
    <div className="rounded-(--radius-card) border" style={{ borderColor: `var(${borderColor})` }}>
      {rows.map((row, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Separator color={separatorColor} />}
          {row}
        </React.Fragment>
      ))}
    </div>
  );
}
