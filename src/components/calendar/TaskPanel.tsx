import { Plus } from 'lucide-react';
import { isSameDay } from '@/utils/date';
import { TaskRow } from './TaskRow';
import type { CalendarItem } from '@/hooks/useWeekCalendar';
import type { Category } from '@/types/api';

interface TaskPanelProps {
  selectedDate: Date | null;
  today: Date;
  weekDates: Date[]; // 7 dates of current week (for range label)
  items: CalendarItem[];
  categories?: Category[];
  isLoading: boolean;
  currentUserId?: string;
}

/** Matches dooooApp's DateRangeBar: selected date → "Today · Apr 3", no selection → "Mar 30 - Apr 5" */
function formatPanelDate(date: Date | null, today: Date, weekDates: Date[]): string {
  if (!date) {
    // No selection → show week date range (matching dooooApp's DateRangeBar)
    const start = weekDates[0];
    const end = weekDates[6];
    if (!start || !end) return '';
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${startStr} – ${endStr}`;
  }
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (isSameDay(date, today)) {
    return `Today · ${dateStr}`;
  }
  return dateStr;
}

export function TaskPanel({ selectedDate, today, weekDates, items, categories, isLoading, currentUserId }: TaskPanelProps) {
  return (
    <div
      data-testid="task-panel"
      className="flex w-full flex-col overflow-hidden rounded-2xl border-t border-border bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] lg:w-80 lg:border-l lg:border-t-0"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <span data-testid="task-panel-date" className="text-base font-semibold text-foreground">
          {formatPanelDate(selectedDate, today, weekDates)}
        </span>
        <button className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90">
          <Plus size={16} />
          <span>Add</span>
        </button>
      </div>

      {/* Task list */}
      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            {selectedDate ? 'No items for this day' : 'No items in this range'}
          </div>
        ) : (
          items.map((item) => (
            <TaskRow key={item.id} item={item} categories={categories} showDate={!selectedDate} currentUserId={currentUserId} />
          ))
        )}
      </div>
    </div>
  );
}
