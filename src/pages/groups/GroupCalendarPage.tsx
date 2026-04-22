import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/contexts/auth-context';
import { useCategories } from '@/hooks/useCategories';
import { useGroupCalendar } from '@/hooks/useGroupCalendar';
import type { CalendarViewMode } from '@/hooks/useCalendar';
import type { CalendarItem } from '@/hooks/useWeekCalendar';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { WeekGrid } from '@/components/calendar/WeekGrid';
import { MonthGrid } from '@/components/calendar/MonthGrid';
import { DayTimeline } from '@/components/calendar/DayTimeline';
import { ItemPanel } from '@/components/calendar/ItemPanel';
import { ItemFormModal } from '@/components/calendar/ItemFormModal';
import { ItemSidePanel } from '@/components/calendar/ItemSidePanel';
import { toISODate } from '@/utils/date';
import { toggleTask, getGroup } from '@/lib/api';
import { getParentId } from '@/utils/calendarItemId';

export function GroupCalendarPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const { data: categories } = useCategories();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sidePanelItem, setSidePanelItem] = useState<CalendarItem | null>(null);

  // Fetch group name for enriching calendar items
  const { data: groupData } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => getGroup(groupId!),
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000,
  });

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
  } = useGroupCalendar(groupId, user?.id, groupData?.group?.name, viewMode);

  const dayItems = viewMode === 'day'
    ? (itemsByDate.get(toISODate(visibleDates[0])) || [])
    : [];

  const handleAddClick = useCallback(() => setShowCreateModal(true), []);
  const handleModalClose = useCallback(() => setShowCreateModal(false), []);
  const handleSaved = useCallback(() => setShowCreateModal(false), []);
  const handleItemClick = useCallback((item: CalendarItem) => setSidePanelItem(item), []);
  const handleSidePanelClose = useCallback(() => setSidePanelItem(null), []);

  const handleToggle = useCallback(async (item: CalendarItem) => {
    if (item.itemType === 'EVENT') return;
    await toggleTask(getParentId(item));
    queryClient.invalidateQueries({ queryKey: ['group-calendar-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['group-calendar-recurring-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['group-todo', groupId] });
  }, [queryClient, groupId]);

  return (
    <div className="flex h-full flex-col gap-5" style={{ fontFamily: 'Inter, sans-serif' }}>
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

      {/* Desktop: side-by-side | Mobile: stacked */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto lg:flex-row lg:overflow-visible">
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
            hideGroupTag
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
            hideGroupTag
          />
        )}
        {viewMode === 'day' && (
          <DayTimeline
            date={visibleDates[0]}
            items={dayItems}
            categories={categories}
            onItemClick={handleItemClick}
            isLoading={isLoading}
            hideGroupTag
          />
        )}

        <ItemPanel
          selectedDate={selectedDate}
          today={today}
          visibleDates={visibleDates}
          viewMode={viewMode}
          items={panelItems}
          categories={categories}
          isLoading={isLoading}
          currentUserId={user?.id}
          hideGroupTag
          onAddClick={handleAddClick}
          onToggle={handleToggle}
          onItemClick={handleItemClick}
        />
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <ItemFormModal
          defaultDate={selectedDate ?? undefined}
          groupId={groupId}
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
