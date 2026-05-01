import { useState, useCallback } from 'react';
import { useCalendar } from '@/hooks/useCalendar';
import type { CalendarViewMode } from '@/hooks/useCalendar';
import { useCategories } from '@/hooks/useCategories';
import { useGroups } from '@/hooks/useGroups';
import { useAuth } from '@/lib/contexts/auth-context';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { WeekGrid } from '@/components/calendar/WeekGrid';
import { MonthGrid } from '@/components/calendar/MonthGrid';
import { DayTimeline } from '@/components/calendar/DayTimeline';
import { ItemPanel } from '@/components/calendar/ItemPanel';
import { ItemFormModal } from '@/components/calendar/ItemFormModal';
import { ItemSidePanel } from '@/components/calendar/ItemSidePanel';
import { toISODate } from '@/utils/date';
import { toggleTask } from '@/lib/api';
import { getParentId } from '@/utils/calendarItemId';
import { usePlanReview } from '@/lib/contexts/plan-review-context';
import { useQueryClient } from '@tanstack/react-query';
import type { CalendarItem } from '@/types/calendar';

export function CalendarPage() {
  const { user } = useAuth();
  const { data: categories } = useCategories();
  const { groupNameMap } = useGroups();
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sidePanelItemId, setSidePanelItemId] = useState<string | null>(null);
  const [sidePanelItemType, setSidePanelItemType] = useState<'TASK' | 'EVENT'>('TASK');

  const queryClient = useQueryClient();
  const { showPlanReview } = usePlanReview();
  const handleAddClick = useCallback(() => setShowCreateModal(true), []);
  const handleModalClose = useCallback(() => setShowCreateModal(false), []);
  const handleSaved = useCallback(() => setShowCreateModal(false), []);
  const handleItemClick = useCallback((item: CalendarItem) => {
    setSidePanelItemId(item.id);
    setSidePanelItemType(item.itemType as 'TASK' | 'EVENT');
  }, []);
  const handleSidePanelClose = useCallback(() => setSidePanelItemId(null), []);

  // Toggle from ItemPanel (receives CalendarItem)
  const handleToggle = useCallback(async (item: CalendarItem) => {
    if (item.itemType === 'EVENT') return;
    const { planExecutionCompleted } = await toggleTask(getParentId(item));
    queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-assigned-group-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-attending-events'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-todo'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-today'] });
    if (planExecutionCompleted) showPlanReview(planExecutionCompleted);
  }, [queryClient, showPlanReview]);

  // Toggle from side panel (no args — side panel handles toggleTask internally)
  const handleSidePanelToggle = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-assigned-group-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-attending-events'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-todo'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-today'] });
  }, [queryClient]);

  const {
    currentDate,
    currentMonth,
    visibleDates,
    selectedDate,
    handleSelectDate,
    itemsByDate,
    panelItems,
    isLoading,
    goToPrev,
    goToNext,
    goToToday,
    today,
  } = useCalendar(user?.id, groupNameMap, viewMode);

  // Day view: items for the single visible date
  const dayItems = viewMode === 'day'
    ? (itemsByDate.get(toISODate(visibleDates[0])) || [])
    : [];

  return (
    <div className="flex h-full flex-col gap-5">
      <CalendarHeader
        viewMode={viewMode}
        onViewChange={setViewMode}
        visibleDates={visibleDates}
        currentMonth={currentMonth}
        currentDate={currentDate}
        onPrev={goToPrev}
        onNext={goToNext}
        onToday={goToToday}
        onAddClick={handleAddClick}
      />

      {/* Desktop: side-by-side | Mobile: stacked (scrollable) */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto lg:flex-row lg:overflow-visible">
        {/* Calendar view */}
        {viewMode === 'week' && (
          <WeekGrid
            weekDates={visibleDates}
            itemsByDate={itemsByDate}
            selectedDate={selectedDate}
            today={today}
            categories={categories}
            onSelectDate={handleSelectDate}
            onItemClick={handleItemClick}
            isLoading={isLoading}
          />
        )}
        {viewMode === 'month' && (
          <MonthGrid
            visibleDates={visibleDates}
            currentMonth={currentMonth}
            itemsByDate={itemsByDate}
            selectedDate={selectedDate}
            today={today}
            categories={categories}
            onSelectDate={handleSelectDate}
            onItemClick={handleItemClick}
            isLoading={isLoading}
          />
        )}
        {viewMode === 'day' && (
          <DayTimeline
            date={visibleDates[0]}
            items={dayItems}
            categories={categories}
            onItemClick={handleItemClick}
            isLoading={isLoading}
          />
        )}

        {/* Task panel */}
        <ItemPanel
          selectedDate={selectedDate}
          today={today}
          visibleDates={visibleDates}
          viewMode={viewMode}
          items={panelItems}
          categories={categories}
          isLoading={isLoading}
          currentUserId={user?.id}
          onAddClick={handleAddClick}
          onToggle={handleToggle}
          onItemClick={handleItemClick}
        />
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <ItemFormModal
          defaultDate={selectedDate ?? undefined}
          onClose={handleModalClose}
          onSaved={handleSaved}
        />
      )}

      {/* Item side panel */}
      {sidePanelItemId && (
        <ItemSidePanel
          itemId={sidePanelItemId}
          itemType={sidePanelItemType}
          currentUserId={user?.id}
          onClose={handleSidePanelClose}
          onToggle={handleSidePanelToggle}
        />
      )}
    </div>
  );
}
