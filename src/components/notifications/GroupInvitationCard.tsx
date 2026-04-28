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
  ADMIN: { bg: 'var(--el-role-admin-bg)', text: 'var(--el-role-admin-text)' },
  MEMBER: { bg: 'var(--el-role-member-bg)', text: 'var(--el-role-member-text)' },
  VIEWER: { bg: 'var(--el-role-viewer-bg)', text: 'var(--el-role-viewer-text)' },
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
        className={`rounded-(--radius-card) border p-(--spacing-card) transition-colors ${
          notification.isRead
            ? 'border-(--el-notif-read-border) bg-(--el-notif-read-bg)'
            : 'border-(--el-notif-unread-border) bg-(--el-notif-unread-bg)'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--el-notif-success-bg)">
            <Icon name="group_add" size={20} color="var(--el-notif-success-color)" />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-(--el-notif-title)">{title}</span>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                style={{ backgroundColor: roleBadge.bg, color: roleBadge.text }}
              >
                {roleLabel}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-(--el-notif-message)">{message}</p>
            <span className="mt-1 block text-xs text-(--el-notif-time)">{timeAgo}</span>

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                data-testid="accept-invitation-button"
                onClick={handleAccept}
                disabled={isActing}
                className="rounded-(--radius-btn) bg-(--el-invite-accept-bg) px-(--spacing-btn-x) py-(--spacing-btn-y) text-sm font-semibold text-(--el-invite-accept-text) hover:opacity-90 disabled:opacity-50"
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
                className="rounded-(--radius-card) border border-(--el-invite-decline-border) px-4 py-1.5 text-sm font-medium text-(--el-invite-decline-text) hover:bg-(--el-settings-hover) disabled:opacity-50"
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
