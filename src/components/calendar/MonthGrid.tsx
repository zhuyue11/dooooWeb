import { isSameDay, toISODate } from '@/utils/date';
import { isItemChecked } from '@/hooks/useWeekCalendar';
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
  hideGroupTag?: boolean;
}

const SHORT_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export function MonthGrid({ visibleDates, currentMonth, itemsByDate, selectedDate, today, categories, onSelectDate, onItemClick, isLoading, hideGroupTag }: MonthGridProps) {
  const { t } = useTranslation();
  const activeMonth = currentMonth.getMonth();
  const weeks: Date[][] = [];
  for (let i = 0; i < visibleDates.length; i += 7) {
    weeks.push(visibleDates.slice(i, i + 7));
  }

  return (
    <div
      data-testid="calendar-month-grid"
      className="flex min-h-[400px] flex-1 flex-col overflow-hidden rounded-(--radius-card) bg-(--el-cal-grid-bg) shadow-(--shadow-card) lg:min-h-0"
    >
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-(--el-cal-grid-border) px-2">
        {SHORT_DAY_KEYS.map((key) => (
          <div key={key} className="py-3 text-center text-xs font-semibold text-(--el-cal-day-header)">
            {t(`calendarPage.weekdaysShort.${key}`)}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div className="flex flex-1 flex-col">
        {weeks.map((week, wi) => (
          <div key={wi} className={`grid flex-1 grid-cols-7 ${wi < weeks.length - 1 ? 'border-b border-(--el-cal-grid-border)' : ''}`}>
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
                  className={`flex flex-col gap-1 p-2 text-left transition-colors hover:bg-(--el-cal-nav-hover-bg) ${
                    di < 6 ? 'border-r border-(--el-cal-grid-border)' : ''
                  } ${isToday ? 'bg-(--el-cal-current-hour-bg)' : ''}`}
                >
                  {/* Date number */}
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[13px] ${
                      isSelected
                        ? 'bg-(--el-cal-date-selected-bg) text-(--el-cal-date-selected-text) font-semibold'
                        : isToday
                          ? 'border-2 border-(--el-cal-date-today-border) text-(--el-cal-date-today-text) font-semibold'
                          : isCurrentMonth
                            ? 'text-(--el-cal-date-normal) font-medium'
                            : 'text-(--el-cal-date-other)'
                    }`}
                  >
                    {date.getDate()}
                  </span>

                  {/* Item titles */}
                  {!isLoading && items.length > 0 && (
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      {items.slice(0, 3).map((item) => {
                        const colors = item.itemType === 'EVENT'
                          ? { bg: 'var(--el-cal-event-bg)', text: 'var(--el-cal-event-text)' }
                          : getCategoryColor(item.categoryId, categories);
                        return (
                          <div
                            key={item.id}
                            className={`overflow-hidden rounded px-1 py-px ${isItemChecked(item) ? 'opacity-60' : ''} ${onItemClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                            style={{ backgroundColor: colors.bg, color: colors.text }}
                            onClick={(e) => { if (onItemClick) { e.stopPropagation(); onItemClick(item); } }}
                          >
                            <div className={`truncate text-[10px] font-medium leading-tight ${isItemChecked(item) ? 'line-through' : ''}`}>
                              {item.title}
                            </div>
                            {item.groupName && !hideGroupTag && (
                              <span className="mt-0.5 inline-flex max-w-full items-center gap-px truncate rounded-full border border-(--el-item-group-border) px-1 text-[7px] font-medium leading-tight text-(--el-item-group-text)">
                                <Icon name="group" size={7} color="var(--el-item-group-text)" />
                                {item.groupName}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {items.length > 3 && (
                        <span className="text-[9px] leading-none text-(--el-cal-more-items)">+{items.length - 3}</span>
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
