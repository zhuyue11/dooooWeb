import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { getHoursArray, formatHourLabel, isSameDay } from '@/utils/date';
import { useDisplay } from '@/lib/contexts/display-context';
import type { ScheduledPlanItem } from '@/utils/planScheduler';

interface StartPlanCalendarGridProps {
  weekDates: Date[];
  planTasks: ScheduledPlanItem[];
  onTaskClick: (task: ScheduledPlanItem) => void;
  onDragEnd?: (task: ScheduledPlanItem, newDate: Date) => void;
}

const HOUR_HEIGHT = 60;
const HOUR_LABEL_WIDTH = 48;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const SNAP_MINUTES = 15;

const TIME_OF_DAY_ICONS: Record<string, string> = {
  MORNING: 'wb_sunny',
  AFTERNOON: 'wb_cloudy',
  EVENING: 'nights_stay',
};

interface DragState {
  task: ScheduledPlanItem;
  startY: number;
  blockTop: number; // original top position in the grid (px)
  blockHeight: number;
  colLeft: number; // left edge of the day column
  colWidth: number;
  pointerId: number;
  element: HTMLElement;
}

function formatDragTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function clampTime(date: Date, originalDate: Date): Date {
  const d = new Date(date);
  if (d.getDate() !== originalDate.getDate()) {
    // Crossed midnight — clamp
    if (d < originalDate) {
      d.setFullYear(originalDate.getFullYear(), originalDate.getMonth(), originalDate.getDate());
      d.setHours(0, 0, 0, 0);
    } else {
      d.setFullYear(originalDate.getFullYear(), originalDate.getMonth(), originalDate.getDate());
      d.setHours(23, 30, 0, 0);
    }
  }
  return d;
}

