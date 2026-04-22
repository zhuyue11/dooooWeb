import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { CalendarPopover } from '@/components/ui/CalendarPopover';
import { TimePicker } from '@/components/ui/TimePicker';
import { TimeOfDayPicker } from '@/components/ui/TimeOfDayPicker';
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
  groupId?: string;
  onClose: () => void;
  onSaved: () => void;
}

// ── Main Modal ──

export function ItemFormModal({ defaultDate, groupId, onClose, onSaved }: ItemFormModalProps) {
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
  const [showTimeOfDayPicker, setShowTimeOfDayPicker] = useState(false);

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
      groupId,
    };
    setTimeout(() => {
      onClose();
      navigate('/items/new', { state: { draft } });
    }, 150);
  }, [itemType, title, selectedDate, hasTime, timeValue, timeOfDay, hasStartTime, startTimeValue, hasEndTime, endTimeValue, groupId, onClose, navigate]);

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
        groupId,
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
        groupId,
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
              <div className="relative px-4 py-2.5">
                {hasTime ? (
                  <TimePicker
                    value={timeValue}
                    onChange={setTimeValue}
                    onClear={handleClearTime}
                  />
                ) : timeOfDay ? (
                  <button
                    type="button"
                    onClick={() => setShowTimeOfDayPicker(true)}
                    className="flex w-full items-center gap-3.5 text-left"
                  >
                    <Icon
                      name={timeOfDay === 'MORNING' ? 'wb_sunny' : timeOfDay === 'AFTERNOON' ? 'wb_cloudy' : 'nightlight'}
                      size={20}
                      color="var(--color-primary)"
                    />
                    <span className="text-sm font-medium text-foreground">
                      {t(`tasks.timeOfDay.${timeOfDay.toLowerCase()}`)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setTimeOfDay(null); }}
                      className="ml-auto text-muted-foreground hover:text-foreground"
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowTimeOfDayPicker(true)}
                    className="flex w-full items-center gap-3.5 text-left"
                  >
                    <Icon name="schedule" size={20} color="var(--color-muted-foreground)" />
                    <span className="text-sm text-muted-foreground">{t('calendarPage.form.addTime')}</span>
                  </button>
                )}
                {showTimeOfDayPicker && (
                  <TimeOfDayPicker
                    selectedTimeOfDay={timeOfDay}
                    onSelect={(value) => { setTimeOfDay(value); setHasTime(false); }}
                    onAtTimePress={() => { handleTimeClick(); }}
                    onClose={() => setShowTimeOfDayPicker(false)}
                  />
                )}
              </div>
            )}

            {/* Event: Start/End time rows */}
            {!isTask && (
              <>
                <div className="px-4 py-2.5">
                  {hasStartTime ? (
                    <TimePicker
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
                    <TimePicker
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
