import { useRef, useEffect } from 'react';
import { getHoursArray, formatHourLabel, formatTime } from '@/utils/date';
import { getCategoryColor, getCategoryName } from '@/utils/category';
import type { CalendarItem } from '@/hooks/useWeekCalendar';
import type { Category } from '@/types/api';
import { useDisplay } from '@/lib/contexts/display-context';
import type { TimeFormat } from '@/utils/date';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';

interface DayTimelineProps {
  date: Date;
  items: CalendarItem[];
  categories?: Category[];
  onItemClick?: (item: CalendarItem) => void;
  isLoading: boolean;
}

const HOUR_HEIGHT = 60; // px per hour row
const TIME_OF_DAY_SECTIONS = [
  { key: 'MORNING' as const, icon: 'wb_sunny', i18nKey: 'tasks.timeOfDay.morning' },
  { key: 'AFTERNOON' as const, icon: 'wb_cloudy', i18nKey: 'tasks.timeOfDay.afternoon' },
  { key: 'EVENING' as const, icon: 'nightlight', i18nKey: 'tasks.timeOfDay.evening' },
] as const;

export function DayTimeline({ date, items, categories, onItemClick, isLoading }: DayTimelineProps) {
  const { t } = useTranslation();
  const { timeFormat } = useDisplay();
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentHour = new Date().getHours();
  const hours = getHoursArray();

  // Auto-scroll to current hour row after loading completes
  useEffect(() => {
    if (!isLoading && scrollRef.current) {
      const targetHour = Math.max(0, currentHour - 1);
      const hourEl = scrollRef.current.querySelector(`[data-testid="hour-row-${targetHour}"]`);
      if (hourEl) {
        hourEl.scrollIntoView({ block: 'start' });
      }
    }
  }, [isLoading, date]);

  // Group timed items by their start hour
  const itemsByHour = new Map<number, CalendarItem[]>();
  for (const item of items) {
    if (!item.hasTime) continue;
    const h = new Date(item.date).getHours();
    if (!itemsByHour.has(h)) itemsByHour.set(h, []);
    itemsByHour.get(h)!.push(item);
  }

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
      className="flex min-h-[400px] flex-1 flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] lg:min-h-0"
    >
      {/* Untimed items — no time-of-day */}
      {noTimeOfDayItems.length > 0 && (
        <div className="overflow-y-auto border-b border-border px-4 py-2" style={{ maxHeight: 60 }}>
          <div className="flex flex-wrap gap-2">
            {noTimeOfDayItems.map((item) => {
              const colors = item.itemType === 'EVENT'
                ? { bg: '#ede9fe', text: '#5b21b6' }
                : getCategoryColor(item.categoryId, categories);
              return (
                <div
                  key={item.id}
                  data-testid={`day-task-${item.id}`}
                  className={`rounded-md px-2.5 py-1 ${onItemClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
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
          <div key={section.key} className="overflow-y-auto border-b border-border px-4 py-2" style={{ maxHeight: 60 }}>
            <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <Icon name={section.icon} size={12} />
              {t(section.i18nKey)}
            </div>
            <div className="flex flex-wrap gap-2">
              {sectionItems.map((item) => {
                const colors = item.itemType === 'EVENT'
                  ? { bg: '#ede9fe', text: '#5b21b6' }
                  : getCategoryColor(item.categoryId, categories);
                return (
                  <div
                    key={item.id}
                    data-testid={`day-task-${item.id}`}
                    className={`rounded-md px-2.5 py-1 ${onItemClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
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

      {/* Hour grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">{t('common.loading')}</div>
        ) : (
          hours.map((hour) => {
            const isCurrentHour = hour === currentHour;
            const hourItems = itemsByHour.get(hour) || [];

            return (
              <div
                key={hour}
                data-testid={`hour-row-${hour}`}
                className={`flex border-b border-border ${isCurrentHour ? 'bg-[#f0f0ff] dark:bg-[#1a1a2e]' : ''}`}
                style={{ minHeight: HOUR_HEIGHT }}
              >
                {/* Hour label */}
                <div className="flex w-[60px] flex-shrink-0 items-start px-4 pt-2">
                  <span className={`text-xs font-medium ${isCurrentHour ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                    {formatHourLabel(hour)}
                  </span>
                </div>

                {/* Task blocks */}
                <div className="flex flex-1 flex-col gap-1 py-1 pr-4">
                  {hourItems.map((item) => {
                    const colors = item.itemType === 'EVENT'
                      ? { bg: '#ede9fe', text: '#5b21b6' }
                      : getCategoryColor(item.categoryId, categories);
                    const duration = item.duration || 60;
                    const blockHeight = Math.max(40, (duration / 60) * HOUR_HEIGHT - 8);
                    const categoryName = getCategoryName(item.categoryId, categories);

                    // Build time range string
                    const startTime = formatTime(item.date, timeFormat as TimeFormat);
                    let endTime = '';
                    if (item.duration) {
                      const end = new Date(new Date(item.date).getTime() + item.duration * 60000);
                      endTime = formatTime(end.toISOString(), timeFormat as TimeFormat);
                    }
                    const metaParts = [endTime ? `${startTime} – ${endTime}` : startTime];
                    if (categoryName) metaParts.push(categoryName);
                    if (item.priority) metaParts.push(item.priority.charAt(0).toUpperCase() + item.priority.slice(1).toLowerCase());

                    return (
                      <div
                        key={item.id}
                        data-testid={`day-task-${item.id}`}
                        className={`rounded-md ${item.isCompleted ? 'opacity-60' : ''} ${onItemClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                        style={{
                          backgroundColor: colors.bg,
                          padding: '6px 10px',
                          minHeight: blockHeight,
                        }}
                        onClick={() => onItemClick?.(item)}
                      >
                        <span
                          className={`text-[12px] font-medium leading-tight ${item.isCompleted ? 'line-through' : ''}`}
                          style={{ color: colors.text }}
                        >
                          {item.title}
                        </span>
                        <div className="text-[11px] leading-tight" style={{ color: colors.text, opacity: 0.8 }}>
                          {metaParts.join(' · ')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
