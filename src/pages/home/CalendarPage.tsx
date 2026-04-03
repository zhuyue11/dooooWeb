import { useWeekCalendar } from '@/hooks/useWeekCalendar';
import { useCategories } from '@/hooks/useCategories';
import { useGroups } from '@/hooks/useGroups';
import { useAuth } from '@/lib/contexts/auth-context';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { WeekGrid } from '@/components/calendar/WeekGrid';
import { TaskPanel } from '@/components/calendar/TaskPanel';

export function CalendarPage() {
  const { user } = useAuth();
  const { data: categories } = useCategories();
  const { groupNameMap } = useGroups();

  const {
    weekDates,
    selectedDate,
    handleSelectDate,
    itemsByDate,
    panelItems,
    isLoading,
    goToPrevWeek,
    goToNextWeek,
    goToToday,
    today,
  } = useWeekCalendar(user?.id, groupNameMap);

  return (
    <div className="flex h-full flex-col gap-5" style={{ fontFamily: 'Inter, sans-serif' }}>
      <CalendarHeader
        weekStart={weekDates[0]}
        weekEnd={weekDates[6]}
        onPrevWeek={goToPrevWeek}
        onNextWeek={goToNextWeek}
        onToday={goToToday}
      />

      {/* Desktop: side-by-side | Mobile: stacked */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <WeekGrid
          weekDates={weekDates}
          itemsByDate={itemsByDate}
          selectedDate={selectedDate}
          today={today}
          categories={categories}
          onSelectDate={handleSelectDate}
          isLoading={isLoading}
        />
        <TaskPanel
          selectedDate={selectedDate}
          today={today}
          weekDates={weekDates}
          items={panelItems}
          categories={categories}
          isLoading={isLoading}
          currentUserId={user?.id}
        />
      </div>
    </div>
  );
}
