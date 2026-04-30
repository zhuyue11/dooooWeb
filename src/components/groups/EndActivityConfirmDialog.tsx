import { useTranslation } from 'react-i18next';
import { getAvatarColorVar } from '@/utils/avatarColor';
import type { ComputedParticipantStats } from '@/utils/participantStats';

const MAX_VISIBLE_PARTICIPANTS = 5;

interface EndActivityConfirmDialogProps {
  open: boolean;
  completionStats: ComputedParticipantStats | null;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function MiniAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
      style={{ backgroundColor: getAvatarColorVar(name) }}
    >
      {initials}
    </div>
  );
}

export function EndActivityConfirmDialog({
  open,
  completionStats,
  isLoading,
  onConfirm,
  onCancel,
}: EndActivityConfirmDialogProps) {
  const { t } = useTranslation();

  if (!open) return null;

  const totalParticipants = completionStats?.totalParticipants ?? 0;
  const completedCount = completionStats?.completedCount ?? 0;
  const incompleteCount = totalParticipants - completedCount;

  const incompleteParticipants = completionStats?.participants?.filter(
    (p) => !p.isCompleted,
  ) ?? [];

  const visibleIncomplete = incompleteParticipants.slice(0, MAX_VISIBLE_PARTICIPANTS);
  const remainingCount = incompleteParticipants.length - MAX_VISIBLE_PARTICIPANTS;

  const getMessage = () => {
    if (totalParticipants === 0) {
      return t('tasks.panel.noParticipants');
    }
    if (incompleteCount === 0) {
      return t('tasks.panel.allParticipantsComplete');
    }
    return t('tasks.panel.incompleteParticipants', {
      incomplete: incompleteCount,
      total: totalParticipants,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-(--el-dialog-overlay)"
      onClick={onCancel}
    >
      <div
        className="mx-6 w-full max-w-sm rounded-(--radius-modal) bg-(--el-dialog-bg) p-(--spacing-card) shadow-(--shadow-modal)"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <h3 className="text-center text-lg font-semibold text-(--el-dialog-title)">
          {t('tasks.panel.endActivityTitle')}
        </h3>

        {/* Message */}
        <p className="mt-3 text-center text-sm leading-5 text-(--el-dialog-description)">
          {getMessage()}
        </p>

        {/* Incomplete participants list */}
        {incompleteCount > 0 && visibleIncomplete.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {visibleIncomplete.map((participant) => (
              <div key={participant.id} className="flex items-center gap-2.5">
                <MiniAvatar name={participant.name} />
                <span className="truncate text-sm text-(--el-dialog-title)">
                  {participant.name}
                </span>
              </div>
            ))}
            {remainingCount > 0 && (
              <p className="ml-[38px] text-[13px] italic text-(--el-dialog-description)">
                {t('tasks.panel.andMore', { count: remainingCount })}
              </p>
            )}
          </div>
        )}

        {/* Warning */}
        <p className="mt-4 text-center text-xs italic leading-[18px] text-(--el-dialog-description)">
          {t('tasks.panel.endActivityWarning')}
        </p>

        {/* Buttons */}
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-(--radius-btn) border border-(--el-dialog-cancel-border) px-(--spacing-btn-x) py-(--spacing-btn-y) text-sm font-medium text-(--el-dialog-cancel-text) hover:opacity-80 disabled:opacity-50 transition-all duration-(--transition-duration)"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="rounded-(--radius-btn) bg-(--el-dialog-confirm-bg) px-(--spacing-btn-x) py-(--spacing-btn-y) text-sm font-semibold text-(--el-dialog-confirm-text) hover:opacity-90 disabled:opacity-50 transition-all duration-(--transition-duration) active:scale-(--active-scale)"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              t('common.confirm')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
