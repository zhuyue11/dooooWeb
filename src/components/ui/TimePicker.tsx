import { useMemo, useCallback, useState } from 'react';
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
        <Icon name="schedule" size={20} color="var(--el-popover-check)" className="shrink-0" />

        {is12h ? (
          <TimePicker12hRow value={value} onChange={onChange} />
        ) : (
          <TimePicker24hRow value={value} onChange={onChange} />
        )}

        <button type="button" onClick={onClear} className="ml-auto text-(--el-popover-item-text) opacity-60 hover:opacity-100">
          <Icon name="close" size={16} />
        </button>
      </div>

      {/* Toggle buttons — matching dooooApp's GlassTimePicker */}
      <div className="flex items-center gap-2 pl-[30px]">
        <button
          type="button"
          onClick={toggleFormat}
          className="rounded-full border border-(--el-popover-border) px-3 py-1 text-xs font-medium text-(--el-popover-item-text) transition-colors hover:bg-(--el-popover-item-hover)"
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
  const [hourDraft, setHourDraft] = useState<string | null>(null);
  const [minuteDraft, setMinuteDraft] = useState<string | null>(null);

  const commitHour = () => {
    if (hourDraft === null) return;
    const parsed = parseInt(hourDraft);
    const v = isNaN(parsed) ? hour : Math.max(1, Math.min(12, parsed));
    setHourDraft(null);
    onChange(to24hFromAmPm(v, minute, period));
  };

  const commitMinute = () => {
    if (minuteDraft === null) return;
    const parsed = parseInt(minuteDraft);
    const v = isNaN(parsed) ? minute : Math.max(0, Math.min(59, parsed));
    setMinuteDraft(null);
    onChange(to24hFromAmPm(hour, v, period));
  };

  return (
    <>
      <div className="flex items-center gap-0.5">
        <input
          type="text"
          inputMode="numeric"
          value={hourDraft ?? String(hour)}
          onChange={(e) => setHourDraft(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
          onBlur={commitHour}
          onKeyDown={(e) => e.key === 'Enter' && commitHour()}
          className="h-8 w-12 rounded-(--radius-input) border border-(--el-input-border) bg-transparent px-(--spacing-input-x) text-center text-sm font-medium text-(--el-input-text) focus:outline-none focus:ring-2 focus:ring-(--el-input-focus)/50"
        />
        <span className="text-sm font-medium text-(--el-popover-item-text) opacity-50">:</span>
        <input
          type="text"
          inputMode="numeric"
          value={minuteDraft ?? String(minute).padStart(2, '0')}
          onChange={(e) => setMinuteDraft(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
          onBlur={commitMinute}
          onKeyDown={(e) => e.key === 'Enter' && commitMinute()}
          className="h-8 w-12 rounded-(--radius-input) border border-(--el-input-border) bg-transparent px-(--spacing-input-x) text-center text-sm font-medium text-(--el-input-text) focus:outline-none focus:ring-2 focus:ring-(--el-input-focus)/50"
        />
      </div>
      {/* AM/PM toggle */}
      <div className="flex rounded-(--radius-btn) border border-(--el-popover-border)">
        <button
          type="button"
          onClick={() => period !== 'AM' && onChange(to24hFromAmPm(hour, minute, 'AM'))}
          className={`px-2 py-1 text-xs font-semibold transition-colors rounded-l-[5px] ${
            period === 'AM'
              ? 'bg-(--el-popover-apply-bg) text-(--el-popover-apply-text)'
              : 'text-(--el-popover-item-text) opacity-60 hover:opacity-100'
          }`}
        >
          {t('tasks.input.timePicker.am')}
        </button>
        <button
          type="button"
          onClick={() => period !== 'PM' && onChange(to24hFromAmPm(hour, minute, 'PM'))}
          className={`px-2 py-1 text-xs font-semibold transition-colors rounded-r-[5px] ${
            period === 'PM'
              ? 'bg-(--el-popover-apply-bg) text-(--el-popover-apply-text)'
              : 'text-(--el-popover-item-text) opacity-60 hover:opacity-100'
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
  const [hourDraft, setHourDraft] = useState<string | null>(null);
  const [minuteDraft, setMinuteDraft] = useState<string | null>(null);

  const commitHour = () => {
    if (hourDraft === null) return;
    const parsed = parseInt(hourDraft);
    const v = isNaN(parsed) ? hour : Math.max(0, Math.min(23, parsed));
    setHourDraft(null);
    onChange(format24h(v, minute));
  };

  const commitMinute = () => {
    if (minuteDraft === null) return;
    const parsed = parseInt(minuteDraft);
    const v = isNaN(parsed) ? minute : Math.max(0, Math.min(59, parsed));
    setMinuteDraft(null);
    onChange(format24h(hour, v));
  };

  return (
    <div className="flex items-center gap-0.5">
      <input
        type="text"
        inputMode="numeric"
        value={hourDraft ?? String(hour).padStart(2, '0')}
        onChange={(e) => setHourDraft(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
        onBlur={commitHour}
        onKeyDown={(e) => e.key === 'Enter' && commitHour()}
        className="h-8 w-12 rounded-(--radius-input) border border-(--el-input-border) bg-transparent px-(--spacing-input-x) text-center text-sm font-medium text-(--el-input-text) focus:outline-none focus:ring-2 focus:ring-(--el-input-focus)/50"
      />
      <span className="text-sm font-medium text-(--el-popover-item-text) opacity-50">:</span>
      <input
        type="text"
        inputMode="numeric"
        value={minuteDraft ?? String(minute).padStart(2, '0')}
        onChange={(e) => setMinuteDraft(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
        onBlur={commitMinute}
        onKeyDown={(e) => e.key === 'Enter' && commitMinute()}
        className="h-8 w-12 rounded-(--radius-input) border border-(--el-input-border) bg-transparent px-(--spacing-input-x) text-center text-sm font-medium text-(--el-input-text) focus:outline-none focus:ring-2 focus:ring-(--el-input-focus)/50"
      />
    </div>
  );
}
