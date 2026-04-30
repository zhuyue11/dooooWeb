import { useRef, useEffect } from 'react';
import { getHoursArray, formatHourLabel, formatTime } from '@/utils/date';
import { getCategoryColor, getCategoryName, translateCategoryName } from '@/utils/category';
import { getSegmentForDay } from '@/utils/multiDay';
import { isItemChecked } from '@/hooks/useWeekCalendar';
import type { CalendarItem } from '@/hooks/useWeekCalendar';
import type { Category } from '@/types/api';
import { useDisplay } from '@/lib/contexts/display-context';
import type { TimeFormat } from '@/utils/date';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { layoutOverlaps } from './WeekGrid';
import { stripHtml } from '@/utils/html';

interface DayTimelineProps {
  date: Date;
  items: CalendarItem[];
  categories?: Category[];
  onItemClick?: (item: CalendarItem) => void;
  isLoading: boolean;
  hideGroupTag?: boolean;
}

const HOUR_HEIGHT = 60; // px per hour row
const TIME_OF_DAY_SECTIONS = [
  { key: 'MORNING' as const, icon: 'wb_sunny', i18nKey: 'tasks.timeOfDay.morning' },
  { key: 'AFTERNOON' as const, icon: 'wb_cloudy', i18nKey: 'tasks.timeOfDay.afternoon' },
  { key: 'EVENING' as const, icon: 'nightlight', i18nKey: 'tasks.timeOfDay.evening' },
] as const;

