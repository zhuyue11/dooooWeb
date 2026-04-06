import { isSameDay, toISODate } from '@/utils/date';
import type { CalendarItem } from '@/hooks/useWeekCalendar';
import type { Category } from '@/types/api';
import { getCategoryColor } from '@/utils/category';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';

interface MonthGridProps {
  visibleDates: Date[]; // 35 or 42 dates from getMonthGridDates
  currentMonth: Date;
  itemsByDate: Map<string, CalendarItem[]>;
  selectedDate: Date | null;
  today: Date;
  categories?: Category[];
  onSelectDate: (date: Date) => void;
  onItemClick?: (item: CalendarItem) => void;
  isLoading: boolean;
}

const SHORT_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export function MonthGrid({ visibleDates, currentMonth, itemsByDate, selectedDate, today, categories, onSelectDate, onItemClick, isLoading }: MonthGridProps) {
  const { t } = useTranslation();
  const activeMonth = currentMonth.getMonth();
  const weeks: Date[][] = [];
  for (let i = 0; i < visibleDates.length; i += 7) {
    weeks.push(visibleDates.slice(i, i + 7));
  }

  return (
    <div
      data-testid="calendar-month-grid"
      className="flex min-h-[400px] flex-1 flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] lg:min-h-0"
    >
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border px-2">
        {SHORT_DAY_KEYS.map((key) => (
          <div key={key} className="py-3 text-center text-xs font-semibold text-muted-foreground">
            {t(`calendarPage.weekdaysShort.${key}`)}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div className="flex flex-1 flex-col">
        {weeks.map((week, wi) => (
          <div key={wi} className={`grid flex-1 grid-cols-7 ${wi < weeks.length - 1 ? 'border-b border-border' : ''}`}>
            {week.map((date, di) => {
              const dateKey = toISODate(date);
              const isToday = isSameDay(date, today);
              const isSelected = selectedDate !== null && isSameDay(date, selectedDate);
              const isCurrentMonth = date.getMonth() === activeMonth;
              const items = itemsByDate.get(dateKey) || [];

              return (
                <button
                  key={di}
                  data-testid={`month-cell-${dateKey}`}
                  onClick={() => onSelectDate(date)}
                  className={`flex flex-col gap-1 p-2 text-left transition-colors hover:bg-muted ${
                    di < 6 ? 'border-r border-border' : ''
                  } ${isToday ? 'bg-[#f0f0ff] dark:bg-[#1a1a2e]' : ''}`}
                >
                  {/* Date number */}
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[13px] ${
                      isSelected
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : isToday
                          ? 'border-2 border-primary text-primary font-semibold'
                          : isCurrentMonth
                            ? 'text-foreground font-medium'
                            : 'text-muted-foreground'
                    }`}
                  >
                    {date.getDate()}
                  </span>

                  {/* Item titles */}
                  {!isLoading && items.length > 0 && (
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      {items.slice(0, 3).map((item) => {
                        const colors = item.itemType === 'EVENT'
                          ? { bg: '#ede9fe', text: '#5b21b6' }
                          : getCategoryColor(item.categoryId, categories);
                        return (
                          <div
                            key={item.id}
                            className={`overflow-hidden rounded px-1 py-px ${item.isCompleted ? 'opacity-60' : ''} ${onItemClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                            style={{ backgroundColor: colors.bg, color: colors.text }}
                            onClick={(e) => { if (onItemClick) { e.stopPropagation(); onItemClick(item); } }}
                          >
                            <div className={`truncate text-[10px] font-medium leading-tight ${item.isCompleted ? 'line-through' : ''}`}>
                              {item.title}
                            </div>
                            {item.groupName && (
                              <span className="mt-0.5 inline-flex max-w-full items-center gap-px truncate rounded-full border border-[#3b82f6] px-1 text-[7px] font-medium leading-tight text-[#3b82f6]">
                                <Icon name="group" size={7} color="#3b82f6" />
                                {item.groupName}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {items.length > 3 && (
                        <span className="text-[9px] leading-none text-muted-foreground">+{items.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
