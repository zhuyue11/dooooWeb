/**
 * Plan scheduling utilities — ported from dooooApp/utils/planScheduler.ts + taskUtils.ts.
 * Pure functions: no React dependencies, no side effects.
 *
 * Given a set of PlanTemplates and a start date, schedules them onto concrete
 * dates/times for calendar preview rendering.
 */
import { getNextOccurrenceDate } from '@/utils/recurrence';
import type { Repeat } from '@/types/api';
import type { PlanTemplate } from '@/types/target';

// ===== Types =====

export type TimePreference = 'morning' | 'afternoon' | 'evening';
export type ScheduleMode = 'spread' | 'same_period';

export interface ScheduledPlanItem {
  templateId: string;
  instanceId?: string; // Unique per expanded recurring instance (templateId-YYYY-MM-DD)
  title: string;
  description?: string;
  date: Date;
  duration: number; // minutes
  hasTime: boolean;
  isAutoSuggested: boolean;
  timeOfDay?: 'MORNING' | 'AFTERNOON' | 'EVENING' | null;
  repeat?: string; // JSON repeat string
  firstReminderMinutes?: number | null;
  secondReminderMinutes?: number | null;
  location?: string | null;
  isEvent?: boolean;
  meetingLink?: string | null;
}

export interface ScheduleResult {
  scheduledTasks: ScheduledPlanItem[];
}

// ===== Time Grading =====

const TIME_GRADES: Record<TimePreference, number[]> = {
  morning: [8, 9, 7, 10, 11, 6],
  afternoon: [13, 14, 12, 15, 16, 17],
  evening: [20, 19, 21, 18, 22, 23],
};

const PERIOD_CYCLE: TimePreference[] = ['morning', 'afternoon', 'evening'];

// ===== Helpers =====

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface TimeSlot {
  start: number; // minutes from midnight
  end: number;
}

function getTaskTimeSlot(task: { date: Date; duration?: number | null; hasTime: boolean }): TimeSlot | null {
  if (!task.hasTime) return null;
  const d = task.date;
  const startMin = d.getHours() * 60 + d.getMinutes();
  const dur = task.duration || 30;
  return { start: startMin, end: startMin + dur };
}

function slotsOverlap(a: TimeSlot, b: TimeSlot): boolean {
  return a.start < b.end && b.start < a.end;
}

function buildOccupiedMap(placedPlanTasks: ScheduledPlanItem[]): Map<string, TimeSlot[]> {
  const map = new Map<string, TimeSlot[]>();
  for (const task of placedPlanTasks) {
    if (!task.hasTime) continue;
    const key = toDateKey(task.date);
    const slot = getTaskTimeSlot({ date: task.date, duration: task.duration, hasTime: true });
    if (slot) {
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(slot);
    }
  }
  return map;
}

function findFreeSlot(
  dateKey: string,
  duration: number,
  hours: number[],
  occupiedMap: Map<string, TimeSlot[]>,
): number | null {
  const occupied = occupiedMap.get(dateKey) || [];
  for (const hour of hours) {
    const candidate: TimeSlot = { start: hour * 60, end: hour * 60 + duration };
    if (!occupied.some((s) => slotsOverlap(s, candidate))) {
      return hour * 60;
    }
  }
  // Try half-hour offsets
  for (const hour of hours) {
    const candidate: TimeSlot = { start: hour * 60 + 30, end: hour * 60 + 30 + duration };
    if (!occupied.some((s) => slotsOverlap(s, candidate))) {
      return hour * 60 + 30;
    }
  }
  return null;
}

