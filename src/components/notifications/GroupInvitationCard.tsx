import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAcceptInvitation, useDeclineInvitation } from '@/hooks/useNotifications';
import { useToast } from '@/lib/contexts/toast-context';
import { formatNotificationMessage } from '@/lib/notificationFormatter';
import { formatTimeAgo } from '@/lib/timeAgo';
import type { Notification } from '@/types/api';
import type { NotificationDataMap } from '@/types/notifications';

const ROLE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  ADMIN: { bg: 'rgba(239, 68, 68, 0.15)', text: '#dc2626' },
  MEMBER: { bg: 'rgba(59, 130, 246, 0.15)', text: '#2563eb' },
  VIEWER: { bg: 'rgba(107, 114, 128, 0.15)', text: '#6b7280' },
};

const ROLE_KEYS: Record<string, string> = {
  ADMIN: 'groups.roleAdmin',
  MEMBER: 'groups.roleMember',
  VIEWER: 'groups.roleViewer',
};

interface GroupInvitationCardProps {
  notification: Notification;
}

export function GroupInvitationCard({ notification }: GroupInvitationCardProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const acceptMutation = useAcceptInvitation();
  const declineMutation = useDeclineInvitation();
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);

  const data = notification.data as NotificationDataMap['GROUP_INVITATION'];
  const { title, message } = formatNotificationMessage(notification, t);
  const roleBadge = ROLE_BADGE_COLORS[data.role] || ROLE_BADGE_COLORS.MEMBER;
  const roleLabel = t(ROLE_KEYS[data.role] || ROLE_KEYS.MEMBER);
  const timeAgo = formatTimeAgo(notification.createdAt, t);
  const isActing = acceptMutation.isPending || declineMutation.isPending;

  function handleAccept() {
    acceptMutation.mutate(
      { invitationId: data.invitationId, notificationId: notification.id },
      {
        onSuccess: () => showToast(t('notifications.joinedGroup'), 'success'),
        onError: () => showToast(t('notifications.acceptInvitationError'), 'error'),
      }
    );
  }

  function handleDecline() {
    declineMutation.mutate(
      { invitationId: data.invitationId, notificationId: notification.id },
      {
        onSuccess: () => {
          showToast(t('notifications.declinedInvitation'), 'info');
          setShowDeclineConfirm(false);
        },
        onError: () => {
          showToast(t('notifications.declineInvitationError'), 'error');
          setShowDeclineConfirm(false);
        },
      }
    );
  }

  return (
    <>
      <div
        data-testid={`invitation-card-${notification.id}`}
        className={`rounded-xl border p-4 transition-colors ${
          notification.isRead
            ? 'border-border bg-surface'
            : 'border-primary/20 bg-primary/5'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Icon name="group_add" size={20} color="var(--color-primary)" />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{title}</span>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                style={{ backgroundColor: roleBadge.bg, color: roleBadge.text }}
              >
                {roleLabel}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{message}</p>
            <span className="mt-1 block text-xs text-muted-foreground/70">{timeAgo}</span>

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                data-testid="accept-invitation-button"
                onClick={handleAccept}
                disabled={isActing}
                className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {acceptMutation.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  t('groupInvitation.accept')
                )}
              </button>
              <button
                type="button"
                data-testid="decline-invitation-button"
                onClick={() => setShowDeclineConfirm(true)}
                disabled={isActing}
                className="rounded-lg border border-border px-4 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
              >
                {t('groupInvitation.decline')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDeclineConfirm}
        title={t('groupInvitation.declineTitle')}
        description={t('groupInvitation.declineMessage')}
        confirmLabel={t('groupInvitation.decline')}
        variant="destructive"
        isLoading={declineMutation.isPending}
        onConfirm={handleDecline}
        onCancel={() => setShowDeclineConfirm(false)}
      />
    </>
  );
}
