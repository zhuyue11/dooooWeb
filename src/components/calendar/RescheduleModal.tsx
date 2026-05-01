/**
 * RescheduleModal — modal for quickly changing a task/event's date and time.
 *
 * Ported from dooooApp/components/RescheduleModal.tsx.
 * Shows the item title, tappable date/time rows that open inline pickers,
 * and Cancel/Confirm buttons. Disables Confirm until the user makes a change
 * and the selected date/time is not in the past.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/Icon';
import { CalendarPopover } from '@/components/ui/CalendarPopover';
import { TimePicker } from '@/components/ui/TimePicker';
import { TimeOfDayPicker, type TimeOfDay } from '@/components/ui/TimeOfDayPicker';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';

export interface RescheduleItem {
  title: string;
  date?: string | null;
  hasTime?: boolean;
  timeOfDay?: TimeOfDay;
  itemType: 'TASK' | 'EVENT';
  duration?: number | null;
  endDate?: string | null;
}

export interface RescheduleResult {
  date: string; // ISO string
  hasTime: boolean;
  timeOfDay: TimeOfDay;
  timeZone: string | null;
  endDate?: string | null; // shifted endDate for events
}

interface RescheduleModalProps {
  open: boolean;
  item: RescheduleItem | null;
  onConfirm: (result: RescheduleResult) => void;
  onClose: () => void;
}

const VIRTUAL_TIME_LABELS: Record<string, string> = {
  MORNING: 'tasks.timeOfDay.morning',
  AFTERNOON: 'tasks.timeOfDay.afternoon',
  EVENING: 'tasks.timeOfDay.evening',
};

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toNoonUTC(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0));
}

export function RescheduleModal({ open, item, onConfirm, onClose }: RescheduleModalProps) {
  const { t } = useTranslation();
  const locale = i18n.language;

  // Picker state — initialized from item's original values
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [hasTime, setHasTime] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(null);
  const [timeValue, setTimeValue] = useState('09:00'); // HH:mm 24h

  // Sub-picker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimeOfDayPicker, setShowTimeOfDayPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Min date = start of today
  const minDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Initialize from item when modal opens
  useEffect(() => {
    if (open && item) {
      const itemDate = item.date ? new Date(item.date) : new Date();
      setSelectedDate(itemDate);
      setHasTime(item.hasTime === true);
      setTimeOfDay(item.timeOfDay || null);
      if (item.hasTime && item.date) {
        const d = new Date(item.date);
        setTimeValue(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
      } else {
        setTimeValue('09:00');
      }
      setShowDatePicker(false);
      setShowTimeOfDayPicker(false);
      setShowTimePicker(false);
      setIsPending(false);
    }
  }, [open, item]);

  // Detect if user has changed anything from the original
  const hasChanged = useMemo(() => {
    if (!item) return false;
    const originalDate = item.date ? new Date(item.date) : null;
    const originalHasTime = item.hasTime === true;
    const originalTimeOfDay = item.timeOfDay || null;

    // Date changed?
    if (originalDate) {
      if (toDateStr(originalDate) !== toDateStr(selectedDate)) return true;
    }
    // Time mode changed?
    if (hasTime !== originalHasTime) return true;
    // Time-of-day changed?
    if (timeOfDay !== originalTimeOfDay) return true;
    // Exact time changed?
    if (hasTime && originalHasTime && originalDate) {
      const [h, m] = timeValue.split(':').map(Number);
      if (h !== originalDate.getHours() || m !== originalDate.getMinutes()) return true;
    }
    return false;
  }, [item, selectedDate, hasTime, timeOfDay, timeValue]);

  // Check if selected date/time is in the past
  const isInPast = useMemo(() => {
    const now = new Date();
    if (hasTime) {
      const [h, m] = timeValue.split(':').map(Number);
      const check = new Date(selectedDate);
      check.setHours(h, m, 0, 0);
      return check.getTime() < now.getTime();
    }
    // All-day or time-of-day: compare date portion only
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const selectedStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    return selectedStart.getTime() < todayStart.getTime();
  }, [selectedDate, hasTime, timeValue]);

  const canConfirm = hasChanged && !isInPast && !isPending;

  // Format the selected date for display
  const formattedDate = useMemo(() => {
    const weekday = selectedDate.toLocaleDateString(locale, { weekday: 'short' });
    const monthDay = selectedDate.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' });
    return `${weekday}, ${monthDay}`;
  }, [selectedDate, locale]);

  // Format the selected time for display
  const formattedTime = useMemo(() => {
    if (hasTime) {
      const [h, m] = timeValue.split(':').map(Number);
      const d = new Date(2000, 0, 1, h, m);
      return d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
    }
    if (timeOfDay) {
      return t(VIRTUAL_TIME_LABELS[timeOfDay]);
    }
    return t('reschedule.allDay');
  }, [hasTime, timeOfDay, timeValue, locale, t]);

  const handleDateSelect = useCallback((date: Date) => {
    // Preserve existing time
    const newDate = new Date(date);
    if (hasTime) {
      const [h, m] = timeValue.split(':').map(Number);
      newDate.setHours(h, m, 0, 0);
    }
    setSelectedDate(newDate);
    setShowDatePicker(false);
  }, [hasTime, timeValue]);

  const handleTimeOfDaySelect = useCallback((value: TimeOfDay) => {
    setTimeOfDay(value);
    setHasTime(false);
    setShowTimeOfDayPicker(false);
  }, []);

  const handleAtTimePress = useCallback(() => {
    setShowTimeOfDayPicker(false);
    setShowTimePicker(true);
  }, []);

  const handleTimeChange = useCallback((value: string) => {
    setTimeValue(value);
    setHasTime(true);
    setTimeOfDay(null);
  }, []);

  const handleTimeClear = useCallback(() => {
    setHasTime(false);
    setTimeOfDay(null);
    setShowTimePicker(false);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!item || !canConfirm) return;
    setIsPending(true);

    const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let dateIso: string;

    if (hasTime) {
      const [h, m] = timeValue.split(':').map(Number);
      const d = new Date(selectedDate);
      d.setHours(h, m, 0, 0);
      dateIso = d.toISOString();
    } else {
      dateIso = toNoonUTC(selectedDate).toISOString();
    }

    // Shift endDate for events
    let endDate: string | null | undefined;
    if (item.itemType === 'EVENT' && item.endDate && item.date) {
      const originalDate = new Date(item.date);
      const delta = selectedDate.getTime() - originalDate.getTime();
      const newEnd = new Date(new Date(item.endDate).getTime() + delta);
      endDate = hasTime ? newEnd.toISOString() : toNoonUTC(newEnd).toISOString();
    }

    onConfirm({
      date: dateIso,
      hasTime,
      timeOfDay,
      timeZone: hasTime ? deviceTz : null,
      endDate,
    });
  }, [item, canConfirm, hasTime, timeValue, selectedDate, timeOfDay, onConfirm]);

  // Close all sub-pickers on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showDatePicker) { setShowDatePicker(false); e.stopPropagation(); }
        else if (showTimeOfDayPicker) { setShowTimeOfDayPicker(false); e.stopPropagation(); }
        else if (showTimePicker) { setShowTimePicker(false); e.stopPropagation(); }
        else onClose();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, showDatePicker, showTimeOfDayPicker, showTimePicker, onClose]);

  if (!open || !item) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-(--el-modal-overlay)"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-(--radius-modal) bg-(--el-modal-bg) p-6 shadow-(--shadow-modal)"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <h2 className="text-center text-lg font-semibold text-(--el-modal-title-text)">
          {t('reschedule.title')}
        </h2>
        <p className="mt-1 text-center text-sm text-(--el-modal-icon-unselected) line-clamp-2">
          {item.title}
        </p>

        {/* Date row */}
        <div className="relative mt-5">
          <button
            type="button"
            onClick={() => { setShowDatePicker(!showDatePicker); setShowTimeOfDayPicker(false); setShowTimePicker(false); }}
            className="flex w-full items-center gap-3 rounded-(--radius-input) bg-(--el-modal-schedule-border)/15 px-3 py-3 transition-colors hover:bg-(--el-modal-schedule-border)/25"
          >
            <Icon name="event" size={20} color="var(--el-modal-icon-selected)" />
            <span className="flex-1 text-left text-[15px] font-medium text-(--el-modal-title-text)">
              {formattedDate}
            </span>
            <Icon name="chevron_right" size={20} color="var(--el-modal-icon-unselected)" />
          </button>

          {showDatePicker && (
            <CalendarPopover
              selectedDate={selectedDate}
              onSelect={handleDateSelect}
              onClose={() => setShowDatePicker(false)}
              minDate={minDate}
            />
          )}
        </div>

        {/* Time row */}
        <div className="relative mt-2.5">
          <button
            type="button"
            onClick={() => {
              if (hasTime) {
                setShowTimePicker(!showTimePicker);
                setShowTimeOfDayPicker(false);
              } else {
                setShowTimeOfDayPicker(!showTimeOfDayPicker);
                setShowTimePicker(false);
              }
              setShowDatePicker(false);
            }}
            className="flex w-full items-center gap-3 rounded-(--radius-input) bg-(--el-modal-schedule-border)/15 px-3 py-3 transition-colors hover:bg-(--el-modal-schedule-border)/25"
          >
            <Icon name="schedule" size={20} color="var(--el-modal-icon-selected)" />
            <span className="flex-1 text-left text-[15px] font-medium text-(--el-modal-title-text)">
              {formattedTime}
            </span>
            <Icon name="chevron_right" size={20} color="var(--el-modal-icon-unselected)" />
          </button>

          {showTimeOfDayPicker && (
            <TimeOfDayPicker
              selectedTimeOfDay={timeOfDay}
              onSelect={handleTimeOfDaySelect}
              onAtTimePress={handleAtTimePress}
              onClose={() => setShowTimeOfDayPicker(false)}
            />
          )}

          {showTimePicker && (
            <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-(--radius-modal) border border-(--el-popover-border) bg-(--el-popover-bg) p-3 shadow-(--shadow-elevated)">
              <TimePicker
                value={timeValue}
                onChange={handleTimeChange}
                onClear={handleTimeClear}
              />
            </div>
          )}
        </div>

        {/* All day toggle — shown when time is set, to let user clear it */}
        {(hasTime || timeOfDay) && (
          <button
            type="button"
            onClick={() => { setHasTime(false); setTimeOfDay(null); setShowTimePicker(false); setShowTimeOfDayPicker(false); }}
            className="mt-2 flex items-center gap-2 px-1 text-sm text-(--el-modal-icon-unselected) hover:text-(--el-modal-icon-selected)"
          >
            <Icon name="event" size={16} />
            <span>{t('reschedule.allDay')}</span>
          </button>
        )}

        {/* Buttons */}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-(--radius-btn) border border-(--el-modal-cancel-border) py-2.5 text-[15px] font-medium text-(--el-modal-title-text) transition-colors hover:opacity-80"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex-1 rounded-(--radius-btn) py-2.5 text-[15px] font-medium text-white transition-colors disabled:opacity-40"
            style={{ backgroundColor: canConfirm ? 'var(--el-modal-save-bg)' : 'var(--el-modal-cancel-border)' }}
          >
            {isPending ? (
              <div className="mx-auto h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              t('reschedule.confirm')
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
