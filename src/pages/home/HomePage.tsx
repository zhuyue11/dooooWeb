import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Flag } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/contexts/auth-context';
import { getTasks } from '@/lib/api';
import type { Task } from '@/types/api';

// ── Date helpers ──────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Monday of the current week */
function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? 6 : day - 1; // offset to Monday
  const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
  return mon;
}

/** Sunday of the current week */
function endOfWeek(d: Date): Date {
  const mon = startOfWeek(d);
  return new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
}

function formatTime(date: string): string {
  const d = new Date(date);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── Category colors for schedule ──────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  cme63mc0q0005f2ui0dfg1tqg: { bg: '#dbeafe', text: '#1e40af' },  // Work
  cme63mc0q0006f2ui0dfg1tqh: { bg: '#d1fae5', text: '#065f46' },  // Personal
  cme63mc0q000af2ui0dfg1tql: { bg: '#ffedd5', text: '#9a3412' },  // Home
  cme63mc0q000bf2ui0dfg1tqm: { bg: '#cffafe', text: '#155e75' },  // Travel
  cme63mc0q0007f2ui0dfg1tqi: { bg: '#fef3c7', text: '#92400e' },  // Shopping
  cme63mc0q0008f2ui0dfg1tqj: { bg: '#fce7f3', text: '#9d174d' },  // Health
  cme63mc0q0009f2ui0dfg1tqk: { bg: '#eef2ff', text: '#3730a3' },  // Learning
};
const DEFAULT_SCHEDULE_COLOR = { bg: '#f3f4f6', text: '#374151' };

// ── Component ─────────────────────────────────────────────────────────

