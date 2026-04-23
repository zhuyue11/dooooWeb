import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@/components/ui/Icon';
import { getTaskCompletionStats } from '@/lib/api';
import { useTranslation } from 'react-i18next';

interface CompletionStatsDisplayProps {
  taskId: string;
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
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
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
        <div key={i} className="ring-2 ring-surface rounded-full">
          <MiniAvatar name={name} />
        </div>
      ))}
      {remaining > 0 && (
        <span className="ml-2 text-xs text-muted-foreground">+{remaining}</span>
      )}
    </div>
  );
}

export function CompletionStatsDisplay({ taskId, currentUserId, organizerId, trackCompletion }: CompletionStatsDisplayProps) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['completion-stats', taskId],
    queryFn: () => getTaskCompletionStats(taskId),
    staleTime: 30 * 1000,
  });

  if (!stats) return null;

  const hasParticipants = stats.participants.length > 0;
  const hasInvited = (stats.invitedParticipants?.length ?? 0) > 0;
  const hasNotGoing = (stats.notGoingParticipants?.length ?? 0) > 0;

  if (!hasParticipants && !hasInvited && !hasNotGoing) return null;

  const displayParticipants = showAll ? stats.participants : stats.participants.slice(0, 5);

  return (
    <div className="mx-4 my-2 rounded-xl border border-border" data-testid="completion-stats">
      {/* Participants section */}
      {hasParticipants && (
        <div className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              {t('groups.participate.participating')}
            </span>
            {trackCompletion && (
              <span className="text-xs text-muted-foreground">
                {stats.completedCount}/{stats.totalParticipants}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {displayParticipants.map((p) => (
              <div key={p.id} className="flex items-center gap-2.5">
                <MiniAvatar name={p.name} />
                <div className="flex-1 min-w-0">
                  <span className="truncate text-xs font-medium text-foreground">{p.name}</span>
                  {p.id === currentUserId && (
                    <span className="ml-1 text-[10px] text-muted-foreground">({t('common.you')})</span>
                  )}
                  {p.id === organizerId && (
                    <span className="ml-1 text-[10px] text-muted-foreground">({t('groups.itemRow.organizer')})</span>
                  )}
                </div>
                {trackCompletion && (
                  p.isCompleted ? (
                    <Icon name="check_circle" size={16} color="var(--color-primary)" />
                  ) : (
                    <Icon name="radio_button_unchecked" size={16} color="var(--color-muted-foreground)" />
                  )
                )}
              </div>
            ))}
          </div>
          {stats.participants.length > 5 && !showAll && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-2 text-xs font-medium text-primary"
              data-testid="completion-stats-see-all"
            >
              {t('groups.participate.seeAll')}
            </button>
          )}
        </div>
      )}

      {/* Invited section */}
      {hasInvited && (
        <div className={`flex items-center gap-3 p-3 ${hasParticipants ? 'border-t border-border' : ''}`}>
          <Icon name="mail" size={16} color="var(--color-secondary)" />
          <span className="text-xs text-muted-foreground">{t('groups.participate.invited')}</span>
          <div className="flex-1" />
          <AvatarStack names={stats.invitedParticipants!.map((p) => p.name)} />
        </div>
      )}

      {/* Not going section */}
      {hasNotGoing && (
        <div className={`flex items-center gap-3 p-3 ${hasParticipants || hasInvited ? 'border-t border-border' : ''}`}>
          <Icon name="close" size={16} color="var(--color-destructive)" />
          <span className="text-xs text-muted-foreground">{t('groups.participate.notGoingList')}</span>
          <div className="flex-1" />
          <AvatarStack names={stats.notGoingParticipants!.map((p) => p.name)} />
        </div>
      )}
    </div>
  );
}
