import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@/components/ui/Icon';
import { ParticipationActions } from '@/components/groups/ParticipationActions';
import { CompletionStatsDisplay } from '@/components/groups/CompletionStatsDisplay';
import { getParticipationStatus } from '@/lib/api';
import { useAuth } from '@/lib/contexts/auth-context';
import type { GroupMessage } from '@/types/api';

interface ParticipateCardProps {
  message: GroupMessage;
  taskId: string;
  taskTitle: string;
  taskDescription?: string | null;
  isRecurring: boolean;
  taskDate?: string;
  groupColor?: string;
}

export function ParticipateCard({
  message,
  taskId,
  taskTitle,
  taskDescription,
  isRecurring,
  taskDate,
  groupColor,
}: ParticipateCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const accentColor = groupColor || 'var(--el-chat-sender)';

  const { data: statusData, isLoading, isError, error } = useQuery({
    queryKey: ['participation-status', taskId, taskDate],
    queryFn: () => getParticipationStatus(taskId, taskDate),
    staleTime: 30 * 1000,
    retry: (count, err) => {
      // Don't retry 404 (task deleted)
      if (err && typeof err === 'object' && 'response' in err) {
        const resp = (err as { response?: { status?: number } }).response;
        if (resp?.status === 404) return false;
      }
      return count < 2;
    },
  });

  const isDeleted =
    isError &&
    error &&
    typeof error === 'object' &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 404;

  const time = new Date(message.createdAt).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  const formattedDate = taskDate
    ? new Date(taskDate).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : null;

  const creatorName = message.user?.name || message.user?.email || 'Unknown';

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex justify-center py-2" data-testid="participate-card-loading">
        <div
          className="w-[85%] max-w-md animate-pulse rounded-(--radius-card) border p-(--spacing-card)"
          style={{ borderColor: `color-mix(in srgb, ${accentColor} 30%, transparent)` }}
        >
          <div className="mb-3 h-4 w-3/4 rounded bg-(--el-chat-other-bg)" />
          <div className="mb-2 h-3 w-1/2 rounded bg-(--el-chat-other-bg)" />
          <div className="h-8 w-1/3 rounded bg-(--el-chat-other-bg)" />
        </div>
      </div>
    );
  }

  // ── Deleted ──
  if (isDeleted) {
    return (
      <div className="flex justify-center py-2" data-testid="participate-card-deleted">
        <div className="flex w-[85%] max-w-md items-center gap-3 rounded-(--radius-card) border border-(--el-card-border) bg-(--el-chat-other-bg) px-4 py-3">
          <Icon name="delete" size={20} color="var(--el-chat-timestamp)" />
          <span className="text-xs text-(--el-chat-timestamp)">
            {t('groups.participate.activityDeleted', 'This activity has been deleted')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center py-2" data-testid="participate-card">
      <div
        className="w-[85%] max-w-md overflow-hidden rounded-(--radius-card) border bg-(--el-card-bg)"
        style={{ borderColor: `color-mix(in srgb, ${accentColor} 30%, transparent)` }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <Icon name="groups" size={16} color={accentColor} />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-(--el-chat-timestamp)">
            {t('groups.participate.groupActivity', 'Group Activity')}
          </span>
          <span className="ml-auto text-[10px] text-(--el-chat-timestamp)">{time}</span>
        </div>

        {/* Task info */}
        <div className="px-4 pb-2">
          <p className="text-sm font-semibold text-(--el-page-text)">{taskTitle}</p>
          {taskDescription && (
            <p className="mt-0.5 line-clamp-2 text-xs text-(--el-chat-timestamp)">{taskDescription}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-(--el-chat-timestamp)">
            <span>{creatorName}</span>
            {formattedDate && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Icon name="event" size={12} color="var(--el-chat-timestamp)" />
                  {formattedDate}
                </span>
              </>
            )}
            {isRecurring && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Icon name="repeat" size={12} color="var(--el-chat-timestamp)" />
                  {t('groups.participate.recurring', 'Recurring')}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Participants */}
        {statusData && (
          <CompletionStatsDisplay
            taskId={taskId}
            currentUserId={user?.id}
            organizerId={message.userId}
            trackCompletion={false}
          />
        )}

        {/* Actions */}
        <div className="border-t border-(--el-card-border)">
          <ParticipationActions
            taskId={taskId}
            isRecurring={isRecurring}
            date={taskDate}
          />
        </div>
      </div>
    </div>
  );
}
