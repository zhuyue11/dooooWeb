import { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

interface CalendarPopoverProps {
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
  onClose: () => void;
  /** Minimum selectable date — dates before this are disabled. */
  minDate?: Date | null;
}

export function CalendarPopover({ selectedDate, onSelect, onClose, minDate }: CalendarPopoverProps) {
  const { t } = useTranslation();
  const [viewMonth, setViewMonth] = useState(() => {
    const d = selectedDate || new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
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
  const isBeforeMinDate = (d: number) => {
    if (!minDate) return false;
    const cellDate = new Date(year, month, d);
    const min = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    return cellDate.getTime() < min.getTime();
  };

  // Month names for the picker grid (locale-aware via Intl)
  const monthNames = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      try {
        return new Date(2024, i, 1).toLocaleDateString(i18n.language, { month: 'short' });
      } catch {
        return new Date(2024, i, 1).toLocaleDateString('en', { month: 'short' });
      }
    });
  }, []);

  // Year for the picker — shows the year being browsed in picker mode
  const [pickerYear, setPickerYear] = useState(year);

  // Sync pickerYear when viewMonth changes (e.g. arrow nav in normal mode)
  useEffect(() => {
    setPickerYear(viewMonth.getFullYear());
  }, [viewMonth]);

  const handleMonthSelect = (m: number) => {
    setViewMonth(new Date(pickerYear, m, 1));
    setShowMonthYearPicker(false);
  };

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-2 z-50 w-[300px] rounded-xl border border-border bg-surface p-4 shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
      data-testid="calendar-popover"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        {!showMonthYearPicker && (
          <button
            type="button"
            onClick={() => setViewMonth(new Date(year, month - 1, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <Icon name="chevron_left" size={18} />
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowMonthYearPicker((v) => !v)}
          className="flex items-center gap-1 text-sm font-semibold text-foreground hover:text-primary"
        >
          <span>{viewMonth.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}</span>
          <Icon name={showMonthYearPicker ? 'expand_more' : 'chevron_right'} size={18} color="var(--color-primary)" />
        </button>
        {!showMonthYearPicker && (
          <button
            type="button"
            onClick={() => setViewMonth(new Date(year, month + 1, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <Icon name="chevron_right" size={18} />
          </button>
        )}
      </div>

      {showMonthYearPicker ? (
        <>
          {/* Year navigation */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPickerYear((y) => y - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            >
              <Icon name="chevron_left" size={18} />
            </button>
            <span className="text-sm font-semibold text-foreground">{pickerYear}</span>
            <button
              type="button"
              onClick={() => setPickerYear((y) => y + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            >
              <Icon name="chevron_right" size={18} />
            </button>
          </div>

          {/* Month grid (4×3) */}
          <div className="grid grid-cols-4 gap-1">
            {monthNames.map((name, i) => {
              const isCurrent = pickerYear === year && i === month;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleMonthSelect(i)}
                  className={`rounded-lg py-2 text-[13px] font-medium transition-colors ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
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
                disabled={d === null || (d !== null && isBeforeMinDate(d))}
                onClick={() => d && !isBeforeMinDate(d) && onSelect(new Date(year, month, d))}
                className={`flex h-8 items-center justify-center rounded-full text-[13px] transition-colors ${
                  d === null
                    ? ''
                    : isBeforeMinDate(d)
                      ? 'cursor-not-allowed text-muted-foreground/40'
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
        </>
      )}
    </div>
  );
}
