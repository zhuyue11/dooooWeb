import { useTranslation } from 'react-i18next';
import type { Group } from '@/types/api';
import { Icon } from '@/components/ui/Icon';
import { useUnreadMessages } from '@/lib/contexts/unread-messages-context';

interface GroupCardProps {
  group: Group;
  currentUserId: string;
  onClick: () => void;
  onStarToggle?: (groupId: string, isStarred: boolean) => void;
}

export function GroupCard({ group, currentUserId, onClick, onStarToggle }: GroupCardProps) {
  const { t } = useTranslation();
  const { unreadCounts } = useUnreadMessages();

  const currentMember = group.members?.find((m) => m.userId === currentUserId);
  const isStarred = currentMember?.isStarred ?? false;
  const isOwner = group.ownerId === currentUserId;
  const memberCount = group.members?.length ?? 0;
  const unreadCount = unreadCounts[group.id] ?? 0;

  return (
    <div
      className="cursor-pointer overflow-hidden rounded-(--radius-card) bg-surface shadow-(--shadow-card) transition-shadow hover:shadow-(--shadow-card-hover)"
      onClick={onClick}
    >
      {/* Color strip */}
      <div className="h-1.5" style={{ backgroundColor: group.color || '#3B82F6' }} />

      {/* Body */}
      <div className="flex flex-col gap-3 px-5 py-4">
        {/* Header: dot + name + star */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: group.color || '#3B82F6' }}
            />
            <span className="text-base font-semibold text-foreground">{group.name}</span>
          </div>
          <button
            type="button"
            data-testid="star-toggle"
            onClick={(e) => {
              e.stopPropagation();
              onStarToggle?.(group.id, !isStarred);
            }}
            className="rounded-full p-1 transition-transform hover:scale-110 active:scale-95"
          >
            <Icon
              name="star"
              size={20}
              filled={isStarred}
              color={isStarred ? 'var(--color-accent)' : 'var(--color-muted-foreground)'}
            />
          </button>
        </div>

        {/* Description */}
        {group.description && (
          <p className="line-clamp-2 text-[13px] text-muted-foreground">{group.description}</p>
        )}

        {/* Footer: member count + badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="group" size={16} color="var(--color-muted-foreground)" />
            <span className="text-xs text-muted-foreground">
              {memberCount} {memberCount === 1 ? t('groups.member') : t('groups.members')}
            </span>
          </div>

          {unreadCount > 0 ? (
            <div className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5">
              <Icon name="chat_bubble" size={12} color="var(--color-primary-foreground)" />
              <span className="text-[11px] font-semibold text-primary-foreground">
                {t('groups.newMessages', { count: unreadCount })}
              </span>
            </div>
          ) : isOwner ? (
            <div className="rounded-full border border-border px-2 py-0.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                {t('groups.owner')}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