export function HomePage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'there';

  const now = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toISODate(now), [now]);
  const yesterdayStr = useMemo(() => {
    const y = startOfDay(now);
    y.setDate(y.getDate() - 1);
    return toISODate(y);
  }, [now]);
  const weekStartStr = useMemo(() => toISODate(startOfWeek(now)), [now]);
  const weekEndStr = useMemo(() => toISODate(endOfWeek(now)), [now]);

  // 1. Today's tasks
  const { data: todayTasks = [], isLoading: loadingToday } = useQuery({
    queryKey: ['dashboard-today', todayStr],
    queryFn: () => getTasks({ date: todayStr }),
  });

  // 2. This week's tasks (for "This Week" + "Completion Rate")
  const { data: weekTasks = [], isLoading: loadingWeek } = useQuery({
    queryKey: ['dashboard-week', weekStartStr, weekEndStr],
    queryFn: () => getTasks({ fromDate: weekStartStr, toDate: weekEndStr }),
  });

  // 3. Past tasks (for overdue count — filter client-side for !isCompleted)
  const { data: pastTasks = [], isLoading: loadingPast } = useQuery({
    queryKey: ['dashboard-past', yesterdayStr],
    queryFn: () => getTasks({ toDate: yesterdayStr }),
  });

  // 4. All incomplete tasks (for "To-do" count)
  const { data: todoTasks = [], isLoading: loadingTodo } = useQuery({
    queryKey: ['dashboard-todo'],
    queryFn: () => getTasks({ status: 'PENDING' }),
  });

  // 5. Upcoming tasks (today + future, not completed)
  const { data: upcomingRaw = [], isLoading: loadingUpcoming } = useQuery({
    queryKey: ['dashboard-upcoming', todayStr],
    queryFn: () => getTasks({ fromDate: todayStr, status: 'PENDING' }),
  });

  const isLoading = loadingToday || loadingWeek || loadingPast || loadingTodo || loadingUpcoming;

  // ── Derived metrics ──

  const overdueTasks = useMemo(
    () => pastTasks.filter((t) => !t.isCompleted),
    [pastTasks],
  );

  const todayCompleted = useMemo(
    () => todayTasks.filter((t) => t.isCompleted).length,
    [todayTasks],
  );

  const weekCompleted = useMemo(
    () => weekTasks.filter((t) => t.isCompleted).length,
    [weekTasks],
  );

  const completionRate = useMemo(
    () => (weekTasks.length > 0 ? Math.round((weekCompleted / weekTasks.length) * 100) : 0),
    [weekTasks, weekCompleted],
  );

  const metrics = useMemo(
    () => [
      {
        label: "Today's Tasks",
        value: String(todayTasks.length),
        sub: `${todayCompleted} completed`,
        subColor: '#10b981',
      },
      {
        label: 'Overdue',
        value: String(overdueTasks.length),
        sub: overdueTasks.length > 0 ? 'needs attention' : 'all clear',
        subColor: '#6b7280',
        valueColor: overdueTasks.length > 0 ? '#ef4444' : undefined,
      },
      {
        label: 'To-do',
        value: String(todoTasks.length),
        sub: `${todayTasks.filter((t) => !t.isCompleted).length} due today`,
        subColor: '#f59e0b',
      },
      {
        label: 'This Week',
        value: String(weekTasks.length),
        sub: `${weekCompleted} completed`,
        subColor: '#3b82f6',
      },
      {
        label: 'Completion Rate',
        value: `${completionRate}%`,
        sub: 'this week',
        subColor: '#10b981',
      },
    ],
    [todayTasks, todayCompleted, overdueTasks, todoTasks, weekTasks, weekCompleted, completionRate],
  );

  // ── Upcoming tasks (sorted by date, limit 5) ──

  const upcomingTasks = useMemo(() => {
    return [...upcomingRaw]
      .sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : Infinity;
        const db = b.date ? new Date(b.date).getTime() : Infinity;
        return da - db;
      })
      .slice(0, 5);
  }, [upcomingRaw]);

  // ── Today's schedule (tasks with time, sorted by time) ──

  const schedule = useMemo(() => {
    return todayTasks
      .filter((t) => t.hasTime && t.date)
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())
      .map((t) => {
        const colors = (t.categoryId && CATEGORY_COLORS[t.categoryId]) || DEFAULT_SCHEDULE_COLOR;
        return {
          id: t.id,
          time: formatTime(t.date!),
          title: t.title,
          bg: colors.bg,
          text: colors.text,
          isCompleted: t.isCompleted,
        };
      });
  }, [todayTasks]);

  // ── Render ──

  return (
    <div className="flex h-full flex-col gap-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-sm font-medium text-muted-foreground">{formatDate()}</p>
        </div>
        <button className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#360EFF] text-white transition-opacity hover:opacity-90">
          <Plus size={20} />
        </button>
      </div>

      {/* Metrics row */}
      <div className="flex gap-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="flex flex-1 flex-col gap-2 rounded-2xl bg-surface p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <span className="text-[13px] font-medium text-muted-foreground">{m.label}</span>
            <div className="flex items-end gap-2">
              <span
                className="text-[32px] font-bold leading-none"
                style={{ color: m.valueColor || 'var(--color-foreground)' }}
                data-testid={`metric-value-${m.label}`}
              >
                {isLoading ? '—' : m.value}
              </span>
              <span className="text-[13px] font-medium" style={{ color: m.subColor }}>
                {isLoading ? '' : m.sub}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Body: Upcoming Tasks + Today's Schedule */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* Upcoming Tasks */}
        <div data-testid="upcoming-tasks-section" className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="text-base font-semibold text-foreground">Upcoming Tasks</span>
            <Link to="/todo" className="text-[13px] font-medium text-[#360EFF] hover:underline">
              View all
            </Link>
          </div>
          <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">Loading…</div>
            ) : upcomingTasks.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">No upcoming tasks</div>
            ) : (
              upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
                  <div className="h-[18px] w-[18px] flex-shrink-0 rounded-full border-2 border-[#360EFF]" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">{task.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatUpcomingMeta(task, now)}
                    </span>
                  </div>
                  {task.priority === 'high' && (
                    <Flag size={16} className="flex-shrink-0 text-[#ef4444]" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Today's Schedule */}
        <div data-testid="schedule-section" className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="text-base font-semibold text-foreground">Today's Schedule</span>
            <Link to="/calendar" className="text-[13px] font-medium text-[#360EFF] hover:underline">
              Open calendar
            </Link>
          </div>
          <div className="flex flex-1 flex-col overflow-y-auto px-4 py-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">Loading…</div>
            ) : schedule.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">No scheduled items today</div>
            ) : (
              schedule.map((item, i) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-4 py-3 ${i < schedule.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <span className="w-10 text-xs font-medium" style={{ color: '#6b7280' }}>
                    {item.time}
                  </span>
                  <div
                    className="flex flex-1 items-center rounded-md px-2.5 py-1.5"
                    style={{ backgroundColor: item.bg }}
                  >
                    <span
                      className={`text-[13px] font-medium ${item.isCompleted ? 'line-through opacity-60' : ''}`}
                      style={{ color: item.text }}
                    >
                      {item.title}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────

const CATEGORY_NAMES: Record<string, string> = {
  cme63mc0q0005f2ui0dfg1tqg: 'Work',
  cme63mc0q0006f2ui0dfg1tqh: 'Personal',
  cme63mc0q000af2ui0dfg1tql: 'Home',
  cme63mc0q000bf2ui0dfg1tqm: 'Travel',
  cme63mc0q0007f2ui0dfg1tqi: 'Shopping',
  cme63mc0q0008f2ui0dfg1tqj: 'Health',
  cme63mc0q0009f2ui0dfg1tqk: 'Learning',
};

function formatUpcomingMeta(task: Task, now: Date): string {
  const parts: string[] = [];

  if (task.date) {
    const d = new Date(task.date);
    const today = startOfDay(now);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    if (d >= today && d < new Date(today.getTime() + 24 * 60 * 60 * 1000)) {
      parts.push('Today');
    } else if (d >= tomorrow && d < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)) {
      parts.push('Tomorrow');
    } else {
      parts.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    }

    if (task.hasTime) {
      parts.push(formatTime(task.date));
    } else if (task.timeOfDay) {
      parts.push(task.timeOfDay.charAt(0) + task.timeOfDay.slice(1).toLowerCase());
    }
  }

  if (task.categoryId && CATEGORY_NAMES[task.categoryId]) {
    parts.push(CATEGORY_NAMES[task.categoryId]);
  }

  return parts.join(' · ');
}