export function StartPlanCalendarGrid({ weekDates, planTasks, onTaskClick, onDragEnd }: StartPlanCalendarGridProps) {
  const { timeFormat } = useDisplay();
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const hours = getHoursArray();

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Separate timed tasks from time-of-day tasks
  const timedTasksByDay = useMemo(() => {
    const map = new Map<number, ScheduledPlanItem[]>();
    for (const task of planTasks) {
      if (!task.hasTime) continue;
      const dayIdx = weekDates.findIndex((d) => isSameDay(d, task.date));
      if (dayIdx === -1) continue;
      if (!map.has(dayIdx)) map.set(dayIdx, []);
      map.get(dayIdx)!.push(task);
    }
    return map;
  }, [planTasks, weekDates]);

  // Group time-of-day tasks by period, then by day
  const timeOfDayTasks = useMemo(() => {
    const periods: Record<string, Map<number, ScheduledPlanItem[]>> = {
      MORNING: new Map(),
      AFTERNOON: new Map(),
      EVENING: new Map(),
    };
    for (const task of planTasks) {
      if (task.hasTime || !task.timeOfDay) continue;
      const dayIdx = weekDates.findIndex((d) => isSameDay(d, task.date));
      if (dayIdx === -1) continue;
      const period = task.timeOfDay;
      if (!periods[period]) continue;
      if (!periods[period].has(dayIdx)) periods[period].set(dayIdx, []);
      periods[period].get(dayIdx)!.push(task);
    }
    return periods;
  }, [planTasks, weekDates]);

  const hasTimeOfDayTasks = useMemo(
    () => Object.values(timeOfDayTasks).some((m) => m.size > 0),
    [timeOfDayTasks],
  );

  // Auto-scroll to earliest timed task
  useEffect(() => {
    if (!scrollRef.current) return;
    const timed = planTasks.filter((t) => t.hasTime);
    if (timed.length === 0) return;
    const earliestHour = Math.min(...timed.map((t) => t.date.getHours()));
    scrollRef.current.scrollTop = Math.max(0, earliestHour - 1) * HOUR_HEIGHT;
  }, [planTasks]);

  // Compute drag preview time (snapped)
  const dragPreview = useMemo(() => {
    if (!dragState) return null;
    const rawMinuteOffset = (dragOffsetY / HOUR_HEIGHT) * 60;
    const snappedOffset = Math.round(rawMinuteOffset / SNAP_MINUTES) * SNAP_MINUTES;
    const originalMinutes = dragState.task.date.getHours() * 60 + dragState.task.date.getMinutes();
    const newMinutes = originalMinutes + snappedOffset;
    const newDate = new Date(dragState.task.date);
    newDate.setHours(Math.floor(newMinutes / 60), newMinutes % 60, 0, 0);
    const clamped = clampTime(newDate, dragState.task.date);
    return { date: clamped, timeLabel: formatDragTime(clamped) };
  }, [dragState, dragOffsetY]);

  // Ref for cleanup of document listeners
  const cleanupRef = useRef<(() => void) | null>(null);

  // Drag handler — adds document-level listeners immediately (not via useEffect)
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, task: ScheduledPlanItem, blockTop: number, blockHeight: number) => {
      if (!onDragEnd || !task.hasTime) return;
      e.preventDefault();
      e.stopPropagation();

      const el = e.currentTarget;
      const startY = e.clientY;

      // Get the day column position for the floating block
      const colEl = el.parentElement;
      const colRect = colEl?.getBoundingClientRect() ?? { left: 0, width: 0 };

      const state: DragState = {
        task,
        startY,
        blockTop,
        blockHeight,
        colLeft: colRect.left,
        colWidth: colRect.width,
        pointerId: e.pointerId,
        element: el,
      };

      setDragState(state);
      setDragOffsetY(0);

      // Prevent scroll during drag
      if (scrollRef.current) {
        scrollRef.current.style.overflowY = 'hidden';
      }

      // Immediately attach document-level listeners (no re-render delay)
      const handleMove = (ev: PointerEvent) => {
        const offset = ev.clientY - startY;
        setDragOffsetY(offset);
      };

      const finishDrag = (offset: number) => {
        // Remove listeners
        document.removeEventListener('pointermove', handleMove);
        document.removeEventListener('pointerup', handleUp);
        document.removeEventListener('keydown', handleKeyDown);
        cleanupRef.current = null;

        // Restore scroll
        if (scrollRef.current) {
          scrollRef.current.style.overflowY = 'auto';
        }

        // Compute snapped new time
        if (Math.abs(offset) > 5) {
          const rawMinuteOffset = (offset / HOUR_HEIGHT) * 60;
          const snappedOffset = Math.round(rawMinuteOffset / SNAP_MINUTES) * SNAP_MINUTES;
          const originalMinutes = task.date.getHours() * 60 + task.date.getMinutes();
          const newMinutes = originalMinutes + snappedOffset;
          const newDate = new Date(task.date);
          newDate.setHours(Math.floor(newMinutes / 60), newMinutes % 60, 0, 0);
          onDragEnd(task, clampTime(newDate, task.date));
        } else {
          onTaskClick(task);
        }

        setDragState(null);
        setDragOffsetY(0);
      };

      let lastOffset = 0;
      const origHandleMove = handleMove;
      const trackingHandleMove = (ev: PointerEvent) => {
        lastOffset = ev.clientY - startY;
        origHandleMove(ev);
      };

      const handleUp = () => finishDrag(lastOffset);

      const handleKeyDown = (ev: KeyboardEvent) => {
        if (ev.key === 'Escape') finishDrag(0);
      };

      // Replace handleMove reference with tracking version
      document.addEventListener('pointermove', trackingHandleMove);
      document.addEventListener('pointerup', handleUp);
      document.addEventListener('keydown', handleKeyDown);

      cleanupRef.current = () => {
        document.removeEventListener('pointermove', trackingHandleMove);
        document.removeEventListener('pointerup', handleUp);
        document.removeEventListener('keydown', handleKeyDown);
      };
    },
    [onDragEnd, onTaskClick],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, []);

  if (weekDates.length === 0) return null;

  const isDragging = dragState !== null;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-(--radius-card) bg-(--el-plan-bg) shadow-(--shadow-card)"
      data-testid="start-plan-calendar-grid"
    >
      {/* Day headers */}
      <div className="flex shrink-0 border-b border-(--el-card-border)">
        <div style={{ width: HOUR_LABEL_WIDTH }} className="flex-shrink-0" />
        <div className="grid flex-1 grid-cols-7">
          {weekDates.map((date, i) => {
            const isToday = isSameDay(date, today);
            return (
              <div key={i} className="flex flex-col items-center py-2">
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide ${
                    isToday ? 'text-(--el-cal-date-today-text)' : 'text-(--el-cal-day-header)'
                  }`}
                >
                  {DAY_NAMES[date.getDay()]}
                </span>
                <div
                  className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${
                    isToday ? 'bg-(--el-cal-date-today-border) text-(--el-cal-date-selected-text)' : 'text-(--el-cal-date-normal)'
                  }`}
                >
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable: time-of-day rows + hour grid */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {/* Time-of-day sections (for useTimeOfDay mode) */}
        {hasTimeOfDayTasks &&
          (['MORNING', 'AFTERNOON', 'EVENING'] as const).map((period) => {
            const periodMap = timeOfDayTasks[period];
            if (!periodMap || periodMap.size === 0) return null;
            return (
              <div key={period} className="flex border-b border-(--el-card-border)" data-testid={`tod-${period.toLowerCase()}`}>
                {/* Period label */}
                <div
                  style={{ width: HOUR_LABEL_WIDTH }}
                  className="flex flex-shrink-0 items-center justify-center"
                >
                  <Icon
                    name={TIME_OF_DAY_ICONS[period]}
                    size={16}
                    color="var(--el-cal-hour-label)"
                  />
                </div>
                {/* Day columns */}
                <div className="grid flex-1 grid-cols-7">
                  {weekDates.map((_, dayIndex) => {
                    const tasks = periodMap.get(dayIndex) || [];
                    return (
                      <div key={dayIndex} className="flex flex-col gap-1 border-l border-(--el-cal-grid-border) p-1">
                        {tasks.map((task) => (
                          <button
                            key={task.instanceId || task.templateId}
                            type="button"
                            className="rounded-(--radius-btn) bg-(--el-target-status-active-bg) px-(--spacing-btn-x-sm) py-1 text-left transition-opacity hover:opacity-80"
                            onClick={() => onTaskClick(task)}
                          >
                            <span className="truncate text-[10px] font-medium leading-tight text-(--el-target-status-active-text)">
                              {task.title}
                            </span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

        {/* Hour grid */}
        <div ref={gridRef} className="relative flex">
          {/* Hour labels */}
          <div className="flex-shrink-0" style={{ width: HOUR_LABEL_WIDTH }}>
            {hours.map((hour) => (
              <div
                key={hour}
                className="flex items-start justify-end pr-2 pt-0"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="text-[10px] text-(--el-cal-hour-label)">{formatHourLabel(hour, timeFormat)}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="grid flex-1 grid-cols-7">
            {weekDates.map((date, dayIndex) => {
              const isToday = isSameDay(date, today);
              const dayTasks = timedTasksByDay.get(dayIndex) || [];
              const currentHour = new Date().getHours();

              return (
                <div key={dayIndex} className="relative border-l border-(--el-cal-grid-border)" data-testid={`start-plan-day-col-${dayIndex}`}>
                  {/* Hour row backgrounds */}
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className={`border-b border-(--el-cal-grid-border)/50 ${
                        isToday && hour === currentHour ? 'bg-(--el-cal-current-hour-bg)' : ''
                      }`}
                      style={{ height: HOUR_HEIGHT }}
                    />
                  ))}

                  {/* Task blocks */}
                  {dayTasks.map((task) => {
                    const startHour = task.date.getHours();
                    const startMinute = task.date.getMinutes();
                    const top = (startHour + startMinute / 60) * HOUR_HEIGHT;
                    const height = Math.max(24, (task.duration / 60) * HOUR_HEIGHT);
                    const taskKey = task.instanceId || task.templateId;
                    const isBeingDragged = isDragging && (dragState.task.instanceId || dragState.task.templateId) === taskKey;

                    return (
                      <div
                        key={task.instanceId || task.templateId}
                        className={`absolute overflow-hidden rounded-(--radius-btn) bg-(--el-btn-primary-bg) px-(--spacing-btn-x-sm) py-1 text-left select-none ${
                          isBeingDragged
                            ? 'opacity-35'
                            : onDragEnd
                              ? 'cursor-grab hover:opacity-80'
                              : 'cursor-pointer hover:opacity-80'
                        }`}
                        style={{
                          top,
                          height,
                          left: '2px',
                          right: '2px',
                          zIndex: isBeingDragged ? 0 : 1,
                          touchAction: 'none',
                        }}
                        data-testid={`start-plan-task-${task.templateId}`}
                        onPointerDown={(e) => handlePointerDown(e, task, top, height)}
                        onClick={!onDragEnd ? () => onTaskClick(task) : undefined}
                      >
                        <div className="flex min-w-0 items-center gap-0.5">
                          {task.isEvent && (
                            <Icon name="event" size={10} color="var(--el-btn-primary-text)" />
                          )}
                          <span className="truncate text-[10px] font-medium leading-tight text-(--el-btn-primary-text)">
                            {task.title}
                          </span>
                        </div>
                        {task.isAutoSuggested && (
                          <div className="absolute right-0.5 top-0.5">
                            <Icon name="auto_awesome" size={8} color="var(--el-btn-primary-text)" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Drag overlay: floating block + time badge */}
      {isDragging && dragPreview && (
        <div className="pointer-events-none fixed inset-0 z-[100]" data-testid="drag-overlay">
          {/* Time badge */}
          <div
            className="absolute rounded bg-(--el-btn-primary-bg) px-2 py-0.5 text-[11px] font-semibold text-(--el-btn-primary-text) shadow-(--shadow-card-hover)"
            style={{
              top: dragState.startY + dragOffsetY - dragState.blockHeight - 8,
              left: dragState.colLeft,
              width: dragState.colWidth,
              textAlign: 'center',
            }}
            data-testid="drag-time-badge"
          >
            {dragPreview.timeLabel}
          </div>

          {/* Floating block */}
          <div
            className="absolute cursor-grabbing overflow-hidden rounded-(--radius-btn) bg-(--el-btn-primary-bg) px-(--spacing-btn-x-sm) py-1 text-left shadow-(--shadow-elevated)"
            style={{
              top: dragState.startY + dragOffsetY - (dragState.startY - (dragState.element.getBoundingClientRect().top)),
              left: dragState.colLeft + 2,
              width: dragState.colWidth - 4,
              height: dragState.blockHeight,
            }}
          >
            <div className="flex min-w-0 items-center gap-0.5">
              {dragState.task.isEvent && (
                <Icon name="event" size={10} color="var(--el-btn-primary-text)" />
              )}
              <span className="truncate text-[10px] font-medium leading-tight text-(--el-btn-primary-text)">
                {dragState.task.title}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
