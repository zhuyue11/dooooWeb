import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { CalendarPopover } from '@/components/ui/CalendarPopover';
import { getHoursArray, formatHourLabel, isSameDay, formatDateRange } from '@/utils/date';
import {
  schedulePlanTasks,
  getPlanWeekRange,
  getTasksForWeek,
  computeSuggestedStartDate,
} from '@/utils/planScheduler';
import type { PlanTemplate } from '@/types/target';
import type { ScheduledPlanItem } from '@/utils/planScheduler';

interface PlanCalendarViewProps {
  templates: PlanTemplate[];
  planArchetype?: string | null;
  onTemplateClick: (templateIndex: number, scheduledDate: Date) => void;
}

const HOUR_HEIGHT = 60;
const HOUR_LABEL_WIDTH = 48;

function getDefaultStartDate(archetype: string | null | undefined): Date {
  const now = new Date();
  const start = new Date(now);
  if (archetype === 'daily_routine' || now.getHours() >= 21) {
    start.setDate(start.getDate() + 1);
  }
  start.setHours(0, 0, 0, 0);
  return start;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function PlanCalendarView({ templates, planArchetype, onTemplateClick }: PlanCalendarViewProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const hours = getHoursArray();
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Start date state — initialized with smart defaults matching dooooApp
  const [startDate, setStartDate] = useState<Date>(() => {
    const base = getDefaultStartDate(planArchetype);
    const suggested = computeSuggestedStartDate(templates, base);
    return suggested || base;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Scheduling state
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledPlanItem[]>([]);
  const [weekStarts, setWeekStarts] = useState<Date[]>([]);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);

  // Run scheduler when startDate or templates change
  useEffect(() => {
    if (templates.length === 0) return;
    const result = schedulePlanTasks(templates, startDate, 'spread', 'morning', planArchetype);
    setScheduledTasks(result.scheduledTasks);
    setWeekStarts(getPlanWeekRange(result.scheduledTasks));
    setCurrentWeekIndex(0);
  }, [templates, startDate, planArchetype]);

  // Auto-scroll to earliest task hour
  useEffect(() => {
    if (scheduledTasks.length === 0 || !scrollRef.current) return;
    const timedTasks = scheduledTasks.filter((t) => t.hasTime);
    if (timedTasks.length === 0) return;
    const earliestHour = Math.min(...timedTasks.map((t) => t.date.getHours()));
    scrollRef.current.scrollTop = Math.max(0, earliestHour - 1) * HOUR_HEIGHT;
  }, [scheduledTasks]);

  // Week dates for current week page (Mon-Sun)
  const weekDates = useMemo(() => {
    if (weekStarts.length === 0) return [];
    const ws = weekStarts[currentWeekIndex];
    if (!ws) return [];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ws);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStarts, currentWeekIndex]);

  // Tasks for the current visible week
  const weekTasks = useMemo(() => {
    if (weekStarts.length === 0 || !weekStarts[currentWeekIndex]) return [];
    return getTasksForWeek(weekStarts[currentWeekIndex], scheduledTasks);
  }, [weekStarts, currentWeekIndex, scheduledTasks]);

  // Group tasks by day column for rendering
  const tasksByDayIndex = useMemo(() => {
    const map = new Map<number, ScheduledPlanItem[]>();
    for (const task of weekTasks) {
      if (!task.hasTime) continue;
      const dayIdx = weekDates.findIndex((d) => isSameDay(d, task.date));
      if (dayIdx === -1) continue;
      if (!map.has(dayIdx)) map.set(dayIdx, []);
      map.get(dayIdx)!.push(task);
    }
    return map;
  }, [weekTasks, weekDates]);

  // Week label for navigation
  const weekLabel = useMemo(() => {
    if (weekDates.length < 7) return '';
    return formatDateRange(weekDates[0], weekDates[6]);
  }, [weekDates]);

  const handleDateSelect = useCallback(
    (date: Date) => {
      setStartDate(date);
      setShowDatePicker(false);
    },
    [],
  );

  const handleTemplateClick = useCallback(
    (task: ScheduledPlanItem) => {
      const index = templates.findIndex((t) => t.id === task.templateId);
      if (index !== -1) {
        onTemplateClick(index, task.date);
      }
    },
    [templates, onTemplateClick],
  );

  if (templates.length === 0) return null;

  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);

  return (
    <div className="flex h-full flex-col gap-3" data-testid="plan-calendar-view">
      {/* Fixed: Start date picker row */}
      <div className="relative shrink-0" data-testid="start-date-row">
        <button
          type="button"
          onClick={() => setShowDatePicker(!showDatePicker)}
          className="flex w-full items-center gap-2 rounded-(--radius-card) border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-muted/50"
        >
          <Icon name="event" size={18} color="var(--color-primary)" />
          <span className="flex-1 text-[13px] text-foreground">
            {t('targetPlan.planStartsOn')}{' '}
            <span className="font-semibold">
              {startDate.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </span>
          <Icon
            name={showDatePicker ? 'expand_less' : 'expand_more'}
            size={20}
            color="var(--color-muted-foreground)"
          />
        </button>
        {showDatePicker && (
          <div className="absolute left-0 top-full z-50 mt-1">
            <CalendarPopover
              selectedDate={startDate}
              onSelect={handleDateSelect}
              onClose={() => setShowDatePicker(false)}
              minDate={minDate}
            />
          </div>
        )}
      </div>

      {/* Fixed: Week navigation — only for multi-week plans */}
      {weekStarts.length > 1 && (
        <div className="flex shrink-0 items-center justify-center gap-3" data-testid="week-navigation">
          <button
            type="button"
            disabled={currentWeekIndex === 0}
            onClick={() => setCurrentWeekIndex((i) => i - 1)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
            data-testid="week-nav-prev"
          >
            <Icon name="chevron_left" size={18} />
          </button>
          <span className="text-[13px] text-muted-foreground" data-testid="week-indicator">
            {weekLabel} · {t('targetPlan.weekIndicator', { current: currentWeekIndex + 1, total: weekStarts.length })}
          </span>
          <button
            type="button"
            disabled={currentWeekIndex === weekStarts.length - 1}
            onClick={() => setCurrentWeekIndex((i) => i + 1)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
            data-testid="week-nav-next"
          >
            <Icon name="chevron_right" size={18} />
          </button>
        </div>
      )}

      {/* Calendar grid — fills remaining height */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-(--radius-card) bg-surface shadow-(--shadow-card)">
        {/* Fixed: Day headers */}
        <div className="flex shrink-0 border-b border-border">
          <div style={{ width: HOUR_LABEL_WIDTH }} className="flex-shrink-0" />
          <div className="grid flex-1 grid-cols-7">
            {weekDates.map((date, i) => {
              const isToday = isSameDay(date, today);
              return (
                <div key={i} className="flex flex-col items-center py-2">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wide ${isToday ? 'text-primary' : 'text-muted-foreground'}`}
                  >
                    {DAY_NAMES[date.getDay()]}
                  </span>
                  <div
                    className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${
                      isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                    }`}
                    data-testid={isToday ? 'plan-cal-today' : undefined}
                  >
                    {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable: Time grid */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <div className="relative flex">
            {/* Hour labels */}
            <div className="flex-shrink-0" style={{ width: HOUR_LABEL_WIDTH }}>
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="flex items-start justify-end pr-2 pt-0"
                  style={{ height: HOUR_HEIGHT }}
                >
                  <span className="text-[10px] text-muted-foreground">
                    {formatHourLabel(hour)}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            <div className="grid flex-1 grid-cols-7">
              {weekDates.map((date, dayIndex) => {
                const isToday = isSameDay(date, today);
                const dayTasks = tasksByDayIndex.get(dayIndex) || [];
                const currentHour = new Date().getHours();

                return (
                  <div key={dayIndex} className="relative border-l border-border" data-testid={`plan-day-col-${dayIndex}`}>
                    {/* Hour row backgrounds */}
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className={`border-b border-border/50 ${
                          isToday && hour === currentHour ? 'bg-primary/5' : ''
                        }`}
                        style={{ height: HOUR_HEIGHT }}
                      />
                    ))}

                    {/* Task blocks — absolutely positioned */}
                    {dayTasks.map((task) => {
                      const startHour = task.date.getHours();
                      const startMinute = task.date.getMinutes();
                      const top = (startHour + startMinute / 60) * HOUR_HEIGHT;
                      const height = Math.max(24, (task.duration / 60) * HOUR_HEIGHT);

                      return (
                        <button
                          key={task.instanceId || task.templateId}
                          type="button"
                          className="absolute cursor-pointer overflow-hidden rounded-(--radius-btn) bg-primary px-(--spacing-btn-x-sm) py-1 text-left transition-opacity hover:opacity-80"
                          style={{
                            top,
                            height,
                            left: '2px',
                            right: '2px',
                            zIndex: 1,
                          }}
                          onClick={() => handleTemplateClick(task)}
                          data-testid={`plan-task-block-${task.templateId}`}
                        >
                          <div className="flex min-w-0 items-center gap-0.5">
                            {task.isEvent && (
                              <Icon name="event" size={10} color="var(--color-primary-foreground)" />
                            )}
                            <span className="truncate text-[10px] font-medium leading-tight text-primary-foreground">
                              {task.title}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
