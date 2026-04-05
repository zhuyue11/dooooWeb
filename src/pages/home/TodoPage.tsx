import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/contexts/auth-context';
import { getTasks, getAssignedGroupTasks, toggleTask } from '@/lib/api';
import { useGroups } from '@/hooks/useGroups';
import { useCategories } from '@/hooks/useCategories';
import { Icon } from '@/components/ui/Icon';
import { ItemRow } from '@/components/calendar/ItemRow';
import { ItemFormModal } from '@/components/calendar/ItemFormModal';
import { ItemSidePanel } from '@/components/calendar/ItemSidePanel';
import { taskToCalendarItem } from '@/hooks/calendarHelpers';
import type { CalendarItem } from '@/hooks/useWeekCalendar';
import type { Task } from '@/types/api';
import { useTranslation } from 'react-i18next';

// ── Helpers (matching HomePage isTodo logic) ──

function isTodo(t: { date?: string | null; dateType?: string }) {
  return !t.date || t.dateType === 'DUE';
}

/** Convert Task to CalendarItem, handling null dates for to-do tasks */
function todoTaskToCalendarItem(task: Task, groupNameMap: Record<string, string>): CalendarItem {
  const item = taskToCalendarItem(task);
  // taskToCalendarItem uses task.date! which is unsafe for no-date tasks
  if (!task.date) {
    (item as Record<string, unknown>).date = '';
  }
  if (task.groupId && groupNameMap[task.groupId]) {
    item.groupName = groupNameMap[task.groupId];
  }
  return item;
}

// ── Priority sort order ──

const PRIORITY_ORDER: Record<string, number> = {
  URGENT: 0, urgent: 0,
  HIGH: 1, high: 1,
  MEDIUM: 2, medium: 2,
  LOW: 3, low: 3,
};

function getPriorityOrder(p?: string): number {
  return p ? (PRIORITY_ORDER[p] ?? 4) : 4;
}

// ── Component ──

