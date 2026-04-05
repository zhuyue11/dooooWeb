import { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from 'react-i18next';

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

interface CalendarPopoverProps {
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

export function CalendarPopover({ selectedDate, onSelect, onClose }: CalendarPopoverProps) {
  const { t } = useTranslation();
  const [viewMonth, setViewMonth] = useState(() => {
    const d = selectedDate || new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const weeks: (number | null)[][] = [];
  let day = 1 - startOffset;
  for (let w = 0; w < 6; w++) {
    const week: (number | null)[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(day >= 1 && day <= daysInMonth ? day : null);
      day++;
    }
    if (week.every((d) => d === null)) break;
    weeks.push(week);
  }

  const isToday = (d: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
  const isSelected = (d: number) =>
    selectedDate && selectedDate.getFullYear() === year && selectedDate.getMonth() === month && selectedDate.getDate() === d;

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-2 z-50 w-[300px] rounded-xl border border-border bg-surface p-4 shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMonth(new Date(year, month - 1, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <Icon name="chevron_left" size={18} />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth(new Date(year, month + 1, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <Icon name="chevron_right" size={18} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground">
        {WEEKDAY_KEYS.map((key) => (
          <span key={key}>{t(`calendarPage.weekdaysTwoChar.${key}`)}</span>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {weeks.flat().map((d, i) => (
          <button
            key={i}
            type="button"
            disabled={d === null}
            onClick={() => d && onSelect(new Date(year, month, d))}
            className={`flex h-8 items-center justify-center rounded-full text-[13px] transition-colors ${
              d === null
                ? ''
                : isSelected(d)
                  ? 'bg-primary font-semibold text-primary-foreground'
                  : isToday(d)
                    ? 'font-semibold text-primary'
                    : 'text-foreground hover:bg-muted'
            }`}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}
