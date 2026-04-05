import { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/contexts/auth-context';
import { getTasks, getAssignedGroupTasks, getEvents, getAttendingEvents, toggleTask } from '@/lib/api';
import { useGroups } from '@/hooks/useGroups';
import { useCategories } from '@/hooks/useCategories';
import type { Event } from '@/types/api';
import type { CalendarItem } from '@/hooks/useWeekCalendar';
import { taskToCalendarItem, eventToCalendarItem } from '@/hooks/calendarHelpers';
import { ItemRow } from '@/components/calendar/ItemRow';
import { ItemSidePanel } from '@/components/calendar/ItemSidePanel';
import { startOfDay, toISODate, startOfWeek, endOfWeek } from '@/utils/date';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';

function getGreeting(t: (key: string) => string): string {
  const hour = new Date().getHours();
  if (hour < 12) return t('dashboard.greeting.morning');
  if (hour < 18) return t('dashboard.greeting.afternoon');
  return t('dashboard.greeting.evening');
}

function formatDate(): string {
  return new Date().toLocaleDateString(i18n.language, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

import { ItemFormModal } from '@/components/calendar/ItemFormModal';

// ── Component ─────────────────────────────────────────────────────────

export function HomePage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const firstName = user?.name?.split(' ')[0] || 'there';
  const [showCreateModal, setShowCreateModal] = useState(false);
  const handleAddClick = useCallback(() => setShowCreateModal(true), []);
  const handleModalClose = useCallback(() => setShowCreateModal(false), []);

  const now = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toISODate(now), [now]);
  const yesterdayStr = useMemo(() => {
    const y = startOfDay(now);
    y.setDate(y.getDate() - 1);
    return toISODate(y);
  }, [now]);
  const weekStartStr = useMemo(() => toISODate(startOfWeek(now)), [now]);
  const weekEndStr = useMemo(() => toISODate(endOfWeek(now)), [now]);
  // Events use datetime comparison — extend range to capture upcoming events beyond current week
  const eventEndStr = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() + 14); // 2 weeks ahead for upcoming events
    return toISODate(d);
  }, [now]);
  // ── Personal tasks ──
  const { data: todayTasks = [], isLoading: loadingToday } = useQuery({
    queryKey: ['dashboard-today', todayStr],
    queryFn: () => getTasks({ date: todayStr }),
  });
  const { data: weekTasks = [], isLoading: loadingWeek } = useQuery({
    queryKey: ['dashboard-week', weekStartStr, weekEndStr],
    queryFn: () => getTasks({ fromDate: weekStartStr, toDate: weekEndStr }),
  });
  const { data: pastTasks = [], isLoading: loadingPast } = useQuery({
    queryKey: ['dashboard-past', yesterdayStr],
    queryFn: () => getTasks({ toDate: yesterdayStr }),
  });
  const { data: todoTasks = [], isLoading: loadingTodo } = useQuery({
    queryKey: ['dashboard-todo'],
    queryFn: () => getTasks({ status: 'PENDING' }),
  });
  const { data: upcomingPersonal = [], isLoading: loadingUpcoming } = useQuery({
    queryKey: ['dashboard-upcoming', todayStr],
    queryFn: () => getTasks({ fromDate: todayStr, status: 'PENDING' }),
  });

  // ── Assigned group tasks ──
  const { data: groupTasks = [], isLoading: loadingGroup } = useQuery({
    queryKey: ['dashboard-assigned-group-tasks'],
    queryFn: getAssignedGroupTasks,
    staleTime: 2 * 60 * 1000,
  });

  // ── Groups (for group name lookup) ──
  const { groupNameMap } = useGroups();

  // ── Events (owned + attending) ──
  const { data: ownedEvents = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['dashboard-events', todayStr, eventEndStr],
    queryFn: () => getEvents({ from: todayStr, to: eventEndStr }),
  });
  const { data: attendingEvents = [], isLoading: loadingAttending } = useQuery({
    queryKey: ['dashboard-attending-events', todayStr, eventEndStr],
    queryFn: () => getAttendingEvents({ from: todayStr, to: eventEndStr }),
  });

  const isLoading = loadingToday || loadingWeek || loadingPast || loadingTodo || loadingUpcoming || loadingGroup || loadingEvents || loadingAttending;

  // ── Merge events (deduplicate owned + attending) ──
  const allEvents = useMemo(() => {
    const seen = new Set<string>();
    const merged: Event[] = [];
    for (const ev of [...ownedEvents, ...attendingEvents]) {
      if (!seen.has(ev.id)) { seen.add(ev.id); merged.push(ev); }
    }
    return merged;
  }, [ownedEvents, attendingEvents]);

  // ── dateType helpers (matching dooooApp business logic) ──
  // To-do item = no date OR dateType === 'DUE'
  // Schedule item = has date AND dateType !== 'DUE' (SCHEDULED or undefined)
  const isTodo = (t: { date?: string | null; dateType?: string }) =>
    !t.date || t.dateType === 'DUE';
  const isScheduleItem = (t: { date?: string | null; dateType?: string }) =>
    !!t.date && t.dateType !== 'DUE';

  // ── Group tasks filtered by date ──
  const groupTasksToday = useMemo(() =>
    groupTasks.filter((t) => t.date && toISODate(new Date(t.date)) === todayStr),
    [groupTasks, todayStr],
  );
  const groupTasksThisWeek = useMemo(() =>
    groupTasks.filter((t) => {
      if (!t.date) return false;
      const d = toISODate(new Date(t.date));
      return d >= weekStartStr && d <= weekEndStr;
    }),
    [groupTasks, weekStartStr, weekEndStr],
  );
  const groupTasksOverdue = useMemo(() =>
    groupTasks.filter((t) => {
      if (!t.date || t.isCompleted) return false;
      return toISODate(new Date(t.date)) < todayStr;
    }),
    [groupTasks, todayStr],
  );
  const groupTasksUpcoming = useMemo(() =>
    groupTasks.filter((t) => {
      if (!t.date || t.isCompleted) return false;
      return toISODate(new Date(t.date)) >= todayStr;
    }),
    [groupTasks, todayStr],
  );

  // ── Events filtered by date ──
  const eventsToday = useMemo(() =>
    allEvents.filter((e) => e.date && toISODate(new Date(e.date)) === todayStr),
    [allEvents, todayStr],
  );

  // ── METRICS (count ALL items regardless of dateType) ──

  // Today's Tasks: personal + group tasks (NOT events — events aren't tasks)
  const allTodayCount = todayTasks.length + groupTasksToday.length;
  const allTodayCompleted = useMemo(
    () => todayTasks.filter((t) => t.isCompleted).length + groupTasksToday.filter((t) => t.isCompleted).length,
    [todayTasks, groupTasksToday],
  );

  // Overdue: all past incomplete (personal + group, both SCHEDULED and DUE past their date)
  const allOverdue = useMemo(
    () => [...pastTasks.filter((t) => !t.isCompleted), ...groupTasksOverdue],
    [pastTasks, groupTasksOverdue],
  );

  // This Week: personal + group tasks (NOT events)
  const allWeekCount = weekTasks.length + groupTasksThisWeek.length;
  const allWeekCompleted = useMemo(
    () => weekTasks.filter((t) => t.isCompleted).length + groupTasksThisWeek.filter((t) => t.isCompleted).length,
    [weekTasks, groupTasksThisWeek],
  );

  // To-do: no-date + DUE tasks (incomplete) — these go in the to-do panel, not calendar
  const todoItems = useMemo(() => {
    const personal = todoTasks.filter((t) => isTodo(t));
    const group = groupTasks.filter((t) => !t.isCompleted && isTodo(t));
    return [...personal, ...group];
  }, [todoTasks, groupTasks]);

  // DUE tasks due today (for sub-text)
  const dueTodayCount = useMemo(() => {
    const p = todoTasks.filter((t) => t.dateType === 'DUE' && t.date && toISODate(new Date(t.date)) === todayStr && !t.isCompleted).length;
    const g = groupTasks.filter((t) => t.dateType === 'DUE' && t.date && toISODate(new Date(t.date)) === todayStr && !t.isCompleted).length;
    return p + g;
  }, [todoTasks, groupTasks, todayStr]);

  const completionRate = useMemo(
    () => (allWeekCount > 0 ? Math.round((allWeekCompleted / allWeekCount) * 100) : 0),
    [allWeekCount, allWeekCompleted],
  );

  const metrics = useMemo(
    () => [
      {
        label: t('dashboard.metrics.todaysTasks'),
        value: String(allTodayCount),
        sub: eventsToday.length > 0
          ? t(eventsToday.length > 1 ? 'dashboard.metrics.completedWithEventsPlural' : 'dashboard.metrics.completedWithEvents', { count: allTodayCompleted, eventCount: eventsToday.length })
          : t('dashboard.metrics.completed', { count: allTodayCompleted }),
        subColor: '#10b981',
      },
      {
        label: t('dashboard.metrics.overdue'),
        value: String(allOverdue.length),
        sub: allOverdue.length > 0 ? t('dashboard.metrics.needsAttention') : t('dashboard.metrics.allClear'),
        subColor: '#6b7280',
        valueColor: allOverdue.length > 0 ? '#ef4444' : undefined,
      },
      {
        label: t('dashboard.metrics.todo'),
        value: String(todoItems.length),
        sub: dueTodayCount > 0 ? t('dashboard.metrics.dueToday', { count: dueTodayCount }) : t('dashboard.metrics.noDeadlinesToday'),
        subColor: '#f59e0b',
      },
      {
        label: t('dashboard.metrics.thisWeek'),
        value: String(allWeekCount),
        sub: t('dashboard.metrics.completed', { count: allWeekCompleted }),
        subColor: '#3b82f6',
      },
      {
        label: t('dashboard.metrics.completionRate'),
        value: `${completionRate}%`,
        sub: t('dashboard.metrics.thisWeekSub'),
        subColor: '#10b981',
      },
    ],
    [allTodayCount, allTodayCompleted, allOverdue, todoItems, dueTodayCount, allWeekCount, allWeekCompleted, completionRate, eventsToday, t],
  );

  // ── PANELS (dateType matters here: schedule = SCHEDULED, to-do = DUE/no-date) ──

  // ── PANEL DATA ──

  // Enrich CalendarItem with group name + participant status (mirrors useWeekCalendar's enrich)
  const enrichCalendarItem = useCallback((ci: CalendarItem, task: { groupId?: string | null; participantInstances?: Array<{ participantUserId: string; status: string }> }): CalendarItem => {
    if (task.groupId && groupNameMap[task.groupId]) ci.groupName = groupNameMap[task.groupId];
    if (task.participantInstances && user) {
      const pi = task.participantInstances.find((p) => p.participantUserId === user.id);
      if (pi) ci.participantInstanceStatus = pi.status;
    }
    return ci;
  }, [groupNameMap, user]);

  const todayItems = useMemo((): CalendarItem[] => {
    const items: CalendarItem[] = [];
    for (const t of todayTasks) {
      items.push(enrichCalendarItem(taskToCalendarItem(t), t));
    }
    for (const t of groupTasksToday) {
      items.push(enrichCalendarItem(taskToCalendarItem(t), t));
    }
    for (const e of eventsToday) {
      items.push(enrichCalendarItem(eventToCalendarItem(e), e));
    }
    return items.sort((a, b) => {
      if (a.hasTime && !b.hasTime) return -1;
      if (!a.hasTime && b.hasTime) return 1;
      if (a.hasTime && b.hasTime && a.date && b.date) return new Date(a.date).getTime() - new Date(b.date).getTime();
      return 0;
    });
  }, [todayTasks, groupTasksToday, eventsToday, groupNameMap]);

  // Overdue panel: past incomplete tasks (personal + group)
  const overdueItems = useMemo((): CalendarItem[] => {
    return allOverdue
      .map((t) => enrichCalendarItem(taskToCalendarItem(t), t))
      .sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return db - da;
      });
  }, [allOverdue, groupNameMap]);

  // Upcoming: tomorrow+ only (exclude today), scheduled + events
  const tomorrowStr = useMemo(() => {
    const d = startOfDay(now);
    d.setDate(d.getDate() + 1);
    return toISODate(d);
  }, [now]);

  const upcomingTasks = useMemo((): CalendarItem[] => {
    const items: CalendarItem[] = [];
    for (const t of upcomingPersonal) {
      if (!isScheduleItem(t)) continue;
      if (!t.date || toISODate(new Date(t.date)) < tomorrowStr) continue;
      items.push(enrichCalendarItem(taskToCalendarItem(t), t));
    }
    for (const t of groupTasksUpcoming) {
      if (!isScheduleItem(t)) continue;
      if (!t.date || toISODate(new Date(t.date)) < tomorrowStr) continue;
      items.push(enrichCalendarItem(taskToCalendarItem(t), t));
    }
    for (const e of allEvents) {
      if (!e.date || toISODate(new Date(e.date)) < tomorrowStr) continue;
      items.push(enrichCalendarItem(eventToCalendarItem(e), e));
    }
    return items
      .sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : Infinity;
        const db = b.date ? new Date(b.date).getTime() : Infinity;
        return da - db;
      })
      .slice(0, 5);
  }, [upcomingPersonal, groupTasksUpcoming, allEvents, tomorrowStr]);

  // To-do panel: no-date + DUE tasks (converted to CalendarItem[])
  const todoListItems = useMemo((): CalendarItem[] => {
    return todoItems.map((t) => enrichCalendarItem(taskToCalendarItem(t), t));
  }, [todoItems, enrichCalendarItem]);

  // Toggle handler
  const queryClient = useQueryClient();
  const invalidateDashboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-today'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-week'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-todo'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-upcoming'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-assigned-group-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-events'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-attending-events'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-past'] });
  }, [queryClient]);
  const handleToggle = async (item: CalendarItem) => {
    if (item.itemType === 'EVENT') return;
    await toggleTask(item.id);
    invalidateDashboard();
  };
  const handleSaved = useCallback(() => {
    setShowCreateModal(false);
    invalidateDashboard();
  }, [invalidateDashboard]);

  // Side panel state
  const [sidePanelItem, setSidePanelItem] = useState<CalendarItem | null>(null);
  const handleItemClick = useCallback((item: CalendarItem) => setSidePanelItem(item), []);
  const handleSidePanelClose = useCallback(() => setSidePanelItem(null), []);
  const { data: categories } = useCategories();

  // ── Render ──

  return (
    <div className="flex h-full flex-col gap-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">
            {getGreeting(t)}, {firstName}
          </h1>
          <p className="text-sm font-medium text-muted-foreground">{formatDate()}</p>
        </div>
        <button
          data-testid="dashboard-add-button"
          onClick={handleAddClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#360EFF] text-white transition-opacity hover:opacity-90"
        >
          <Icon name="add" size={20} />
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

      {/* Body: Today | Overdue | To-do | Upcoming */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* 1. Today */}
        <div data-testid="today-section" className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="text-base font-semibold text-foreground">{t('dashboard.panels.today')}</span>
            <Link to="/calendar" className="text-[13px] font-medium text-[#360EFF] hover:underline">
              {t('dashboard.panels.openCalendar')}
            </Link>
          </div>
          <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">{t('common.loading')}</div>
            ) : todayItems.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">{t('dashboard.panels.nothingForToday')}</div>
            ) : (
              todayItems.map((item) => (
                <ItemRow key={item.id} item={item} categories={categories} currentUserId={user?.id} onToggle={handleToggle} onClick={handleItemClick} />
              ))
            )}
          </div>
        </div>

        {/* 2. Overdue */}
        {overdueItems.length > 0 && (
          <div data-testid="overdue-section" className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <span className="text-base font-semibold text-destructive">{t('dashboard.panels.overdue')}</span>
            </div>
            <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
              {overdueItems.map((item) => (
                <ItemRow key={item.id} item={item} categories={categories} showDate currentUserId={user?.id} onToggle={handleToggle} onClick={handleItemClick} />
              ))}
            </div>
          </div>
        )}

        {/* 3. To-do */}
        <div data-testid="todo-section" className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="text-base font-semibold text-foreground">{t('dashboard.panels.todo')}</span>
            <Link to="/todo" className="text-[13px] font-medium text-[#360EFF] hover:underline">
              {t('dashboard.panels.viewAll')}
            </Link>
          </div>
          <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">{t('common.loading')}</div>
            ) : todoListItems.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">{t('dashboard.panels.noTodoItems')}</div>
            ) : (
              todoListItems.map((item) => (
                <ItemRow key={item.id} item={item} categories={categories} currentUserId={user?.id} onToggle={handleToggle} onClick={handleItemClick} />
              ))
            )}
          </div>
        </div>

        {/* 4. Upcoming */}
        <div data-testid="upcoming-tasks-section" className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="text-base font-semibold text-foreground">{t('dashboard.panels.upcoming')}</span>
          </div>
          <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">{t('common.loading')}</div>
            ) : upcomingTasks.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">{t('dashboard.panels.noUpcomingTasks')}</div>
            ) : (
              upcomingTasks.map((item) => (
                <ItemRow key={item.id} item={item} categories={categories} showDate currentUserId={user?.id} onClick={handleItemClick} />
              ))
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <ItemFormModal
          onClose={handleModalClose}
          onSaved={handleSaved}
        />
      )}

      {sidePanelItem && (
        <ItemSidePanel
          item={sidePanelItem}
          currentUserId={user?.id}
          onClose={handleSidePanelClose}
          onToggle={handleToggle}
        />
      )}
    </div>
  );
}
