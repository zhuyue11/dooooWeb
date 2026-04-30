/**
 * ParticipationBanner — inline participation status & action row for group activities.
 *
 * Ported from dooooApp/components/ParticipationBanner.tsx.
 * Takes status as a prop (from CalendarItem.participantInstanceStatus).
 *
 * Tiers:
 *  - NONE / LEFT  → "Join" pill(s) + optional "Not Going"
 *  - INVITED      → "You're invited" with Accept / Decline pills
 *  - DECLINED     → "You declined" with "Join anyway" link
 *  - CONFIRMED    → No banner (completion circle in title row + menu handles it)
 *  - COMPLETED    → No banner
 */

import { Icon } from '@/components/ui/Icon';
import { useParticipationMutations } from '@/hooks/useParticipationMutations';
import { useTranslation } from 'react-i18next';
import { isTaskTimeInPast } from '@/utils/date';

interface ParticipationBannerProps {
  taskId: string;
  status?: string;
  isRecurring?: boolean;
  date?: string;
  isOrganizer?: boolean;
}

export function ParticipationBanner({ taskId, status, isRecurring, date, isOrganizer }: ParticipationBannerProps) {
  const { t } = useTranslation();
  const { participateMutation, declineMutation, notGoingMutation } = useParticipationMutations(taskId);
  const isPending = participateMutation.isPending || declineMutation.isPending || notGoingMutation.isPending;

  const taskStarted = isTaskTimeInPast(date, true);

  const btnPrimary = 'rounded-full bg-(--el-btn-primary-bg) px-4 py-2 text-[13px] font-semibold text-(--el-btn-primary-text) hover:opacity-90 disabled:opacity-50';
  const btnOutline = 'rounded-full border border-(--el-btn-outline-border) px-4 py-2 text-[13px] font-semibold text-(--el-btn-outline-text) hover:bg-(--el-btn-outline-hover) disabled:opacity-50';
  const btnDanger = 'rounded-full border border-(--el-group-cancel-border) px-4 py-2 text-[13px] font-semibold text-(--el-group-cancel-text) hover:bg-(--el-group-cancel-hover) disabled:opacity-50';
  const btnMuted = 'rounded-full border border-(--el-card-border) px-4 py-2 text-[13px] font-medium text-(--el-group-description) hover:bg-(--el-popover-item-hover) disabled:opacity-50';

  // CONFIRMED / COMPLETED / organizer / no status — no banner
  if (!status || status === 'CONFIRMED' || status === 'COMPLETED' || isOrganizer) {
    return null;
  }

  // INVITED — "You're invited" with accept/decline
  if (status === 'INVITED') {
    return (
      <div className="px-4 py-3" data-testid="participation-banner">
        <div className="mb-2.5 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--el-btn-primary-bg) 15%, transparent)' }}>
            <Icon name="mail" size={14} color="var(--el-btn-primary-bg)" />
          </div>
          <span className="text-[13px] font-medium text-(--el-btn-primary-bg)">
            {t('groups.participate.invitedMessage')}
          </span>
        </div>
        {!taskStarted && (
          <div className="flex flex-wrap gap-2">
            {isRecurring ? (
              <>
                <button type="button" disabled={isPending} onClick={() => participateMutation.mutateAsync({ participationType: 'next', date })} className={btnPrimary}>
                  {t('groups.participate.participateTitle')}
                </button>
                <button type="button" disabled={isPending} onClick={() => participateMutation.mutateAsync({ participationType: 'all', date })} className={btnOutline}>
                  {t('groups.participate.participateAllTitle')}
                </button>
              </>
            ) : (
              <button type="button" disabled={isPending} onClick={() => participateMutation.mutateAsync({ participationType: 'single', date })} className={btnPrimary}>
                {t('groups.participate.confirm')}
              </button>
            )}
            <button type="button" disabled={isPending} onClick={() => declineMutation.mutateAsync()} className={btnDanger}>
              {t('groups.participate.decline')}
            </button>
          </div>
        )}
      </div>
    );
  }

  // DECLINED — "You declined" with "Join anyway"
  if (status === 'DECLINED') {
    return (
      <div className="px-4 py-3" data-testid="participation-banner">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--el-group-cancel-text) 15%, transparent)' }}>
            <Icon name="close" size={14} color="var(--el-group-cancel-text)" />
          </div>
          <span className="text-[13px] font-medium text-(--el-group-cancel-text)">
            {t('groups.participate.declined')}
          </span>
          {!taskStarted && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (isRecurring) {
                  participateMutation.mutateAsync({ participationType: 'single', date });
                } else {
                  participateMutation.mutateAsync({ participationType: 'single', date });
                }
              }}
              className="text-[13px] font-semibold text-(--el-btn-primary-bg) hover:underline disabled:opacity-50"
            >
              {t('groups.participate.joinAnyway')}
            </button>
          )}
        </div>
      </div>
    );
  }

  // NONE / LEFT — join pills + optional "Not Going"
  if (taskStarted) return null;

  return (
    <div className="px-4 py-3" data-testid="participation-banner">
      <div className="flex flex-wrap gap-2">
        {isRecurring ? (
          <>
            <button type="button" disabled={isPending} onClick={() => participateMutation.mutateAsync({ participationType: 'next', date })} className={btnPrimary}>
              {t('groups.participate.participateTitle')}
            </button>
            <button type="button" disabled={isPending} onClick={() => participateMutation.mutateAsync({ participationType: 'all', date })} className={btnOutline}>
              {t('groups.participate.participateAllTitle')}
            </button>
          </>
        ) : (
          <button type="button" disabled={isPending} onClick={() => participateMutation.mutateAsync({ participationType: 'single', date })} className={btnPrimary}>
            {t('groups.participate.button')}
          </button>
        )}
        {status === 'NONE' && (
          <button type="button" disabled={isPending} onClick={() => notGoingMutation.mutateAsync({ date: date! })} className={btnMuted}>
            {t('groups.participate.notGoing')}
          </button>
        )}
      </div>
    </div>
  );
}
