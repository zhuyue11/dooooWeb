import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { GroupInvitationCard } from '@/components/notifications/GroupInvitationCard';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { useNotifications, useMarkAllAsRead } from '@/hooks/useNotifications';
import { NotificationType } from '@/types/api';

type FilterTab = 'unread' | 'invitations' | 'all';

export function NotificationPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<FilterTab>('unread');

  const {
    notifications,
    invitationNotifications,
    unreadNotifications,
    invitationCount,
    unreadCount,
    isLoading,
  } = useNotifications();

  const markAllAsRead = useMarkAllAsRead();

  const filteredNotifications = (() => {
    switch (activeTab) {
      case 'unread':
        return unreadNotifications;
      case 'invitations':
        return invitationNotifications;
      case 'all':
        return notifications;
    }
  })();

  const emptyState = (() => {
    switch (activeTab) {
      case 'unread':
        return { title: t('notifications.allCaughtUp'), sub: t('notifications.allRead') };
      case 'invitations':
        return { title: t('notifications.noPendingInvitations'), sub: t('notifications.invitationsAppearHere') };
      case 'all':
        return { title: t('notifications.noNotifications'), sub: t('notifications.notificationsAppearHere') };
    }
  })();

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: 'unread', label: t('notifications.unread'), count: unreadCount || undefined },
    { key: 'invitations', label: t('notifications.invitations'), count: invitationCount || undefined },
    { key: 'all', label: t('notifications.all') },
  ];

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-1" data-testid="notifications-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground" data-testid="notifications-heading">
          {t('notifications.notifications')}
        </h1>
        {unreadCount > 0 && (
          <button
            type="button"
            data-testid="mark-all-read-button"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
            className="flex items-center gap-1.5 rounded-(--radius-btn) px-(--spacing-btn-x) py-(--spacing-btn-y) text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            <Icon name="done_all" size={18} />
            {t('notifications.markAllRead')}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            data-testid={`tab-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.count != null && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white">
                {tab.count > 99 ? '99+' : tab.count}
              </span>
            )}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16" data-testid="empty-state">
          <Icon name="notifications_none" size={48} color="var(--color-muted-foreground)" />
          <p className="text-sm font-medium text-foreground">{emptyState.title}</p>
          <p className="text-xs text-muted-foreground">{emptyState.sub}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2" data-testid="notifications-list">
          {filteredNotifications.map((notification) =>
            notification.type === NotificationType.GROUP_INVITATION ? (
              <GroupInvitationCard key={notification.id} notification={notification} />
            ) : (
              <NotificationItem key={notification.id} notification={notification} />
            )
          )}
        </div>
      )}
    </div>
  );
}
