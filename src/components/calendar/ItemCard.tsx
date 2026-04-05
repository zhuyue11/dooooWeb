import type { CalendarItem } from '@/hooks/useWeekCalendar';
import type { Category } from '@/types/api';
import { getCategoryColor } from '@/utils/category';
import { formatTime } from '@/utils/date';
import { useDisplay } from '@/lib/contexts/display-context';
import type { TimeFormat } from '@/utils/date';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from 'react-i18next';

interface ItemCardProps {
  item: CalendarItem;
  categories?: Category[];
  onClick?: (item: CalendarItem) => void;
}

export function ItemCard({ item, categories, onClick }: ItemCardProps) {
  const { t } = useTranslation();
  const { timeFormat } = useDisplay();
  const colors = item.itemType === 'EVENT'
    ? { bg: '#ede9fe', text: '#5b21b6' } // purple tint for events
    : getCategoryColor(item.categoryId, categories);

  return (
    <div
      data-testid={`task-card-${item.id}`}
      className={`rounded-md ${item.isCompleted ? 'opacity-60' : ''} ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      style={{ backgroundColor: colors.bg, padding: '6px 8px' }}
      onClick={() => onClick?.(item)}
    >
      <div className="flex items-center gap-1">
        {item.itemType === 'EVENT' && (
          <Icon name="calendar_today" size={10} color={colors.text} />
        )}
        <span
          className={`text-[11px] font-medium leading-tight ${item.isCompleted ? 'line-through' : ''}`}
          style={{ color: colors.text }}
        >
          {item.title}
        </span>
      </div>
      {item.hasTime && (
        <span className="text-[10px] leading-tight" style={{ color: colors.text, opacity: 0.8 }}>
          {formatTime(item.date, timeFormat as TimeFormat)}
        </span>
      )}
      {item.isForAllMembers && item.participantSummary && item.participantSummary.goingCount > 0 && (
        <span className="text-[9px] leading-tight" style={{ color: colors.text, opacity: 0.7 }}>
          {t('calendarPage.itemRow.goingCount', { count: item.participantSummary.goingCount })}
        </span>
      )}
    </div>
  );
}
