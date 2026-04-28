import { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { CalendarPopover } from '@/components/ui/CalendarPopover';
import type { Repeat } from '@/types/api';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';

// JS weekday: 0=Sun, 1=Mon, ..., 6=Sat
// Display order: Mon=0, Tue=1, ..., Sun=6
const DISPLAY_TO_JS = [1, 2, 3, 4, 5, 6, 0]; // Mon, Tue, Wed, Thu, Fri, Sat, Sun
const WEEKDAY_SHORT_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

const ORDINAL_OPTIONS = ['first', 'second', 'third', 'fourth', 'last'] as const;
const PERIOD_OPTIONS = ['day', 'week', 'month', 'year'] as const;

interface RepeatPopoverProps {
  selectedRepeat: Repeat | null;
  selectedDate: Date | null;
  onSelect: (repeat: Repeat | null) => void;
  onClose: () => void;
}

export function RepeatPopover({ selectedRepeat, selectedDate, onSelect, onClose }: RepeatPopoverProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'presets' | 'custom'>(
    selectedRepeat?.type === 'custom' ? 'custom' : 'presets'
  );

  // Custom state
  const [interval, setInterval] = useState(selectedRepeat?.interval || 1);
  const [period, setPeriod] = useState<typeof PERIOD_OPTIONS[number]>(
    selectedRepeat?.type === 'custom' ? 'day' : (selectedRepeat?.type || 'day')
  );
  const [weekdays, setWeekdays] = useState<number[]>(selectedRepeat?.weekdays || []);
  const [monthlyMode, setMonthlyMode] = useState<'date' | 'weekday'>(
    selectedRepeat?.weekdayPattern ? 'weekday' : 'date'
  );
  const [ordinal, setOrdinal] = useState<typeof ORDINAL_OPTIONS[number]>(
    selectedRepeat?.weekdayPattern?.week || 'first'
  );
  const [ordinalWeekday, setOrdinalWeekday] = useState(
    selectedRepeat?.weekdayPattern?.weekday ?? (selectedDate ? selectedDate.getDay() : 1)
  );

  // End condition
  const [endType, setEndType] = useState<'none' | 'date' | 'count'>(
    selectedRepeat?.endCondition?.type || 'none'
  );
  const [endDate, setEndDate] = useState<Date | null>(
    selectedRepeat?.endCondition?.endDate ? new Date(selectedRepeat.endCondition.endDate) : null
  );
  const [endCount, setEndCount] = useState(selectedRepeat?.endCondition?.occurrences || 10);
  const [showEndDateCalendar, setShowEndDateCalendar] = useState(false);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const buildEndCondition = (): Repeat['endCondition'] => {
    if (endType === 'date' && endDate) {
      return { type: 'date', endDate: endDate.toISOString() };
    }
    if (endType === 'count') {
      return { type: 'count', occurrences: endCount };
    }
    return undefined;
  };

  const handlePresetSelect = (repeat: Repeat | null) => {
    if (!repeat) {
      onSelect(null);
      return;
    }
    onSelect({ ...repeat, endCondition: buildEndCondition() });
  };

  const handleCustomApply = () => {
    const repeat: Repeat = {
      type: 'custom',
      interval,
    };

    if (period === 'week' && weekdays.length > 0) {
      repeat.weekdays = weekdays;
    } else if (period === 'month' && monthlyMode === 'weekday') {
      repeat.weekdayPattern = { weekday: ordinalWeekday, week: ordinal };
    }

    // Map period to type for non-custom standard intervals
    if (interval === 1) {
      if (period === 'day') repeat.type = 'daily';
      else if (period === 'week') repeat.type = 'weekly';
      else if (period === 'month') repeat.type = 'monthly';
      else if (period === 'year') repeat.type = 'yearly';
    }

    repeat.endCondition = buildEndCondition();
    onSelect(repeat);
  };

  const toggleWeekday = (jsDay: number) => {
    setWeekdays((prev) =>
      prev.includes(jsDay) ? prev.filter((d) => d !== jsDay) : [...prev, jsDay]
    );
  };

  const dateNum = selectedDate?.getDate() || 1;

  // Common presets
  const presets: { label: string; value: Repeat | null }[] = [
    { label: t('tasks.input.doesNotRepeat'), value: null },
    { label: t('tasks.input.everyDay'), value: { type: 'daily', interval: 1 } },
    { label: t('tasks.input.everyWeek'), value: { type: 'weekly', interval: 1 } },
    { label: t('tasks.input.everyWeekday'), value: { type: 'weekly', interval: 1, weekdays: [1, 2, 3, 4, 5] } },
    { label: t('tasks.input.everyMonthOnThe', { date: dateNum }), value: { type: 'monthly', interval: 1 } },
    { label: t('tasks.input.everyYear'), value: { type: 'yearly', interval: 1 } },
  ];

  const isPresetSelected = (preset: Repeat | null) => {
    if (!preset && !selectedRepeat) return true;
    if (!preset || !selectedRepeat) return false;
    return preset.type === selectedRepeat.type &&
      (preset.interval || 1) === (selectedRepeat.interval || 1) &&
      JSON.stringify(preset.weekdays) === JSON.stringify(selectedRepeat.weekdays);
  };

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-1 z-50 w-[320px] rounded-(--radius-modal) border border-border bg-surface shadow-(--shadow-elevated)"
    >
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setMode('presets')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${mode === 'presets' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
        >
          {t('tasks.input.repeatPicker.common')}
        </button>
        <button
          type="button"
          onClick={() => setMode('custom')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${mode === 'custom' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
        >
          {t('tasks.input.repeatPicker.custom')}
        </button>
      </div>

      {mode === 'presets' ? (
        <div className="p-1">
          {presets.map((preset, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handlePresetSelect(preset.value)}
              className={`flex w-full items-center gap-3 rounded-(--radius-card) px-3 py-2 text-sm transition-colors hover:bg-muted/50 ${isPresetSelected(preset.value) ? 'bg-muted font-medium' : ''}`}
            >
              {isPresetSelected(preset.value) && <Icon name="check" size={16} className="text-primary" />}
              <span className={isPresetSelected(preset.value) ? '' : 'pl-[28px]'}>{preset.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="p-4">
          {/* Every [N] [period] */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{t('tasks.input.repeatPicker.every')}</span>
            <input
              type="number"
              min={1}
              max={999}
              value={interval}
              onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
              className="h-8 w-16 rounded-(--radius-input) border border-border bg-transparent px-(--spacing-input-x) text-center text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as typeof PERIOD_OPTIONS[number])}
              className="h-8 rounded-(--radius-input) border border-border bg-transparent px-(--spacing-input-x) text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {PERIOD_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {t(`tasks.input.repeatPicker.${interval > 1 ? p + 's' : p}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Weekday chips (for weekly) */}
          {period === 'week' && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">{t('tasks.input.repeatPicker.onDays')}</p>
              <div className="flex gap-1">
                {WEEKDAY_SHORT_KEYS.map((key, displayIdx) => {
                  const jsDay = DISPLAY_TO_JS[displayIdx];
                  const active = weekdays.includes(jsDay);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleWeekday(jsDay)}
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                        active ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {t(`tasks.input.weekdays.${key}`).charAt(0)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Monthly pattern */}
          {period === 'month' && (
            <div className="mb-4 space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={monthlyMode === 'date'}
                  onChange={() => setMonthlyMode('date')}
                  className="accent-primary"
                />
                <span className="text-foreground">
                  {t('tasks.input.repeatPicker.onTheDate', { date: dateNum })}
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={monthlyMode === 'weekday'}
                  onChange={() => setMonthlyMode('weekday')}
                  className="accent-primary"
                />
                <span className="text-foreground">{t('tasks.input.repeatPicker.onThe')}</span>
                <select
                  value={ordinal}
                  onChange={(e) => setOrdinal(e.target.value as typeof ORDINAL_OPTIONS[number])}
                  disabled={monthlyMode !== 'weekday'}
                  className="h-7 rounded border border-border bg-transparent px-1 text-xs text-foreground disabled:opacity-50"
                >
                  {ORDINAL_OPTIONS.map((o) => (
                    <option key={o} value={o}>{t(`tasks.input.repeatPicker.${o}`)}</option>
                  ))}
                </select>
                <select
                  value={ordinalWeekday}
                  onChange={(e) => setOrdinalWeekday(parseInt(e.target.value))}
                  disabled={monthlyMode !== 'weekday'}
                  className="h-7 rounded border border-border bg-transparent px-1 text-xs text-foreground disabled:opacity-50"
                >
                  {WEEKDAY_SHORT_KEYS.map((key, displayIdx) => (
                    <option key={key} value={DISPLAY_TO_JS[displayIdx]}>
                      {t(`tasks.input.weekdays.${key === 'sun' ? 'sunday' : key === 'mon' ? 'monday' : key === 'tue' ? 'tuesday' : key === 'wed' ? 'wednesday' : key === 'thu' ? 'thursday' : key === 'fri' ? 'friday' : 'saturday'}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {/* End condition */}
          <div className="mb-4 border-t border-border pt-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEndType('none')}
                className={`rounded-(--radius-btn) px-(--spacing-btn-x-sm) py-1 text-xs font-medium transition-colors ${endType === 'none' ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-muted'}`}
              >
                {t('tasks.input.infinite')}
              </button>
              <button
                type="button"
                onClick={() => setEndType('date')}
                className={`rounded-(--radius-btn) px-(--spacing-btn-x-sm) py-1 text-xs font-medium transition-colors ${endType === 'date' ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-muted'}`}
              >
                {t('tasks.input.addRepeatEndDate')}
              </button>
              <button
                type="button"
                onClick={() => setEndType('count')}
                className={`rounded-(--radius-btn) px-(--spacing-btn-x-sm) py-1 text-xs font-medium transition-colors ${endType === 'count' ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-muted'}`}
              >
                {t('tasks.input.addRepeatTimes')}
              </button>
            </div>

            {endType === 'date' && (
              <div className="relative mt-2">
                <button
                  type="button"
                  onClick={() => setShowEndDateCalendar(!showEndDateCalendar)}
                  className="flex items-center gap-2 rounded-(--radius-btn) border border-border px-(--spacing-btn-x) py-(--spacing-btn-y) text-sm text-foreground hover:bg-muted/50"
                >
                  <Icon name="calendar_today" size={16} />
                  {endDate
                    ? endDate.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' })
                    : t('tasks.input.addRepeatEndDate')
                  }
                </button>
                {showEndDateCalendar && (
                  <CalendarPopover
                    selectedDate={endDate}
                    onSelect={(d) => { setEndDate(d); setShowEndDateCalendar(false); }}
                    onClose={() => setShowEndDateCalendar(false)}
                  />
                )}
              </div>
            )}

            {endType === 'count' && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('tasks.input.numberOfTimes')}</span>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={endCount}
                  onChange={(e) => setEndCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-8 w-16 rounded-(--radius-input) border border-border bg-transparent px-(--spacing-input-x) text-center text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            )}
          </div>

          {/* Apply button */}
          <button
            type="button"
            onClick={handleCustomApply}
            className="w-full rounded-(--radius-btn) bg-primary px-(--spacing-btn-x) py-(--spacing-btn-y) text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {t('itemEditor.save')}
          </button>
        </div>
      )}
    </div>
  );
}
