import { Icon } from '@/components/ui/Icon';
import type { CalendarItem } from '@/hooks/useWeekCalendar';
import type { Category } from '@/types/api';
import { getCategoryName, getCategoryColor, translateCategoryName } from '@/utils/category';
import { formatTime } from '@/utils/date';
import { useDisplay } from '@/lib/contexts/display-context';
import type { TimeFormat } from '@/utils/date';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { stripHtml } from '@/utils/html';

interface ItemRowProps {
  item: CalendarItem;
  categories?: Category[];
  showDate?: boolean;
  currentUserId?: string;
  hideGroupTag?: boolean;
  onToggle?: (item: CalendarItem) => void;
  onClick?: (item: CalendarItem) => void;
}

export function ItemRow({ item, categories, showDate, currentUserId, hideGroupTag, onToggle, onClick }: ItemRowProps) {
  const { t } = useTranslation();
  const { timeFormat } = useDisplay();

  // ── Toggle logic (matching dooooApp's shouldShowToggle) ──
  const shouldShowToggle = (() => {
    if (item.itemType === 'EVENT') return false;
    if (!item.groupId) return true;
    if (item.isForAllMembers) {
      if (item.trackCompletion === false) return false;
      return item.participantInstanceStatus === 'CONFIRMED' ||
             item.participantInstanceStatus === 'COMPLETED';
    }
    if (item.assigneeId) return currentUserId === item.assigneeId;
    return currentUserId === item.userId;
  })();

  const isChecked = item.isForAllMembers
    ? item.participantInstanceStatus === 'COMPLETED'
    : item.isCompleted;

  const isOrganizer = item.isForAllMembers && item.userId === currentUserId;
  const isGroupActivity = !!item.isForAllMembers;

  // ── Derived display values ──
  const rawCategoryName = item.itemType === 'TASK' ? getCategoryName(item.categoryId, categories) : undefined;
  const categoryName = rawCategoryName ? translateCategoryName(rawCategoryName, t) : undefined;
  const categoryColor = item.categoryId ? getCategoryColor(item.categoryId, categories) : undefined;
  const isHighPriority = item.priority === 'high' || item.priority === 'HIGH' || item.priority === 'urgent' || item.priority === 'URGENT';
  const hasTimeDisplay = item.hasTime && item.date;
  const timeDisplay = hasTimeDisplay ? formatTime(item.date, timeFormat as TimeFormat) : null;

  return (
    <div
      data-testid={`task-row-${item.id}`}
      className={`flex items-start gap-3 rounded-(--radius-card) px-3 py-2.5 ${isChecked ? 'bg-(--el-item-completed-bg)' : ''} ${onClick ? 'cursor-pointer hover:bg-(--el-item-completed-bg)/50 transition-colors' : ''}`}
      onClick={() => onClick?.(item)}
    >
      {/* ── Toggle / Icon column ── */}
      <div className="flex h-5 flex-shrink-0 items-center pt-0.5">
        {item.itemType === 'EVENT' ? (
          <Icon name="calendar_today" size={18} color="var(--el-cal-event-text)" />
        ) : !shouldShowToggle ? (
          isOrganizer ? (
            <Icon name="star" size={16} color="var(--el-item-organizer-icon)" />
          ) : (
            <div className="h-[18px] w-[18px]" />
          )
        ) : isChecked ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle?.(item); }}
            className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-(--el-item-checkbox-bg)"
          >
            <Icon name="check" size={12} color="var(--el-item-checkbox-mark)" weight={700} />
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle?.(item); }}
            className="h-[18px] w-[18px] rounded-full border-2 border-(--el-item-checkbox-border)"
          />
        )}
      </div>

      {/* ── Content column (5 rows matching dooooApp's TaskItem) ── */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* Row 1: Title */}
        <span className={`text-sm font-medium leading-5 ${isChecked ? 'text-(--el-item-title-completed) line-through' : 'text-(--el-item-title)'}`}>
          {item.title}
        </span>

        {/* Row 2: Time + date + overdue indicator */}
        {(timeDisplay || showDate) && (
          <div className="flex items-center gap-2">
            {timeDisplay && (
              <span className={`text-xs ${isChecked ? 'text-(--el-item-details)' : 'text-(--el-item-details)'}`}>
                {timeDisplay}
              </span>
            )}
            {showDate && item.date && (
              <span className="text-xs text-(--el-item-details)">
                {new Date(item.date).toLocaleDateString(i18n.language, { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        )}

        {/* Row 3: Description (2-line preview) */}
        {item.description && (
          <p className="line-clamp-2 text-xs text-(--el-item-details)">
            {stripHtml(item.description)}
          </p>
        )}

        {/* Row 4: Tags row — Event, Group, Assignee, Category, Priority, Meta icons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Event tag */}
          {item.itemType === 'EVENT' && (
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-(--el-cal-event-text)">
              <Icon name="calendar_today" size={10} /> {t('calendarPage.itemRow.event')}
            </span>
          )}
          {/* Group name tag — hidden when already inside a group context */}
          {item.groupId && !hideGroupTag && (
            <span className="flex items-center gap-0.5 rounded-full border border-(--el-item-group-border) px-1.5 text-[10px] font-medium text-(--el-item-group-text)">
              <Icon name="group" size={9} /> {item.groupName || t('calendarPage.itemRow.group')}
            </span>
          )}
          {/* Plan tag */}
          {item.planName && (
            <span className="flex items-center gap-0.5 rounded-full border border-(--el-item-plan-border) px-1.5 text-[10px] font-medium text-(--el-item-plan-text)">
              {item.planName}
            </span>
          )}
          {/* Assignee tag */}
          {item.assigneeName && (
            <span className="flex items-center gap-0.5 text-[10px] text-(--el-item-title)">
              <Icon name="person" size={10} /> {item.assigneeName}
            </span>
          )}
          {/* Category tag */}
          {categoryName && (
            <span className="flex items-center gap-1 text-[10px] text-(--el-item-title)">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: categoryColor?.text || '#6b7280' }} />
              {categoryName}
            </span>
          )}
          {/* Priority tag */}
          {item.priority && (
            <span className="flex items-center gap-1 text-[10px] text-(--el-item-title)">
              <span className={`inline-block h-2 w-2 rounded-full ${isHighPriority ? 'bg-(--el-item-priority-high)' : 'bg-(--el-item-priority-normal)'}`} />
              {t(`tasks.priorities.${item.priority.toLowerCase()}`)}
            </span>
          )}
          {/* Meta icons: recurring, reminders */}
          {!!item.repeat && <Icon name="repeat" size={12} color="var(--el-item-meta-icon)" />}
          {(item.firstReminderMinutes != null || item.secondReminderMinutes != null) && (
            <Icon name="notifications" size={12} color="var(--el-item-meta-icon)" />
          )}
        </div>

        {/* Row 5: Group activity section — participant summary + status tags */}
        {isGroupActivity && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {/* Participant count */}
            {item.participantSummary && (
              <div className="flex items-center gap-2">
                {item.participantSummary.goingCount > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] font-medium text-(--el-item-confirmed-text)">
                    <Icon name="check" size={10} />
                    {item.trackCompletion !== false
                      ? `${item.participantSummary.completedCount}/${item.participantSummary.goingCount}`
                      : item.participantSummary.goingCount}
                  </span>
                )}
                {item.participantSummary.notGoingCount > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] text-(--el-item-declined-text)">
                    ✕ {item.participantSummary.notGoingCount}
                  </span>
                )}
              </div>
            )}
            {/* Status tags */}
            {item.participantInstanceStatus === 'INVITED' && (
              <span className="rounded-full bg-(--el-item-invited-bg) px-1.5 text-[10px] font-medium text-(--el-item-invited-text)">{t('calendarPage.itemRow.invited')}</span>
            )}
            {(item.participantInstanceStatus === 'DECLINED' || item.participantInstanceStatus === 'LEFT') && (
              <span className="rounded-full bg-(--el-item-declined-bg) px-1.5 text-[10px] font-medium text-(--el-item-declined-text)">{t('calendarPage.itemRow.notGoing')}</span>
            )}
            {item.participantInstanceStatus === 'CONFIRMED' && (
              <span className="rounded-full bg-(--el-item-confirmed-bg) px-1.5 text-[10px] font-medium text-(--el-item-confirmed-text)">{t('calendarPage.itemRow.going')}</span>
            )}
            {isOrganizer && (
              <span className="rounded-full bg-(--el-item-invited-bg) px-1.5 text-[10px] font-medium text-(--el-item-invited-text)">{t('calendarPage.itemRow.organizer')}</span>
            )}
            <span className="rounded-full bg-(--el-item-activity-bg) px-1.5 text-[10px] font-medium text-(--el-item-activity-text)">{t('calendarPage.itemRow.activity')}</span>
          </div>
        )}
      </div>

      {/* ── Right column: priority flag ── */}
      {isHighPriority && (
        <Icon name="flag" size={16} color="var(--el-item-priority-high)" className="mt-0.5 flex-shrink-0" />
      )}
    </div>
  );
}
