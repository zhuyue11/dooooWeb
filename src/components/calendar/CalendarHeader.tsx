import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { formatDateRange } from '@/utils/date';

interface CalendarHeaderProps {
  weekStart: Date;
  weekEnd: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
}

export function CalendarHeader({ weekStart, weekEnd, onPrevWeek, onNextWeek, onToday }: CalendarHeaderProps) {
  return (
    <div data-testid="calendar-header" className="flex items-center justify-between">
      {/* Left: title + date range */}
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
        <span data-testid="calendar-date-range" className="text-sm font-medium text-muted-foreground">
          {formatDateRange(weekStart, weekEnd)}
        </span>
      </div>

      {/* Right: nav + tabs + today + add */}
      <div className="flex items-center gap-2">
        {/* Prev/Next arrows */}
        <button
          data-testid="nav-prev-week"
          onClick={onPrevWeek}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          data-testid="nav-next-week"
          onClick={onNextWeek}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted"
        >
          <ChevronRight size={18} />
        </button>

        {/* View switcher (Week/Month/Day) — hidden on mobile */}
        <div data-testid="view-switcher" className="hidden items-center rounded-lg bg-muted p-1 lg:flex">
          <button
            data-testid="view-tab-week"
            className="rounded-md bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-foreground shadow-sm"
          >
            Week
          </button>
          <button
            data-testid="view-tab-month"
            className="cursor-not-allowed rounded-md px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground"
            disabled
          >
            Month
          </button>
          <button
            data-testid="view-tab-day"
            className="cursor-not-allowed rounded-md px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground"
            disabled
          >
            Day
          </button>
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
        <button className="hidden h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 lg:flex">
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}
