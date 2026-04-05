import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTask, getEvent } from '@/lib/api';
import { useItemMutations } from '@/hooks/useItemMutations';
import { useCategories } from '@/hooks/useCategories';
import { Icon } from '@/components/ui/Icon';
import { CalendarPopover } from '@/components/ui/CalendarPopover';
import { RepeatPopover } from '@/components/ui/RepeatPopover';
import { TimePicker } from '@/components/ui/TimePicker';
import { TimeOfDayPicker } from '@/components/ui/TimeOfDayPicker';
import { TimeZonePicker } from '@/components/ui/TimeZonePicker';
import { DurationPopover, formatDurationDisplay } from '@/components/ui/DurationPicker';
import { ReminderPopover, formatReminderDisplay } from '@/components/ui/ReminderPicker';
import { toNoonUTC, combineDateAndTime } from '@/utils/dateForm';
import { getRepeatDisplayText } from '@/utils/repeatDisplay';
import type { CreateTaskRequest, CreateEventRequest, UpdateTaskRequest, UpdateEventRequest, Task, Event as ApiEvent, Repeat } from '@/types/api';
import { useTranslation } from 'react-i18next';

// ── Types ──

type ItemType = 'TASK' | 'EVENT';
type TimeOfDay = 'MORNING' | 'AFTERNOON' | 'EVENING' | null;
type ActivePopover = 'date' | 'priority' | 'category' | 'repeat' | 'duration' | 'reminder1' | 'reminder2' | null;

export interface ItemFormDraft {
  itemType: ItemType;
  title: string;
  selectedDate: string | null;
  hasTime: boolean;
  timeValue: string;
  timeOfDay: TimeOfDay;
  hasStartTime: boolean;
  startTimeValue: string;
  hasEndTime: boolean;
  endTimeValue: string;
  repeat?: Repeat | null;
  duration?: number | null;
  firstReminderMinutes?: number | null;
  secondReminderMinutes?: number | null;
}

// ── Popover wrapper (click-outside-to-close) ──

function PopoverWrapper({ children, onClose, className }: {
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div ref={ref} className={`absolute left-0 top-full mt-1 z-50 rounded-xl border border-border bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.2)] ${className || ''}`}>
      {children}
    </div>
  );
}

// ── Field row component ──

function FieldRow({ icon, text, onClick, active, suffix }: {
  icon: string;
  text: string;
  onClick?: () => void;
  active?: boolean;
  suffix?: React.ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick(); }}
      className="flex w-full cursor-pointer items-center gap-3.5 px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
    >
      <Icon name={icon} size={20} color={active ? 'var(--color-primary)' : 'var(--color-muted-foreground)'} />
      <span className={`flex-1 text-sm ${active ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{text}</span>
      {suffix}
    </div>
  );
}

// ── Priority popover ──

const PRIORITY_OPTIONS = [
  { value: 'URGENT', key: 'todoPage.priorityUrgent', color: 'text-red-500' },
  { value: 'HIGH', key: 'todoPage.priorityHigh', color: 'text-orange-500' },
  { value: 'MEDIUM', key: 'todoPage.priorityMedium', color: 'text-yellow-500' },
  { value: 'LOW', key: 'todoPage.priorityLow', color: 'text-blue-500' },
] as const;

function PriorityPopover({ selected, onSelect, onClear, onClose }: {
  selected: string;
  onSelect: (value: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <PopoverWrapper onClose={onClose} className="w-[200px] p-1">
      {PRIORITY_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onSelect(opt.value)}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50 ${selected === opt.value ? 'bg-muted font-medium' : ''}`}
        >
          <Icon name="flag" size={16} className={opt.color} />
          <span>{t(opt.key)}</span>
        </button>
      ))}
      {selected && (
        <>
          <div className="mx-2 my-1 border-t border-border" />
          <button
            type="button"
            onClick={onClear}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
          >
            <Icon name="close" size={16} />
            <span>{t('itemEditor.clear')}</span>
          </button>
        </>
      )}
    </PopoverWrapper>
  );
}

// ── Category popover ──

