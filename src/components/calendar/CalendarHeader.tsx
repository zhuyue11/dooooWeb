import { Icon } from '@/components/ui/Icon';
import { formatDateRange, formatMonthYear, formatFullDate } from '@/utils/date';
import type { CalendarViewMode } from '@/hooks/useCalendar';
import { useTranslation } from 'react-i18next';

interface CalendarHeaderProps {
  viewMode: CalendarViewMode;
  onViewChange: (mode: CalendarViewMode) => void;
  visibleDates: Date[];
  currentMonth: Date;
  currentDate: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onAddClick?: () => void;
}

const VIEWS: CalendarViewMode[] = ['week', 'month', 'day'];
const VIEW_LABEL_KEYS: Record<CalendarViewMode, string> = { week: 'calendarPage.views.week', month: 'calendarPage.views.month', day: 'calendarPage.views.day' };

function getDateLabel(viewMode: CalendarViewMode, visibleDates: Date[], currentMonth: Date, currentDate: Date): string {
  switch (viewMode) {
    case 'week':
      return formatDateRange(visibleDates[0], visibleDates[visibleDates.length - 1]);
    case 'month':
      return formatMonthYear(currentMonth);
    case 'day':
      return formatFullDate(currentDate);
  }
}

export function CalendarHeader({ viewMode, onViewChange, visibleDates, currentMonth, currentDate, onPrev, onNext, onToday, onAddClick }: CalendarHeaderProps) {
  const { t } = useTranslation();
  return (
    <div data-testid="calendar-header" className="flex items-center justify-between">
      {/* Left: title + date label */}
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-(--el-cal-title)">{t('calendarPage.title')}</h1>
        <span data-testid="calendar-date-range" className="text-sm font-medium text-(--el-cal-date-label)">
          {visibleDates.length > 0 ? getDateLabel(viewMode, visibleDates, currentMonth, currentDate) : ''}
        </span>
      </div>

      {/* Right: nav + tabs + today + add */}
      <div className="flex items-center gap-2">
        {/* Prev/Next arrows */}
        <button
          data-testid="nav-prev-week"
          onClick={onPrev}
          className="flex h-8 w-8 items-center justify-center rounded-(--radius-card) border border-(--el-cal-nav-border) text-(--el-cal-nav-text) transition-colors hover:bg-(--el-cal-nav-hover-bg)"
        >
          <Icon name="chevron_left" size={18} />
        </button>
        <button
          data-testid="nav-next-week"
          onClick={onNext}
          className="flex h-8 w-8 items-center justify-center rounded-(--radius-card) border border-(--el-cal-nav-border) text-(--el-cal-nav-text) transition-colors hover:bg-(--el-cal-nav-hover-bg)"
        >
          <Icon name="chevron_right" size={18} />
        </button>

        {/* View switcher — hidden on mobile */}
        <div data-testid="view-switcher" className="flex items-center rounded-(--radius-card) bg-(--el-cal-switcher-bg) p-1">
          {VIEWS.map((v) => (
            <button
              key={v}
              data-testid={`view-tab-${v}`}
              onClick={() => onViewChange(v)}
              className={`rounded-(--radius-btn) px-(--spacing-btn-x) py-(--spacing-btn-y) text-[13px] transition-colors ${
                v === viewMode
                  ? 'bg-(--el-cal-tab-active-bg) font-semibold text-(--el-cal-tab-active-text) shadow-(--shadow-card)'
                  : 'font-medium text-(--el-cal-tab-inactive-text) hover:text-(--el-cal-tab-active-text)'
              }`}
            >
              {t(VIEW_LABEL_KEYS[v])}
            </button>
          ))}
        </div>

        {/* Today button */}
        <button
          data-testid="nav-today"
          onClick={onToday}
          className="flex items-center gap-1.5 rounded-(--radius-btn) border border-(--el-cal-today-border) px-(--spacing-btn-x) py-(--spacing-btn-y) text-[13px] font-medium text-(--el-cal-today-text) transition-colors hover:bg-(--el-cal-nav-hover-bg)"
        >
          {t('calendarPage.today')}
        </button>

        {/* Add button — hidden on mobile */}
        <button
          onClick={onAddClick}
          className="hidden h-(--btn-height-sm) w-9 items-center justify-center rounded-(--radius-btn) bg-(--el-cal-add-btn-bg) text-(--el-cal-add-btn-text) transition-opacity hover:opacity-90 lg:flex"
        >
          <Icon name="add" size={20} />
        </button>
      </div>
    </div>
  );
}
