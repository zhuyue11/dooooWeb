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
import { PopoverWrapper } from '@/components/ui/PopoverWrapper';
import { CategoryPopover } from '@/components/ui/CategoryPopover';
import { toNoonUTC, combineDateAndTime } from '@/utils/dateForm';
import { getRepeatDisplayText } from '@/utils/repeatDisplay';
import type { CreateTaskRequest, CreateEventRequest, UpdateTaskRequest, UpdateEventRequest, Task, Event as ApiEvent, Repeat } from '@/types/api';
import { useAuth } from '@/lib/contexts/auth-context';
import { ForAllMembersToggle } from '@/components/groups/ForAllMembersToggle';
import { TrackCompletionToggle } from '@/components/groups/TrackCompletionToggle';
import { AssigneePicker } from '@/components/groups/AssigneePicker';
import { ParticipantSelectionModal } from '@/components/groups/ParticipantSelectionModal';
import { useTranslation } from 'react-i18next';

// ── Helpers ──

type ApiPriority = UpdateTaskRequest['priority'];
/** Map UI priority (uppercase) to the lowercase format the API expects. */
function toApiPriority(p: string): ApiPriority {
  return (p ? p.toLowerCase() : undefined) as ApiPriority;
}

/** Get UTC offset in minutes for a given IANA timezone at a given instant. */
function getTimezoneOffsetMinutes(tz: string, date: Date): number {
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC', hour12: false });
  const tzStr = date.toLocaleString('en-US', { timeZone: tz, hour12: false });
  return Math.round((new Date(tzStr).getTime() - new Date(utcStr).getTime()) / 60000);
}

// ── Types ──

type ItemType = 'TASK' | 'EVENT';
type TimeOfDay = 'MORNING' | 'AFTERNOON' | 'EVENING' | null;
type ActivePopover = 'date' | 'endDate' | 'priority' | 'category' | 'repeat' | 'duration' | 'reminder1' | 'reminder2' | null;

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
  groupId?: string;
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
      className="flex w-full cursor-pointer items-center gap-3.5 px-4 py-2.5 text-left transition-colors hover:bg-(--el-popover-item-hover)"
    >
      <Icon name={icon} size={20} color={active ? 'var(--el-modal-icon-selected)' : 'var(--el-modal-icon-unselected)'} />
      <span className={`flex-1 text-sm ${active ? 'font-medium text-(--el-editor-field-value)' : 'text-(--el-editor-field-label)'}`}>{text}</span>
      {suffix}
    </div>
  );
}

// ── Priority popover ──

const PRIORITY_OPTIONS = [
  { value: 'URGENT', key: 'todoPage.priorityUrgent', color: 'text-(--el-dialog-confirm-bg)' },
  { value: 'HIGH', key: 'todoPage.priorityHigh', color: 'text-accent' },
  { value: 'MEDIUM', key: 'todoPage.priorityMedium', color: 'text-yellow-500' },
  { value: 'LOW', key: 'todoPage.priorityLow', color: 'text-(--el-item-group-text)' },
] as const;

type PriorityValue = typeof PRIORITY_OPTIONS[number]['value'];