export function DayTimeline({ date, items, categories, onItemClick, isLoading, hideGroupTag }: DayTimelineProps) {
  const { t } = useTranslation();
  const { timeFormat } = useDisplay();
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentHour = new Date().getHours();
  const hours = getHoursArray();

  // Auto-scroll to current time after loading completes
  useEffect(() => {
    if (!isLoading && scrollRef.current) {
      const now = new Date();
      const scrollTo = Math.max(0, (now.getHours() + now.getMinutes() / 60 - 1)) * HOUR_HEIGHT;
      scrollRef.current.scrollTop = scrollTo;
    }
  }, [isLoading, date]);

  // Timed items for absolute positioning
  const timedItems = items.filter((item) => item.hasTime);
  const DAY_MAX_COLS = 5;

  // Untimed items grouped by time of day
  const untimedItems = items.filter((item) => !item.hasTime);
  const noTimeOfDayItems = untimedItems.filter((item) => !item.timeOfDay);
  const itemsByTimeOfDay = {
    MORNING: untimedItems.filter((item) => item.timeOfDay === 'MORNING'),
    AFTERNOON: untimedItems.filter((item) => item.timeOfDay === 'AFTERNOON'),
    EVENING: untimedItems.filter((item) => item.timeOfDay === 'EVENING'),
  };

  return (
    <div
      data-testid="calendar-day-timeline"
      className="flex min-h-[400px] flex-1 flex-col overflow-hidden rounded-(--radius-card) bg-(--el-cal-grid-bg) shadow-(--shadow-card) lg:min-h-0"
    >
      {/* Untimed items — no time-of-day */}
      {noTimeOfDayItems.length > 0 && (
        <div className="flex border-b border-(--el-cal-grid-border)" style={{ maxHeight: 120 }}>
          <div className="flex w-[60px] flex-shrink-0 items-start px-4 pt-2" />
          <div className="flex flex-1 flex-col gap-1 overflow-y-auto py-1 pr-4">
            {noTimeOfDayItems.map((item) => {
              const colors = item.itemType === 'EVENT'
                ? { bg: 'var(--el-cal-event-bg)', text: 'var(--el-cal-event-text)' }
                : getCategoryColor(item.categoryId, categories);
              return (
                <div
                  key={item.id}
                  data-testid={`day-task-${item.id}`}
                  className={`rounded-(--radius-btn) px-(--spacing-btn-x-sm) py-1 ${onItemClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                  style={{ backgroundColor: colors.bg }}
                  onClick={() => onItemClick?.(item)}
                >
                  <span className="text-xs font-medium" style={{ color: colors.text }}>{item.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Time-of-day sections (Morning / Afternoon / Evening) */}
      {TIME_OF_DAY_SECTIONS.map((section) => {
        const sectionItems = itemsByTimeOfDay[section.key];
        if (sectionItems.length === 0) return null;
        return (
          <div key={section.key} className="flex border-b border-(--el-cal-grid-border)" style={{ maxHeight: 120 }}>
            <div className="flex w-[60px] flex-shrink-0 items-start px-4 pt-2">
              <span className="text-xs font-medium text-(--el-cal-hour-label)">
                <Icon name={section.icon} size={14} />
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-1 overflow-y-auto py-1 pr-4">
              {sectionItems.map((item) => {
                const colors = item.itemType === 'EVENT'
                  ? { bg: 'var(--el-cal-event-bg)', text: 'var(--el-cal-event-text)' }
                  : getCategoryColor(item.categoryId, categories);
                return (
                  <div
                    key={item.id}
                    data-testid={`day-task-${item.id}`}
                    className={`rounded-(--radius-btn) px-(--spacing-btn-x-sm) py-1 ${onItemClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                    style={{ backgroundColor: colors.bg }}
                    onClick={() => onItemClick?.(item)}
                  >
                    <span className="text-xs font-medium" style={{ color: colors.text }}>{item.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Hour grid — fixed rows with absolutely positioned items */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-(--el-cal-hour-label)">{t('common.loading')}</div>
        ) : (
          <div className="relative flex">
            {/* Hour labels column */}
            <div className="flex-shrink-0" style={{ width: 60 }}>
              {hours.map((hour) => {
                const isCurrentHour = hour === currentHour;
                return (
                  <div key={hour} className="flex items-start justify-start px-4 pt-2" style={{ height: HOUR_HEIGHT }}>
                    <span className={`text-xs font-medium ${isCurrentHour ? 'text-(--el-cal-hour-label-current) font-semibold' : 'text-(--el-cal-hour-label)'}`}>
                      {formatHourLabel(hour, timeFormat)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Timeline column with hour row backgrounds + absolutely positioned items */}
            <div className="relative flex-1">
              {/* Hour row backgrounds */}
              {hours.map((hour) => {
                const isCurrentHour = hour === currentHour;
                return (
                  <div
                    key={hour}
                    data-testid={`hour-row-${hour}`}
                    className={`border-b border-(--el-cal-grid-border)/50 ${isCurrentHour ? 'bg-(--el-cal-current-hour-bg)' : ''}`}
                    style={{ height: HOUR_HEIGHT }}
                  />
                );
              })}

              {/* Absolutely positioned timed items */}
              {(() => {
                const layout = layoutOverlaps(timedItems, DAY_MAX_COLS, date);
                return timedItems.filter((item) => !layout.get(item.id)?.hidden).map((item) => {
                  // For multi-day items, clip start/duration to this day's visible segment
                  const segment = getSegmentForDay(item.date, item.duration || 60, date);
                  const startHour = segment.visibleStart.getHours();
                  const startMinute = segment.visibleStart.getMinutes();
                  const top = (startHour + startMinute / 60) * HOUR_HEIGHT;
                  const height = Math.max(24, (segment.visibleMinutes / 60) * HOUR_HEIGHT);
                  const colors = item.itemType === 'EVENT'
                    ? { bg: 'var(--el-cal-event-bg)', text: 'var(--el-cal-event-text)' }
                    : getCategoryColor(item.categoryId, categories);
                  const info = layout.get(item.id)!;
                  const widthPct = `calc(${100 / info.totalColumns}% - 4px)`;
                  const leftPct = `calc(${(info.column / info.totalColumns) * 100}% + 2px)`;

                  const rawCategoryName = getCategoryName(item.categoryId, categories);
                  const categoryName = rawCategoryName ? translateCategoryName(rawCategoryName, t) : undefined;
                  const startTime = formatTime(item.date, timeFormat as TimeFormat);
                  let endTime = '';
                  if (item.duration) {
                    const end = new Date(new Date(item.date).getTime() + item.duration * 60000);
                    endTime = formatTime(end.toISOString(), timeFormat as TimeFormat);
                  }
                  const metaParts = [endTime ? `${startTime} – ${endTime}` : startTime];
                  if (categoryName) metaParts.push(categoryName);
                  if (item.priority) metaParts.push(t(`tasks.priorities.${item.priority.toLowerCase()}`));
                  const isHighPriority = item.priority === 'high' || item.priority === 'HIGH' || item.priority === 'urgent' || item.priority === 'URGENT';

                  return (
                    <div
                      key={item.id}
                      data-testid={`day-task-${item.id}`}
                      className={`absolute cursor-pointer overflow-hidden transition-opacity hover:opacity-80 ${isItemChecked(item) ? 'opacity-60' : ''}`}
                      style={{
                        top,
                        height,
                        left: leftPct,
                        width: widthPct,
                        backgroundColor: colors.bg,
                        padding: '4px 8px',
                        zIndex: 1,
                      }}
                      onClick={() => onItemClick?.(item)}
                    >
                      {/* Title + priority flag */}
                      <div className="flex items-center gap-1">
                        {item.itemType === 'EVENT' && <Icon name="calendar_today" size={11} color={colors.text} />}
                        <span
                          className={`truncate text-[12px] font-medium leading-tight ${isItemChecked(item) ? 'line-through' : ''}`}
                          style={{ color: colors.text }}
                        >
                          {item.title}
                        </span>
                        {isHighPriority && <Icon name="flag" size={11} color="var(--el-item-priority-high)" />}
                      </div>
                      {/* Meta line */}
                      <div className="flex items-center gap-1.5 text-[11px] leading-tight" style={{ color: colors.text, opacity: 0.8 }}>
                        <span className="truncate">{metaParts.join(' · ')}</span>
                        {item.description && (
                          <span className="truncate opacity-70">— {stripHtml(item.description)}</span>
                        )}
                      </div>
                      {/* Tags line */}
                      <div className="flex flex-wrap items-center gap-1" style={{ color: colors.text }}>
                        {item.groupId && !hideGroupTag && (
                          <span className="inline-flex items-center gap-px rounded-full border border-(--el-item-group-border) px-1 text-[9px] font-medium text-(--el-item-group-text)">
                            <Icon name="group" size={8} color="var(--el-item-group-text)" />
                            {item.groupName || t('calendarPage.itemRow.group')}
                          </span>
                        )}
                        {item.planName && (
                          <span className="inline-flex items-center gap-px rounded-full border border-(--el-item-plan-border) px-1 text-[9px] font-medium text-(--el-item-plan-text)">
                            {item.planName}
                          </span>
                        )}
                        {item.assigneeName && (
                          <span className="inline-flex items-center gap-px text-[9px] opacity-80">
                            <Icon name="person" size={9} color={colors.text} /> {item.assigneeName}
                          </span>
                        )}
                        {!!item.repeat && <span className="opacity-60"><Icon name="repeat" size={10} color={colors.text} /></span>}
                        {(item.firstReminderMinutes != null || item.secondReminderMinutes != null) && (
                          <span className="opacity-60"><Icon name="notifications" size={10} color={colors.text} /></span>
                        )}
                        {item.isForAllMembers && item.participantSummary && item.participantSummary.goingCount > 0 && (
                          <span className="text-[9px] font-medium opacity-80">
                            {item.trackCompletion !== false
                              ? `${item.participantSummary.completedCount}/${item.participantSummary.goingCount}`
                              : `${item.participantSummary.goingCount}`} {t('calendarPage.itemRow.going').toLowerCase()}
                          </span>
                        )}
                      </div>
                      {info.overflowCount > 0 && (
                        <span className="mt-0.5 block text-[9px] font-medium text-(--el-cal-hour-label)">
                          +{info.overflowCount} more
                        </span>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