function CategoryPopover({ categories, selected, onSelect, onClear, onClose }: {
  categories: { id: string; name: string; color: string }[];
  selected: string;
  onSelect: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <PopoverWrapper onClose={onClose} className="w-[220px] max-h-[280px] overflow-y-auto p-1">
      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onSelect(cat.id)}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50 ${selected === cat.id ? 'bg-muted font-medium' : ''}`}
        >
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
          <span className="truncate">{cat.name}</span>
        </button>
      ))}
      {selected && (
        <>
          <div className="mx-2 my-1 border-t border-border" />
          <button
            type="button"
            onClick={onClear}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
          >
            <Icon name="close" size={16} />
            <span>{t('itemEditor.clear')}</span>
          </button>
        </>
      )}
    </PopoverWrapper>
  );
}

// ── Main component ──

export function ItemEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { data: categories } = useCategories();
  const {
    createTaskMutation, createEventMutation,
    updateTaskMutation, updateEventMutation,
  } = useItemMutations();

  const isEditMode = !!id;
  const typeParam = searchParams.get('type') || 'task';

  // Get draft from location.state (passed from modal "More Options")
  const draft = (location.state as { draft?: ItemFormDraft } | null)?.draft;

  // ── Form state ──
  const [itemType, setItemType] = useState<ItemType>(draft?.itemType || (typeParam === 'event' ? 'EVENT' : 'TASK'));
  const [title, setTitle] = useState(draft?.title || '');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    draft?.selectedDate ? new Date(draft.selectedDate) : null,
  );
  const [hasTime, setHasTime] = useState(draft?.hasTime ?? false);
  const [timeValue, setTimeValue] = useState(draft?.timeValue || '09:00');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(draft?.timeOfDay || null);

  // Event time
  const [hasStartTime, setHasStartTime] = useState(draft?.hasStartTime ?? false);
  const [startTimeValue, setStartTimeValue] = useState(draft?.startTimeValue || '10:00');
  const [hasEndTime, setHasEndTime] = useState(draft?.hasEndTime ?? false);
  const [endTimeValue, setEndTimeValue] = useState(draft?.endTimeValue || '11:00');

  // Timezone
  const browserTimeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const [selectedTimeZone, setSelectedTimeZone] = useState(browserTimeZone);
  const [eventEndTimeZone, setEventEndTimeZone] = useState<string | null>(null);
  const [showTimeZonePicker, setShowTimeZonePicker] = useState(false);
  const [timeZonePickerTarget, setTimeZonePickerTarget] = useState<'start' | 'end'>('start');

  // Additional fields
  const [priority, setPriority] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [locationValue, setLocationValue] = useState('');
  const [selectedRepeat, setSelectedRepeat] = useState<Repeat | null>(draft?.repeat || null);
  const [duration, setDuration] = useState<number | null>(draft?.duration ?? null);
  const [firstReminder, setFirstReminder] = useState<number | undefined>(
    draft?.firstReminderMinutes != null ? draft.firstReminderMinutes : undefined,
  );
  const [secondReminder, setSecondReminder] = useState<number | undefined>(
    draft?.secondReminderMinutes != null ? draft.secondReminderMinutes : undefined,
  );
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Task advanced options (More Options)
  const [dateType, setDateType] = useState<'SCHEDULED' | 'DUE'>('SCHEDULED');
  const [showInTodoWhenOverdue, setShowInTodoWhenOverdue] = useState(true);
  const [setToDoneAutomatically, setSetToDoneAutomatically] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [activeInfoPanel, setActiveInfoPanel] = useState<'dateType' | 'overdue' | 'autoDone' | null>(null);

  // UI state
  const [activePopover, setActivePopover] = useState<ActivePopover>(null);
  const [editingLocation, setEditingLocation] = useState(false);
  const [repeatInfoMessage, setRepeatInfoMessage] = useState<string | null>(null);
  const [showTimeOfDayPicker, setShowTimeOfDayPicker] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);

  // ── Load existing item for edit mode ──
  const { data: existingItem } = useQuery({
    queryKey: [typeParam === 'event' ? 'event' : 'task', id],
    queryFn: () => typeParam === 'event' ? getEvent(id!) : getTask(id!),
    enabled: isEditMode,
    retry: false,
  });

  // Populate form when existing item loads
  useEffect(() => {
    if (!existingItem) return;
    const isTask = typeParam !== 'event';
    setItemType(isTask ? 'TASK' : 'EVENT');
    setTitle(existingItem.title);
    setDescription(existingItem.description || '');
    if (existingItem.date) {
      setSelectedDate(new Date(existingItem.date));
      if (existingItem.hasTime) {
        const d = new Date(existingItem.date);
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        if (isTask) {
          setHasTime(true);
          setTimeValue(`${h}:${m}`);
        } else {
          setHasStartTime(true);
          setStartTimeValue(`${h}:${m}`);
        }
      }
    }
    // Load timezone
    if (existingItem.timeZone) setSelectedTimeZone(existingItem.timeZone);
    if (isTask) {
      const task = existingItem as Task;
      setPriority(task.priority?.toUpperCase() || '');
      setCategoryId(task.categoryId || '');
      setTimeOfDay(task.timeOfDay || null);
      setLocationValue(task.location || '');
      setSelectedRepeat(task.repeat || null);
      setTags(task.tags || []);
      if (task.dateType) setDateType(task.dateType);
      if (task.showInTodoWhenOverdue != null) setShowInTodoWhenOverdue(task.showInTodoWhenOverdue);
      if (task.setToDoneAutomatically != null) setSetToDoneAutomatically(task.setToDoneAutomatically);
      setDuration(task.duration ?? null);
      setFirstReminder(task.firstReminderMinutes != null ? task.firstReminderMinutes : undefined);
      setSecondReminder(task.secondReminderMinutes != null ? task.secondReminderMinutes : undefined);
    } else {
      const event = existingItem as ApiEvent;
      setLocationValue(event.location || '');
      if (event.endTimeZone) setEventEndTimeZone(event.endTimeZone);
      if (event.endDate) {
        setHasEndTime(true);
        const ed = new Date(event.endDate);
        setEndTimeValue(`${String(ed.getHours()).padStart(2, '0')}:${String(ed.getMinutes()).padStart(2, '0')}`);
      }
    }
  }, [existingItem, typeParam]);

  // Focus title on mount (create mode only)
  useEffect(() => {
    if (!isEditMode) titleRef.current?.focus();
  }, [isEditMode]);

  // Focus location input when entering edit mode
  useEffect(() => {
    if (editingLocation) locationRef.current?.focus();
  }, [editingLocation]);


  // ── Computed ──
  const isTask = itemType === 'TASK';
  const isTitleValid = title.trim().length > 0;
  const isPending = createTaskMutation.isPending || createEventMutation.isPending ||
    updateTaskMutation.isPending || updateEventMutation.isPending;
  const saveDisabled = isPending || !isTitleValid;

  const isDateInPast = useMemo(() => {
    if (!selectedDate) return false;
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const dateMidnight = new Date(selectedDate);
    dateMidnight.setHours(0, 0, 0, 0);
    return dateMidnight.getTime() < todayMidnight.getTime();
  }, [selectedDate]);
  const isTaskTimeInPast = (() => {
    if (!selectedDate) return false;
    if (hasTime) {
      const [h, m] = timeValue.split(':').map(Number);
      const taskTime = new Date(selectedDate);
      taskTime.setHours(h, m, 0, 0);
      return taskTime.getTime() < Date.now();
    }
    return isDateInPast;
  })();
  const isRepeatDisabled = isDateInPast && !selectedRepeat;

  // Clear reminders when task time moves to the past
  useEffect(() => {
    if (isTaskTimeInPast) {
      setFirstReminder(undefined);
      setSecondReminder(undefined);
    }
  }, [isTaskTimeInPast]);

  const headerTitle = isEditMode
    ? (isTask ? t('itemEditor.editTask') : t('itemEditor.editEvent'))
    : (isTask ? t('itemEditor.newTask') : t('itemEditor.newEvent'));

  // ── Handlers ──
  const handleClose = useCallback(() => navigate(-1), [navigate]);

  const handleItemTypeChange = useCallback((type: ItemType) => {
    setItemType(type);
    if (type === 'EVENT') {
      setTimeOfDay(null);
      setHasTime(false);
      setDuration(null);
      setFirstReminder(undefined);
      setSecondReminder(undefined);
    } else {
      setHasStartTime(false);
      setHasEndTime(false);
    }
  }, []);

  const togglePopover = useCallback((popover: ActivePopover) => {
    setActivePopover((prev) => prev === popover ? null : popover);
  }, []);

  const closePopover = useCallback(() => setActivePopover(null), []);

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    setSelectedRepeat(null);
    setActivePopover(null);
  }, []);

  const handleClearDate = useCallback(() => {
    setSelectedDate(null);
    setActivePopover(null);
    setHasTime(false);
    setTimeOfDay(null);
    setHasStartTime(false);
    setHasEndTime(false);
    setSelectedRepeat(null);
    setDuration(null);
    setFirstReminder(undefined);
    setSecondReminder(undefined);
  }, []);

  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput('');
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!isTitleValid) return;

    const trimmedTitle = title.trim();
    const tz = selectedTimeZone;
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

      if (isEditMode) {
        const req: UpdateTaskRequest = {
          title: trimmedTitle,
          description: description || undefined,
          date: dateStr ?? null,
          hasTime,
          timeOfDay: !hasTime ? timeOfDay ?? undefined : undefined,
          timeZone: hasTime ? tz : undefined,
          dateType,
          showInTodoWhenOverdue,
          setToDoneAutomatically,
          priority: priority || undefined,
          categoryId: categoryId || undefined,
          location: locationValue || undefined,
          repeat: selectedRepeat ?? null,
          duration: duration ?? null,
          firstReminderMinutes: firstReminder ?? null,
          secondReminderMinutes: secondReminder ?? null,
        };
        await updateTaskMutation.mutateAsync({ id: id!, data: req });
      } else {
        const req: CreateTaskRequest = {
          title: trimmedTitle,
          description: description || undefined,
          date: dateStr,
          hasTime,
          timeOfDay: !hasTime ? timeOfDay ?? undefined : undefined,
          timeMode: 'FIXED',
          timeZone: hasTime ? tz : undefined,
          dateType,
          showInTodoWhenOverdue,
          setToDoneAutomatically,
          priority: priority || undefined,
          categoryId: categoryId || undefined,
          location: locationValue || undefined,
          repeat: selectedRepeat ?? undefined,
          duration: duration ?? undefined,
          firstReminderMinutes: firstReminder,
          secondReminderMinutes: secondReminder,
        };
        await createTaskMutation.mutateAsync(req);
      }
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

      if (isEditMode) {
        const req: UpdateEventRequest = {
          title: trimmedTitle,
          description: description || undefined,
          date: dateStr ?? null,
          hasTime: hasStartTime,
          timeZone: hasStartTime ? tz : undefined,
          endTimeZone: hasEndTime && eventEndTimeZone ? eventEndTimeZone : undefined,
          endDate: endDateStr ?? null,
          location: locationValue || undefined,
        };
        await updateEventMutation.mutateAsync({ id: id!, data: req });
      } else {
        const req: CreateEventRequest = {
          title: trimmedTitle,
          date: dateStr,
          hasTime: hasStartTime,
          timeZone: hasStartTime ? tz : undefined,
          endTimeZone: hasEndTime && eventEndTimeZone ? eventEndTimeZone : undefined,
          endDate: endDateStr,
        };
        await createEventMutation.mutateAsync(req);
      }
    }

    navigate(-1);
  }, [
    isTitleValid, title, description, isTask, selectedDate, hasTime, timeValue,
    timeOfDay, hasStartTime, startTimeValue, hasEndTime, endTimeValue,
    priority, categoryId, locationValue, selectedRepeat, duration, firstReminder, secondReminder,
    dateType, showInTodoWhenOverdue, setToDoneAutomatically,
    isEditMode, id, createTaskMutation, createEventMutation, updateTaskMutation, updateEventMutation,
    navigate, selectedTimeZone, eventEndTimeZone,
  ]);

  // ── Date display ─���
  const dateDisplay = selectedDate
    ? selectedDate.toLocaleDateString(i18n.language, { weekday: 'short', month: 'short', day: 'numeric' })
    : null;

  // ── Repeat display ──
  const repeatDisplay = selectedRepeat ? getRepeatDisplayText(selectedRepeat, selectedDate, t) : null;

  // ── Priority display ──
  const priorityDisplay = priority
    ? t(`todoPage.priority${priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase()}`)
    : null;

  return (
    <div className="animate-page-enter" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* ── Header bar ── */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface shadow-sm text-muted-foreground hover:bg-muted"
          >
            <Icon name="close" size={18} />
          </button>
          <h1 className="text-xl font-bold text-foreground">{headerTitle}</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Type toggle */}
          <div className="flex rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => handleItemTypeChange('TASK')}
              className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                isTask ? 'bg-surface shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
            >
              <Icon name="check_circle" size={14} />
              {t('calendarPage.form.task')}
            </button>
            <button
              type="button"
              onClick={() => handleItemTypeChange('EVENT')}
              className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                !isTask ? 'bg-surface shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
            >
              <Icon name="calendar_today" size={14} />
              {t('calendarPage.form.event')}
            </button>
          </div>
          {/* Save */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saveDisabled}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_2px_8px_rgba(54,14,255,0.25)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              t('itemEditor.save')
            )}
          </button>
        </div>
      </div>

      {/* ── Title + Description card ── */}
      <div className="mb-4 rounded-xl bg-surface p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('itemEditor.addTitle')}
          className="mb-3 w-full bg-transparent text-[22px] font-bold text-foreground placeholder:text-muted-foreground focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault();
          }}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('itemEditor.addDescription')}
          rows={3}
          className="w-full resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_446px]">
        {/* Left column: Schedule card */}
        <div className="rounded-xl bg-surface p-1 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {/* Date */}
          <div className="relative">
            <div
              role="button"
              tabIndex={0}
              onClick={() => togglePopover('date')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') togglePopover('date'); }}
              className="flex w-full cursor-pointer items-center gap-3.5 px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
            >
              <Icon name="calendar_today" size={20} color={selectedDate ? 'var(--color-primary)' : 'var(--color-muted-foreground)'} />
              {selectedDate ? (
                <>
                  <span className="flex-1 text-sm font-medium text-foreground">{dateDisplay}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleClearDate(); }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Icon name="close" size={16} />
                  </button>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">{t('itemEditor.addDate')}</span>
              )}
            </div>
            {activePopover === 'date' && (
              <CalendarPopover
                selectedDate={selectedDate}
                onSelect={handleDateSelect}
                onClose={closePopover}
              />
            )}
          </div>

          {/* Time (task) */}
          {isTask && selectedDate && (
            <div className="relative px-4 py-2.5">
              {hasTime ? (
                <TimePicker
                  value={timeValue}
                  onChange={setTimeValue}
                  onClear={() => { setHasTime(false); setTimeOfDay(null); setDuration(null); setFirstReminder(undefined); setSecondReminder(undefined); setActivePopover(null); }}
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
                  onAtTimePress={() => { setHasTime(true); setTimeOfDay(null); }}
                  onClose={() => setShowTimeOfDayPicker(false)}
                />
              )}
            </div>
          )}

          {/* Start/end time (event) */}
          {!isTask && selectedDate && (
            <>
              <div className="px-4 py-2.5">
                {hasStartTime ? (
                  <TimePicker
                    value={startTimeValue}
                    onChange={setStartTimeValue}
                    onClear={() => setHasStartTime(false)}
                  />
                ) : (
                  <button type="button" onClick={() => setHasStartTime(true)} className="flex w-full items-center gap-3.5 text-left">
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
                  <button type="button" onClick={() => setHasEndTime(true)} className="flex w-full items-center gap-3.5 text-left">
                    <Icon name="schedule" size={20} color="var(--color-muted-foreground)" />
                    <span className="text-sm text-muted-foreground">{t('calendarPage.form.endTime')}</span>
                  </button>
                )}
              </div>
            </>
          )}

          {/* Timezone — inline for events only (task timezone moved to More Options) */}
          {selectedDate && !isTask && hasStartTime && (
            <>
              <div className="relative px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => { setTimeZonePickerTarget('start'); setShowTimeZonePicker(true); }}
                  className="flex w-full items-center gap-3.5 text-left"
                >
                  <Icon name="public" size={20} color={selectedTimeZone !== browserTimeZone ? 'var(--color-primary)' : 'var(--color-muted-foreground)'} />
                  <span className={`text-sm ${selectedTimeZone !== browserTimeZone ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                    {eventEndTimeZone ? `${t('itemEditor.startTimeZone')}: ` : ''}
                    {(() => {
                      try {
                        const parts = new Intl.DateTimeFormat(i18n.language, { timeZone: selectedTimeZone, timeZoneName: 'long' }).formatToParts(new Date());
                        return parts.find(p => p.type === 'timeZoneName')?.value || selectedTimeZone;
                      } catch { return selectedTimeZone; }
                    })()}
                  </span>
                  {selectedTimeZone !== browserTimeZone && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedTimeZone(browserTimeZone); setEventEndTimeZone(null); }}
                      className="ml-auto text-muted-foreground hover:text-foreground"
                    >
                      <Icon name="close" size={16} />
                    </button>
                  )}
                </button>
                {showTimeZonePicker && timeZonePickerTarget === 'start' && (
                  <TimeZonePicker
                    selectedTimeZone={selectedTimeZone}
                    onSelect={setSelectedTimeZone}
                    onClose={() => setShowTimeZonePicker(false)}
                  />
                )}
              </div>

              {/* End timezone (events with end time) */}
              {hasEndTime && (
                <div className="relative px-4 py-2.5">
                  {eventEndTimeZone ? (
                    <button
                      type="button"
                      onClick={() => { setTimeZonePickerTarget('end'); setShowTimeZonePicker(true); }}
                      className="flex w-full items-center gap-3.5 text-left"
                    >
                      <Icon name="public" size={20} color="var(--color-primary)" />
                      <span className="text-sm font-medium text-foreground">
                        {t('itemEditor.endTimeZone')}: {(() => {
                          try {
                            const parts = new Intl.DateTimeFormat(i18n.language, { timeZone: eventEndTimeZone, timeZoneName: 'long' }).formatToParts(new Date());
                            return parts.find(p => p.type === 'timeZoneName')?.value || eventEndTimeZone;
                          } catch { return eventEndTimeZone; }
                        })()}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setEventEndTimeZone(null); }}
                        className="ml-auto text-muted-foreground hover:text-foreground"
                      >
                        <Icon name="close" size={16} />
                      </button>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setEventEndTimeZone(selectedTimeZone); setTimeZonePickerTarget('end'); setShowTimeZonePicker(true); }}
                      className="flex w-full items-center gap-3.5 text-left"
                    >
                      <Icon name="public" size={20} color="var(--color-muted-foreground)" />
                      <span className="text-sm text-muted-foreground">{t('itemEditor.addEndTimeZone')}</span>
                    </button>
                  )}
                  {showTimeZonePicker && timeZonePickerTarget === 'end' && (
                    <TimeZonePicker
                      selectedTimeZone={eventEndTimeZone || selectedTimeZone}
                      onSelect={(tz) => setEventEndTimeZone(tz)}
                      onClose={() => setShowTimeZonePicker(false)}
                    />
                  )}
                </div>
              )}
            </>
          )}

          {/* Duration (tasks with time or time-of-day) */}
          {isTask && selectedDate && (hasTime || timeOfDay) && (
            <div className="relative">
              <FieldRow
                icon="timer"
                text={duration != null ? formatDurationDisplay(duration, t) : t('itemEditor.addDuration')}
                active={duration != null}
                onClick={() => togglePopover('duration')}
                suffix={duration != null ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDuration(null); }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Icon name="close" size={16} />
                  </button>
                ) : undefined}
              />
              {activePopover === 'duration' && (
                <DurationPopover
                  value={duration}
                  onSelect={(mins) => setDuration(mins)}
                  onClear={() => setDuration(null)}
                  onClose={closePopover}
                />
              )}
            </div>
          )}

          {/* Reminder 1 (tasks with exact time, not in past) */}
          {isTask && selectedDate && hasTime && !isTaskTimeInPast && (
            <div className="relative">
              <FieldRow
                icon="notifications"
                text={firstReminder !== undefined ? formatReminderDisplay(firstReminder, t) : t('itemEditor.addReminder')}
                active={firstReminder !== undefined}
                onClick={() => togglePopover('reminder1')}
                suffix={firstReminder !== undefined ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFirstReminder(undefined); setSecondReminder(undefined); }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Icon name="close" size={16} />
                  </button>
                ) : undefined}
              />
              {activePopover === 'reminder1' && (
                <ReminderPopover
                  value={firstReminder}
                  onSelect={(mins) => setFirstReminder(mins)}
                  onClear={() => { setFirstReminder(undefined); setSecondReminder(undefined); }}
                  onClose={closePopover}
                />
              )}
            </div>
          )}

          {/* Reminder 2 (only when first reminder is set, not in past) */}
          {isTask && selectedDate && hasTime && !isTaskTimeInPast && firstReminder !== undefined && (
            <div className="relative">
              <FieldRow
                icon="notifications"
                text={secondReminder !== undefined ? `${t('itemEditor.secondReminder')}: ${formatReminderDisplay(secondReminder, t)}` : t('itemEditor.addSecondReminder')}
                active={secondReminder !== undefined}
                onClick={() => togglePopover('reminder2')}
                suffix={secondReminder !== undefined ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSecondReminder(undefined); }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Icon name="close" size={16} />
                  </button>
                ) : undefined}
              />
              {activePopover === 'reminder2' && (
                <ReminderPopover
                  value={secondReminder}
                  onSelect={(mins) => setSecondReminder(mins)}
                  onClear={() => setSecondReminder(undefined)}
                  onClose={closePopover}
                />
              )}
            </div>
          )}

          {/* Repeat (always visible — matches dooooApp) */}
          <div className="relative">
            <FieldRow
              icon="repeat"
              text={repeatDisplay || t('itemEditor.setRecurrence')}
              active={!!selectedRepeat}
              onClick={() => {
                if (isRepeatDisabled) {
                  setRepeatInfoMessage(t('tasks.validation.cannotAddRecurrencePastTask'));
                  setTimeout(() => setRepeatInfoMessage(null), 4000);
                  return;
                }
                togglePopover('repeat');
              }}
              suffix={selectedRepeat ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelectedRepeat(null); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Icon name="close" size={16} />
                </button>
              ) : undefined}
            />
            {activePopover === 'repeat' && (
              <RepeatPopover
                selectedRepeat={selectedRepeat}
                selectedDate={selectedDate}
                onSelect={(repeat) => {
                  if (repeat) {
                    if (!selectedDate) {
                      setSelectedDate(new Date());
                      setRepeatInfoMessage(t('tasks.validation.repeatDateAutoSet'));
                      setTimeout(() => setRepeatInfoMessage(null), 4000);
                    } else {
                      const todayMidnight = new Date();
                      todayMidnight.setHours(0, 0, 0, 0);
                      const selectedMidnight = new Date(selectedDate);
                      selectedMidnight.setHours(0, 0, 0, 0);
                      if (selectedMidnight.getTime() < todayMidnight.getTime()) {
                        const newDate = new Date();
                        if (hasTime) {
                          newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
                        }
                        setSelectedDate(newDate);
                        setRepeatInfoMessage(t('tasks.validation.recurringTaskPastDate'));
                        setTimeout(() => setRepeatInfoMessage(null), 4000);
                      }
                    }
                  }
                  setSelectedRepeat(repeat);
                  setActivePopover(null);
                }}
                onClose={closePopover}
              />
            )}
            {repeatInfoMessage && (
              <div className="flex items-center gap-2 px-4 py-2 text-xs text-primary">
                <Icon name="info" size={16} color="var(--color-primary)" className="shrink-0" />
                <span>{repeatInfoMessage}</span>
              </div>
            )}
          </div>

          {/* Location */}
          {editingLocation ? (
            <div className="flex items-center gap-3.5 px-4 py-2.5">
              <Icon name="location_on" size={20} color="var(--color-primary)" />
              <input
                ref={locationRef}
                type="text"
                value={locationValue}
                onChange={(e) => setLocationValue(e.target.value)}
                onBlur={() => setEditingLocation(false)}
                onKeyDown={(e) => { if (e.key === 'Enter') setEditingLocation(false); if (e.key === 'Escape') { setLocationValue(''); setEditingLocation(false); } }}
                placeholder={t('itemEditor.addLocation')}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {locationValue && (
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setLocationValue(''); setEditingLocation(false); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Icon name="close" size={16} />
                </button>
              )}
            </div>
          ) : (
            <FieldRow
              icon="location_on"
              text={locationValue || t('itemEditor.addLocation')}
              active={!!locationValue}
              onClick={() => setEditingLocation(true)}
            />
          )}

          {/* ── More Options (tasks only, when date selected & not in past) ── */}
          {isTask && selectedDate && !isTaskTimeInPast && (
            <>
              {/* Toggle button */}
              <button
                type="button"
                onClick={() => setShowMoreOptions((v) => !v)}
                className="flex w-full items-center gap-3.5 px-4 py-2.5 text-muted-foreground transition-colors hover:bg-muted/50"
              >
                <Icon name={showMoreOptions ? 'expand_less' : 'expand_more'} size={20} />
                <span className="text-sm font-medium">
                  {showMoreOptions ? t('tasks.panel.showLess') : t('tasks.panel.showMore')}
                </span>
              </button>

              {showMoreOptions && (
                <>
                  {/* Timezone (only when exact time is set) */}
                  {hasTime && (
                    <div className="relative px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => { setTimeZonePickerTarget('start'); setShowTimeZonePicker(true); }}
                        className="flex w-full items-center gap-3.5 text-left"
                      >
                        <Icon name="public" size={20} color={selectedTimeZone !== browserTimeZone ? 'var(--color-primary)' : 'var(--color-muted-foreground)'} />
                        <span className={`text-sm ${selectedTimeZone !== browserTimeZone ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                          {(() => {
                            try {
                              const parts = new Intl.DateTimeFormat(i18n.language, { timeZone: selectedTimeZone, timeZoneName: 'long' }).formatToParts(new Date());
                              return parts.find(p => p.type === 'timeZoneName')?.value || selectedTimeZone;
                            } catch { return selectedTimeZone; }
                          })()}
                        </span>
                        {selectedTimeZone !== browserTimeZone && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelectedTimeZone(browserTimeZone); }}
                            className="ml-auto text-muted-foreground hover:text-foreground"
                          >
                            <Icon name="close" size={16} />
                          </button>
                        )}
                      </button>
                      {showTimeZonePicker && timeZonePickerTarget === 'start' && (
                        <TimeZonePicker
                          selectedTimeZone={selectedTimeZone}
                          onSelect={setSelectedTimeZone}
                          onClose={() => setShowTimeZonePicker(false)}
                        />
                      )}
                    </div>
                  )}

                  {/* Date type toggle (Scheduled vs Due) — only when no repeat */}
                  {!selectedRepeat && (
                    <div className="relative px-4 py-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon name="event_available" size={20} color="var(--color-primary)" />
                          <span className="text-sm text-foreground">
                            {t(hasTime ? 'tasks.input.dueAtThisTime' : 'tasks.input.dueAtThisDate')}
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveInfoPanel((v) => v === 'dateType' ? null : 'dateType')}
                            className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                          >
                            <Icon name="info" size={14} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDateType((v) => v === 'SCHEDULED' ? 'DUE' : 'SCHEDULED')}
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${dateType === 'DUE' ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                        >
                          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${dateType === 'DUE' ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                      {activeInfoPanel === 'dateType' && (
                        <PopoverWrapper onClose={() => setActiveInfoPanel(null)} className="w-[320px] p-4">
                          <p className="text-xs font-semibold text-foreground">{t('tasks.input.dueToggleInfoTitle')}</p>
                          <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">{t('tasks.input.dueToggleInfoContent')}</p>
                        </PopoverWrapper>
                      )}
                    </div>
                  )}

                  {/* Show in todo when overdue */}
                  <div className="relative px-4 py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon name="visibility" size={20} color="var(--color-primary)" />
                        <span className="text-sm text-foreground">{t('tasks.panel.showInTodoWhenOverdue')}</span>
                        <button
                          type="button"
                          onClick={() => setActiveInfoPanel((v) => v === 'overdue' ? null : 'overdue')}
                          className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                        >
                          <Icon name="info" size={14} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowInTodoWhenOverdue((v) => !v)}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${showInTodoWhenOverdue ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                      >
                        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${showInTodoWhenOverdue ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    {activeInfoPanel === 'overdue' && (
                      <PopoverWrapper onClose={() => setActiveInfoPanel(null)} className="w-[320px] p-4">
                        <p className="text-xs font-semibold text-foreground">{t('tasks.panel.overdueInfoTitle')}</p>
                        <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">{t('tasks.panel.overdueInfoContent')}</p>
                      </PopoverWrapper>
                    )}
                  </div>

                  {/* Set to done automatically */}
                  <div className="relative px-4 py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon name="done_all" size={20} color="var(--color-primary)" />
                        <span className="text-sm text-foreground">{t('tasks.panel.setToDoneAutomatically')}</span>
                        <button
                          type="button"
                          onClick={() => setActiveInfoPanel((v) => v === 'autoDone' ? null : 'autoDone')}
                          className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                        >
                          <Icon name="info" size={14} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSetToDoneAutomatically((v) => !v)}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${setToDoneAutomatically ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                      >
                        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${setToDoneAutomatically ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    {activeInfoPanel === 'autoDone' && (
                      <PopoverWrapper onClose={() => setActiveInfoPanel(null)} className="w-[320px] p-4">
                        <p className="text-xs font-semibold text-foreground">{t('tasks.panel.autoDoneInfoTitle')}</p>
                        <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">{t('tasks.panel.autoDoneInfoContent')}</p>
                      </PopoverWrapper>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Classification card */}
          <div className="rounded-xl bg-surface p-1 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            {/* Priority */}
            <div className="relative">
              <FieldRow
                icon="flag"
                text={priorityDisplay || t('itemEditor.addPriority')}
                active={!!priority}
                onClick={() => togglePopover('priority')}
                suffix={priority ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setPriority(''); }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Icon name="close" size={16} />
                  </button>
                ) : undefined}
              />
              {activePopover === 'priority' && (
                <PriorityPopover
                  selected={priority}
                  onSelect={(val) => { setPriority(val); setActivePopover(null); }}
                  onClear={() => { setPriority(''); setActivePopover(null); }}
                  onClose={closePopover}
                />
              )}
            </div>

            {/* Category (tasks only) */}
            {isTask && (
              <div className="relative">
                <FieldRow
                  icon="sell"
                  text={
                    categoryId
                      ? (categories?.find((c) => c.id === categoryId)?.name || t('itemEditor.addCategory'))
                      : t('itemEditor.addCategory')
                  }
                  active={!!categoryId}
                  onClick={() => togglePopover('category')}
                  suffix={categoryId ? (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setCategoryId(''); }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Icon name="close" size={16} />
                    </button>
                  ) : undefined}
                />
                {activePopover === 'category' && categories && (
                  <CategoryPopover
                    categories={categories}
                    selected={categoryId}
                    onSelect={(id) => { setCategoryId(id); setActivePopover(null); }}
                    onClear={() => { setCategoryId(''); setActivePopover(null); }}
                    onClose={closePopover}
                  />
                )}
              </div>
            )}

            {/* Tags */}
            <div className="px-4 py-2.5">
              <div className="flex items-center gap-3.5">
                <Icon name="label" size={20} color={tags.length > 0 ? 'var(--color-primary)' : 'var(--color-muted-foreground)'} />
                <div className="flex flex-1 flex-wrap items-center gap-1.5">
                  {tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                      {tag}
                      <button type="button" onClick={() => handleRemoveTag(tag)} className="text-muted-foreground hover:text-foreground">
                        <Icon name="close" size={12} />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }
                      if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
                        setTags((prev) => prev.slice(0, -1));
                      }
                    }}
                    onBlur={handleAddTag}
                    placeholder={tags.length === 0 ? t('itemEditor.addTags') : ''}
                    className="min-w-[80px] flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Info card */}
          {!selectedDate && (
            <div className="flex items-start gap-2.5 rounded-xl bg-muted p-4">
              <Icon name="info" size={18} color="var(--color-muted-foreground)" className="mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t('itemEditor.infoText')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