function PriorityPopover({ selected, onSelect, onClear, onClose }: {
  selected: string;
  onSelect: (value: PriorityValue) => void;
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
          className={`flex w-full items-center gap-3 rounded-(--radius-card) px-3 py-2 text-sm transition-colors hover:bg-(--el-popover-item-hover) ${selected === opt.value ? 'bg-(--el-editor-tag-bg) font-medium' : ''}`}
        >
          <Icon name="flag" size={16} className={opt.color} />
          <span>{t(opt.key)}</span>
        </button>
      ))}
      {selected && (
        <>
          <div className="mx-2 my-1 border-t border-(--el-input-border)" />
          <button
            type="button"
            onClick={onClear}
            className="flex w-full items-center gap-3 rounded-(--radius-card) px-3 py-2 text-sm text-(--el-editor-field-label) transition-colors hover:bg-(--el-popover-item-hover)"
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
  const {
    createTaskMutation, createEventMutation,
    updateTaskMutation, updateEventMutation,
    createTaskInstanceMutation, updateTaskInstanceMutation,
    convertTaskInstanceMutation,
    createEventInstanceMutation, updateEventInstanceMutation,
    convertEventInstanceMutation,
  } = useItemMutations();

  const isEditMode = !!id;
  const typeParam = searchParams.get('type') || 'task';

  // Single-occurrence editing — set when navigated from the side panel's
  // RecurringScopeModal. `scope` decides how `handleSubmit` dispatches the save.
  // `occurrenceDate` is the date of the clicked occurrence (`YYYY-MM-DD`).
  const scope = searchParams.get('scope') as 'this' | 'future' | 'all' | null;
  const occurrenceDate = searchParams.get('occurrenceDate'); // `YYYY-MM-DD`
  const isOccurrenceEdit = isEditMode && scope === 'this' && !!occurrenceDate;
  const isFutureEdit = isEditMode && scope === 'future' && !!occurrenceDate;

  // Get draft from location.state (passed from modal "More Options")
  const draft = (location.state as { draft?: ItemFormDraft } | null)?.draft;

  const { user } = useAuth();
  const { data: categories } = useCategories(draft?.groupId);

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

  // Event time. Events always require a time (enforced by the backend with
  // 400 "Event must have a time"), so new events default to hasStartTime=true.
  // Tasks can be untimed, so their `hasTime` defaults to false above.
  const [hasStartTime, setHasStartTime] = useState(
    draft?.hasStartTime ?? (itemType === 'EVENT'),
  );
  const [startTimeValue, setStartTimeValue] = useState(draft?.startTimeValue || '10:00');
  const [hasEndTime, setHasEndTime] = useState(draft?.hasEndTime ?? false);
  const [endTimeValue, setEndTimeValue] = useState(draft?.endTimeValue || '11:00');

  // Timezone
  const browserTimeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const [selectedTimeZone, setSelectedTimeZone] = useState(browserTimeZone);
  const [eventEndTimeZone, setEventEndTimeZone] = useState<string | null>(null);
  const [eventEndDate, setEventEndDate] = useState<Date | null>(null);
  const [showTimeZonePicker, setShowTimeZonePicker] = useState(false);
  const [timeZonePickerTarget, setTimeZonePickerTarget] = useState<'start' | 'end'>('start');

  // Additional fields
  const [priority, setPriority] = useState<'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' | ''>('');
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

  // Duration / end time mode
  const [useEndTime, setUseEndTime] = useState(false);
  const [endDate, setEndDate] = useState<Date | null>(null); // End date for timed end-time mode (defaults to start date)
  const [useSeparateTimeZones, setUseSeparateTimeZones] = useState(false);

  // Event-specific fields
  const [guests, setGuests] = useState<Array<{email: string; name?: string}>>([]);
  const [guestInput, setGuestInput] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [editingMeetingLink, setEditingMeetingLink] = useState(false);

  // Task advanced options (More Options)
  const [dateType, setDateType] = useState<'SCHEDULED' | 'DUE'>('SCHEDULED');
  const [showInTodoWhenOverdue, setShowInTodoWhenOverdue] = useState(true);
  const [setToDoneAutomatically, setSetToDoneAutomatically] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [activeInfoPanel, setActiveInfoPanel] = useState<'dateType' | 'overdue' | 'autoDone' | null>(null);

  // Group task assignment
  const [isForAllMembers, setIsForAllMembers] = useState(false);
  const [trackCompletion, setTrackCompletion] = useState(true);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<string[]>([]);
  const [participateMyself, setParticipateMyself] = useState(true);
  const [showParticipantModal, setShowParticipantModal] = useState(false);

  // UI state
  const [activePopover, setActivePopover] = useState<ActivePopover>(null);
  const [editingLocation, setEditingLocation] = useState(false);
  const [repeatInfoMessage, setRepeatInfoMessage] = useState<string | null>(null);
  const [showTimeOfDayPicker, setShowTimeOfDayPicker] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);
  const meetingLinkRef = useRef<HTMLInputElement>(null);

  // Captures the parent task/event's title + date *as loaded* — used by the
  // single-occurrence edit dispatch to detect title/date changes vs other
  // field changes (mirrors dooooApp's editSingleTaskInstance behavior).
  const originalTitleRef = useRef<string | null>(null);
  const originalDateRef = useRef<string | null>(null); // YYYY-MM-DD

  // ── Load existing item for edit mode ──
  const { data: existingItem } = useQuery<Task | ApiEvent>({
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

    // Capture original title + date (YYYY-MM-DD) for the single-occurrence
    // edit dispatch — these are used by handleSubmit to detect title/date
    // changes that require routing to the convert endpoint.
    //
    // For occurrence edits, the "original date" we compare against is the
    // occurrence date (from the URL), not the parent's start date — otherwise
    // every edit would look like a date change.
    originalTitleRef.current = existingItem.title;
    if ((scope === 'this' || scope === 'future') && occurrenceDate) {
      originalDateRef.current = occurrenceDate;
    } else if (existingItem.date) {
      const od = new Date(existingItem.date);
      originalDateRef.current = `${od.getFullYear()}-${String(od.getMonth() + 1).padStart(2, '0')}-${String(od.getDate()).padStart(2, '0')}`;
    } else {
      originalDateRef.current = null;
    }

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
      setPriority((task.priority?.toUpperCase() || '') as PriorityValue | '');
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
      // Group assignment state
      if (task.isForAllMembers != null) setIsForAllMembers(task.isForAllMembers);
      if (task.trackCompletion != null) setTrackCompletion(task.trackCompletion);
      if (task.assigneeId) setAssigneeId(task.assigneeId);
    } else {
      const event = existingItem as ApiEvent;
      setLocationValue(event.location || '');
      setPriority((event.priority?.toUpperCase() || '') as PriorityValue | '');
      if (event.endDate) {
        const ed = new Date(event.endDate);
        if (event.hasTime) {
          setUseEndTime(true);
          setHasEndTime(true);
          setEndTimeValue(`${String(ed.getHours()).padStart(2, '0')}:${String(ed.getMinutes()).padStart(2, '0')}`);
          // Check if end date is a different day from start
          if (event.date) {
            const sd = new Date(event.date);
            if (ed.toDateString() !== sd.toDateString()) {
              setEndDate(ed);
            }
          }
        } else {
          setEventEndDate(ed);
        }
      }
      if (event.endTimeZone) {
        setEventEndTimeZone(event.endTimeZone);
        if (event.endTimeZone !== (event.timeZone || browserTimeZone)) {
          setUseSeparateTimeZones(true);
        }
      }
      if (event.guests) setGuests(event.guests);
      if (event.meetingLink) setMeetingLink(event.meetingLink);
    }

    // For "edit this occurrence" / "edit this and future", seed the form's
    // selectedDate from the occurrence date in the URL, NOT the parent's start
    // date — otherwise the new standalone task/event lands on the parent's
    // base date instead of the clicked occurrence.
    if ((scope === 'this' || scope === 'future') && occurrenceDate) {
      const od = new Date(occurrenceDate + 'T00:00:00');
      setSelectedDate(od);
    }
  }, [existingItem, typeParam, scope, occurrenceDate, browserTimeZone]);

  // Focus title on mount (create mode only)
  useEffect(() => {
    if (!isEditMode) titleRef.current?.focus();
  }, [isEditMode]);

  // Focus location input when entering edit mode
  useEffect(() => {
    if (editingLocation) locationRef.current?.focus();
  }, [editingLocation]);

  useEffect(() => {
    if (editingMeetingLink) meetingLinkRef.current?.focus();
  }, [editingMeetingLink]);

  // ── Computed ──
  const isTask = itemType === 'TASK';
  const isTitleValid = title.trim().length > 0;
  const hasExactTime = isTask ? hasTime : hasStartTime;

  // When in end-time mode, compute duration from start and end date/times (timezone-aware)
  const effectiveDuration = useMemo(() => {
    if (!useEndTime || !hasExactTime || !hasEndTime || !selectedDate) return duration;
    const startTime = isTask ? timeValue : startTimeValue;
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTimeValue.split(':').map(Number);
    const sd = selectedDate;
    const ed = endDate || selectedDate;
    // Wall-clock milliseconds (no timezone)
    const startWallMs = new Date(sd.getFullYear(), sd.getMonth(), sd.getDate(), sh, sm).getTime();
    const endWallMs = new Date(ed.getFullYear(), ed.getMonth(), ed.getDate(), eh, em).getTime();
    let diffMs = endWallMs - startWallMs;
    // Adjust for timezone difference when using separate timezones
    if (useSeparateTimeZones && eventEndTimeZone && eventEndTimeZone !== selectedTimeZone) {
      try {
        const now = new Date();
        const startOffset = getTimezoneOffsetMinutes(selectedTimeZone, now);
        const endOffset = getTimezoneOffsetMinutes(eventEndTimeZone, now);
        diffMs += (startOffset - endOffset) * 60000;
      } catch { /* fallback to wall-clock diff */ }
    }
    return Math.round(diffMs / 60000);
  }, [useEndTime, hasExactTime, hasEndTime, isTask, timeValue, startTimeValue, endTimeValue, duration, selectedDate, endDate, selectedTimeZone, eventEndTimeZone, useSeparateTimeZones]);
  const isPending = createTaskMutation.isPending || createEventMutation.isPending ||
    updateTaskMutation.isPending || updateEventMutation.isPending;
  const isEndTimeInvalid = useEndTime && hasExactTime && hasEndTime && effectiveDuration != null && effectiveDuration <= 0;
  const saveDisabled = isPending || !isTitleValid || isEndTimeInvalid;

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
      // Events always require a clock time (backend returns 400 otherwise).
      setHasStartTime(true);
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
    // Note: previously this also cleared selectedRepeat, which broke the
    // legitimate "shift the whole recurring series forward by N days" flow
    // (RT8 / RE8 / edit-all-occurrences with a date change). Repeat patterns
    // are date-relative, not date-dependent, so we keep the repeat as-is.
    setActivePopover(null);
  }, []);

  const handleClearDate = useCallback(() => {
    setSelectedDate(null);
    setActivePopover(null);
    setHasTime(false);
    setTimeOfDay(null);
    setHasStartTime(false);
    setHasEndTime(false);
    setEventEndDate(null);
    setEndDate(null);
    setUseEndTime(false);
    setUseSeparateTimeZones(false);
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

  const handleSwitchToEndTime = useCallback(() => {
    setUseEndTime(true);
    if (!endDate) setEndDate(selectedDate);
    if (!hasEndTime) {
      // Initialize end time from start + duration (or +1h default)
      const [h, m] = (isTask ? timeValue : startTimeValue).split(':').map(Number);
      const dur = duration || 60;
      const totalMins = h * 60 + m + dur;
      const endH = Math.min(23, Math.floor(totalMins / 60));
      const endM = totalMins % 60;
      setEndTimeValue(`${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`);
      setHasEndTime(true);
    }
  }, [isTask, timeValue, startTimeValue, duration, hasEndTime, selectedDate, endDate]);

  const handleSwitchToDuration = useCallback(() => {
    setUseEndTime(false);
    setHasEndTime(false);
    setEndDate(null);
    setUseSeparateTimeZones(false);
    setEventEndTimeZone(null);
  }, []);

  const handleAddGuest = useCallback(() => {
    const trimmed = guestInput.trim();
    if (trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) && !guests.some((g) => g.email === trimmed)) {
      setGuests((prev) => [...prev, { email: trimmed }]);
    }
    setGuestInput('');
  }, [guestInput, guests]);

  const handleSubmit = useCallback(async () => {
    if (!isTitleValid) return;

    const trimmedTitle = title.trim();
    const tz = selectedTimeZone;
    const dateOnly = selectedDate
      ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
      : undefined;

    // Compute previous-day key for the "edit this and future" path. The new
    // tail item starts on `occurrenceDate`, so the parent's recurrence ends
    // on `occurrenceDate - 1 day`.
    const previousDayKey = (key: string) => {
      const d = new Date(key + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() - 1);
      return d.toISOString().slice(0, 10);
    };

    if (isTask) {
      let dateStr: string | undefined;
      if (selectedDate) {
        dateStr = hasTime
          ? combineDateAndTime(dateOnly!, timeValue).toISOString()
          : toNoonUTC(selectedDate).toISOString();
      }

      if (isEditMode) {
        // ── Single-occurrence task edit (scope = "this") ──
        if (isOccurrenceEdit && occurrenceDate) {
          const titleChanged = trimmedTitle !== (originalTitleRef.current ?? '');
          const dateChanged = dateOnly !== originalDateRef.current;

          if (titleChanged || dateChanged) {
            // Title or date changed → create new standalone task + REMOVE original.
            // The backend convert endpoint does this transactionally.
            await convertTaskInstanceMutation.mutateAsync({
              taskId: id!,
              instanceId: null,
              data: {
                title: trimmedTitle,
                description: description || undefined,
                date: dateStr!,
                hasTime,
                priority: (priority?.toLowerCase() as any) || undefined,
                categoryId: categoryId || undefined,
                firstReminderMinutes: firstReminder ?? null,
                secondReminderMinutes: secondReminder ?? null,
                duration: effectiveDuration ?? null,
                dateType,
                showInTodoWhenOverdue,
                setToDoneAutomatically,
                originalInstanceDate: occurrenceDate,
              },
            });
          } else {
            // Other fields changed → upsert a MODIFIED instance for this date
            await createTaskInstanceMutation.mutateAsync({
              taskId: id!,
              data: {
                instanceDate: occurrenceDate,
                status: 'MODIFIED',
                title: trimmedTitle,
                description: description || undefined,
                hasTime,
                timeOfDay: !hasTime ? timeOfDay ?? undefined : undefined,
                priority: (priority?.toLowerCase() as any) || undefined,
                categoryId: categoryId || null,
                firstReminderMinutes: firstReminder ?? null,
                secondReminderMinutes: secondReminder ?? null,
                duration: effectiveDuration ?? null,
              },
            });
          }
          navigate(-1);
          return;
        }

        // ── Edit this and future (scope = "future") ──
        if (isFutureEdit && occurrenceDate) {
          // 1) End-cap the parent's recurrence on previousDay
          const truncatedRepeat = selectedRepeat
            ? { ...selectedRepeat, endCondition: { type: 'date' as const, endDate: previousDayKey(occurrenceDate) } }
            : null;
          await updateTaskMutation.mutateAsync({
            id: id!,
            data: { repeat: truncatedRepeat as any },
          });

          // 2) Create a new task carrying the edited fields, starting on occurrenceDate
          const tailRepeat = selectedRepeat
            ? { ...selectedRepeat, endCondition: selectedRepeat.endCondition }
            : undefined;
          await createTaskMutation.mutateAsync({
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
            priority: toApiPriority(priority),
            categoryId: categoryId || undefined,
            location: locationValue || undefined,
            repeat: tailRepeat,
            duration: effectiveDuration ?? undefined,
            firstReminderMinutes: firstReminder,
            secondReminderMinutes: secondReminder,
          });
          navigate(-1);
          return;
        }

        // ── All occurrences (scope = "all" or undefined) ──
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
          priority: toApiPriority(priority),
          categoryId: categoryId || undefined,
          location: locationValue || undefined,
          repeat: selectedRepeat ?? null,
          duration: effectiveDuration ?? null,
          firstReminderMinutes: firstReminder ?? null,
          secondReminderMinutes: secondReminder ?? null,
          isForAllMembers,
          trackCompletion,
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
          priority: toApiPriority(priority),
          categoryId: categoryId || undefined,
          location: locationValue || undefined,
          repeat: selectedRepeat ?? undefined,
          duration: effectiveDuration ?? undefined,
          firstReminderMinutes: firstReminder,
          secondReminderMinutes: secondReminder,
          groupId: draft?.groupId,
          // Group assignment fields
          ...(draft?.groupId && {
            isForAllMembers,
            ...(isForAllMembers
              ? {
                  trackCompletion,
                  assignments: [
                    ...(participateMyself && user?.id ? [user.id] : []),
                    ...assignments,
                  ].filter((id2, i, arr) => arr.indexOf(id2) === i), // dedup
                }
              : { assigneeId: assigneeId || undefined }),
          }),
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
        if (hasStartTime && hasEndTime) {
          const endDateOnly = endDate
            ? `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
            : dateOnly!;
          endDateStr = combineDateAndTime(endDateOnly, endTimeValue).toISOString();
        } else if (!hasStartTime && eventEndDate) {
          endDateStr = toNoonUTC(eventEndDate).toISOString();
        }
      }

      if (isEditMode) {
        // ── Single-occurrence event edit (scope = "this") ──
        if (isOccurrenceEdit && occurrenceDate) {
          const titleChanged = trimmedTitle !== (originalTitleRef.current ?? '');
          const dateChanged = dateOnly !== originalDateRef.current;

          if (titleChanged || dateChanged) {
            await convertEventInstanceMutation.mutateAsync({
              eventId: id!,
              instanceId: null,
              data: {
                title: trimmedTitle,
                description: description || undefined,
                date: dateStr!,
                hasTime: hasStartTime,
                timeZone: hasStartTime ? tz : undefined,
                endDate: endDateStr ?? null,
                endTimeZone: hasEndTime && eventEndTimeZone ? eventEndTimeZone : null,
                duration: effectiveDuration ?? null,
                priority: toApiPriority(priority),
                location: locationValue || null,
                guests: guests.length > 0 ? guests : null,
                meetingLink: meetingLink || null,
                firstReminderMinutes: firstReminder ?? null,
                secondReminderMinutes: secondReminder ?? null,
                originalInstanceDate: occurrenceDate,
              },
            });
          } else {
            // No title/date change → upsert MODIFIED instance via the date-keyed
            // PATCH endpoint. Per the backend, instances are addressed by date.
            await updateEventInstanceMutation.mutateAsync({
              eventId: id!,
              date: occurrenceDate,
              data: {
                status: 'MODIFIED',
                title: trimmedTitle,
                description: description || undefined,
                hasTime: hasStartTime,
                timeZone: hasStartTime ? tz : undefined,
                endDate: endDateStr ?? null,
                endTimeZone: hasEndTime && eventEndTimeZone ? eventEndTimeZone : null,
                duration: effectiveDuration ?? null,
                priority: toApiPriority(priority),
                location: locationValue || null,
                guests: guests.length > 0 ? guests : null,
                meetingLink: meetingLink || null,
                firstReminderMinutes: firstReminder ?? null,
                secondReminderMinutes: secondReminder ?? null,
              },
            }).catch(async (err: any) => {
              // PATCH /events/:eventId/instances/:date returns 404 if no stored
              // instance exists yet (virtual occurrence). Fall back to creating
              // a new MODIFIED instance.
              if (err?.response?.status === 404) {
                await createEventInstanceMutation.mutateAsync({
                  eventId: id!,
                  data: {
                    date: occurrenceDate,
                    status: 'MODIFIED',
                    title: trimmedTitle,
                    description: description || undefined,
                    hasTime: hasStartTime,
                    timeZone: hasStartTime ? tz : undefined,
                    endDate: endDateStr ?? null,
                    endTimeZone: hasEndTime && eventEndTimeZone ? eventEndTimeZone : null,
                    duration: effectiveDuration ?? null,
                    priority: toApiPriority(priority),
                    location: locationValue || null,
                    guests: guests.length > 0 ? guests : null,
                    meetingLink: meetingLink || null,
                    firstReminderMinutes: firstReminder ?? null,
                    secondReminderMinutes: secondReminder ?? null,
                  },
                });
              } else {
                throw err;
              }
            });
          }
          navigate(-1);
          return;
        }

        // ── Edit this and future event occurrences ──
        if (isFutureEdit && occurrenceDate) {
          // Read parent event's existing repeat from selectedRepeat (loaded into form)
          const truncatedRepeat = selectedRepeat
            ? { ...selectedRepeat, endCondition: { type: 'date' as const, endDate: previousDayKey(occurrenceDate) } }
            : null;
          await updateEventMutation.mutateAsync({
            id: id!,
            data: { repeat: truncatedRepeat as any },
          });

          await createEventMutation.mutateAsync({
            title: trimmedTitle,
            description: description || undefined,
            date: dateStr,
            hasTime: hasStartTime,
            timeZone: hasStartTime ? tz : undefined,
            endTimeZone: hasEndTime && eventEndTimeZone ? eventEndTimeZone : undefined,
            endDate: endDateStr,
            duration: effectiveDuration ?? undefined,
            priority: toApiPriority(priority),
            location: locationValue || undefined,
            guests: guests.length > 0 ? guests : undefined,
            meetingLink: meetingLink || undefined,
            repeat: selectedRepeat || undefined,
          });
          navigate(-1);
          return;
        }

        // ── All occurrences (or non-recurring) ──
        const req: UpdateEventRequest = {
          title: trimmedTitle,
          description: description || undefined,
          date: dateStr ?? null,
          hasTime: hasStartTime,
          timeZone: hasStartTime ? tz : undefined,
          endTimeZone: hasEndTime && eventEndTimeZone ? eventEndTimeZone : undefined,
          endDate: endDateStr ?? null,
          duration: effectiveDuration ?? null,
          priority: toApiPriority(priority),
          location: locationValue || undefined,
          guests: guests.length > 0 ? guests : null,
          meetingLink: meetingLink || null,
          repeat: selectedRepeat ?? null,
        };
        await updateEventMutation.mutateAsync({ id: id!, data: req });
      } else {
        const req: CreateEventRequest = {
          title: trimmedTitle,
          description: description || undefined,
          date: dateStr,
          hasTime: hasStartTime,
          timeZone: hasStartTime ? tz : undefined,
          endTimeZone: hasEndTime && eventEndTimeZone ? eventEndTimeZone : undefined,
          endDate: endDateStr,
          duration: effectiveDuration ?? undefined,
          priority: toApiPriority(priority),
          location: locationValue || undefined,
          guests: guests.length > 0 ? guests : undefined,
          meetingLink: meetingLink || undefined,
          repeat: selectedRepeat ?? undefined,
          groupId: draft?.groupId,
        };
        await createEventMutation.mutateAsync(req);
      }
    }

    navigate(-1);
  }, [
    isTitleValid, title, description, isTask, selectedDate, hasTime, timeValue,
    timeOfDay, hasStartTime, startTimeValue, hasEndTime, endTimeValue,
    priority, categoryId, locationValue, selectedRepeat, effectiveDuration, firstReminder, secondReminder,
    dateType, showInTodoWhenOverdue, setToDoneAutomatically,
    isForAllMembers, trackCompletion, assigneeId, assignments, participateMyself, user,
    guests, meetingLink, eventEndDate, useEndTime, endDate,
    isEditMode, id, createTaskMutation, createEventMutation, updateTaskMutation, updateEventMutation,
    isOccurrenceEdit, isFutureEdit, occurrenceDate,
    convertTaskInstanceMutation, createTaskInstanceMutation,
    convertEventInstanceMutation, updateEventInstanceMutation, createEventInstanceMutation,
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
            className="flex h-9 w-9 items-center justify-center rounded-(--radius-card) bg-(--el-editor-card-bg) shadow-(--shadow-card) text-(--el-editor-field-label) hover:bg-(--el-popover-item-hover)"
          >
            <Icon name="close" size={18} />
          </button>
          <h1 className="text-xl font-bold text-(--el-editor-field-value)">{headerTitle}</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Type toggle */}
          <div className="flex rounded-(--radius-card) bg-(--el-editor-tag-bg) p-1">
            <button
              type="button"
              onClick={() => handleItemTypeChange('TASK')}
              className={`flex items-center gap-1.5 rounded-(--radius-btn) px-(--spacing-btn-x) py-(--spacing-btn-y) text-[13px] font-semibold transition-colors ${
                isTask ? 'bg-(--el-editor-card-bg) shadow-(--shadow-card) text-(--el-editor-field-value)' : 'text-(--el-editor-field-label)'
              }`}
            >
              <Icon name="check_circle" size={14} />
              {t('calendarPage.form.task')}
            </button>
            <button
              type="button"
              onClick={() => handleItemTypeChange('EVENT')}
              className={`flex items-center gap-1.5 rounded-(--radius-btn) px-(--spacing-btn-x) py-(--spacing-btn-y) text-[13px] font-semibold transition-colors ${
                !isTask ? 'bg-(--el-editor-card-bg) shadow-(--shadow-card) text-(--el-editor-field-value)' : 'text-(--el-editor-field-label)'
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
            className="rounded-(--radius-btn) bg-(--el-modal-save-bg) px-(--spacing-btn-x) py-(--spacing-btn-y) text-sm font-semibold text-(--el-modal-save-text) shadow-(--shadow-card) transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
      <div className="mb-4 rounded-(--radius-card) bg-(--el-editor-card-bg) p-(--spacing-card) shadow-(--shadow-card)">
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('itemEditor.addTitle')}
          className="mb-3 w-full bg-transparent text-[22px] font-bold text-(--el-editor-field-value) placeholder:text-(--el-editor-field-label) focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault();
          }}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('itemEditor.addDescription')}
          rows={3}
          className="w-full resize-none bg-transparent text-sm leading-relaxed text-(--el-editor-field-value) placeholder:text-(--el-editor-field-label) focus:outline-none"
        />
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_446px]">
        {/* Left column: Schedule card */}
        <div className="rounded-(--radius-card) bg-(--el-editor-card-bg) p-1 shadow-(--shadow-card)">
          {/* Date */}
          <div className="relative">
            <div
              role="button"
              tabIndex={0}
              onClick={() => togglePopover('date')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') togglePopover('date'); }}
              className="flex w-full cursor-pointer items-center gap-3.5 px-4 py-2.5 text-left transition-colors hover:bg-(--el-popover-item-hover)"
            >
              <Icon name="calendar_today" size={20} color={selectedDate ? 'var(--el-modal-icon-selected)' : 'var(--el-modal-icon-unselected)'} />
              {selectedDate ? (
                <>
                  <span className="flex-1 text-sm font-medium text-(--el-editor-field-value)">{dateDisplay}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleClearDate(); }}
                    className="text-(--el-editor-field-label) hover:text-(--el-editor-field-value)"
                  >
                    <Icon name="close" size={16} />
                  </button>
                </>
              ) : (
                <span className="text-sm text-(--el-editor-field-label)">{t('itemEditor.addDate')}</span>
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
                    color="var(--el-modal-icon-selected)"
                  />
                  <span className="text-sm font-medium text-(--el-editor-field-value)">
                    {t(`tasks.timeOfDay.${timeOfDay.toLowerCase()}`)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setTimeOfDay(null); }}
                    className="ml-auto text-(--el-editor-field-label) hover:text-(--el-editor-field-value)"
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
                  <Icon name="schedule" size={20} color="var(--el-modal-icon-unselected)" />
                  <span className="text-sm text-(--el-editor-field-label)">{t('calendarPage.form.addTime')}</span>
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

          {/* Time (event) */}
          {!isTask && selectedDate && (
            <div className="relative px-4 py-2.5">
              {/* Start time label when in end-time mode */}
              {hasStartTime && useEndTime && (
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-(--el-editor-field-label)">
                  {t('calendarPage.form.startTime')}
                </div>
              )}
              {hasStartTime ? (
                <TimePicker
                  value={startTimeValue}
                  onChange={setStartTimeValue}
                  onClear={() => { setHasStartTime(false); setHasEndTime(false); setUseEndTime(false); }}
                />
              ) : (
                <button type="button" onClick={() => setHasStartTime(true)} className="flex w-full items-center gap-3.5 text-left">
                  <Icon name="schedule" size={20} color="var(--el-modal-icon-unselected)" />
                  <span className="text-sm text-(--el-editor-field-label)">{t('calendarPage.form.addTime')}</span>
                </button>
              )}
            </div>
          )}

          {/* Timezone — inline for events (when not in end-time mode, which handles its own tz) */}
          {selectedDate && !isTask && hasStartTime && !useEndTime && (
            <div className="relative px-4 py-2.5">
              <button
                type="button"
                onClick={() => { setTimeZonePickerTarget('start'); setShowTimeZonePicker(true); }}
                className="flex w-full items-center gap-3.5 text-left"
              >
                <Icon name="public" size={20} color={selectedTimeZone !== browserTimeZone ? 'var(--el-modal-icon-selected)' : 'var(--el-modal-icon-unselected)'} />
                <span className={`text-sm ${selectedTimeZone !== browserTimeZone ? 'font-medium text-(--el-editor-field-value)' : 'text-(--el-editor-field-label)'}`}>
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
                    className="ml-auto text-(--el-editor-field-label) hover:text-(--el-editor-field-value)"
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

          {/* Duration (tasks/events with time, not in end-time mode) */}
          {selectedDate && (hasExactTime || (isTask && timeOfDay)) && !useEndTime && (
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
                    className="text-(--el-editor-field-label) hover:text-(--el-editor-field-value)"
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
              {/* Switch to end time (only when exact time is set) */}
              {hasExactTime && (
                <button
                  type="button"
                  onClick={handleSwitchToEndTime}
                  className="flex w-full items-center gap-3.5 px-4 py-1.5 text-xs text-(--el-editor-field-label) hover:text-(--el-modal-icon-selected)"
                >
                  <span>{t('tasks.input.durationPicker.switchToEndTime')}</span>
                </button>
              )}
            </div>
          )}

          {/* Start timezone (events in end-time mode — inline tz section hidden) */}
          {selectedDate && !isTask && hasStartTime && useEndTime && (
            <div className="relative px-4 py-2.5">
              <button
                type="button"
                onClick={() => { setTimeZonePickerTarget('start'); setShowTimeZonePicker(true); }}
                className="flex w-full items-center gap-3.5 text-left"
              >
                <Icon name="public" size={20} color={selectedTimeZone !== browserTimeZone ? 'var(--el-modal-icon-selected)' : 'var(--el-modal-icon-unselected)'} />
                <span className={`text-sm ${selectedTimeZone !== browserTimeZone ? 'font-medium text-(--el-editor-field-value)' : 'text-(--el-editor-field-label)'}`}>
                  {(() => {
                    try {
                      const parts = new Intl.DateTimeFormat(i18n.language, { timeZone: selectedTimeZone, timeZoneName: 'long' }).formatToParts(new Date());
                      return parts.find(p => p.type === 'timeZoneName')?.value || selectedTimeZone;
                    } catch { return selectedTimeZone; }
                  })()}
                </span>
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

          {/* End date + time (tasks/events in end-time mode) */}
          {selectedDate && hasExactTime && useEndTime && (
            <>
              {/* "Ends" section label */}
              <div className="mx-4 mt-1 border-t border-(--el-input-border) pt-2.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-(--el-editor-field-label)">
                  {t('calendarPage.form.endTime')}
                </span>
              </div>
              {/* End date */}
              <div className="relative">
                <FieldRow
                  icon="event"
                  text={(endDate || selectedDate).toLocaleDateString(i18n.language, { weekday: 'short', month: 'short', day: 'numeric' })}
                  active
                  onClick={() => togglePopover('endDate')}
                />
                {activePopover === 'endDate' && (
                  <CalendarPopover
                    selectedDate={endDate || selectedDate}
                    minDate={selectedDate}
                    onSelect={(date) => { setEndDate(date); setActivePopover(null); }}
                    onClose={closePopover}
                  />
                )}
              </div>
              {/* End time */}
              <div className="px-4 py-2.5">
                <TimePicker
                  value={endTimeValue}
                  onChange={setEndTimeValue}
                  onClear={() => { setHasEndTime(false); setUseEndTime(false); setEndDate(null); }}
                />
              </div>
              {/* Separate timezones toggle */}
              <div className="px-4 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-(--el-editor-field-label)">
                    {t('tasks.panel.separateTimeZones', 'Use separate start and end time zones')}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setUseSeparateTimeZones((v) => {
                        if (!v && !eventEndTimeZone) setEventEndTimeZone(selectedTimeZone);
                        if (v) setEventEndTimeZone(null);
                        return !v;
                      });
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${useSeparateTimeZones ? 'bg-(--el-modal-save-bg)' : 'bg-(--el-switch-inactive)'}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${useSeparateTimeZones ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
              {/* End timezone picker (when separate timezones enabled) */}
              {useSeparateTimeZones && (
                <div className="relative px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => { setTimeZonePickerTarget('end'); setShowTimeZonePicker(true); }}
                    className="flex w-full items-center gap-3.5 text-left"
                  >
                    <Icon name="public" size={20} color="var(--el-modal-icon-selected)" />
                    <span className="text-sm font-medium text-(--el-editor-field-value)">
                      {t('itemEditor.endTimeZone')}: {(() => {
                        try {
                          const tz = eventEndTimeZone || selectedTimeZone;
                          const parts = new Intl.DateTimeFormat(i18n.language, { timeZone: tz, timeZoneName: 'long' }).formatToParts(new Date());
                          return parts.find(p => p.type === 'timeZoneName')?.value || tz;
                        } catch { return eventEndTimeZone || selectedTimeZone; }
                      })()}
                    </span>
                  </button>
                  {showTimeZonePicker && timeZonePickerTarget === 'end' && (
                    <TimeZonePicker
                      selectedTimeZone={eventEndTimeZone || selectedTimeZone}
                      onSelect={(tz) => { setEventEndTimeZone(tz); setShowTimeZonePicker(false); }}
                      onClose={() => setShowTimeZonePicker(false)}
                    />
                  )}
                </div>
              )}
              {/* Validation: end can't be before start */}
              {effectiveDuration != null && effectiveDuration <= 0 && (
                <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-(--el-dialog-confirm-bg)">
                  <Icon name="error" size={14} color="var(--el-item-priority-high, #ef4444)" />
                  <span>{t('tasks.validation.endTimeBeforeStart', 'End time must be after start time')}</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleSwitchToDuration}
                className="flex w-full items-center gap-3.5 px-4 py-1.5 text-xs text-(--el-editor-field-label) hover:text-(--el-modal-icon-selected)"
              >
                <span>{t('tasks.input.endTimePicker.switchToDuration')}</span>
              </button>
            </>
          )}

          {/* End date (all-day events only — multi-day event support) */}
          {!isTask && selectedDate && !hasStartTime && (
            <div className="relative">
              <FieldRow
                icon="event"
                text={eventEndDate
                  ? `${t('tasks.input.endDate')}: ${eventEndDate.toLocaleDateString(i18n.language, { weekday: 'short', month: 'short', day: 'numeric' })}`
                  : t('tasks.input.endDate')
                }
                active={!!eventEndDate}
                onClick={() => togglePopover('endDate')}
                suffix={eventEndDate ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setEventEndDate(null); }}
                    className="text-(--el-editor-field-label) hover:text-(--el-editor-field-value)"
                  >
                    <Icon name="close" size={16} />
                  </button>
                ) : undefined}
              />
              {activePopover === 'endDate' && (
                <CalendarPopover
                  selectedDate={eventEndDate}
                  minDate={selectedDate}
                  onSelect={(date) => { setEventEndDate(date); setActivePopover(null); }}
                  onClose={closePopover}
                />
              )}
            </div>
          )}

          {/* Guests (events only) */}
          {!isTask && (
            <div className="px-4 py-2.5">
              <div className="flex items-center gap-3.5">
                <Icon name="group" size={20} color={guests.length > 0 ? 'var(--el-modal-icon-selected)' : 'var(--el-modal-icon-unselected)'} />
                <div className="flex flex-1 flex-wrap items-center gap-1.5">
                  {guests.map((guest, idx) => (
                    <span key={guest.email} className="inline-flex items-center gap-1 rounded-(--radius-btn) bg-(--el-editor-tag-bg) px-(--spacing-btn-x-sm) py-0.5 text-xs font-medium text-(--el-editor-field-value)">
                      {guest.email}
                      <button type="button" onClick={() => setGuests((prev) => prev.filter((_, i) => i !== idx))} className="text-(--el-editor-field-label) hover:text-(--el-editor-field-value)">
                        <Icon name="close" size={12} />
                      </button>
                    </span>
                  ))}
                  <input
                    type="email"
                    value={guestInput}
                    onChange={(e) => setGuestInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); handleAddGuest(); }
                      if (e.key === 'Backspace' && !guestInput && guests.length > 0) {
                        setGuests((prev) => prev.slice(0, -1));
                      }
                    }}
                    onBlur={handleAddGuest}
                    placeholder={guests.length === 0 ? t('calendarPage.form.addGuests') : ''}
                    className="min-w-[120px] flex-1 bg-transparent text-sm text-(--el-editor-field-value) placeholder:text-(--el-editor-field-label) focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Meeting link (events only) */}
          {!isTask && (
            editingMeetingLink ? (
              <div className="flex items-center gap-3.5 px-4 py-2.5">
                <Icon name="link" size={20} color="var(--el-modal-icon-selected)" />
                <input
                  ref={meetingLinkRef}
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  onBlur={() => setEditingMeetingLink(false)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setEditingMeetingLink(false); if (e.key === 'Escape') { setMeetingLink(''); setEditingMeetingLink(false); } }}
                  placeholder="https://meet.google.com/..."
                  className="flex-1 bg-transparent text-sm text-(--el-editor-field-value) placeholder:text-(--el-editor-field-label) focus:outline-none"
                />
                {meetingLink && (
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setMeetingLink(''); setEditingMeetingLink(false); }}
                    className="text-(--el-editor-field-label) hover:text-(--el-editor-field-value)"
                  >
                    <Icon name="close" size={16} />
                  </button>
                )}
              </div>
            ) : (
              <FieldRow
                icon="link"
                text={meetingLink || t('calendarPage.form.addMeetingLink')}
                active={!!meetingLink}
                onClick={() => setEditingMeetingLink(true)}
                suffix={meetingLink ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMeetingLink(''); }}
                    className="text-(--el-editor-field-label) hover:text-(--el-editor-field-value)"
                  >
                    <Icon name="close" size={16} />
                  </button>
                ) : undefined}
              />
            )
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
                    className="text-(--el-editor-field-label) hover:text-(--el-editor-field-value)"
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
                    className="text-(--el-editor-field-label) hover:text-(--el-editor-field-value)"
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
                  className="text-(--el-editor-field-label) hover:text-(--el-editor-field-value)"
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
              <div className="flex items-center gap-2 px-4 py-2 text-xs text-(--el-modal-icon-selected)">
                <Icon name="info" size={16} color="var(--el-modal-icon-selected)" className="shrink-0" />
                <span>{repeatInfoMessage}</span>
              </div>
            )}
          </div>

          {/* Location */}
          {editingLocation ? (
            <div className="flex items-center gap-3.5 px-4 py-2.5">
              <Icon name="location_on" size={20} color="var(--el-modal-icon-selected)" />
              <input
                ref={locationRef}
                type="text"
                value={locationValue}
                onChange={(e) => setLocationValue(e.target.value)}
                onBlur={() => setEditingLocation(false)}
                onKeyDown={(e) => { if (e.key === 'Enter') setEditingLocation(false); if (e.key === 'Escape') { setLocationValue(''); setEditingLocation(false); } }}
                placeholder={t('itemEditor.addLocation')}
                className="flex-1 bg-transparent text-sm text-(--el-editor-field-value) placeholder:text-(--el-editor-field-label) focus:outline-none"
              />
              {locationValue && (
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setLocationValue(''); setEditingLocation(false); }}
                  className="text-(--el-editor-field-label) hover:text-(--el-editor-field-value)"
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
                className="flex w-full items-center gap-3.5 px-4 py-2.5 text-(--el-editor-field-label) transition-colors hover:bg-(--el-popover-item-hover)"
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
                        <Icon name="public" size={20} color={selectedTimeZone !== browserTimeZone ? 'var(--el-modal-icon-selected)' : 'var(--el-modal-icon-unselected)'} />
                        <span className={`text-sm ${selectedTimeZone !== browserTimeZone ? 'font-medium text-(--el-editor-field-value)' : 'text-(--el-editor-field-label)'}`}>
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
                            className="ml-auto text-(--el-editor-field-label) hover:text-(--el-editor-field-value)"
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
                          <Icon name="event_available" size={20} color="var(--el-modal-icon-selected)" />
                          <span className="text-sm text-(--el-editor-field-value)">
                            {t(hasTime ? 'tasks.input.dueAtThisTime' : 'tasks.input.dueAtThisDate')}
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveInfoPanel((v) => v === 'dateType' ? null : 'dateType')}
                            className="flex h-5 w-5 items-center justify-center rounded-full text-(--el-editor-field-label) hover:bg-(--el-popover-item-hover)"
                          >
                            <Icon name="info" size={14} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDateType((v) => v === 'SCHEDULED' ? 'DUE' : 'SCHEDULED')}
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${dateType === 'DUE' ? 'bg-(--el-modal-save-bg)' : 'bg-(--el-switch-inactive)'}`}
                        >
                          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${dateType === 'DUE' ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                      {activeInfoPanel === 'dateType' && (
                        <PopoverWrapper onClose={() => setActiveInfoPanel(null)} className="w-[320px] p-4">
                          <p className="text-xs font-semibold text-(--el-editor-field-value)">{t('tasks.input.dueToggleInfoTitle')}</p>
                          <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-(--el-editor-field-label)">{t('tasks.input.dueToggleInfoContent')}</p>
                        </PopoverWrapper>
                      )}
                    </div>
                  )}

                  {/* Show in todo when overdue */}
                  <div className="relative px-4 py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon name="visibility" size={20} color="var(--el-modal-icon-selected)" />
                        <span className="text-sm text-(--el-editor-field-value)">{t('tasks.panel.showInTodoWhenOverdue')}</span>
                        <button
                          type="button"
                          onClick={() => setActiveInfoPanel((v) => v === 'overdue' ? null : 'overdue')}
                          className="flex h-5 w-5 items-center justify-center rounded-full text-(--el-editor-field-label) hover:bg-(--el-popover-item-hover)"
                        >
                          <Icon name="info" size={14} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowInTodoWhenOverdue((v) => !v)}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${showInTodoWhenOverdue ? 'bg-(--el-modal-save-bg)' : 'bg-(--el-switch-inactive)'}`}
                      >
                        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${showInTodoWhenOverdue ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    {activeInfoPanel === 'overdue' && (
                      <PopoverWrapper onClose={() => setActiveInfoPanel(null)} className="w-[320px] p-4">
                        <p className="text-xs font-semibold text-(--el-editor-field-value)">{t('tasks.panel.overdueInfoTitle')}</p>
                        <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-(--el-editor-field-label)">{t('tasks.panel.overdueInfoContent')}</p>
                      </PopoverWrapper>
                    )}
                  </div>

                  {/* Set to done automatically */}
                  <div className="relative px-4 py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon name="done_all" size={20} color="var(--el-modal-icon-selected)" />
                        <span className="text-sm text-(--el-editor-field-value)">{t('tasks.panel.setToDoneAutomatically')}</span>
                        <button
                          type="button"
                          onClick={() => setActiveInfoPanel((v) => v === 'autoDone' ? null : 'autoDone')}
                          className="flex h-5 w-5 items-center justify-center rounded-full text-(--el-editor-field-label) hover:bg-(--el-popover-item-hover)"
                        >
                          <Icon name="info" size={14} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSetToDoneAutomatically((v) => !v)}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${setToDoneAutomatically ? 'bg-(--el-modal-save-bg)' : 'bg-(--el-switch-inactive)'}`}
                      >
                        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${setToDoneAutomatically ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    {activeInfoPanel === 'autoDone' && (
                      <PopoverWrapper onClose={() => setActiveInfoPanel(null)} className="w-[320px] p-4">
                        <p className="text-xs font-semibold text-(--el-editor-field-value)">{t('tasks.panel.autoDoneInfoTitle')}</p>
                        <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-(--el-editor-field-label)">{t('tasks.panel.autoDoneInfoContent')}</p>
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
          <div className="rounded-(--radius-card) bg-(--el-editor-card-bg) p-1 shadow-(--shadow-card)">
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
                    className="text-(--el-editor-field-label) hover:text-(--el-editor-field-value)"
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
                      className="text-(--el-editor-field-label) hover:text-(--el-editor-field-value)"
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
                    groupId={draft?.groupId}
                  />
                )}
              </div>
            )}

            {/* Group Assignment (only for group tasks) */}
            {isTask && draft?.groupId && (
              <div className="border-t border-(--el-input-border)" data-testid="group-assignment-section">
                <ForAllMembersToggle
                  value={isForAllMembers}
                  onChange={(v) => {
                    setIsForAllMembers(v);
                    // Clear the other mode's selection when toggling
                    if (v) { setAssigneeId(null); } else { setAssignments([]); }
                  }}
                />

                {!isForAllMembers && (
                  <AssigneePicker
                    groupId={draft.groupId}
                    selectedUserId={assigneeId}
                    onSelect={setAssigneeId}
                    currentUserId={user?.id || ''}
                  />
                )}

                {isForAllMembers && (
                  <>
                    <TrackCompletionToggle value={trackCompletion} onChange={setTrackCompletion} />

                    {/* Participate myself toggle */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setParticipateMyself((v) => !v)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setParticipateMyself((v) => !v); }}
                      className="flex w-full cursor-pointer items-center gap-3.5 px-4 py-2.5 text-left transition-colors hover:bg-(--el-popover-item-hover)"
                    >
                      <Icon name="person" size={20} color="var(--el-modal-icon-selected)" />
                      <span className="flex-1 text-sm font-medium text-(--el-editor-field-value)">{t('tasks.input.participateMyself')}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setParticipateMyself((v) => !v); }}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${participateMyself ? 'bg-(--el-modal-save-bg)' : 'bg-(--el-switch-inactive)'}`}
                        data-testid="participate-myself-switch"
                      >
                        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${participateMyself ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                      </button>
                    </div>

                    {/* Select participants */}
                    <FieldRow
                      icon="group_add"
                      text={assignments.length > 0
                        ? `${assignments.length} ${t('tasks.input.membersSelected')}`
                        : t('tasks.input.inviteToParticipate')}
                      onClick={() => setShowParticipantModal(true)}
                      active={assignments.length > 0}
                    />
                  </>
                )}
              </div>
            )}

            {/* Tags */}
            <div className="px-4 py-2.5">
              <div className="flex items-center gap-3.5">
                <Icon name="label" size={20} color={tags.length > 0 ? 'var(--el-modal-icon-selected)' : 'var(--el-modal-icon-unselected)'} />
                <div className="flex flex-1 flex-wrap items-center gap-1.5">
                  {tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-(--radius-btn) bg-(--el-editor-tag-bg) px-(--spacing-btn-x-sm) py-0.5 text-xs font-medium text-(--el-editor-field-value)">
                      {tag}
                      <button type="button" onClick={() => handleRemoveTag(tag)} className="text-(--el-editor-field-label) hover:text-(--el-editor-field-value)">
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
                    className="min-w-[80px] flex-1 bg-transparent text-sm text-(--el-editor-field-value) placeholder:text-(--el-editor-field-label) focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Info card */}
          {!selectedDate && (
            <div className="flex items-start gap-2.5 rounded-(--radius-card) bg-(--el-editor-tag-bg) p-(--spacing-card)">
              <Icon name="info" size={18} color="var(--el-modal-icon-unselected)" className="mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed text-(--el-editor-field-label)">
                {t('itemEditor.infoText')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Participant selection modal (for group activities) */}
      {draft?.groupId && (
        <ParticipantSelectionModal
          open={showParticipantModal}
          onClose={() => setShowParticipantModal(false)}
          groupId={draft.groupId}
          selectedUserIds={assignments}
          onSelectionChange={setAssignments}
          currentUserId={user?.id || ''}
        />
      )}
    </div>
  );
}
