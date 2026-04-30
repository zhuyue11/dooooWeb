import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@/components/ui/Icon';
import { getGroup } from '@/lib/api';
import { useParticipationMutations } from '@/hooks/useParticipationMutations';
import { useTranslation } from 'react-i18next';
import { getAvatarColorVar } from '@/utils/avatarColor';

interface InviteParticipantsModalProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  taskId: string;
  taskDate?: string;
  /** User IDs that are already participating, invited, or not going — exclude from selection */
  existingUserIds: string[];
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

export function InviteParticipantsModal({ open, onClose, groupId, taskId, taskDate, existingUserIds }: InviteParticipantsModalProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { inviteMutation } = useParticipationMutations(taskId);

  const { data: groupData } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => getGroup(groupId),
    enabled: open && !!groupId,
  });

  // Reset selection when modal opens
  useEffect(() => {
    if (open) setSelected(new Set());
  }, [open]);

  if (!open) return null;

  const members = groupData?.members ?? [];
  const availableMembers = members.filter(m => !existingUserIds.includes(m.userId));

  const toggleMember = (userId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleInvite = async () => {
    if (selected.size === 0) return;
    await inviteMutation.mutateAsync({ userIds: Array.from(selected), taskDate });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--el-dialog-overlay)" onClick={onClose}>
      <div className="w-full max-w-sm rounded-(--radius-modal) bg-(--el-dialog-bg) p-(--spacing-card) shadow-(--shadow-modal)" onClick={e => e.stopPropagation()}>
        <h3 className="mb-3 text-base font-semibold text-(--el-dialog-title)">
          {t('tasks.panel.invite')}
        </h3>

        {availableMembers.length === 0 ? (
          <p className="py-4 text-center text-sm text-(--el-group-description)">
            {t('tasks.panel.participantsInvited', 'All members already invited')}
          </p>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            {availableMembers.map(m => (
              <button
                key={m.userId}
                type="button"
                onClick={() => toggleMember(m.userId)}
                className="flex w-full items-center gap-3 rounded-(--radius-btn) px-3 py-2 hover:bg-(--el-popover-item-hover)"
              >
                <MiniAvatar name={m.user?.name || m.userId} />
                <span className="flex-1 text-left text-[13px] font-medium text-(--el-group-title)">
                  {m.user?.name || m.user?.email || m.userId}
                </span>
                {selected.has(m.userId) ? (
                  <Icon name="check_box" size={20} color="var(--el-btn-primary-bg)" />
                ) : (
                  <Icon name="check_box_outline_blank" size={20} color="var(--el-group-description)" />
                )}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-(--radius-btn) border border-(--el-dialog-cancel-border) px-(--spacing-btn-x) py-(--spacing-btn-y) text-sm font-medium text-(--el-dialog-cancel-text) hover:opacity-80"
          >
            {t('common.cancel')}
          </button>
          {availableMembers.length > 0 && (
            <button
              onClick={handleInvite}
              disabled={selected.size === 0 || inviteMutation.isPending}
              className="rounded-(--radius-btn) bg-(--el-btn-primary-bg) px-(--spacing-btn-x) py-(--spacing-btn-y) text-sm font-semibold text-(--el-btn-primary-text) hover:opacity-90 disabled:opacity-50"
            >
              {inviteMutation.isPending
                ? t('common.loading')
                : `${t('tasks.panel.invite')} (${selected.size})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
