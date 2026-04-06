import { useRef, useEffect } from 'react';
import { isSameDay, toISODate, getHoursArray, formatHourLabel, formatTime } from '@/utils/date';
import { getCategoryColor } from '@/utils/category';
import type { CalendarItem } from '@/hooks/useWeekCalendar';
import type { Category } from '@/types/api';
import type { TimeFormat } from '@/utils/date';
import { useDisplay } from '@/lib/contexts/display-context';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';

interface WeekGridProps {
  weekDates: Date[];
  itemsByDate: Map<string, CalendarItem[]>;
  selectedDate: Date | null;
  today: Date;
  categories?: Category[];
  onSelectDate: (date: Date) => void;
  onItemClick?: (item: CalendarItem) => void;
  isLoading: boolean;
}

const SHORT_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const HOUR_HEIGHT = 60; // px per hour row
const HOUR_LABEL_WIDTH = 48; // px for hour label column

export function WeekGrid({ weekDates, itemsByDate, selectedDate, today, categories, onSelectDate, onItemClick, isLoading }: WeekGridProps) {
  const { t } = useTranslation();
  const { timeFormat } = useDisplay();
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentHour = new Date().getHours();
  const hours = getHoursArray();

  // Auto-scroll to 8 AM (or current hour if after 8)
  useEffect(() => {
    if (scrollRef.current) {
      const scrollToHour = Math.max(8, currentHour - 1);
      scrollRef.current.scrollTop = scrollToHour * HOUR_HEIGHT;
    }
  }, [weekDates[0]?.getTime()]); // re-scroll when week changes

  // Pre-process items per date: separate timed vs untimed
  const timedByDate = new Map<string, CalendarItem[]>();
  const untimedByDate = new Map<string, CalendarItem[]>();
  for (const date of weekDates) {
    const key = toISODate(date);
    const items = itemsByDate.get(key) || [];
    timedByDate.set(key, items.filter((item) => item.hasTime));
    untimedByDate.set(key, items.filter((item) => !item.hasTime));
  }

  const hasAnyUntimed = weekDates.some((d) => (untimedByDate.get(toISODate(d))?.length ?? 0) > 0);

  return (
    <div
      data-testid="calendar-week-grid"
      className="flex min-h-[400px] flex-1 flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] lg:min-h-0"
    >
      {/* Day labels + date numbers header */}
      <div className="flex border-b border-border">
        {/* Spacer for hour label column */}
        <div style={{ width: HOUR_LABEL_WIDTH }} className="flex-shrink-0" />
        {/* Day columns header */}
        <div className="grid flex-1 grid-cols-7">
          {weekDates.map((date, i) => {
            const isToday = isSameDay(date, today);
            const isSelected = selectedDate !== null && isSameDay(date, selectedDate);
            return (
              <div key={i} className="flex flex-col items-center py-2">
                <span className={`text-[10px] font-semibold uppercase tracking-wide ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                  <span className="hidden md:inline">{t(`calendarPage.weekdaysShort.${SHORT_DAY_KEYS[i]}`)}</span>
                  <span className="md:hidden">{t(`calendarPage.weekdaysNarrow.${SHORT_DAY_KEYS[i]}`)}</span>
                </span>
                <button
                  onClick={() => onSelectDate(date)}
                  className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : isToday
                        ? 'border-2 border-primary text-primary'
                        : 'text-foreground hover:bg-muted'
                  }`}
                  data-testid={isToday ? 'today-indicator' : undefined}
                >
                  {date.getDate()}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Untimed items row */}
      {hasAnyUntimed && (
        <div className="flex border-b border-border">
          <div style={{ width: HOUR_LABEL_WIDTH }} className="flex-shrink-0" />
          <div className="grid flex-1 grid-cols-7 gap-px py-1">
            {weekDates.map((date, i) => {
              const key = toISODate(date);
              const items = untimedByDate.get(key) || [];
              return (
                <div key={i} className="flex flex-col gap-0.5 px-0.5">
                  {items.map((item) => {
                    const colors = item.itemType === 'EVENT'
                      ? { bg: '#ede9fe', text: '#5b21b6' }
                      : getCategoryColor(item.categoryId, categories);
                    return (
                      <div
                        key={item.id}
                        data-testid={`task-card-${item.id}`}
                        className={`cursor-pointer truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight transition-opacity hover:opacity-80 ${item.isCompleted ? 'opacity-60 line-through' : ''}`}
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                        onClick={() => onItemClick?.(item)}
                      >
                        {item.title}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">{t('common.loading')}</div>
        ) : (
          <div className="relative flex">
            {/* Hour labels column */}
            <div className="flex-shrink-0" style={{ width: HOUR_LABEL_WIDTH }}>
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="flex items-start justify-end pr-2 pt-0"
                  style={{ height: HOUR_HEIGHT }}
                >
                  <span className={`text-[10px] ${hour === currentHour ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                    {formatHourLabel(hour)}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns with hour rows */}
            <div className="grid flex-1 grid-cols-7">
              {weekDates.map((date, i) => {
                const dateKey = toISODate(date);
                const isToday = isSameDay(date, today);
                const timedItems = timedByDate.get(dateKey) || [];

                return (
                  <div
                    key={i}
                    data-testid={`day-column-${dateKey}`}
                    className="relative border-l border-border"
                  >
                    {/* Hour row backgrounds */}
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        data-testid={i === 0 ? `hour-row-${hour}` : undefined}
                        className={`border-b border-border/50 ${
                          isToday && hour === currentHour ? 'bg-[#f0f0ff] dark:bg-[#1a1a2e]' : ''
                        }`}
                        style={{ height: HOUR_HEIGHT }}
                      />
                    ))}

                    {/* Timed items — absolutely positioned */}
                    {timedItems.map((item) => {
                      const itemDate = new Date(item.date);
                      const startHour = itemDate.getHours();
                      const startMinute = itemDate.getMinutes();
                      const top = (startHour + startMinute / 60) * HOUR_HEIGHT;
                      const duration = item.duration || 60;
                      const height = Math.max(24, (duration / 60) * HOUR_HEIGHT);
                      const colors = item.itemType === 'EVENT'
                        ? { bg: '#ede9fe', text: '#5b21b6' }
                        : getCategoryColor(item.categoryId, categories);

                      return (
                        <div
                          key={item.id}
                          data-testid={`task-card-${item.id}`}
                          className={`absolute left-0.5 right-0.5 cursor-pointer overflow-hidden rounded transition-opacity hover:opacity-80 ${item.isCompleted ? 'opacity-60' : ''}`}
                          style={{
                            top,
                            height,
                            backgroundColor: colors.bg,
                            padding: '2px 4px',
                            zIndex: 1,
                          }}
                          onClick={() => onItemClick?.(item)}
                        >
                          <div className="flex items-center gap-0.5">
                            {item.itemType === 'EVENT' && (
                              <Icon name="calendar_today" size={9} color={colors.text} />
                            )}
                            <span
                              className={`truncate text-[10px] font-medium leading-tight ${item.isCompleted ? 'line-through' : ''}`}
                              style={{ color: colors.text }}
                            >
                              {item.title}
                            </span>
                          </div>
                          <span className="text-[9px] leading-tight" style={{ color: colors.text, opacity: 0.8 }}>
                            {formatTime(item.date, timeFormat as TimeFormat)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
