import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/contexts/auth-context';
import { toggleTask } from '@/lib/api';
import { usePlanReview } from '@/lib/contexts/plan-review-context';
import { useCategories } from '@/hooks/useCategories';
import { useTodoListTasks } from '@/hooks/useTodoListTasks';
import { Icon } from '@/components/ui/Icon';
import { ItemRow } from '@/components/calendar/ItemRow';
import { ItemFormModal } from '@/components/calendar/ItemFormModal';
import { ItemSidePanel } from '@/components/calendar/ItemSidePanel';
import { taskToCalendarItem } from '@/hooks/calendarHelpers';
import type { CalendarItem } from '@/hooks/useWeekCalendar';
import type { Task } from '@/types/api';
import { useTranslation } from 'react-i18next';

/** Convert Task to CalendarItem, handling null dates for to-do tasks */
function todoTaskToCalendarItem(task: Task): CalendarItem {
  const item = taskToCalendarItem(task);
  if (!task.date) {
    (item as unknown as Record<string, unknown>).date = '';
  }
  return item;
}

// ── Component ──

export function TodoPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();

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

  // ── Data ──

  const { todoTasks, isLoading } = useTodoListTasks();

  // ── Build CalendarItems (backend already sorts) ──

  const todoItems = useMemo(() => {
    return todoTasks.map((task) => todoTaskToCalendarItem(task));
  }, [todoTasks]);

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

  const { showPlanReview } = usePlanReview();
  const handleToggle = useCallback(async (item: CalendarItem) => {
    if (item.itemType === 'EVENT') return;
    const { planExecutionCompleted } = await toggleTask(item.id);
    queryClient.invalidateQueries({ queryKey: ['todo-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-todo'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-today'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
    if (planExecutionCompleted) showPlanReview(planExecutionCompleted);
  }, [queryClient, showPlanReview]);

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
    <div className="flex h-full flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-(--el-page-text)">{t('todoPage.title')}</h1>
          <span className="text-sm text-(--el-page-text) opacity-60">
            {todoItems.length === 1
              ? t('todoPage.taskCountOne')
              : t('todoPage.taskCount', { count: todoItems.length })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="flex h-9 w-60 items-center gap-2 rounded-(--radius-card) border border-(--el-input-border) px-3">
            <Icon name="search" size={16} color="var(--el-input-placeholder)" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('todoPage.searchPlaceholder')}
              className="w-full bg-transparent text-[13px] text-(--el-input-text) placeholder:text-(--el-input-placeholder) focus:outline-none"
            />
          </div>

          {/* Filter */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`flex h-9 items-center gap-1.5 rounded-(--radius-card) border px-3.5 text-[13px] font-medium transition-colors ${
                hasActiveFilters
                  ? 'border-(--el-settings-selected-border) bg-(--el-settings-selected-bg) text-(--el-settings-check)'
                  : 'border-(--el-input-border) text-(--el-page-text) hover:bg-(--el-settings-hover)'
              }`}
            >
              <Icon name="filter_list" size={16} />
              {t('common.filter')}
            </button>

            {showFilter && (
              <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-(--radius-card) border border-(--el-card-border) bg-(--el-card-bg) p-(--spacing-card) shadow-(--shadow-elevated)">
                {/* Category filter */}
                <div className="mb-2">
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-(--el-page-text) opacity-60">
                    {t('todoPage.filterCategory')}
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full rounded-(--radius-btn) border border-(--el-input-border) bg-(--el-input-bg) px-(--spacing-btn-x-sm) py-1.5 text-xs text-(--el-input-text)"
                  >
                    <option value="">{t('todoPage.filterAll')}</option>
                    {categoryOptions.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Priority filter */}
                <div className="mb-2">
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-(--el-page-text) opacity-60">
                    {t('todoPage.filterPriority')}
                  </label>
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="w-full rounded-(--radius-btn) border border-(--el-input-border) bg-(--el-input-bg) px-(--spacing-btn-x-sm) py-1.5 text-xs text-(--el-input-text)"
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
                    className="mt-1 text-xs font-medium text-(--el-btn-primary-bg) hover:underline"
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
            className="flex h-(--btn-height-sm) items-center gap-1.5 rounded-(--radius-btn) bg-(--el-btn-primary-bg) px-(--spacing-btn-x-sm) text-[13px] font-semibold text-(--el-btn-primary-text) transition-opacity hover:opacity-90"
          >
            <Icon name="add" size={16} />
            {t('todoPage.addTask')}
          </button>
        </div>
      </div>

      {/* Task list card */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-(--radius-card) bg-(--el-card-bg) shadow-(--shadow-card)">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-(--el-page-text) opacity-60">
            {t('common.loading')}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-(--el-page-text) opacity-60">
            {search || hasActiveFilters ? t('todoPage.noResults') : t('todoPage.noTasks')}
          </div>
        ) : (
          filteredItems.map((item, i) => (
            <div
              key={item.id}
              className={`px-5 py-0.5 ${i < filteredItems.length - 1 ? 'border-b border-(--el-card-border)' : ''}`}
            >
              <ItemRow
                item={item}
                categories={categories}
                showDate
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
