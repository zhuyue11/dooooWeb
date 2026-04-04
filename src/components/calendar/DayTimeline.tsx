import { useRef, useEffect } from 'react';
import { getHoursArray, formatHourLabel, formatTime } from '@/utils/date';
import { getCategoryColor, getCategoryName } from '@/utils/category';
import type { CalendarItem } from '@/hooks/useWeekCalendar';
import type { Category } from '@/types/api';
import { useDisplay } from '@/lib/contexts/display-context';
import type { TimeFormat } from '@/utils/date';

interface DayTimelineProps {
  date: Date;
  items: CalendarItem[];
  categories?: Category[];
  isLoading: boolean;
}

const HOUR_HEIGHT = 60; // px per hour row

export function DayTimeline({ date, items, categories, isLoading }: DayTimelineProps) {
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
  }, [date]); // re-scroll when date changes

  // Group timed items by their start hour
  const itemsByHour = new Map<number, CalendarItem[]>();
  for (const item of items) {
    if (!item.hasTime) continue;
    const h = new Date(item.date).getHours();
    if (!itemsByHour.has(h)) itemsByHour.set(h, []);
    itemsByHour.get(h)!.push(item);
  }

  // Untimed items (shown at top)
  const untimedItems = items.filter((item) => !item.hasTime);

  return (
    <div
      data-testid="calendar-day-timeline"
      className="flex min-h-[400px] flex-1 flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] lg:min-h-0"
    >
      {/* Untimed items section */}
      {untimedItems.length > 0 && (
        <div className="border-b border-border px-4 py-2">
          <div className="flex flex-wrap gap-2">
            {untimedItems.map((item) => {
              const colors = item.itemType === 'EVENT'
                ? { bg: '#ede9fe', text: '#5b21b6' }
                : getCategoryColor(item.categoryId, categories);
              return (
                <div
                  key={item.id}
                  data-testid={`day-task-${item.id}`}
                  className="rounded-md px-2.5 py-1"
                  style={{ backgroundColor: colors.bg }}
                >
                  <span className="text-xs font-medium" style={{ color: colors.text }}>{item.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hour grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Loading…</div>
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
                        className={`rounded-md ${item.isCompleted ? 'opacity-60' : ''}`}
                        style={{
                          backgroundColor: colors.bg,
                          padding: '6px 10px',
                          minHeight: blockHeight,
                        }}
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
