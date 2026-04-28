import { useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/contexts/auth-context';
import { toggleTask } from '@/lib/api';
import { usePlanReview } from '@/lib/contexts/plan-review-context';
import { useCategories } from '@/hooks/useCategories';
import { useTodoListTasks } from '@/hooks/useTodoListTasks';
import { Icon } from '@/components/ui/Icon';
import { ItemRow } from '@/components/calendar/ItemRow';
import { ItemSidePanel } from '@/components/calendar/ItemSidePanel';
import { taskToCalendarItem } from '@/hooks/calendarHelpers';
import type { CalendarItem } from '@/hooks/useWeekCalendar';
import { getParentId } from '@/utils/calendarItemId';

const PRIORITY_ORDER: Record<string, number> = {
  URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3,
};

function getPriorityOrder(p?: string): number {
  return p ? (PRIORITY_ORDER[p.toUpperCase()] ?? 4) : 4;
}

export function GroupTodoPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: categories } = useCategories(groupId);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [sidePanelItem, setSidePanelItem] = useState<CalendarItem | null>(null);

  const { unplannedTasks, overdueTasks, isLoading } = useTodoListTasks(groupId);

  // Convert to CalendarItems and sort (matching dooooApp ExpandableCalendar list viewMode)
  const todoItems: CalendarItem[] = useMemo(() => {
    const items: CalendarItem[] = [];

    for (const task of overdueTasks) {
      items.push(taskToCalendarItem(task));
    }

    for (const task of unplannedTasks) {
      const item = taskToCalendarItem(task);
      if (!task.date) {
        item.date = '';
        item.isNoDate = true;
      }
      items.push(item);
    }

    items.sort((a, b) => {
      const aHasDate = !!a.date;
      const bHasDate = !!b.date;
      if (aHasDate && !bHasDate) return -1;
      if (!aHasDate && bHasDate) return 1;
      if (aHasDate && bHasDate) {
        const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (diff !== 0) return diff;
      }
      const priDiff = getPriorityOrder(a.priority) - getPriorityOrder(b.priority);
      if (priDiff !== 0) return priDiff;
      return a.title.localeCompare(b.title);
    });

    return items;
  }, [unplannedTasks, overdueTasks]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return todoItems;
    const q = search.toLowerCase();
    return todoItems.filter((item) => item.title.toLowerCase().includes(q));
  }, [todoItems, search]);

  const { showPlanReview } = usePlanReview();
  const handleToggle = useCallback(async (item: CalendarItem) => {
    if (item.itemType === 'EVENT') return;
    const { planExecutionCompleted } = await toggleTask(getParentId(item));
    queryClient.invalidateQueries({ queryKey: ['group-todo', groupId] });
    if (planExecutionCompleted) showPlanReview(planExecutionCompleted);
  }, [queryClient, groupId, showPlanReview]);

  const handleItemClick = useCallback((item: CalendarItem) => setSidePanelItem(item), []);

  return (
    <div className="flex h-full flex-col gap-5" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header — matches TodoPage */}
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
          <div className="flex h-9 w-60 items-center gap-2 rounded-(--radius-card) border border-border px-3">
            <Icon name="search" size={16} color="var(--color-muted-foreground)" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('todoPage.searchPlaceholder')}
              className="w-full bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <button
            type="button"
            className="flex h-(--btn-height-sm) items-center gap-1.5 rounded-(--radius-btn) bg-primary px-(--spacing-btn-x-sm) text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Icon name="add" size={16} />
            {t('todoPage.addTask')}
          </button>
        </div>
      </div>

      {/* Task list card — matches TodoPage */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-(--radius-card) bg-surface shadow-(--shadow-card)">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            {t('common.loading')}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            {search ? t('todoPage.noResults') : t('todoPage.noTasks')}
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
                hideGroupTag
                onToggle={handleToggle}
                onClick={handleItemClick}
              />
            </div>
          ))
        )}
      </div>

      {/* Item side panel */}
      {sidePanelItem && (
        <ItemSidePanel
          item={sidePanelItem}
          currentUserId={user?.id}
          onClose={() => setSidePanelItem(null)}
          onToggle={handleToggle}
          groupId={groupId}
        />
      )}
    </div>
  );
}
