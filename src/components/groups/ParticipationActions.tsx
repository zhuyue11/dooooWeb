import { useQuery } from '@tanstack/react-query';
import { getParticipationStatus } from '@/lib/api';
import { useParticipationMutations } from '@/hooks/useParticipationMutations';
import { useTranslation } from 'react-i18next';

interface ParticipationActionsProps {
  taskId: string;
  isRecurring?: boolean;
  date?: string;
  onActionComplete?: () => void;
}

export function ParticipationActions({ taskId, isRecurring, date, onActionComplete }: ParticipationActionsProps) {
  const { t } = useTranslation();

  const { data: statusData } = useQuery({
    queryKey: ['participation-status', taskId, date],
    queryFn: () => getParticipationStatus(taskId, date),
    staleTime: 30 * 1000,
  });

  const { participateMutation, declineMutation, leaveMutation, notGoingMutation } = useParticipationMutations(taskId);

  if (!statusData) return null;

  const { status } = statusData;
  const isPending = participateMutation.isPending || declineMutation.isPending || leaveMutation.isPending || notGoingMutation.isPending;

  const handleAction = async (action: () => Promise<void>) => {
    await action();
    onActionComplete?.();
  };

  const btnPrimary = 'rounded-(--radius-btn) bg-primary px-(--spacing-btn-x) py-(--spacing-btn-y) text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50';
  const btnOutline = 'rounded-(--radius-btn) border border-border px-(--spacing-btn-x) py-(--spacing-btn-y) text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50';
  const btnDestructive = 'rounded-(--radius-btn) border border-destructive/30 px-(--spacing-btn-x) py-(--spacing-btn-y) text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50';

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3" data-testid="participation-actions">
      {(status === 'NONE' || status === 'INVITED') && (
        <>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleAction(() =>
              participateMutation.mutateAsync({ participationType: isRecurring ? 'all' : 'single', date })
            )}
            className={btnPrimary}
            data-testid="participation-join-btn"
          >
            {t('groups.participate.participateTitle')}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleAction(() => declineMutation.mutateAsync())}
            className={btnOutline}
            data-testid="participation-decline-btn"
          >
            {t('groups.participate.decline')}
          </button>
        </>
      )}

      {status === 'CONFIRMED' && (
        <>
          <span className="text-xs font-medium text-primary">{t('groups.participate.alreadyParticipating')}</span>
          {date && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleAction(() => notGoingMutation.mutateAsync({ date }))}
              className={btnDestructive}
              data-testid="participation-not-going-btn"
            >
              {t('groups.participate.notGoing')}
            </button>
          )}
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleAction(() => leaveMutation.mutateAsync({ leaveType: 'all' }))}
            className={btnDestructive}
            data-testid="participation-leave-btn"
          >
            {t('groups.participate.leave')}
          </button>
        </>
      )}

      {status === 'DECLINED' && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleAction(() =>
            participateMutation.mutateAsync({ participationType: isRecurring ? 'all' : 'single', date })
          )}
          className={btnPrimary}
          data-testid="participation-join-anyway-btn"
        >
          {t('groups.participate.joinAnyway')}
        </button>
      )}

      {status === 'LEFT' && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleAction(() =>
            participateMutation.mutateAsync({ participationType: isRecurring ? 'all' : 'single', date })
          )}
          className={btnPrimary}
          data-testid="participation-rejoin-btn"
        >
          {t('groups.participate.participateTitle')}
        </button>
      )}
    </div>
  );
}
