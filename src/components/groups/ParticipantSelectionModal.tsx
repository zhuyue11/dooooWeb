import { useState, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useMembersData } from '@/hooks/useMembersData';
import { useTranslation } from 'react-i18next';

interface ParticipantSelectionModalProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  selectedUserIds: string[];
  onSelectionChange: (userIds: string[]) => void;
  currentUserId: string;
  notGoingUserIds?: string[];
  participantUserIds?: string[];
  invitedUserIds?: string[];
}

function MemberAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--el-group-avatar-bg) text-xs font-semibold text-(--el-group-avatar-text)">
      {initials}
    </div>
  );
}

export function ParticipantSelectionModal({
  open,
  onClose,
  groupId,
  selectedUserIds,
  onSelectionChange,
  currentUserId,
  notGoingUserIds = [],
  participantUserIds = [],
  invitedUserIds = [],
}: ParticipantSelectionModalProps) {
  const { t } = useTranslation();
  const { assignees, isLoading } = useMembersData(groupId);
  const [search, setSearch] = useState('');

  const lockedUserIds = [...participantUserIds, ...invitedUserIds];

  // Filter and sort: selectable → invited → participating → not-going
  const sortedMembers = useMemo(() => {
    let members = assignees.filter((a) => a.id !== currentUserId);
    if (search.trim()) {
      const q = search.toLowerCase();
      members = members.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
    }
    return [...members].sort((a, b) => {
      const cat = (id: string) => {
        if (notGoingUserIds.includes(id)) return 3;
        if (participantUserIds.includes(id)) return 2;
        if (invitedUserIds.includes(id)) return 1;
        return 0;
      };
      const diff = cat(a.id) - cat(b.id);
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });
  }, [assignees, search, currentUserId, notGoingUserIds, participantUserIds, invitedUserIds]);

  // "Select all" logic — only considers selectable (not locked, not not-going)
  const selectableOthers = assignees.filter(
    (a) => a.id !== currentUserId && !notGoingUserIds.includes(a.id) && !lockedUserIds.includes(a.id),
  );
  const isAllSelected = selectableOthers.length > 0 && selectableOthers.every((a) => selectedUserIds.includes(a.id));

  const toggleMember = (userId: string) => {
    if (lockedUserIds.includes(userId)) return;
    if (selectedUserIds.includes(userId)) {
      onSelectionChange(selectedUserIds.filter((id) => id !== userId));
    } else {
      onSelectionChange([...selectedUserIds, userId]);
    }
  };

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      onSelectionChange([...lockedUserIds]);
    } else {
      const selectableIds = selectableOthers.map((a) => a.id);
      onSelectionChange([...new Set([...lockedUserIds, ...selectableIds])]);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-(--el-modal-overlay)"
      onClick={onClose}
      data-testid="participant-selection-modal"
    >
      <div
        className="mx-4 flex max-h-[80vh] w-full max-w-md flex-col rounded-(--radius-modal) bg-(--el-modal-bg) shadow-(--shadow-modal)"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-(--el-card-border) px-4 py-3">
          <button type="button" onClick={onClose} data-testid="participant-modal-close">
            <Icon name="arrow_back" size={22} color="var(--el-modal-title-text)" />
          </button>
          <h3 className="text-sm font-semibold text-(--el-modal-title-text)">{t('tasks.input.inviteToParticipate')}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-(--el-group-status-text)"
            data-testid="participant-modal-done"
          >
            {t('tasks.input.done')}
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 rounded-(--radius-card) bg-(--el-editor-tag-bg) px-3 py-1.5">
            <Icon name="search" size={16} color="var(--el-input-placeholder)" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('tasks.input.searchMembers')}
              className="flex-1 bg-transparent text-sm text-(--el-input-text) outline-none placeholder:text-(--el-input-placeholder)"
              data-testid="participant-search-input"
            />
          </div>
        </div>

        {/* Select all toggle */}
        {selectableOthers.length > 0 && (
          <div
            role="button"
            tabIndex={0}
            onClick={handleSelectAllToggle}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectAllToggle(); }}
            className="flex cursor-pointer items-center gap-3 border-b border-(--el-card-border) px-4 py-2.5 transition-colors hover:bg-(--el-popover-item-hover)"
            data-testid="participant-select-all"
          >
            <Icon name="people" size={20} color="var(--el-group-status-text)" />
            <span className="flex-1 text-sm font-medium text-(--el-group-title)">{t('tasks.input.selectAllMembers')}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleSelectAllToggle(); }}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${isAllSelected ? 'bg-(--el-switch-active)' : 'bg-(--el-group-radio-inactive-border)'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${isAllSelected ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
            </button>
          </div>
        )}

        {/* Member list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <p className="py-8 text-center text-sm text-(--el-group-description)">{t('common.loading')}</p>
          )}
          {!isLoading && sortedMembers.length === 0 && (
            <p className="py-4 text-center text-sm text-(--el-group-description)">
              {search ? t('tasks.input.noSearchResults') : t('tasks.input.noMembersAvailable')}
            </p>
          )}
          {sortedMembers.map((member) => {
            const isSelected = selectedUserIds.includes(member.id);
            const isNotGoing = notGoingUserIds.includes(member.id);
            const isParticipant = participantUserIds.includes(member.id);
            const isInvited = invitedUserIds.includes(member.id);
            const isLocked = isParticipant || isInvited;

            return (
              <button
                key={member.id}
                type="button"
                onClick={() => toggleMember(member.id)}
                disabled={isLocked || isNotGoing}
                className={`flex w-full items-center gap-3 border-b border-(--el-card-border) px-5 py-3 text-left transition-colors ${
                  isLocked || isNotGoing ? 'cursor-default opacity-60' : 'cursor-pointer hover:bg-(--el-popover-item-hover)'
                }`}
                data-testid={`participant-item-${member.id}`}
              >
                <MemberAvatar name={member.name} />
                <div className="flex-1 min-w-0">
                  <p className={`truncate text-sm font-medium ${isNotGoing || isLocked ? 'text-(--el-group-description)' : 'text-(--el-group-title)'}`}>
                    {member.name}
                  </p>
                  {isNotGoing ? (
                    <p className="text-xs text-(--el-group-cancel-text)">{t('groups.participate.notGoingList')}</p>
                  ) : isParticipant ? (
                    <p className="text-xs text-(--el-group-status-text)">{t('groups.participate.participating')}</p>
                  ) : isInvited ? (
                    <p className="text-xs text-(--el-btn-secondary-bg)">{t('groups.participate.invited')}</p>
                  ) : (
                    <p className="truncate text-xs text-(--el-group-description)">{member.email}</p>
                  )}
                </div>
                {isNotGoing ? (
                  <Icon name="close" size={18} color="var(--el-group-cancel-text)" />
                ) : isParticipant ? (
                  <Icon name="check_circle" size={18} color="var(--el-group-status-text)" />
                ) : isInvited ? (
                  <Icon name="mail" size={18} color="var(--el-btn-secondary-bg)" />
                ) : (
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded ${isSelected ? 'bg-(--el-btn-primary-bg)' : 'border-2 border-(--el-card-border)'}`}
                  >
                    {isSelected && <Icon name="check" size={14} color="white" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
