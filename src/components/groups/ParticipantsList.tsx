import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from 'react-i18next';
import { getAvatarColorVar } from '@/utils/avatarColor';

interface Participant {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  isCompleted: boolean;
  completedAt?: string;
}

interface CompactParticipant {
  id: string;
  name: string;
  avatar?: string;
}

interface ParticipantsListProps {
  participants: Participant[];
  invitedParticipants?: CompactParticipant[];
  notGoingParticipants?: CompactParticipant[];
  totalParticipants: number;
  completedCount: number;
  currentUserId?: string;
  organizerId: string;
  trackCompletion?: boolean;
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
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
      style={{ backgroundColor: getAvatarColorVar(name) }}
    >
      {initials}
    </div>
  );
}

function AvatarStack({ names }: { names: string[] }) {
  const visible = names.slice(0, 4);
  const remaining = names.length - visible.length;
  return (
    <div className="flex items-center -space-x-2">
      {visible.map((name, i) => (
        <div key={i} className="ring-2 ring-(--el-group-bg) rounded-full">
          <MiniAvatar name={name} />
        </div>
      ))}
      {remaining > 0 && (
        <span className="ml-2 text-xs text-(--el-group-description)">+{remaining}</span>
      )}
    </div>
  );
}

export function ParticipantsList({
  participants,
  invitedParticipants,
  notGoingParticipants,
  totalParticipants,
  completedCount,
  currentUserId,
  organizerId,
  trackCompletion = true,
}: ParticipantsListProps) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  const hasParticipants = participants.length > 0;
  const hasInvited = (invitedParticipants?.length ?? 0) > 0;
  const hasNotGoing = (notGoingParticipants?.length ?? 0) > 0;

  if (!hasParticipants && !hasInvited && !hasNotGoing) return null;

  const displayParticipants = showAll ? participants : participants.slice(0, 5);
  const showSeeAll = participants.length > 5 && !showAll;

  return (
    <div className="rounded-(--radius-card) border border-(--el-card-border)" data-testid="participants-list">
      {/* Participants card */}
      {hasParticipants && (
        <div>
          {/* Card header — "Participants ✓  1/6" */}
          <div className="flex items-center justify-between border-b border-(--el-card-border) px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-(--el-group-title)">
                {t('groups.participate.participants', 'Participants')}
              </span>
              {trackCompletion && (
                <Icon name="check" size={14} color="var(--el-group-status-text)" />
              )}
            </div>
            <span className="text-xs text-(--el-group-description)">
              {trackCompletion
                ? `${completedCount}/${totalParticipants}`
                : totalParticipants}
            </span>
          </div>

          {/* Participant rows */}
          <div>
            {displayParticipants.map((p, idx) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 px-4 py-2.5 ${idx < displayParticipants.length - 1 || showSeeAll ? 'border-b border-(--el-card-border)' : ''}`}
              >
                <MiniAvatar name={p.name} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="truncate text-[13px] font-medium text-(--el-group-title)">{p.name}</span>
                    {p.id === currentUserId && (
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-(--el-btn-primary-bg)" style={{ backgroundColor: 'color-mix(in srgb, var(--el-btn-primary-bg) 15%, transparent)' }}>
                        {t('common.you')}
                      </span>
                    )}
                    {p.id === organizerId && (
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-(--el-group-status-text)" style={{ backgroundColor: 'color-mix(in srgb, var(--el-group-status-text) 15%, transparent)' }}>
                        {t('groups.itemRow.organizer')}
                      </span>
                    )}
                  </div>
                  {trackCompletion && p.isCompleted && p.completedAt && (
                    <span className="text-[11px] text-(--el-group-description)">
                      {t('tasks.panel.completedAt')} {new Date(p.completedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                {trackCompletion && (
                  p.isCompleted ? (
                    <Icon name="check_circle" size={20} color="var(--el-group-status-text)" />
                  ) : (
                    <Icon name="radio_button_unchecked" size={20} color="var(--el-group-description)" />
                  )
                )}
              </div>
            ))}
          </div>

          {/* See all */}
          {showSeeAll && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="flex w-full items-center justify-between px-4 py-3 text-xs text-(--el-group-description) hover:bg-(--el-popover-item-hover)"
              data-testid="participants-see-all"
            >
              <span>{t('groups.participate.seeAll')}</span>
              <Icon name="chevron_right" size={18} color="var(--el-group-description)" />
            </button>
          )}
        </div>
      )}

      {/* Invited section — compact with count + avatar stack */}
      {hasInvited && (
        <div className={`flex items-center gap-3 px-4 py-3 ${hasParticipants ? 'border-t border-(--el-card-border)' : ''}`}>
          <Icon name="mail" size={16} color="var(--el-btn-secondary-bg)" />
          <span className="text-[13px] font-semibold text-(--el-group-title)">{t('groups.participate.invited')}</span>
          <span className="text-xs text-(--el-group-description)">{invitedParticipants!.length}</span>
          <div className="flex-1" />
          <AvatarStack names={invitedParticipants!.map((p) => p.name)} />
        </div>
      )}

      {/* Not going section — compact with count + avatar stack */}
      {hasNotGoing && (
        <div className={`flex items-center gap-3 px-4 py-3 ${hasParticipants || hasInvited ? 'border-t border-(--el-card-border)' : ''}`}>
          <Icon name="close" size={16} color="var(--el-group-cancel-text)" />
          <span className="text-[13px] font-semibold text-(--el-group-title)">{t('groups.participate.notGoingList')}</span>
          <span className="text-xs text-(--el-group-description)">{notGoingParticipants!.length}</span>
          <div className="flex-1" />
          <AvatarStack names={notGoingParticipants!.map((p) => p.name)} />
        </div>
      )}
    </div>
  );
}
