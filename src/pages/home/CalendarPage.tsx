import { useState } from 'react';
import { useCalendar } from '@/hooks/useCalendar';
import type { CalendarViewMode } from '@/hooks/useCalendar';
import { useCategories } from '@/hooks/useCategories';
import { useGroups } from '@/hooks/useGroups';
import { useAuth } from '@/lib/contexts/auth-context';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { WeekGrid } from '@/components/calendar/WeekGrid';
import { MonthGrid } from '@/components/calendar/MonthGrid';
import { DayTimeline } from '@/components/calendar/DayTimeline';
import { TaskPanel } from '@/components/calendar/TaskPanel';
import { toISODate } from '@/utils/date';

export function CalendarPage() {
  const { user } = useAuth();
  const { data: categories } = useCategories();
  const { groupNameMap } = useGroups();
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');

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
            isLoading={isLoading}
          />
        )}
        {viewMode === 'day' && (
          <DayTimeline
            date={visibleDates[0]}
            items={dayItems}
            categories={categories}
            isLoading={isLoading}
          />
        )}

        {/* Task panel */}
        <TaskPanel
          selectedDate={selectedDate}
          today={today}
          visibleDates={visibleDates}
          viewMode={viewMode}
          items={panelItems}
          categories={categories}
          isLoading={isLoading}
          currentUserId={user?.id}
        />
      </div>
    </div>
  );
}
