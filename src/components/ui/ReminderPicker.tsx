import { useState, useCallback, useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from 'react-i18next';

/**
 * ReminderPopover — popover matching dooooApp's GlassReminderPicker.
 *
 * Two views:
 *   1. **List view** — preset rows + Custom + No reminder.
 *      Selecting a preset applies + closes.
 *      "Custom" swaps to custom view.
 *      "No reminder" clears + closes.
 *   2. **Custom view** — back button + day/hour/minute inputs + "before" label
 *      + Save button. Only applies on Save (matches RepeatPopover).
 *
 * Opens directly in custom view when current value is non-standard.
 */

interface ReminderPopoverProps {
  value: number | undefined;
  onSelect: (minutes: number) => void;
  onClear: () => void;
  onClose: () => void;
}

const STANDARD_MINUTES = [0, 15, 30, 60, 1440, 10080];

type ListOption = 'at_time' | '15_minutes' | '30_minutes' | '1_hour' | '1_day' | '1_week' | 'custom' | 'none';

const LIST_OPTIONS: ListOption[] = [
  'at_time', '15_minutes', '30_minutes',
  '1_hour', '1_day', '1_week',
  'custom', 'none',
];

const OPTION_TO_MINUTES: Record<string, number> = {
  at_time: 0,
  '15_minutes': 15,
  '30_minutes': 30,
  '1_hour': 60,
  '1_day': 1440,
  '1_week': 10080,
};

function minutesToListOption(minutes?: number): ListOption {
  if (minutes === undefined) return 'none';
  const entry = Object.entries(OPTION_TO_MINUTES).find(([, v]) => v === minutes);
  return (entry?.[0] as ListOption) || 'custom';
}

export function formatReminderDisplay(minutes: number, t: (key: string, opts?: Record<string, unknown>) => string): string {
  // Exact standard values get clean labels
  if (minutes === 0) return t('tasks.input.atTimeOfEvent');
  if (minutes === 15) return t('tasks.input.minutesBefore', { count: 15 });
  if (minutes === 30) return t('tasks.input.minutesBefore', { count: 30 });
  if (minutes === 60) return t('tasks.input.hourBefore');
  if (minutes === 1440) return t('tasks.input.dayBefore');
  if (minutes === 10080) return t('tasks.input.weekBefore');
  // Custom values: show full d/h/m breakdown using translated short forms
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  const parts: string[] = [];
  if (d > 0) parts.push((t('tasks.input.reminderShort.d') as string).replace('{0}', String(d)));
  if (h > 0) parts.push((t('tasks.input.reminderShort.h') as string).replace('{0}', String(h)));
  if (m > 0) parts.push((t('tasks.input.reminderShort.m') as string).replace('{0}', String(m)));
  return parts.join(' ') + ` ${t('tasks.input.reminderPicker.before')}`;
}

export function ReminderPopover({ value, onSelect, onClear, onClose }: ReminderPopoverProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  const isCustomValue = value !== undefined && !STANDARD_MINUTES.includes(value);
  const [view, setView] = useState<'list' | 'custom'>(isCustomValue ? 'custom' : 'list');

  // Local-only state for custom view — not applied until Save
  const [customDay, setCustomDay] = useState(0);
  const [customHour, setCustomHour] = useState(0);
  const [customMin, setCustomMin] = useState(30);

  // Initialize custom state from value when opening in custom view
  useEffect(() => {
    if (value === undefined) return;
    if (!STANDARD_MINUTES.includes(value)) {
      const d = Math.floor(value / (24 * 60));
      const remainAfterDays = value % (24 * 60);
      const h = Math.floor(remainAfterDays / 60);
      const m = remainAfterDays % 60;
      setCustomDay(d);
      setCustomHour(h);
      setCustomMin(m);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const currentOption = minutesToListOption(value);

  const handleListSelect = useCallback((option: ListOption) => {
    if (option === 'custom') {
      // Seed custom inputs from current value
      if (value !== undefined) {
        const d = Math.floor(value / (24 * 60));
        const remainAfterDays = value % (24 * 60);
        const h = Math.floor(remainAfterDays / 60);
        const m = remainAfterDays % 60;
        setCustomDay(d);
        setCustomHour(h);
        setCustomMin(m);
      }
      setView('custom');
      return;
    }
    if (option === 'none') {
      onClear();
      onClose();
      return;
    }
    const mins = OPTION_TO_MINUTES[option];
    if (mins !== undefined) onSelect(mins);
    onClose();
  }, [onSelect, onClear, onClose, value]);

  const getOptionLabel = useCallback((option: ListOption): string => {
    switch (option) {
      case 'at_time': return t('tasks.input.atTimeOfEvent');
      case '15_minutes': return t('tasks.input.minutesBefore', { count: 15 });
      case '30_minutes': return t('tasks.input.minutesBefore', { count: 30 });
      case '1_hour': return t('tasks.input.hourBefore');
      case '1_day': return t('tasks.input.dayBefore');
      case '1_week': return t('tasks.input.weekBefore');
      case 'custom': return t('tasks.input.reminderPicker.custom');
      case 'none': return t('tasks.input.noReminder');
    }
  }, [t]);

  const handleCustomApply = useCallback(() => {
    onSelect(customDay * 24 * 60 + customHour * 60 + customMin);
    onClose();
  }, [customDay, customHour, customMin, onSelect, onClose]);

  // ═══════════════════════ LIST VIEW ═══════════════════════
  if (view === 'list') {
    return (
      <div ref={ref} className="absolute left-0 top-full mt-1 z-50 w-[240px] rounded-(--radius-modal) border border-border bg-surface p-1 shadow-(--shadow-elevated)">
        {LIST_OPTIONS.map((option) => {
          const isSelected = currentOption === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => handleListSelect(option)}
              className={`flex w-full items-center gap-3 rounded-(--radius-card) px-3 py-2 text-sm transition-colors hover:bg-muted/50 ${isSelected ? 'bg-muted font-medium' : ''}`}
            >
              <span className="flex-1">{getOptionLabel(option)}</span>
              {isSelected && <Icon name="check" size={16} color="var(--color-primary)" />}
            </button>
          );
        })}
      </div>
    );
  }

  // ═══════════════════════ CUSTOM VIEW ═══════════════════════
  return (
    <div ref={ref} className="absolute left-0 top-full mt-1 z-50 w-[300px] rounded-(--radius-modal) border border-border bg-surface p-(--spacing-card) shadow-(--shadow-elevated)">
      {/* Back button */}
      <button
        type="button"
        onClick={() => setView('list')}
        className="mb-3 flex items-center gap-2 border-b border-border pb-2 text-left"
      >
        <Icon name="arrow_back" size={18} color="var(--color-foreground)" />
        <span className="text-sm font-semibold text-foreground">{t('tasks.input.reminderPicker.custom')}</span>
      </button>

      {/* Day / Hour / Minute inputs */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-semibold text-foreground">{t('tasks.input.reminderPicker.day')}</span>
          <input
            type="number"
            min={0}
            max={30}
            value={customDay}
            onChange={(e) => setCustomDay(Math.max(0, Math.min(30, parseInt(e.target.value) || 0)))}
            className="h-8 w-16 rounded-(--radius-input) border border-border bg-transparent px-(--spacing-input-x) text-center text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-semibold text-foreground">{t('tasks.input.reminderPicker.hour')}</span>
          <input
            type="number"
            min={0}
            max={23}
            value={customHour}
            onChange={(e) => setCustomHour(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
            className="h-8 w-16 rounded-(--radius-input) border border-border bg-transparent px-(--spacing-input-x) text-center text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-semibold text-foreground">{t('tasks.input.reminderPicker.minute')}</span>
          <input
            type="number"
            min={0}
            max={59}
            value={customMin}
            onChange={(e) => setCustomMin(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
            className="h-8 w-16 rounded-(--radius-input) border border-border bg-transparent px-(--spacing-input-x) text-center text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* "before" label */}
      <div className="mt-2 text-center text-sm font-medium text-foreground">
        {t('tasks.input.reminderPicker.before')}
      </div>

      {/* Save button */}
      <button
        type="button"
        onClick={handleCustomApply}
        className="mt-3 w-full rounded-(--radius-btn) bg-primary px-(--spacing-btn-x) py-(--spacing-btn-y) text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        {t('itemEditor.save')}
      </button>
    </div>
  );
}
