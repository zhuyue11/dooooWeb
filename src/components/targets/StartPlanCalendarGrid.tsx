import { useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { getHoursArray, formatHourLabel, isSameDay } from '@/utils/date';
import type { ScheduledPlanItem } from '@/utils/planScheduler';

interface StartPlanCalendarGridProps {
  weekDates: Date[];
  planTasks: ScheduledPlanItem[];
  onTaskClick: (task: ScheduledPlanItem) => void;
}

const HOUR_HEIGHT = 60;
const HOUR_LABEL_WIDTH = 48;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const TIME_OF_DAY_ICONS: Record<string, string> = {
  MORNING: 'wb_sunny',
  AFTERNOON: 'wb_cloudy',
  EVENING: 'nights_stay',
};

const TIME_OF_DAY_LABELS: Record<string, string> = {
  MORNING: 'Morning',
  AFTERNOON: 'Afternoon',
  EVENING: 'Evening',
};

export function StartPlanCalendarGrid({ weekDates, planTasks, onTaskClick }: StartPlanCalendarGridProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const hours = getHoursArray();

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

  if (weekDates.length === 0) return null;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
      data-testid="start-plan-calendar-grid"
    >
      {/* Day headers */}
      <div className="flex shrink-0 border-b border-border">
        <div style={{ width: HOUR_LABEL_WIDTH }} className="flex-shrink-0" />
        <div className="grid flex-1 grid-cols-7">
          {weekDates.map((date, i) => {
            const isToday = isSameDay(date, today);
            return (
              <div key={i} className="flex flex-col items-center py-2">
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide ${
                    isToday ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {DAY_NAMES[date.getDay()]}
                </span>
                <div
                  className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${
                    isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
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
              <div key={period} className="flex border-b border-border" data-testid={`tod-${period.toLowerCase()}`}>
                {/* Period label */}
                <div
                  style={{ width: HOUR_LABEL_WIDTH }}
                  className="flex flex-shrink-0 items-center justify-center"
                >
                  <Icon
                    name={TIME_OF_DAY_ICONS[period]}
                    size={16}
                    color="var(--color-muted-foreground)"
                  />
                </div>
                {/* Day columns */}
                <div className="grid flex-1 grid-cols-7">
                  {weekDates.map((_, dayIndex) => {
                    const tasks = periodMap.get(dayIndex) || [];
                    return (
                      <div key={dayIndex} className="flex flex-col gap-1 border-l border-border p-1">
                        {tasks.map((task) => (
                          <button
                            key={task.instanceId || task.templateId}
                            type="button"
                            className="rounded-md bg-primary/15 px-1.5 py-1 text-left transition-opacity hover:opacity-80"
                            onClick={() => onTaskClick(task)}
                          >
                            <span className="truncate text-[10px] font-medium leading-tight text-primary">
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
        <div className="relative flex">
          {/* Hour labels */}
          <div className="flex-shrink-0" style={{ width: HOUR_LABEL_WIDTH }}>
            {hours.map((hour) => (
              <div
                key={hour}
                className="flex items-start justify-end pr-2 pt-0"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="text-[10px] text-muted-foreground">{formatHourLabel(hour)}</span>
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
                <div key={dayIndex} className="relative border-l border-border" data-testid={`start-plan-day-col-${dayIndex}`}>
                  {/* Hour row backgrounds */}
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className={`border-b border-border/50 ${
                        isToday && hour === currentHour ? 'bg-[#f0f0ff] dark:bg-[#1a1a2e]' : ''
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

                    return (
                      <button
                        key={task.instanceId || task.templateId}
                        type="button"
                        className="absolute cursor-pointer overflow-hidden rounded-md bg-primary px-1.5 py-1 text-left transition-opacity hover:opacity-80"
                        style={{
                          top,
                          height,
                          left: '2px',
                          right: '2px',
                          zIndex: 1,
                        }}
                        onClick={() => onTaskClick(task)}
                        data-testid={`start-plan-task-${task.templateId}`}
                      >
                        <div className="flex min-w-0 items-center gap-0.5">
                          {task.isEvent && (
                            <Icon name="event" size={10} color="var(--color-primary-foreground)" />
                          )}
                          <span className="truncate text-[10px] font-medium leading-tight text-primary-foreground">
                            {task.title}
                          </span>
                        </div>
                        {task.isAutoSuggested && (
                          <div className="absolute right-0.5 top-0.5">
                            <Icon name="auto_awesome" size={8} color="var(--color-primary-foreground)" />
                          </div>
                        )}
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
  );
}
