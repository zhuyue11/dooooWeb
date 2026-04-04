import { Icon } from '@/components/ui/Icon';
import type { CalendarItem } from '@/hooks/useWeekCalendar';
import type { Category } from '@/types/api';
import { getCategoryName, getCategoryColor } from '@/utils/category';
import { formatTime } from '@/utils/date';
import { useDisplay } from '@/lib/contexts/display-context';
import type { TimeFormat } from '@/utils/date';

interface ItemRowProps {
  item: CalendarItem;
  categories?: Category[];
  showDate?: boolean;
  currentUserId?: string;
}

export function ItemRow({ item, categories, showDate, currentUserId }: ItemRowProps) {
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
  const categoryName = item.itemType === 'TASK' ? getCategoryName(item.categoryId, categories) : undefined;
  const categoryColor = item.categoryId ? getCategoryColor(item.categoryId, categories) : undefined;
  const isHighPriority = item.priority === 'high' || item.priority === 'HIGH' || item.priority === 'urgent' || item.priority === 'URGENT';
  const hasTimeDisplay = item.hasTime && item.date;
  const timeDisplay = hasTimeDisplay ? formatTime(item.date, timeFormat as TimeFormat) : null;

  return (
    <div
      data-testid={`task-row-${item.id}`}
      className={`flex items-start gap-3 rounded-lg px-3 py-2.5 ${isChecked ? 'bg-muted' : ''}`}
    >
      {/* ── Toggle / Icon column ── */}
      <div className="flex h-5 flex-shrink-0 items-center pt-0.5">
        {item.itemType === 'EVENT' ? (
          <Icon name="calendar_today" size={18} color="#5b21b6" />
        ) : !shouldShowToggle ? (
          isOrganizer ? (
            <Icon name="star" size={16} color="#f59e0b" />
          ) : (
            <div className="h-[18px] w-[18px]" />
          )
        ) : isChecked ? (
          <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-primary">
            <Icon name="check" size={12} color="var(--color-primary-foreground)" weight={700} />
          </div>
        ) : (
          <div className="h-[18px] w-[18px] rounded-full border-2 border-primary" />
        )}
      </div>

      {/* ── Content column (5 rows matching dooooApp's TaskItem) ── */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* Row 1: Title */}
        <span className={`text-sm font-medium leading-5 ${isChecked ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
          {item.title}
        </span>

        {/* Row 2: Time + date + overdue indicator */}
        {(timeDisplay || showDate) && (
          <div className="flex items-center gap-2">
            {timeDisplay && (
              <span className={`text-xs ${isChecked ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                {timeDisplay}
              </span>
            )}
            {showDate && item.date && (
              <span className="text-xs text-muted-foreground">
                {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        )}

        {/* Row 3: Description (2-line preview) */}
        {item.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {item.description}
          </p>
        )}

        {/* Row 4: Tags row — Event, Group, Assignee, Category, Priority, Meta icons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Event tag */}
          {item.itemType === 'EVENT' && (
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-primary">
              <Icon name="calendar_today" size={10} /> Event
            </span>
          )}
          {/* Group name tag */}
          {item.groupId && (
            <span className="flex items-center gap-0.5 rounded-full border border-[#3b82f6] px-1.5 text-[10px] font-medium text-[#3b82f6]">
              <Icon name="group" size={9} /> {item.groupName || 'Group'}
            </span>
          )}
          {/* Plan tag */}
          {item.planName && (
            <span className="flex items-center gap-0.5 rounded-full border border-secondary px-1.5 text-[10px] font-medium text-secondary">
              {item.planName}
            </span>
          )}
          {/* Assignee tag */}
          {item.assigneeName && (
            <span className="flex items-center gap-0.5 text-[10px] text-foreground">
              <Icon name="person" size={10} /> {item.assigneeName}
            </span>
          )}
          {/* Category tag */}
          {categoryName && (
            <span className="flex items-center gap-1 text-[10px] text-foreground">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: categoryColor?.text || '#6b7280' }} />
              {categoryName}
            </span>
          )}
          {/* Priority tag */}
          {item.priority && (
            <span className="flex items-center gap-1 text-[10px] text-foreground">
              <span className={`inline-block h-2 w-2 rounded-full ${isHighPriority ? 'bg-destructive' : 'bg-[#f59e0b]'}`} />
              {item.priority.charAt(0).toUpperCase() + item.priority.slice(1).toLowerCase()}
            </span>
          )}
          {/* Meta icons: recurring, reminders */}
          {!!item.repeat && <Icon name="repeat" size={12} color="var(--color-muted-foreground)" />}
          {(item.firstReminderMinutes != null || item.secondReminderMinutes != null) && (
            <Icon name="notifications" size={12} color="var(--color-muted-foreground)" />
          )}
        </div>

        {/* Row 5: Group activity section — participant summary + status tags */}
        {isGroupActivity && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {/* Participant count */}
            {item.participantSummary && (
              <div className="flex items-center gap-2">
                {item.participantSummary.goingCount > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] font-medium text-primary">
                    <Icon name="check" size={10} />
                    {item.trackCompletion !== false
                      ? `${item.participantSummary.completedCount}/${item.participantSummary.goingCount}`
                      : item.participantSummary.goingCount}
                  </span>
                )}
                {item.participantSummary.notGoingCount > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    ✕ {item.participantSummary.notGoingCount}
                  </span>
                )}
              </div>
            )}
            {/* Status tags */}
            {item.participantInstanceStatus === 'INVITED' && (
              <span className="rounded-full bg-[#fef3c7] px-1.5 text-[10px] font-medium text-[#92400e]">Invited</span>
            )}
            {(item.participantInstanceStatus === 'DECLINED' || item.participantInstanceStatus === 'LEFT') && (
              <span className="rounded-full bg-[#fee2e2] px-1.5 text-[10px] font-medium text-[#991b1b]">Not Going</span>
            )}
            {item.participantInstanceStatus === 'CONFIRMED' && (
              <span className="rounded-full bg-[#d1fae5] px-1.5 text-[10px] font-medium text-[#065f46]">Going</span>
            )}
            {isOrganizer && (
              <span className="rounded-full bg-[#fef3c7] px-1.5 text-[10px] font-medium text-[#92400e]">Organizer</span>
            )}
            <span className="rounded-full bg-[#f0fdf4] px-1.5 text-[10px] font-medium text-[#15803d]">Activity</span>
          </div>
        )}
      </div>

      {/* ── Right column: priority flag ── */}
      {isHighPriority && (
        <Icon name="flag" size={16} color="var(--color-destructive)" className="mt-0.5 flex-shrink-0" />
      )}
    </div>
  );
}
