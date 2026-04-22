import { Icon } from '@/components/ui/Icon';
import { isSameDay, formatMonthYear } from '@/utils/date';
import { ItemRow } from './ItemRow';
import type { CalendarItem } from '@/hooks/useWeekCalendar';
import type { CalendarViewMode } from '@/hooks/useCalendar';
import type { Category } from '@/types/api';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';

interface ItemPanelProps {
  selectedDate: Date | null;
  today: Date;
  visibleDates: Date[];
  viewMode: CalendarViewMode;
  items: CalendarItem[];
  categories?: Category[];
  isLoading: boolean;
  currentUserId?: string;
  hideGroupTag?: boolean;
  onAddClick?: () => void;
  onToggle?: (item: CalendarItem) => void;
  onItemClick?: (item: CalendarItem) => void;
}

/** Panel header label — adapts to view mode and selection state */
function formatPanelDate(date: Date | null, today: Date, visibleDates: Date[], viewMode: CalendarViewMode, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (date) {
    const dateStr = date.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
    if (isSameDay(date, today)) return t('calendarPage.panel.todayDot', { date: dateStr });
    return dateStr;
  }
  // No selection — label depends on view mode
  switch (viewMode) {
    case 'month':
      return formatMonthYear(visibleDates[Math.floor(visibleDates.length / 2)]); // mid-point is always in the active month
    case 'day':
      return visibleDates[0]?.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' }) || '';
    case 'week':
    default: {
      const start = visibleDates[0];
      const end = visibleDates[visibleDates.length - 1];
      if (!start || !end) return '';
      const startStr = start.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
      const endStr = end.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
      return `${startStr} – ${endStr}`;
    }
  }
}

export function ItemPanel({ selectedDate, today, visibleDates, viewMode, items, categories, isLoading, currentUserId, hideGroupTag, onAddClick, onToggle, onItemClick }: ItemPanelProps) {
  const { t } = useTranslation();
  return (
    <div
      data-testid="task-panel"
      className="flex w-full flex-col overflow-hidden rounded-2xl border-t border-border bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] lg:w-80 lg:border-l lg:border-t-0"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <span data-testid="task-panel-date" className="text-base font-semibold text-foreground">
          {formatPanelDate(selectedDate, today, visibleDates, viewMode, t)}
        </span>
        <button
          onClick={onAddClick}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Icon name="add" size={16} />
          <span>{t('calendarPage.panel.add')}</span>
        </button>
      </div>

      {/* Task list */}
      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">{t('common.loading')}</div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            {selectedDate ? t('calendarPage.panel.noItemsForDay') : t('calendarPage.panel.noItemsInRange')}
          </div>
        ) : (
          items.map((item) => (
            <ItemRow key={item.id} item={item} categories={categories} showDate={!selectedDate} currentUserId={currentUserId} hideGroupTag={hideGroupTag} onToggle={onToggle} onClick={onItemClick} />
          ))
        )}
      </div>
    </div>
  );
}
