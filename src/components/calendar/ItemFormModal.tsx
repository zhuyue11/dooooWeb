import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useItemMutations } from '@/hooks/useItemMutations';
import type { ItemFormDraft } from '@/pages/items/ItemEditorPage';
import { toNoonUTC, combineDateAndTime, formatDateDisplay } from '@/utils/dateForm';
import type { CreateTaskRequest, CreateEventRequest } from '@/types/api';
import { useTranslation } from 'react-i18next';

// ── Types ──

type ItemType = 'TASK' | 'EVENT';
type TimeOfDay = 'MORNING' | 'AFTERNOON' | 'EVENING' | null;

interface ItemFormModalProps {
  defaultDate?: Date;
  onClose: () => void;
  onSaved: () => void;
}

// ── Calendar Popover ──

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

function CalendarPopover({ selectedDate, onSelect, onClose }: {
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
  onClose: () => void;
}) {
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
  // Monday=0 based offset
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
      className="absolute left-6 right-6 top-full mt-2 z-50 rounded-xl border border-border bg-surface p-4 shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
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

// ── Inline Time Picker ──

function InlineTimePicker({ value, onChange, onClear }: {
  value: string; // "HH:mm" 24h format
  onChange: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon name="schedule" size={20} color="var(--color-primary)" className="shrink-0" />
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-border bg-transparent px-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      <button type="button" onClick={onClear} className="ml-auto text-muted-foreground hover:text-foreground">
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}

// ── Main Modal ──

export function ItemFormModal({ defaultDate, onClose, onSaved }: ItemFormModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createTaskMutation, createEventMutation } = useItemMutations();
  const [isClosing, setIsClosing] = useState(false);

  // Form state
  const [itemType, setItemType] = useState<ItemType>('TASK');
  const [title, setTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(defaultDate || null);
  const [showCalendar, setShowCalendar] = useState(false);

  // Task time state
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(null);
  const [hasTime, setHasTime] = useState(false);
  const [timeValue, setTimeValue] = useState('09:00'); // "HH:mm" 24h format

  // Event time state
  const [startTimeValue, setStartTimeValue] = useState('10:00');
  const [endTimeValue, setEndTimeValue] = useState('11:00');
  const [hasStartTime, setHasStartTime] = useState(false);
  const [hasEndTime, setHasEndTime] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // Escape to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Save button state
  const isTitleValid = title.trim().length > 0;
  const isTask = itemType === 'TASK';
  const isPending = createTaskMutation.isPending || createEventMutation.isPending;
  const eventReady = !isTask && isTitleValid && !!selectedDate;
  const taskReady = isTask && isTitleValid;
  const saveDisabled = isPending || (isTask ? !taskReady : !eventReady);
  const saveText = isTask
    ? selectedDate ? t('calendarPage.form.saveTask') : t('calendarPage.form.addToTodo')
    : t('calendarPage.form.saveEvent');

  const handleItemTypeChange = useCallback((type: ItemType) => {
    setItemType(type);
    // Reset time states when switching
    if (type === 'EVENT') {
      setTimeOfDay(null);
      setHasTime(false);
    } else {
      setHasStartTime(false);
      setHasEndTime(false);
    }
  }, []);

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    setShowCalendar(false);
  }, []);

  const handleClearDate = useCallback(() => {
    setSelectedDate(null);
    setShowCalendar(false);
  }, []);

  const handleTimeClick = useCallback(() => {
    if (hasTime) return;
    setHasTime(true);
    setTimeOfDay(null);
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(Math.round(now.getMinutes() / 5) * 5 % 60).padStart(2, '0');
    setTimeValue(`${h}:${m}`);
  }, [hasTime]);

  const handleClearTime = useCallback(() => {
    setHasTime(false);
    setTimeOfDay(null);
  }, []);

  const handleMoreOptions = useCallback(() => {
    setIsClosing(true);
    const draft: ItemFormDraft = {
      itemType,
      title,
      selectedDate: selectedDate?.toISOString() ?? null,
      hasTime,
      timeValue,
      timeOfDay,
      hasStartTime,
      startTimeValue,
      hasEndTime,
      endTimeValue,
    };
    setTimeout(() => {
      onClose();
      navigate('/items/new', { state: { draft } });
    }, 150);
  }, [itemType, title, selectedDate, hasTime, timeValue, timeOfDay, hasStartTime, startTimeValue, hasEndTime, endTimeValue, onClose, navigate]);

  const handleSubmit = useCallback(async () => {
    if (!isTitleValid) return;

    const trimmedTitle = title.trim();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const dateOnly = selectedDate
      ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
      : undefined;

    if (isTask) {
      let dateStr: string | undefined;
      if (selectedDate) {
        dateStr = hasTime
          ? combineDateAndTime(dateOnly!, timeValue).toISOString()
          : toNoonUTC(selectedDate).toISOString();
      }

      const req: CreateTaskRequest = {
        title: trimmedTitle,
        date: dateStr,
        hasTime,
        timeOfDay: !hasTime ? timeOfDay ?? undefined : undefined,
        timeMode: 'FIXED',
        timeZone: hasTime ? tz : undefined,
        dateType: 'SCHEDULED',
        showInTodoWhenOverdue: true,
        setToDoneAutomatically: false,
      };

      await createTaskMutation.mutateAsync(req);
    } else {
      let dateStr: string | undefined;
      let endDateStr: string | undefined;

      if (selectedDate) {
        dateStr = hasStartTime
          ? combineDateAndTime(dateOnly!, startTimeValue).toISOString()
          : toNoonUTC(selectedDate).toISOString();

        if (hasEndTime) {
          endDateStr = combineDateAndTime(dateOnly!, endTimeValue).toISOString();
        }
      }

      const req: CreateEventRequest = {
        title: trimmedTitle,
        date: dateStr,
        hasTime: hasStartTime,
        timeZone: hasStartTime ? tz : undefined,
        endDate: endDateStr,
      };

      await createEventMutation.mutateAsync(req);
    }

    onSaved();
  }, [
    isTitleValid, title, isTask, selectedDate, hasTime, timeValue,
    timeOfDay, hasStartTime, startTimeValue, hasEndTime, endTimeValue,
    createTaskMutation, createEventMutation, onSaved,
  ]);

  return createPortal(
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 ${isClosing ? 'animate-backdrop-out' : ''}`} onClick={onClose}>
      <div
        className={`relative w-full max-w-[560px] rounded-xl bg-surface shadow-[0_8px_32px_rgba(0,0,0,0.25)] ${isClosing ? 'animate-modal-exit' : 'animate-modal-enter'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: type toggle + close */}
        <div className="flex items-center justify-between px-6 pt-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleItemTypeChange('TASK')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors ${
                isTask
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              <Icon name="check_circle" size={16} />
              {t('calendarPage.form.task')}
            </button>
            <button
              type="button"
              onClick={() => handleItemTypeChange('EVENT')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors ${
                !isTask
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              <Icon name="calendar_today" size={16} />
              {t('calendarPage.form.event')}
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-6 py-4">
          {/* Title */}
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('calendarPage.form.titlePlaceholder')}
            className="bg-transparent text-xl font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !saveDisabled) handleSubmit();
            }}
          />

          {/* Schedule card */}
          <div className="rounded-xl border border-border">
            {/* Date row */}
            <div className="relative">
            <button
              type="button"
              onClick={() => setShowCalendar(!showCalendar)}
              className="flex w-full items-center gap-3.5 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
            >
              <Icon name="calendar_today" size={20} color={selectedDate ? 'var(--color-primary)' : 'var(--color-muted-foreground)'} />
              {selectedDate ? (
                <>
                  <span className="text-sm font-medium text-foreground">{formatDateDisplay(selectedDate)}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleClearDate(); }}
                    className="ml-auto text-muted-foreground hover:text-foreground"
                  >
                    <Icon name="close" size={16} />
                  </button>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">{t('calendarPage.form.addDate')}</span>
              )}
            </button>

            {/* Calendar popover — positioned below date row */}
            {showCalendar && (
              <CalendarPopover
                selectedDate={selectedDate}
                onSelect={handleDateSelect}
                onClose={() => setShowCalendar(false)}
              />
            )}
            </div>

            {/* Task: Time row */}
            {isTask && (
              <div className="px-4 py-2.5">
                {hasTime ? (
                  <InlineTimePicker
                    value={timeValue}
                    onChange={setTimeValue}
                    onClear={handleClearTime}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={handleTimeClick}
                    className="flex w-full items-center gap-3.5 text-left"
                  >
                    <Icon name="schedule" size={20} color="var(--color-muted-foreground)" />
                    <span className="text-sm text-muted-foreground">{t('calendarPage.form.addTime')}</span>
                  </button>
                )}
              </div>
            )}

            {/* Event: Start/End time rows */}
            {!isTask && (
              <>
                <div className="px-4 py-2.5">
                  {hasStartTime ? (
                    <InlineTimePicker
                      value={startTimeValue}
                      onChange={setStartTimeValue}
                      onClear={() => setHasStartTime(false)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setHasStartTime(true)}
                      className="flex w-full items-center gap-3.5 text-left"
                    >
                      <Icon name="schedule" size={20} color="var(--color-muted-foreground)" />
                      <span className="text-sm text-muted-foreground">{t('calendarPage.form.startTime')}</span>
                    </button>
                  )}
                </div>
                <div className="px-4 py-2.5">
                  {hasEndTime ? (
                    <InlineTimePicker
                      value={endTimeValue}
                      onChange={setEndTimeValue}
                      onClear={() => setHasEndTime(false)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setHasEndTime(true)}
                      className="flex w-full items-center gap-3.5 text-left"
                    >
                      <Icon name="schedule" size={20} color="var(--color-muted-foreground)" />
                      <span className="text-sm text-muted-foreground">{t('calendarPage.form.endTime')}</span>
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Event: placeholder rows */}
            {!isTask && (
              <>
                <div className="flex items-center gap-3.5 px-4 py-2.5 text-muted-foreground opacity-50">
                  <Icon name="person_add" size={20} />
                  <span className="text-sm">{t('calendarPage.form.addGuests')}</span>
                </div>
                <div className="flex items-center gap-3.5 px-4 py-2.5 text-muted-foreground opacity-50">
                  <Icon name="videocam" size={20} />
                  <span className="text-sm">{t('calendarPage.form.addMeetingLink')}</span>
                </div>
                <div className="flex items-center gap-3.5 px-4 py-2.5 text-muted-foreground opacity-50">
                  <Icon name="location_on" size={20} />
                  <span className="text-sm">{t('calendarPage.form.addLocation')}</span>
                </div>
              </>
            )}

            {/* More options */}
            <button
              type="button"
              onClick={handleMoreOptions}
              className="flex w-full items-center gap-3.5 px-4 py-2.5 text-muted-foreground transition-colors hover:bg-muted/50"
            >
              <Icon name="tune" size={20} />
              <span className="text-sm font-medium">{t('calendarPage.form.moreOptions')}</span>
              <Icon name="expand_more" size={18} />
            </button>

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {t('calendarPage.form.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saveDisabled}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              saveText
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
