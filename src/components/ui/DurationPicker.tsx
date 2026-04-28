import { useState, useCallback, useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from 'react-i18next';

/**
 * DurationPopover — popover with list view (15m, 30m, 1h, Custom).
 * Presets apply + close immediately.
 * "Custom" swaps to hour/minute inputs with a Save button (matches RepeatPopover).
 */

interface DurationPopoverProps {
  value: number | null;
  onSelect: (minutes: number) => void;
  onClear: () => void;
  onClose: () => void;
}

const STANDARD_DURATIONS = [15, 30, 60];

export function formatDurationDisplay(minutes: number, t: (key: string) => string): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hStr = (t('tasks.input.reminderShort.h') as string).replace('{0}', String(h));
  const mStr = (t('tasks.input.reminderShort.m') as string).replace('{0}', String(m));
  if (h === 0) return mStr;
  if (m === 0) return hStr;
  return `${hStr} ${mStr}`;
}

export function DurationPopover({ value, onSelect, onClear, onClose }: DurationPopoverProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  const isCustomValue = value != null && !STANDARD_DURATIONS.includes(value);
  const [view, setView] = useState<'list' | 'custom'>(isCustomValue ? 'custom' : 'list');

  // Local-only state for custom view — not applied until Save
  const [durHour, setDurHour] = useState(Math.floor((value ?? 30) / 60));
  const [durMinute, setDurMinute] = useState((value ?? 30) % 60);

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const handlePresetSelect = useCallback((mins: number) => {
    onSelect(mins);
    onClose();
  }, [onSelect, onClose]);

  const handleCustomSelect = useCallback(() => {
    // Seed custom inputs from current value
    const v = value ?? 30;
    setDurHour(Math.floor(v / 60));
    setDurMinute(v % 60);
    setView('custom');
  }, [value]);

  const handleCustomApply = useCallback(() => {
    onSelect(durHour * 60 + durMinute);
    onClose();
  }, [durHour, durMinute, onSelect, onClose]);

  const handleClear = useCallback(() => {
    onClear();
    onClose();
  }, [onClear, onClose]);

  // ── List view ──
  if (view === 'list') {
    return (
      <div ref={ref} className="absolute left-0 top-full mt-1 z-50 w-[220px] rounded-(--radius-modal) border border-border bg-surface p-1 shadow-(--shadow-elevated)">
        {STANDARD_DURATIONS.map((mins) => (
          <button
            key={mins}
            type="button"
            onClick={() => handlePresetSelect(mins)}
            className={`flex w-full items-center gap-3 rounded-(--radius-card) px-3 py-2 text-sm transition-colors hover:bg-muted/50 ${value === mins ? 'bg-muted font-medium' : ''}`}
          >
            <span className="flex-1">{t(`tasks.input.durationPicker.${mins === 15 ? '15min' : mins === 30 ? '30min' : '1hour'}`)}</span>
            {value === mins && <Icon name="check" size={16} color="var(--color-primary)" />}
          </button>
        ))}
        <button
          type="button"
          onClick={handleCustomSelect}
          className={`flex w-full items-center gap-3 rounded-(--radius-card) px-3 py-2 text-sm transition-colors hover:bg-muted/50 ${isCustomValue ? 'bg-muted font-medium' : ''}`}
        >
          <span className="flex-1">{t('tasks.input.reminderPicker.custom')}</span>
          {isCustomValue && <Icon name="check" size={16} color="var(--color-primary)" />}
        </button>
        {value != null && (
          <>
            <div className="mx-2 my-1 border-t border-border" />
            <button
              type="button"
              onClick={handleClear}
              className="flex w-full items-center gap-3 rounded-(--radius-card) px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
            >
              <Icon name="close" size={16} />
              <span>{t('itemEditor.clear')}</span>
            </button>
          </>
        )}
      </div>
    );
  }

  // ── Custom view ──
  return (
    <div ref={ref} className="absolute left-0 top-full mt-1 z-50 w-[280px] rounded-(--radius-modal) border border-border bg-surface p-(--spacing-card) shadow-(--shadow-elevated)">
      {/* Back button */}
      <button
        type="button"
        onClick={() => setView('list')}
        className="mb-3 flex items-center gap-2 text-left"
      >
        <Icon name="arrow_back" size={18} color="var(--color-foreground)" />
        <span className="text-sm font-semibold text-foreground">{t('tasks.input.reminderPicker.custom')}</span>
      </button>

      {/* Hour / Minute inputs */}
      <div className="mb-3 flex items-center justify-center gap-4">
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            max={23}
            value={durHour}
            onChange={(e) => setDurHour(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
            className="h-8 w-16 rounded-(--radius-input) border border-border bg-transparent px-(--spacing-input-x) text-center text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <span className="text-sm font-medium text-muted-foreground">{t('tasks.input.durationPicker.hour')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            max={59}
            value={durMinute}
            onChange={(e) => setDurMinute(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
            className="h-8 w-16 rounded-(--radius-input) border border-border bg-transparent px-(--spacing-input-x) text-center text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <span className="text-sm font-medium text-muted-foreground">{t('tasks.input.durationPicker.minute')}</span>
        </div>
      </div>

      {/* Save button */}
      <button
        type="button"
        onClick={handleCustomApply}
        className="w-full rounded-(--radius-btn) bg-primary px-(--spacing-btn-x) py-(--spacing-btn-y) text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        {t('itemEditor.save')}
      </button>
    </div>
  );
}
