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

export function GroupTodoPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: categories } = useCategories(groupId);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [sidePanelItemId, setSidePanelItemId] = useState<string | null>(null);
  const [sidePanelItemType, setSidePanelItemType] = useState<'TASK' | 'EVENT'>('TASK');

  const { todoTasks, isLoading } = useTodoListTasks(groupId);

  // Convert to CalendarItems (backend already sorts)
  const todoItems: CalendarItem[] = useMemo(() => {
    return todoTasks.map((task) => {
      const item = taskToCalendarItem(task);
      if (!task.date) {
        item.date = '';
        item.isNoDate = true;
      }
      return item;
    });
  }, [todoTasks]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return todoItems;
    const q = search.toLowerCase();
    return todoItems.filter((item) => item.title.toLowerCase().includes(q));
  }, [todoItems, search]);

  const { showPlanReview } = usePlanReview();
  const handleToggle = useCallback(async (item: CalendarItem) => {
    if (item.itemType === 'EVENT') return;
    const { planExecutionCompleted } = await toggleTask(getParentId(item));
    queryClient.invalidateQueries({ queryKey: ['todo-tasks', groupId] });
    if (planExecutionCompleted) showPlanReview(planExecutionCompleted);
  }, [queryClient, groupId, showPlanReview]);

  const handleItemClick = useCallback((item: CalendarItem) => {
    setSidePanelItemId(item.id);
    setSidePanelItemType(item.itemType as 'TASK' | 'EVENT');
  }, []);
  const handleSidePanelToggle = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['todo-tasks', groupId] });
  }, [queryClient, groupId]);

  return (
    <div className="flex h-full flex-col gap-5">
      {/* Header — matches TodoPage */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-(--el-group-title)">{t('todoPage.title')}</h1>
          <span className="text-sm text-(--el-group-description)">
            {todoItems.length === 1
              ? t('todoPage.taskCountOne')
              : t('todoPage.taskCount', { count: todoItems.length })}
          </span>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            type="button"
            className="flex h-(--btn-height-sm) items-center gap-1.5 rounded-(--radius-btn) bg-(--el-btn-primary-bg) px-(--spacing-btn-x-sm) text-[13px] font-semibold text-(--el-btn-primary-text) transition-opacity hover:opacity-90"
          >
            <Icon name="add" size={16} />
            {t('todoPage.addTask')}
          </button>
        </div>
      </div>

      {/* Task list card — matches TodoPage */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-(--radius-card) bg-(--el-group-bg) shadow-(--shadow-card)">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-(--el-group-description)">
            {t('common.loading')}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-(--el-group-description)">
            {search ? t('todoPage.noResults') : t('todoPage.noTasks')}
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
      {sidePanelItemId && (
        <ItemSidePanel
          itemId={sidePanelItemId}
          itemType={sidePanelItemType}
          currentUserId={user?.id}
          onClose={() => setSidePanelItemId(null)}
          onToggle={handleSidePanelToggle}
          groupId={groupId}
        />
      )}
    </div>
  );
}
