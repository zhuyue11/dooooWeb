import { useState, useMemo, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/contexts/auth-context';
import { usePlanReview } from '@/lib/contexts/plan-review-context';
import { useGroups } from '@/hooks/useGroups';
import { useCategories } from '@/hooks/useCategories';
import { usePlans } from '@/hooks/usePlans';
import { useTargets } from '@/hooks/useTargets';
import { searchTasks, searchEvents, toggleTask } from '@/lib/api';
import { taskToCalendarItem, eventToCalendarItem } from '@/hooks/calendarHelpers';
import type { CalendarItem } from '@/hooks/useWeekCalendar';
import { Icon } from '@/components/ui/Icon';
import { ItemRow } from '@/components/calendar/ItemRow';
import { ItemSidePanel } from '@/components/calendar/ItemSidePanel';
import { SearchFilterPanel } from '@/components/search/SearchFilterPanel';
import { SearchFilterChips, type ActiveFilterChip } from '@/components/search/SearchFilterChips';

const PRIORITY_LABELS: Record<string, { labelKey: string; color: string }> = {
  LOW: { labelKey: 'todoPage.priorityLow', color: '#3B82F6' },
  MEDIUM: { labelKey: 'todoPage.priorityMedium', color: '#FF9500' },
  HIGH: { labelKey: 'todoPage.priorityHigh', color: '#9B59B6' },
  URGENT: { labelKey: 'todoPage.priorityUrgent', color: '#FF3B30' },
};

export function SearchPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showPlanReview } = usePlanReview();
  const { data: categories } = useCategories();
  const { data: groups, groupNameMap } = useGroups();
  const { data: plans } = usePlans();
  const { data: targets } = useTargets();

  // ── Search & filter state ──

  const [searchText, setSearchText] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [completedOnly, setCompletedOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [searchResults, setSearchResults] = useState<CalendarItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sidePanelItem, setSidePanelItem] = useState<CalendarItem | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Derived state ──

  const hasAnyFilter = searchText.length > 0 || selectedPriority !== null
    || selectedCategory !== null || selectedGroup !== null
    || selectedPlan !== null || selectedTarget !== null
    || dateFrom !== null || dateTo !== null
    || overdueOnly || completedOnly;

  // ── Search execution ──

  const executeSearch = useCallback(async (params: {
    query?: string;
    priority?: string | null;
    categoryId?: string | null;
    planId?: string | null;
    targetId?: string | null;
    groupId?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
    overdueOnly?: boolean;
    completedOnly?: boolean;
  }) => {
    const search = params.query || undefined;
    const priority = params.priority || undefined;
    const categoryId = params.categoryId || undefined;
    const planId = params.planId || undefined;
    const targetId = params.targetId || undefined;
    const groupId = params.groupId || undefined;
    const pDateFrom = params.dateFrom || undefined;
    const pDateTo = params.dateTo || undefined;
    const pOverdueOnly = params.overdueOnly || false;
    const pCompletedOnly = params.completedOnly || false;

    if (!search && !priority && !categoryId && !planId && !targetId && !groupId && !pDateFrom && !pDateTo && !pOverdueOnly && !pCompletedOnly) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const [tasks, events] = await Promise.all([
        searchTasks({
          search, priority, categoryId, planId, targetId, groupId,
          dateFrom: pDateFrom, dateTo: pDateTo,
          overdueOnly: pOverdueOnly, completedOnly: pCompletedOnly,
          scope: 'all',
        }).catch(() => []),
        searchEvents({
          search, dateFrom: pDateFrom, dateTo: pDateTo,
        }).catch(() => []),
      ]);

      const nameMap = groupNameMap || {};
      const taskItems = tasks.map((task) => {
        const item = taskToCalendarItem(task);
        if (task.groupId && nameMap[task.groupId]) {
          item.groupName = nameMap[task.groupId];
        }
        return item;
      });
      const eventItems = events.map((e) => eventToCalendarItem(e));
      setSearchResults([...taskItems, ...eventItems]);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [groupNameMap]);

  const runSearch = useCallback((
    text: string,
    priority: string | null,
    category: string | null,
    plan: string | null,
    target: string | null,
    group: string | null,
    pDateFrom: string | null,
    pDateTo: string | null,
    pOverdueOnly: boolean,
    pCompletedOnly: boolean,
  ) => {
    executeSearch({
      query: text || undefined,
      priority, categoryId: category, planId: plan, targetId: target, groupId: group,
      dateFrom: pDateFrom, dateTo: pDateTo, overdueOnly: pOverdueOnly, completedOnly: pCompletedOnly,
    });
  }, [executeSearch]);

  const rerunSearch = useCallback(() => {
    runSearch(searchText, selectedPriority, selectedCategory, selectedPlan, selectedTarget, selectedGroup, dateFrom, dateTo, overdueOnly, completedOnly);
  }, [runSearch, searchText, selectedPriority, selectedCategory, selectedPlan, selectedTarget, selectedGroup, dateFrom, dateTo, overdueOnly, completedOnly]);

  // ── Debounced text input ──

  const handleTextChange = useCallback((text: string) => {
    setSearchText(text);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!text && !selectedPriority && !selectedCategory && !selectedPlan && !selectedTarget && !selectedGroup && !dateFrom && !dateTo && !overdueOnly && !completedOnly) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      runSearch(text, selectedPriority, selectedCategory, selectedPlan, selectedTarget, selectedGroup, dateFrom, dateTo, overdueOnly, completedOnly);
    }, 300);
  }, [runSearch, selectedPriority, selectedCategory, selectedPlan, selectedTarget, selectedGroup, dateFrom, dateTo, overdueOnly, completedOnly]);

  // ── Filter handlers (toggle + immediate re-search) ──

  const handlePriorityChange = useCallback((value: string | null) => {
    setSelectedPriority(value);
    runSearch(searchText, value, selectedCategory, selectedPlan, selectedTarget, selectedGroup, dateFrom, dateTo, overdueOnly, completedOnly);
  }, [runSearch, searchText, selectedCategory, selectedPlan, selectedTarget, selectedGroup, dateFrom, dateTo, overdueOnly, completedOnly]);

  const handleCategoryChange = useCallback((value: string | null) => {
    setSelectedCategory(value);
    runSearch(searchText, selectedPriority, value, selectedPlan, selectedTarget, selectedGroup, dateFrom, dateTo, overdueOnly, completedOnly);
  }, [runSearch, searchText, selectedPriority, selectedPlan, selectedTarget, selectedGroup, dateFrom, dateTo, overdueOnly, completedOnly]);

  const handleGroupChange = useCallback((value: string | null) => {
    setSelectedGroup(value);
    runSearch(searchText, selectedPriority, selectedCategory, selectedPlan, selectedTarget, value, dateFrom, dateTo, overdueOnly, completedOnly);
  }, [runSearch, searchText, selectedPriority, selectedCategory, selectedPlan, selectedTarget, dateFrom, dateTo, overdueOnly, completedOnly]);

  const handlePlanChange = useCallback((value: string | null) => {
    setSelectedPlan(value);
    runSearch(searchText, selectedPriority, selectedCategory, value, selectedTarget, selectedGroup, dateFrom, dateTo, overdueOnly, completedOnly);
  }, [runSearch, searchText, selectedPriority, selectedCategory, selectedTarget, selectedGroup, dateFrom, dateTo, overdueOnly, completedOnly]);

  const handleTargetChange = useCallback((value: string | null) => {
    setSelectedTarget(value);
    runSearch(searchText, selectedPriority, selectedCategory, selectedPlan, value, selectedGroup, dateFrom, dateTo, overdueOnly, completedOnly);
  }, [runSearch, searchText, selectedPriority, selectedCategory, selectedPlan, selectedGroup, dateFrom, dateTo, overdueOnly, completedOnly]);

  const handleOverdueChange = useCallback((value: boolean) => {
    setOverdueOnly(value);
    const newCompleted = value ? false : completedOnly;
    if (value) setCompletedOnly(false);
    runSearch(searchText, selectedPriority, selectedCategory, selectedPlan, selectedTarget, selectedGroup, dateFrom, dateTo, value, newCompleted);
  }, [runSearch, searchText, selectedPriority, selectedCategory, selectedPlan, selectedTarget, selectedGroup, dateFrom, dateTo, completedOnly]);

  const handleCompletedChange = useCallback((value: boolean) => {
    setCompletedOnly(value);
    const newOverdue = value ? false : overdueOnly;
    if (value) setOverdueOnly(false);
    runSearch(searchText, selectedPriority, selectedCategory, selectedPlan, selectedTarget, selectedGroup, dateFrom, dateTo, newOverdue, value);
  }, [runSearch, searchText, selectedPriority, selectedCategory, selectedPlan, selectedTarget, selectedGroup, dateFrom, dateTo, overdueOnly]);

  const handleDateFromChange = useCallback((value: string | null) => {
    setDateFrom(value);
    runSearch(searchText, selectedPriority, selectedCategory, selectedPlan, selectedTarget, selectedGroup, value, dateTo, overdueOnly, completedOnly);
  }, [runSearch, searchText, selectedPriority, selectedCategory, selectedPlan, selectedTarget, selectedGroup, dateTo, overdueOnly, completedOnly]);

  const handleDateToChange = useCallback((value: string | null) => {
    setDateTo(value);
    runSearch(searchText, selectedPriority, selectedCategory, selectedPlan, selectedTarget, selectedGroup, dateFrom, value, overdueOnly, completedOnly);
  }, [runSearch, searchText, selectedPriority, selectedCategory, selectedPlan, selectedTarget, selectedGroup, dateFrom, overdueOnly, completedOnly]);

  const handleClearAll = useCallback(() => {
    setSearchText('');
    setSelectedPriority(null);
    setSelectedCategory(null);
    setSelectedGroup(null);
    setSelectedPlan(null);
    setSelectedTarget(null);
    setOverdueOnly(false);
    setCompletedOnly(false);
    setDateFrom(null);
    setDateTo(null);
    setSearchResults([]);
    setIsSearching(false);
  }, []);

  // ── Active filter chips ──

  const activeFilterChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];

    if (selectedPriority) {
      const p = PRIORITY_LABELS[selectedPriority];
      chips.push({
        key: 'priority',
        label: p ? t(p.labelKey) : selectedPriority,
        color: p?.color || 'var(--el-btn-primary-bg)',
        onRemove: () => handlePriorityChange(null),
      });
    }
    if (selectedCategory) {
      const c = categories?.find((cat) => cat.id === selectedCategory);
      chips.push({
        key: 'category',
        label: c?.name || '',
        color: c?.color || 'var(--el-btn-primary-bg)',
        onRemove: () => handleCategoryChange(null),
      });
    }
    if (selectedGroup) {
      const g = groups?.find((grp) => grp.id === selectedGroup);
      chips.push({
        key: 'group',
        label: g?.name || '',
        color: g?.color || 'var(--el-btn-primary-bg)',
        onRemove: () => handleGroupChange(null),
      });
    }
    if (selectedPlan) {
      const p = plans?.find((pl) => pl.id === selectedPlan);
      chips.push({
        key: 'plan',
        label: p?.name || '',
        color: 'var(--el-btn-secondary-bg)',
        onRemove: () => handlePlanChange(null),
      });
    }
    if (selectedTarget) {
      const tgt = targets?.find((t) => t.id === selectedTarget);
      chips.push({
        key: 'target',
        label: tgt?.name || '',
        color: 'var(--el-notif-task-color)',
        onRemove: () => handleTargetChange(null),
      });
    }
    if (overdueOnly) {
      chips.push({
        key: 'overdue',
        label: t('search.overdue'),
        color: 'var(--el-btn-destructive-bg)',
        onRemove: () => handleOverdueChange(false),
      });
    }
    if (completedOnly) {
      chips.push({
        key: 'completed',
        label: t('search.completed'),
        color: 'var(--el-btn-secondary-bg)',
        onRemove: () => handleCompletedChange(false),
      });
    }
    if (dateFrom || dateTo) {
      const fromStr = dateFrom ? new Date(dateFrom + 'T00:00:00').toLocaleDateString() : '...';
      const toStr = dateTo ? new Date(dateTo + 'T00:00:00').toLocaleDateString() : '...';
      chips.push({
        key: 'dateRange',
        label: `${fromStr} – ${toStr}`,
        color: 'var(--el-btn-primary-bg)',
        onRemove: () => { handleDateFromChange(null); handleDateToChange(null); },
      });
    }

    return chips;
  }, [
    selectedPriority, selectedCategory, selectedGroup, selectedPlan, selectedTarget,
    overdueOnly, completedOnly, dateFrom, dateTo,
    categories, groups, plans, targets, t,
    handlePriorityChange, handleCategoryChange, handleGroupChange, handlePlanChange,
    handleTargetChange, handleOverdueChange, handleCompletedChange, handleDateFromChange, handleDateToChange,
  ]);

  // ── Item handlers ──

  const handleToggle = useCallback(async (item: CalendarItem) => {
    if (item.itemType === 'EVENT') return;
    const { planExecutionCompleted } = await toggleTask(item.id);
    queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['todo-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-today'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-todo'] });
    if (planExecutionCompleted) showPlanReview(planExecutionCompleted);
    // Re-search after a short delay to let server update
    setTimeout(rerunSearch, 300);
  }, [queryClient, showPlanReview, rerunSearch]);

  const handleItemClick = useCallback((item: CalendarItem) => setSidePanelItem(item), []);
  const handleSidePanelClose = useCallback(() => setSidePanelItem(null), []);

  // Count active filters (for badge)
  const activeFilterCount = activeFilterChips.length;

  // ── Render ──

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-(--el-page-text)">{t('search.title')}</h1>
        {(searchResults.length > 0 || isSearching) && (
          <span className="text-sm text-(--el-page-text) opacity-60">
            {isSearching ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-(--el-btn-primary-bg) border-t-transparent" />
              </span>
            ) : (
              t('search.resultCount', { count: searchResults.length })
            )}
          </span>
        )}
      </div>

      {/* Search bar + filter toggle */}
      <div className="flex items-center gap-2">
        <div className="flex h-10 flex-1 items-center gap-2 rounded-(--radius-card) border border-(--el-input-border) bg-(--el-input-bg) px-4">
          <Icon name="search" size={18} color="var(--el-input-placeholder)" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={t('search.placeholder')}
            className="w-full bg-transparent text-[14px] text-(--el-input-text) placeholder:text-(--el-input-placeholder) focus:outline-none"
            autoFocus
          />
          {searchText && (
            <button onClick={() => handleTextChange('')} className="text-(--el-input-placeholder) hover:text-(--el-input-text)">
              <Icon name="close" size={16} />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex h-10 items-center gap-1.5 rounded-(--radius-card) border px-4 text-[13px] font-medium transition-colors ${
            showFilters || activeFilterCount > 0
              ? 'border-(--el-settings-selected-border) bg-(--el-settings-selected-bg) text-(--el-settings-check)'
              : 'border-(--el-input-border) text-(--el-page-text) hover:bg-(--el-settings-hover)'
          }`}
        >
          <Icon name="tune" size={18} />
          {t('search.filters')}
          {activeFilterCount > 0 && !showFilters && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-(--el-btn-primary-bg) px-1 text-[11px] font-bold text-(--el-btn-primary-text)">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Active filter chips (when panel collapsed) */}
      {!showFilters && activeFilterChips.length > 0 && (
        <SearchFilterChips chips={activeFilterChips} onClearAll={handleClearAll} />
      )}

      {/* Filter panel (expandable) */}
      {showFilters && (
        <SearchFilterPanel
          selectedPriority={selectedPriority}
          selectedCategory={selectedCategory}
          selectedGroup={selectedGroup}
          selectedPlan={selectedPlan}
          selectedTarget={selectedTarget}
          overdueOnly={overdueOnly}
          completedOnly={completedOnly}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onPriorityChange={handlePriorityChange}
          onCategoryChange={handleCategoryChange}
          onGroupChange={handleGroupChange}
          onPlanChange={handlePlanChange}
          onTargetChange={handleTargetChange}
          onOverdueChange={handleOverdueChange}
          onCompletedChange={handleCompletedChange}
          onDateFromChange={handleDateFromChange}
          onDateToChange={handleDateToChange}
        />
      )}

      {/* Results list */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-(--radius-card) bg-(--el-card-bg) shadow-(--shadow-card)">
        {isSearching ? (
          <div className="flex items-center justify-center py-12 text-sm text-(--el-page-text) opacity-60">
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-(--el-btn-primary-bg) border-t-transparent" />
            {t('common.loading')}
          </div>
        ) : searchResults.length > 0 ? (
          searchResults.map((item, i) => (
            <div
              key={item.id}
              className={`px-5 py-0.5 ${i < searchResults.length - 1 ? 'border-b border-(--el-card-border)' : ''}`}
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
        ) : hasAnyFilter ? (
          <div className="flex flex-col items-center justify-center py-12 text-(--el-page-text) opacity-60">
            <Icon name="search_off" size={40} color="var(--el-input-placeholder)" />
            <p className="mt-2 text-sm">{t('search.noResults')}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-(--el-page-text) opacity-60">
            <Icon name="search" size={48} color="var(--el-input-placeholder)" />
            <p className="mt-3 text-sm">{t('search.placeholder')}</p>
          </div>
        )}
      </div>

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
