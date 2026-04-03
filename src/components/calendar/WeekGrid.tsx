import { isSameDay, toISODate } from '@/utils/date';
import { TaskCard } from './TaskCard';
import type { CalendarItem } from '@/hooks/useWeekCalendar';
import type { Category } from '@/types/api';

interface WeekGridProps {
  weekDates: Date[];
  itemsByDate: Map<string, CalendarItem[]>;
  selectedDate: Date | null;
  today: Date;
  categories?: Category[];
  onSelectDate: (date: Date) => void;
  isLoading: boolean;
}

const SHORT_DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SINGLE_DAY_NAMES = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function WeekGrid({ weekDates, itemsByDate, selectedDate, today, categories, onSelectDate, isLoading }: WeekGridProps) {
  return (
    <div
      data-testid="calendar-week-grid"
      className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
    >
      {/* Day labels row */}
      <div className="grid grid-cols-7 px-4 pt-3">
        {weekDates.map((date, i) => {
          const isToday = isSameDay(date, today);
          return (
            <div key={i} className="text-center">
              <span className={`hidden text-xs font-semibold md:inline ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                {SHORT_DAY_NAMES[i]}
              </span>
              <span className={`text-xs font-semibold md:hidden ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                {SINGLE_DAY_NAMES[i]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Date numbers row */}
      <div className="grid grid-cols-7 px-4 pb-3 pt-1">
        {weekDates.map((date, i) => {
          const isToday = isSameDay(date, today);
          const isSelected = selectedDate !== null && isSameDay(date, selectedDate);
          return (
            <div key={i} className="flex justify-center">
              <button
                onClick={() => onSelectDate(date)}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : isToday
                      ? 'border-2 border-primary text-primary'
                      : 'text-muted-foreground hover:bg-muted'
                }`}
                data-testid={isToday ? 'today-indicator' : undefined}
              >
                {date.getDate()}
              </button>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="border-b border-border" />

      {/* Day columns with task cards */}
      <div className="grid flex-1 grid-cols-7 gap-1 overflow-y-auto px-2 py-2 md:px-4">
        {weekDates.map((date, i) => {
          const dateKey = toISODate(date);
          const items = itemsByDate.get(dateKey) || [];
          const isToday = isSameDay(date, today);

          return (
            <div
              key={i}
              data-testid={`day-column-${dateKey}`}
              className={`flex flex-col gap-1 rounded-lg p-1 ${isToday ? 'bg-[#f0f0ff] dark:bg-[#1a1a2e]' : ''}`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">…</div>
              ) : items.length === 0 ? null : (
                items.map((item) => (
                  <TaskCard key={item.id} item={item} categories={categories} />
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