export function TodoPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();
  const { groupNameMap } = useGroups();

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [showFilter, setShowFilter] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sidePanelItem, setSidePanelItem] = useState<CalendarItem | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown on outside click
  useEffect(() => {
    if (!showFilter) return;
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilter(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showFilter]);

  // ── Data queries ──

  const { data: personalTasks = [], isLoading: loadingPersonal } = useQuery({
    queryKey: ['todo-tasks'],
    queryFn: () => getTasks({ status: 'PENDING' }),
  });

  const { data: groupTasks = [], isLoading: loadingGroup } = useQuery({
    queryKey: ['todo-assigned-group-tasks'],
    queryFn: getAssignedGroupTasks,
    staleTime: 2 * 60 * 1000,
  });

  const isLoading = loadingPersonal || loadingGroup;

  // ── Build to-do items ──

  const todoItems = useMemo(() => {
    const items: CalendarItem[] = [];
    const nameMap = groupNameMap || {};

    // Personal to-do tasks
    for (const task of personalTasks) {
      if (!isTodo(task)) continue;
      items.push(todoTaskToCalendarItem(task, nameMap));
    }

    // Group tasks that are to-do items
    for (const task of groupTasks) {
      if (task.isCompleted) continue;
      if (!isTodo(task)) continue;
      items.push(todoTaskToCalendarItem(task, nameMap));
    }

    // Sort: DUE tasks with dates first (by due date), then no-date tasks (by priority, then creation)
    items.sort((a, b) => {
      const aHasDate = !!a.date;
      const bHasDate = !!b.date;
      if (aHasDate && !bHasDate) return -1;
      if (!aHasDate && bHasDate) return 1;
      if (aHasDate && bHasDate) {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
      }
      const priDiff = getPriorityOrder(a.priority) - getPriorityOrder(b.priority);
      if (priDiff !== 0) return priDiff;
      return a.title.localeCompare(b.title);
    });

    return items;
  }, [personalTasks, groupTasks, groupNameMap]);

  // ── Filter & search ──

  const filteredItems = useMemo(() => {
    let items = todoItems;

    if (search) {
      const q = search.toLowerCase();
      items = items.filter((item) => item.title.toLowerCase().includes(q));
    }

    if (filterCategory) {
      items = items.filter((item) => item.categoryId === filterCategory);
    }

    if (filterPriority) {
      items = items.filter((item) => item.priority?.toUpperCase() === filterPriority);
    }

    return items;
  }, [todoItems, search, filterCategory, filterPriority]);

  const hasActiveFilters = !!filterCategory || !!filterPriority;

  // ── Handlers ──

  const handleToggle = useCallback(async (item: CalendarItem) => {
    if (item.itemType === 'EVENT') return;
    await toggleTask(item.id);
    queryClient.invalidateQueries({ queryKey: ['todo-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['todo-assigned-group-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-todo'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-today'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
  }, [queryClient]);

  const handleItemClick = useCallback((item: CalendarItem) => setSidePanelItem(item), []);
  const handleSidePanelClose = useCallback(() => setSidePanelItem(null), []);
  const handleAddClick = useCallback(() => setShowCreateModal(true), []);
  const handleModalClose = useCallback(() => setShowCreateModal(false), []);
  const handleSaved = useCallback(() => {
    setShowCreateModal(false);
    queryClient.invalidateQueries({ queryKey: ['todo-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-todo'] });
  }, [queryClient]);

  const clearFilters = useCallback(() => {
    setFilterCategory('');
    setFilterPriority('');
  }, []);

  // ── Unique categories from current items (for filter dropdown) ──

  const categoryOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const item of todoItems) {
      if (item.categoryId) ids.add(item.categoryId);
    }
    if (!categories) return [];
    return categories.filter((c) => ids.has(c.id));
  }, [todoItems, categories]);

  // ── Render ──

  return (
    <div className="flex h-full flex-col gap-5" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">{t('todoPage.title')}</h1>
          <span className="text-sm text-muted-foreground">
            {todoItems.length === 1
              ? t('todoPage.taskCountOne')
              : t('todoPage.taskCount', { count: todoItems.length })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="flex h-9 w-60 items-center gap-2 rounded-lg border border-border px-3">
            <Icon name="search" size={16} color="var(--color-muted-foreground)" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('todoPage.searchPlaceholder')}
              className="w-full bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {/* Filter */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`flex h-9 items-center gap-1.5 rounded-lg border px-3.5 text-[13px] font-medium transition-colors ${
                hasActiveFilters
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-foreground hover:bg-muted'
              }`}
            >
              <Icon name="filter_list" size={16} />
              {t('common.filter')}
            </button>

            {showFilter && (
              <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-xl border border-border bg-surface p-3 shadow-lg">
                {/* Category filter */}
                <div className="mb-2">
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t('todoPage.filterCategory')}
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                  >
                    <option value="">{t('todoPage.filterAll')}</option>
                    {categoryOptions.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Priority filter */}
                <div className="mb-2">
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t('todoPage.filterPriority')}
                  </label>
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                  >
                    <option value="">{t('todoPage.filterAll')}</option>
                    <option value="URGENT">{t('todoPage.priorityUrgent')}</option>
                    <option value="HIGH">{t('todoPage.priorityHigh')}</option>
                    <option value="MEDIUM">{t('todoPage.priorityMedium')}</option>
                    <option value="LOW">{t('todoPage.priorityLow')}</option>
                  </select>
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-1 text-xs font-medium text-primary hover:underline"
                  >
                    {t('todoPage.clearFilters')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Add task */}
          <button
            onClick={handleAddClick}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Icon name="add" size={16} />
            {t('todoPage.addTask')}
          </button>
        </div>
      </div>

      {/* Task list card */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-2xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            {t('common.loading')}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            {search || hasActiveFilters ? t('todoPage.noResults') : t('todoPage.noTasks')}
          </div>
        ) : (
          filteredItems.map((item, i) => (
            <div
              key={item.id}
              className={`px-5 py-0.5 ${i < filteredItems.length - 1 ? 'border-b border-border' : ''}`}
            >
              <ItemRow
                item={item}
                categories={categories}
                currentUserId={user?.id}
                onToggle={handleToggle}
                onClick={handleItemClick}
              />
            </div>
          ))
        )}
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <ItemFormModal
          onClose={handleModalClose}
          onSaved={handleSaved}
        />
      )}

      {/* Item side panel */}
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
