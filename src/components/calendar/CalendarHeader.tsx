import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { formatDateRange, formatMonthYear, formatFullDate } from '@/utils/date';
import type { CalendarViewMode } from '@/hooks/useCalendar';

interface CalendarHeaderProps {
  viewMode: CalendarViewMode;
  onViewChange: (mode: CalendarViewMode) => void;
  visibleDates: Date[];
  currentMonth: Date;
  currentDate: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onAddClick?: () => void;
}

const VIEWS: CalendarViewMode[] = ['week', 'month', 'day'];
const VIEW_LABELS: Record<CalendarViewMode, string> = { week: 'Week', month: 'Month', day: 'Day' };

function getDateLabel(viewMode: CalendarViewMode, visibleDates: Date[], currentMonth: Date, currentDate: Date): string {
  switch (viewMode) {
    case 'week':
      return formatDateRange(visibleDates[0], visibleDates[visibleDates.length - 1]);
    case 'month':
      return formatMonthYear(currentMonth);
    case 'day':
      return formatFullDate(currentDate);
  }
}

export function CalendarHeader({ viewMode, onViewChange, visibleDates, currentMonth, currentDate, onPrev, onNext, onToday, onAddClick }: CalendarHeaderProps) {
  return (
    <div data-testid="calendar-header" className="flex items-center justify-between">
      {/* Left: title + date label */}
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
        <span data-testid="calendar-date-range" className="text-sm font-medium text-muted-foreground">
          {visibleDates.length > 0 ? getDateLabel(viewMode, visibleDates, currentMonth, currentDate) : ''}
        </span>
      </div>

      {/* Right: nav + tabs + today + add */}
      <div className="flex items-center gap-2">
        {/* Prev/Next arrows */}
        <button
          data-testid="nav-prev-week"
          onClick={onPrev}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          data-testid="nav-next-week"
          onClick={onNext}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted"
        >
          <ChevronRight size={18} />
        </button>

        {/* View switcher — hidden on mobile */}
        <div data-testid="view-switcher" className="flex items-center rounded-lg bg-muted p-1">
          {VIEWS.map((v) => (
            <button
              key={v}
              data-testid={`view-tab-${v}`}
              onClick={() => onViewChange(v)}
              className={`rounded-md px-3.5 py-1.5 text-[13px] transition-colors ${
                v === viewMode
                  ? 'bg-surface font-semibold text-foreground shadow-sm'
                  : 'font-medium text-muted-foreground hover:text-foreground'
              }`}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>

        {/* Today button */}
        <button
          data-testid="nav-today"
          onClick={onToday}
          className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
        >
          Today
        </button>

        {/* Add button — hidden on mobile */}
        <button
          onClick={onAddClick}
          className="hidden h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 lg:flex"
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}
