import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTask, getEvent } from '@/lib/api';
import { useItemMutations } from '@/hooks/useItemMutations';
import { useCategories } from '@/hooks/useCategories';
import { Icon } from '@/components/ui/Icon';
import { toNoonUTC, combineDateAndTime } from '@/utils/dateForm';
import type { CreateTaskRequest, CreateEventRequest, UpdateTaskRequest, UpdateEventRequest, Task, Event as ApiEvent } from '@/types/api';
import { useTranslation } from 'react-i18next';

// ── Types ──

type ItemType = 'TASK' | 'EVENT';
type TimeOfDay = 'MORNING' | 'AFTERNOON' | 'EVENING' | null;

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
}

// ── Field row component ──

function FieldRow({ icon, text, onClick, active }: { icon: string; text: string; onClick?: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3.5 px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
    >
      <Icon name={icon} size={20} color={active ? 'var(--color-primary)' : 'var(--color-muted-foreground)'} />
      <span className={`text-sm ${active ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{text}</span>
    </button>
  );
}

// ── Main component ──

export function ItemEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
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

  // Additional fields
  const [priority, setPriority] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [locationValue, setLocationValue] = useState('');

  const titleRef = useRef<HTMLInputElement>(null);

  // ── Load existing item for edit mode ──
  const { data: existingItem, isError: fetchError } = useQuery({
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
    if (isTask) {
      const task = existingItem as Task;
      setPriority(task.priority || '');
      setCategoryId(task.categoryId || '');
      setTimeOfDay(task.timeOfDay || null);
      setLocationValue(task.location || '');
    } else {
      const event = existingItem as ApiEvent;
      setLocationValue(event.location || '');
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

  // ── Computed ──
  const isTask = itemType === 'TASK';
  const isTitleValid = title.trim().length > 0;
  const isPending = createTaskMutation.isPending || createEventMutation.isPending ||
    updateTaskMutation.isPending || updateEventMutation.isPending;
  const saveDisabled = isPending || !isTitleValid;

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
    } else {
      setHasStartTime(false);
      setHasEndTime(false);
    }
  }, []);

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

      if (isEditMode) {
        const req: UpdateTaskRequest = {
          title: trimmedTitle,
          description: description || undefined,
          date: dateStr ?? null,
          hasTime,
          timeOfDay: !hasTime ? timeOfDay ?? undefined : undefined,
          timeZone: hasTime ? tz : undefined,
          priority: priority || undefined,
          categoryId: categoryId || undefined,
          location: locationValue || undefined,
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
          dateType: 'SCHEDULED',
          showInTodoWhenOverdue: true,
          setToDoneAutomatically: false,
          priority: priority || undefined,
          categoryId: categoryId || undefined,
          location: locationValue || undefined,
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
          endDate: endDateStr,
        };
        await createEventMutation.mutateAsync(req);
      }
    }

    navigate(-1);
  }, [
    isTitleValid, title, description, isTask, selectedDate, hasTime, timeValue,
    timeOfDay, hasStartTime, startTimeValue, hasEndTime, endTimeValue,
    priority, categoryId, locationValue, isEditMode, id,
    createTaskMutation, createEventMutation, updateTaskMutation, updateEventMutation,
    navigate,
  ]);

  // ── Date display ──
  const dateDisplay = selectedDate
    ? selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
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
          <FieldRow
            icon="calendar_today"
            text={dateDisplay || t('itemEditor.addDate')}
            active={!!selectedDate}
          />
          {/* Time (task) */}
          {isTask && selectedDate && (
            <div className="px-4 py-2.5">
              {hasTime ? (
                <div className="flex items-center gap-2.5">
                  <Icon name="schedule" size={20} color="var(--color-primary)" />
                  <input
                    type="time"
                    value={timeValue}
                    onChange={(e) => setTimeValue(e.target.value)}
                    className="h-9 rounded-md border border-border bg-transparent px-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button type="button" onClick={() => { setHasTime(false); setTimeOfDay(null); }} className="ml-auto text-muted-foreground hover:text-foreground">
                    <Icon name="close" size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setHasTime(true)}
                  className="flex w-full items-center gap-3.5 text-left"
                >
                  <Icon name="schedule" size={20} color="var(--color-muted-foreground)" />
                  <span className="text-sm text-muted-foreground">{t('calendarPage.form.addTime')}</span>
                </button>
              )}
            </div>
          )}
          {/* Start/end time (event) */}
          {!isTask && selectedDate && (
            <>
              <div className="px-4 py-2.5">
                {hasStartTime ? (
                  <div className="flex items-center gap-2.5">
                    <Icon name="schedule" size={20} color="var(--color-primary)" />
                    <input
                      type="time"
                      value={startTimeValue}
                      onChange={(e) => setStartTimeValue(e.target.value)}
                      className="h-9 rounded-md border border-border bg-transparent px-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <button type="button" onClick={() => setHasStartTime(false)} className="ml-auto text-muted-foreground hover:text-foreground">
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setHasStartTime(true)} className="flex w-full items-center gap-3.5 text-left">
                    <Icon name="schedule" size={20} color="var(--color-muted-foreground)" />
                    <span className="text-sm text-muted-foreground">{t('calendarPage.form.startTime')}</span>
                  </button>
                )}
              </div>
              <div className="px-4 py-2.5">
                {hasEndTime ? (
                  <div className="flex items-center gap-2.5">
                    <Icon name="schedule" size={20} color="var(--color-primary)" />
                    <input
                      type="time"
                      value={endTimeValue}
                      onChange={(e) => setEndTimeValue(e.target.value)}
                      className="h-9 rounded-md border border-border bg-transparent px-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <button type="button" onClick={() => setHasEndTime(false)} className="ml-auto text-muted-foreground hover:text-foreground">
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setHasEndTime(true)} className="flex w-full items-center gap-3.5 text-left">
                    <Icon name="schedule" size={20} color="var(--color-muted-foreground)" />
                    <span className="text-sm text-muted-foreground">{t('calendarPage.form.endTime')}</span>
                  </button>
                )}
              </div>
            </>
          )}
          {/* Recurrence */}
          <FieldRow icon="repeat" text={t('itemEditor.setRecurrence')} />
          {/* Location */}
          <FieldRow
            icon="location_on"
            text={locationValue || t('itemEditor.addLocation')}
            active={!!locationValue}
          />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Classification card */}
          <div className="rounded-xl bg-surface p-1 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            {/* Priority */}
            <FieldRow
              icon="flag"
              text={priority ? priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase() : t('itemEditor.addPriority')}
              active={!!priority}
            />
            {/* Category */}
            <FieldRow
              icon="sell"
              text={
                categoryId
                  ? (categories?.find((c) => c.id === categoryId)?.name || t('itemEditor.addCategory'))
                  : t('itemEditor.addCategory')
              }
              active={!!categoryId}
            />
            {/* Tags */}
            <FieldRow icon="label" text={t('itemEditor.addTags')} />
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
