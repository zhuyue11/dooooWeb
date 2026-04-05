import { useMemo, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useDisplay } from '@/lib/contexts/display-context';
import { useTranslation } from 'react-i18next';

interface TimePickerProps {
  value: string; // "HH:mm" 24h format
  onChange: (value: string) => void;
  onClear: () => void;
}

function to12h(time24: string): { hour: number; minute: number; period: 'AM' | 'PM' } {
  const [h, m] = time24.split(':').map(Number);
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { hour, minute: m, period };
}

function to24hFromAmPm(hour: number, minute: number, period: 'AM' | 'PM'): string {
  let h = hour;
  if (period === 'AM' && h === 12) h = 0;
  else if (period === 'PM' && h !== 12) h += 12;
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function parse24h(time24: string): { hour: number; minute: number } {
  const [h, m] = time24.split(':').map(Number);
  return { hour: h, minute: m };
}

function format24h(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function TimePicker({ value, onChange, onClear }: TimePickerProps) {
  const { t } = useTranslation();
  const { timeFormat, setTimeFormat } = useDisplay();
  const is12h = timeFormat === '12h';

  const minuteOptions = useMemo(
    () => Array.from({ length: 60 }, (_, i) => i),
    [],
  );

  const toggleFormat = useCallback(() => {
    setTimeFormat(is12h ? '24h' : '12h');
  }, [is12h, setTimeFormat]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Icon name="schedule" size={20} color="var(--color-primary)" className="shrink-0" />

        {is12h ? (
          <TimePicker12hRow value={value} onChange={onChange} minuteOptions={minuteOptions} />
        ) : (
          <TimePicker24hRow value={value} onChange={onChange} minuteOptions={minuteOptions} />
        )}

        <button type="button" onClick={onClear} className="ml-auto text-muted-foreground hover:text-foreground">
          <Icon name="close" size={16} />
        </button>
      </div>

      {/* Toggle buttons — matching dooooApp's GlassTimePicker */}
      <div className="flex items-center gap-2 pl-[30px]">
        <button
          type="button"
          onClick={toggleFormat}
          className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          {is12h ? t('tasks.input.timePicker.use24h') : t('tasks.input.timePicker.use12h')}
        </button>
      </div>
    </div>
  );
}

// ── 12h row: hour (1-12) + minute + AM/PM ──

function TimePicker12hRow({ value, onChange, minuteOptions }: {
  value: string;
  onChange: (v: string) => void;
  minuteOptions: number[];
}) {
  const { hour, minute, period } = useMemo(() => to12h(value), [value]);
  const { t } = useTranslation();

  return (
    <>
      <div className="flex items-center gap-0.5">
        <select
          value={hour}
          onChange={(e) => onChange(to24hFromAmPm(Number(e.target.value), minute, period))}
          className="h-9 w-14 appearance-none rounded-md border border-border bg-transparent px-1 text-center text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <span className="text-sm font-medium text-muted-foreground">:</span>
        <select
          value={minute}
          onChange={(e) => onChange(to24hFromAmPm(hour, Number(e.target.value), period))}
          className="h-9 w-14 appearance-none rounded-md border border-border bg-transparent px-1 text-center text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {minuteOptions.map((m) => (
            <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
          ))}
        </select>
      </div>
      {/* AM/PM toggle */}
      <div className="flex rounded-md border border-border">
        <button
          type="button"
          onClick={() => period !== 'AM' && onChange(to24hFromAmPm(hour, minute, 'AM'))}
          className={`px-2 py-1 text-xs font-semibold transition-colors rounded-l-[5px] ${
            period === 'AM'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          {t('tasks.input.timePicker.am')}
        </button>
        <button
          type="button"
          onClick={() => period !== 'PM' && onChange(to24hFromAmPm(hour, minute, 'PM'))}
          className={`px-2 py-1 text-xs font-semibold transition-colors rounded-r-[5px] ${
            period === 'PM'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          {t('tasks.input.timePicker.pm')}
        </button>
      </div>
    </>
  );
}

// ── 24h row: hour (00-23) + minute ──

function TimePicker24hRow({ value, onChange, minuteOptions }: {
  value: string;
  onChange: (v: string) => void;
  minuteOptions: number[];
}) {
  const { hour, minute } = useMemo(() => parse24h(value), [value]);

  return (
    <div className="flex items-center gap-0.5">
      <select
        value={hour}
        onChange={(e) => onChange(format24h(Number(e.target.value), minute))}
        className="h-9 w-14 appearance-none rounded-md border border-border bg-transparent px-1 text-center text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        {Array.from({ length: 24 }, (_, i) => i).map((h) => (
          <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
        ))}
      </select>
      <span className="text-sm font-medium text-muted-foreground">:</span>
      <select
        value={minute}
        onChange={(e) => onChange(format24h(hour, Number(e.target.value)))}
        className="h-9 w-14 appearance-none rounded-md border border-border bg-transparent px-1 text-center text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        {minuteOptions.map((m) => (
          <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
        ))}
      </select>
    </div>
  );
}
