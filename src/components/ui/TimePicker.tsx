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

  const toggleFormat = useCallback(() => {
    setTimeFormat(is12h ? '24h' : '12h');
  }, [is12h, setTimeFormat]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Icon name="schedule" size={20} color="var(--color-primary)" className="shrink-0" />

        {is12h ? (
          <TimePicker12hRow value={value} onChange={onChange} />
        ) : (
          <TimePicker24hRow value={value} onChange={onChange} />
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

function TimePicker12hRow({ value, onChange }: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { hour, minute, period } = useMemo(() => to12h(value), [value]);
  const { t } = useTranslation();

  return (
    <>
      <div className="flex items-center gap-0.5">
        <input
          type="number"
          min={1}
          max={12}
          value={hour}
          onChange={(e) => {
            const v = Math.max(1, Math.min(12, parseInt(e.target.value) || 1));
            onChange(to24hFromAmPm(v, minute, period));
          }}
          className="h-8 w-12 rounded-(--radius-input) border border-border bg-transparent px-(--spacing-input-x) text-center text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <span className="text-sm font-medium text-muted-foreground">:</span>
        <input
          type="number"
          min={0}
          max={59}
          value={String(minute).padStart(2, '0')}
          onChange={(e) => {
            const v = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
            onChange(to24hFromAmPm(hour, v, period));
          }}
          className="h-8 w-12 rounded-(--radius-input) border border-border bg-transparent px-(--spacing-input-x) text-center text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      {/* AM/PM toggle */}
      <div className="flex rounded-(--radius-btn) border border-border">
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

function TimePicker24hRow({ value, onChange }: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { hour, minute } = useMemo(() => parse24h(value), [value]);

  return (
    <div className="flex items-center gap-0.5">
      <input
        type="number"
        min={0}
        max={23}
        value={String(hour).padStart(2, '0')}
        onChange={(e) => {
          const v = Math.max(0, Math.min(23, parseInt(e.target.value) || 0));
          onChange(format24h(v, minute));
        }}
        className="h-8 w-12 rounded-(--radius-input) border border-border bg-transparent px-(--spacing-input-x) text-center text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      <span className="text-sm font-medium text-muted-foreground">:</span>
      <input
        type="number"
        min={0}
        max={59}
        value={String(minute).padStart(2, '0')}
        onChange={(e) => {
          const v = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
          onChange(format24h(hour, v));
        }}
        className="h-8 w-12 rounded-(--radius-input) border border-border bg-transparent px-(--spacing-input-x) text-center text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
    </div>
  );
}
