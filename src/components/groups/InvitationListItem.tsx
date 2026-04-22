import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Icon } from '@/components/ui/Icon';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { GroupInvitation } from '@/types/api';

const ROLE_BADGE_STYLES: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  MEMBER: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  VIEWER: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400',
};

const ROLE_KEYS: Record<string, string> = {
  ADMIN: 'groups.roleAdmin',
  MEMBER: 'groups.roleMember',
  VIEWER: 'groups.roleViewer',
};

function getTimeAgo(dateString: string, t: TFunction): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (days > 0) return t('notifications.timeAgo.daysAgo', { count: days });
  if (hours > 0) return t('notifications.timeAgo.hoursAgo', { count: hours });
  if (minutes > 0) return t('notifications.timeAgo.minutesAgo', { count: minutes });
  return t('notifications.timeAgo.justNow');
}

function isExpiringSoon(expiresAt: string): boolean {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  const diffHours = diffMs / 3600000;
  return diffHours < 24 && diffHours > 0;
}

interface InvitationListItemProps {
  invitation: GroupInvitation;
  onCancel?: (invitationId: string) => Promise<void>;
  canCancel: boolean;
}

export function InvitationListItem({
  invitation,
  onCancel,
  canCancel,
}: InvitationListItemProps) {
  const { t } = useTranslation();
  const [isCanceling, setIsCanceling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const inviterName = invitation.invitedBy?.name || invitation.invitedBy?.email || '';
  const timeAgo = getTimeAgo(invitation.createdAt, t);
  const expiringSoon = invitation.expiresAt ? isExpiringSoon(invitation.expiresAt) : false;

  async function handleCancel() {
    if (!onCancel) return;
    setIsCanceling(true);
    try {
      await onCancel(invitation.id);
      setShowConfirm(false);
    } catch {
      // Error handling done by parent
    } finally {
      setIsCanceling(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Mail icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/40">
          <Icon name="mail" size={20} color="var(--color-muted-foreground)" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Email + role badge */}
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">
              {invitation.invitedEmail || '—'}
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${ROLE_BADGE_STYLES[invitation.role] || ROLE_BADGE_STYLES.MEMBER}`}
            >
              {t(ROLE_KEYS[invitation.role] || ROLE_KEYS.MEMBER)}
            </span>
          </div>

          {/* Invited by + time ago */}
          <div className="mt-0.5 text-xs text-muted-foreground">
            {inviterName && (
              <>
                {t('groups.invitedBy')} {inviterName} · {' '}
              </>
            )}
            {timeAgo}
          </div>

          {/* Expires soon warning */}
          {expiringSoon && (
            <div className="mt-0.5 text-xs font-medium text-destructive">
              {t('groups.expiresSoon')}
            </div>
          )}
        </div>

        {/* Cancel button */}
        {canCancel && onCancel && (
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={isCanceling}
            className="shrink-0 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            {isCanceling ? t('groups.canceling') : t('groups.cancelInvitation')}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={showConfirm}
        title={t('groups.cancelInvitation')}
        description={t('groups.cancelInvitationConfirm')}
        confirmLabel={t('groups.yesCancelInvitation')}
        variant="destructive"
        isLoading={isCanceling}
        onConfirm={handleCancel}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