function setTimeFromMinutes(baseDate: Date, minutes: number): Date {
  const d = new Date(baseDate);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ===== Template → ScheduledPlanItem =====

function templateToScheduledTask(
  template: PlanTemplate,
  baseDate: Date,
  isAutoSuggested: boolean,
): ScheduledPlanItem {
  const date = new Date(baseDate);
  if (template.time) {
    const [h, m] = template.time.split(':').map(Number);
    date.setHours(h, m, 0, 0);
  }
  return {
    templateId: template.id,
    title: template.title,
    description: template.description,
    date,
    duration: template.duration || 30,
    hasTime: !!template.time,
    isAutoSuggested,
    repeat: template.repeat,
    firstReminderMinutes: template.firstReminderMinutes,
    secondReminderMinutes: template.secondReminderMinutes,
    location: template.location,
    isEvent: template.type === 'event',
    meetingLink: template.type === 'event' ? template.meetingLink : null,
  };
}

// ===== Date Calculation (from taskUtils.ts) =====

function getFirstOccurrenceOnOrAfter(date: Date, repeat: Repeat): Date {
  const dayBefore = new Date(date);
  dayBefore.setDate(dayBefore.getDate() - 1);
  dayBefore.setHours(0, 0, 0, 0);
  return getNextOccurrenceDate(dayBefore, repeat);
}

/**
 * Calculate scheduled dates for plan templates, accounting for cumulative gapDays
 * and recurring weekday snapping.
 */
export function calculateTemplateScheduledDates(
  templates: PlanTemplate[],
  planArchetype: string | null | undefined,
  startDateOverride?: Date,
): Date[] {
  let start: Date;
  if (startDateOverride) {
    start = new Date(startDateOverride);
  } else {
    const now = new Date();
    start = new Date(now);
    if (planArchetype === 'daily_routine') {
      start.setDate(start.getDate() + 1);
    } else if (now.getHours() >= 21) {
      start.setDate(start.getDate() + 1);
    }
  }
  start.setHours(0, 0, 0, 0);

  const dates: Date[] = [];
  let current = new Date(start);
  for (const template of templates) {
    if (dates.length > 0) {
      current = new Date(current);
      current.setDate(current.getDate() + template.gapDays);
    }

    let d = new Date(current);

    // If the template has a recurring pattern, find the first matching date
    if (template.repeat) {
      try {
        const repeat: Repeat = JSON.parse(template.repeat);
        if (repeat.weekdays && repeat.weekdays.length > 0) {
          d = getFirstOccurrenceOnOrAfter(d, repeat);
        }
      } catch {
        // Invalid repeat JSON — fall through to base date
      }
    }

    if (template.time) {
      const [h, m] = template.time.split(':').map(Number);
      d.setHours(h, m, 0, 0);
    }
    dates.push(d);
  }
  return dates;
}

/** Find the nearest valid start date based on recurring patterns of gapDays=0 templates. */
export function computeSuggestedStartDate(tmpls: PlanTemplate[], fallback: Date): Date | undefined {
  const dayBefore = new Date(fallback);
  dayBefore.setDate(dayBefore.getDate() - 1);
  dayBefore.setHours(0, 0, 0, 0);

  let nearest: Date | undefined;

  for (const t of tmpls) {
    if (t.gapDays !== 0) continue;
    if (!t.repeat) continue;
    try {
      const repeat: Repeat = typeof t.repeat === 'string' ? JSON.parse(t.repeat) : t.repeat;
      if (repeat.type === 'daily') return undefined;
      if (!repeat.weekdays || repeat.weekdays.length === 0) continue;
      const nextDate = getNextOccurrenceDate(dayBefore, repeat);
      if (!nearest || nextDate < nearest) {
        nearest = nextDate;
      }
    } catch {
      /* invalid JSON */
    }
  }

  return nearest;
}

// ===== Main Scheduling Function =====

export function schedulePlanTasks(
  templates: PlanTemplate[],
  startDate: Date,
  mode: ScheduleMode,
  preference: TimePreference,
  planArchetype: string | null | undefined,
  useTimeOfDay: boolean = false,
): ScheduleResult {
  // 1. Calculate base dates
  const baseDates = calculateTemplateScheduledDates(templates, planArchetype, startDate);

  // 2. Separate scheduled (has time) and unscheduled
  const scheduledTasks: ScheduledPlanItem[] = [];
  const unscheduledEntries: { template: PlanTemplate; baseDate: Date }[] = [];

  templates.forEach((template, index) => {
    if (template.time) {
      scheduledTasks.push(templateToScheduledTask(template, baseDates[index], false));
    } else {
      unscheduledEntries.push({ template, baseDate: baseDates[index] });
    }
  });

  // 3. Build occupied map from already-placed tasks
  const occupiedMap = buildOccupiedMap(scheduledTasks);

  // 4. Auto-suggest times for unscheduled tasks
  if (useTimeOfDay) {
    // timeOfDay mode: assign virtual time periods instead of exact times.
    const defaultPeriod = preference.toUpperCase() as 'MORNING' | 'AFTERNOON' | 'EVENING';
    for (const entry of unscheduledEntries) {
      const task = templateToScheduledTask(entry.template, entry.baseDate, true);
      task.hasTime = false;
      task.timeOfDay = defaultPeriod;
      scheduledTasks.push(task);
    }
  } else if (mode === 'spread') {
    // Group by date, cycle periods for multi-task days
    const byDate = new Map<string, { template: PlanTemplate; baseDate: Date }[]>();
    for (const entry of unscheduledEntries) {
      const key = toDateKey(entry.baseDate);
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(entry);
    }

    for (const [dateKey, entries] of byDate) {
      let periodIdx = 0;
      for (const entry of entries) {
        const period =
          entries.length > 1 ? PERIOD_CYCLE[periodIdx % PERIOD_CYCLE.length] : 'morning';
        const duration = entry.template.duration || 30;
        const hours = TIME_GRADES[period];
        const startMin = findFreeSlot(dateKey, duration, hours, occupiedMap);

        const task = templateToScheduledTask(entry.template, entry.baseDate, true);
        if (startMin !== null) {
          task.date = setTimeFromMinutes(entry.baseDate, startMin);
          task.hasTime = true;
          if (!occupiedMap.has(dateKey)) occupiedMap.set(dateKey, []);
          occupiedMap.get(dateKey)!.push({ start: startMin, end: startMin + duration });
        } else {
          const fallbackHour = hours[0];
          task.date = setTimeFromMinutes(entry.baseDate, fallbackHour * 60);
          task.hasTime = true;
          if (!occupiedMap.has(dateKey)) occupiedMap.set(dateKey, []);
          occupiedMap
            .get(dateKey)!
            .push({ start: fallbackHour * 60, end: fallbackHour * 60 + duration });
        }
        scheduledTasks.push(task);
        periodIdx++;
      }
    }
  } else {
    // Same period: all unscheduled tasks in the chosen preference period
    const hours = TIME_GRADES[preference];
    for (const entry of unscheduledEntries) {
      const dateKey = toDateKey(entry.baseDate);
      const duration = entry.template.duration || 30;
      const startMin = findFreeSlot(dateKey, duration, hours, occupiedMap);

      const task = templateToScheduledTask(entry.template, entry.baseDate, true);
      if (startMin !== null) {
        task.date = setTimeFromMinutes(entry.baseDate, startMin);
        task.hasTime = true;
        if (!occupiedMap.has(dateKey)) occupiedMap.set(dateKey, []);
        occupiedMap.get(dateKey)!.push({ start: startMin, end: startMin + duration });
      } else {
        const fallbackHour = hours[0];
        task.date = setTimeFromMinutes(entry.baseDate, fallbackHour * 60);
        task.hasTime = true;
        if (!occupiedMap.has(dateKey)) occupiedMap.set(dateKey, []);
        occupiedMap
          .get(dateKey)!
          .push({ start: fallbackHour * 60, end: fallbackHour * 60 + duration });
      }
      scheduledTasks.push(task);
    }
  }

  return { scheduledTasks };
}

// ===== Utility =====

/** Returns true if any template lacks a .time field. */
export function hasUnscheduledTasks(templates: PlanTemplate[]): boolean {
  return templates.some((t) => !t.time);
}

// ===== Week Helpers for Calendar Preview =====

/**
 * Get the range of weeks the plan spans.
 * Returns an array of week start dates (Monday).
 */
export function getPlanWeekRange(scheduledTasks: ScheduledPlanItem[]): Date[] {
  if (scheduledTasks.length === 0) return [];

  let earliest = scheduledTasks[0].date;
  let latest = scheduledTasks[0].date;

  for (const task of scheduledTasks) {
    if (task.date < earliest) earliest = task.date;
    if (task.date > latest) latest = task.date;

    // For recurring items, find the last occurrence
    if (task.repeat) {
      let repeat: Repeat;
      try {
        repeat = typeof task.repeat === 'string' ? JSON.parse(task.repeat) : task.repeat;
      } catch {
        continue;
      }

      const maxOccurrences =
        repeat.endCondition?.type === 'count'
          ? repeat.endCondition.occurrences || Infinity
          : Infinity;
      const endDate =
        repeat.endCondition?.type === 'date' && repeat.endCondition.endDate
          ? new Date(repeat.endCondition.endDate)
          : null;

      let current = new Date(task.date);
      current.setHours(0, 0, 0, 0);
      let occurrenceCount = 0;
      const maxIterations = 500;
      let iterations = 0;

      while (iterations < maxIterations) {
        occurrenceCount++;
        if (occurrenceCount > maxOccurrences) break;
        if (endDate && current > endDate) break;
        if (current > latest) latest = new Date(current);

        const next = getNextOccurrenceDate(current, repeat);
        if (next <= current) break;
        current = next;
        iterations++;
      }
    }
  }

  const startMonday = getMonday(earliest);
  const endMonday = getMonday(latest);

  const weeks: Date[] = [];
  const current = new Date(startMonday);
  while (current <= endMonday) {
    weeks.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}

/**
 * Get plan tasks for a specific week (Monday-Sunday), expanding recurring items.
 */
export function getTasksForWeek(
  weekStart: Date,
  scheduledTasks: ScheduledPlanItem[],
): ScheduledPlanItem[] {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const planTasksInWeek: ScheduledPlanItem[] = [];

  for (const task of scheduledTasks) {
    // Non-recurring: simple date check
    if (!task.repeat) {
      if (task.date >= weekStart && task.date < weekEnd) {
        planTasksInWeek.push(task);
      }
      continue;
    }

    // Recurring: generate occurrences within this week
    let repeat: Repeat;
    try {
      repeat = typeof task.repeat === 'string' ? JSON.parse(task.repeat) : task.repeat;
    } catch {
      if (task.date >= weekStart && task.date < weekEnd) {
        planTasksInWeek.push(task);
      }
      continue;
    }

    const maxOccurrences =
      repeat.endCondition?.type === 'count'
        ? repeat.endCondition.occurrences || Infinity
        : Infinity;
    const endDate =
      repeat.endCondition?.type === 'date' && repeat.endCondition.endDate
        ? new Date(repeat.endCondition.endDate)
        : null;

    const time = task.hasTime
      ? { hours: task.date.getHours(), minutes: task.date.getMinutes() }
      : null;
    let current = new Date(task.date);
    current.setHours(0, 0, 0, 0);

    const maxIterations = 500;
    let iterations = 0;
    let occurrenceCount = 0;

    while (current < weekEnd && iterations < maxIterations) {
      occurrenceCount++;
      if (occurrenceCount > maxOccurrences) break;
      if (endDate && current > endDate) break;

      if (current >= weekStart) {
        const instanceDate = new Date(current);
        if (time) {
          instanceDate.setHours(time.hours, time.minutes, 0, 0);
        }

        planTasksInWeek.push({
          ...task,
          date: instanceDate,
          instanceId: `${task.templateId}-${toDateKey(current)}`,
        });
      }
      current = getNextOccurrenceDate(current, repeat);
      iterations++;
    }
  }

  return planTasksInWeek;
}

/**
 * Check if the plan has multiple unscheduled tasks falling on the same day.
 * Used to decide whether to show the "spread vs same period" option in the
 * TimePreferenceModal.
 */
export function hasMultipleUnscheduledTasksPerDay(
  templates: PlanTemplate[],
  planArchetype: string | null | undefined,
  startDate: Date,
): boolean {
  const unscheduled = templates.filter((t) => !t.time);
  if (unscheduled.length <= 1) return false;

  const baseDates = calculateTemplateScheduledDates(templates, planArchetype, startDate);
  const dateCount = new Map<string, number>();

  templates.forEach((template, index) => {
    if (template.time) return;

    const baseDate = baseDates[index];

    if (!template.repeat) {
      const key = toDateKey(baseDate);
      dateCount.set(key, (dateCount.get(key) || 0) + 1);
      return;
    }

    // Recurring: expand instances using the occurrence count
    let repeat: Repeat;
    try {
      repeat = JSON.parse(template.repeat);
    } catch {
      const key = toDateKey(baseDate);
      dateCount.set(key, (dateCount.get(key) || 0) + 1);
      return;
    }

    const occurrences = repeat.endCondition?.occurrences || 1;
    let current = new Date(baseDate);
    current.setHours(0, 0, 0, 0);

    for (let i = 0; i < occurrences; i++) {
      const key = toDateKey(current);
      dateCount.set(key, (dateCount.get(key) || 0) + 1);
      current = getNextOccurrenceDate(current, repeat);
    }
  });

  for (const count of dateCount.values()) {
    if (count > 1) return true;
  }
  return false;
}
