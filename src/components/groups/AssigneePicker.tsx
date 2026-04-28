import { useState, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useMembersData } from '@/hooks/useMembersData';
import { useTranslation } from 'react-i18next';

interface AssigneePickerProps {
  groupId: string;
  selectedUserId: string | null;
  onSelect: (userId: string | null) => void;
  currentUserId: string;
}

function MemberAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--el-group-avatar-bg) text-xs font-semibold text-(--el-group-avatar-text)">
      {initials}
    </div>
  );
}

export function AssigneePicker({ groupId, selectedUserId, onSelect, currentUserId }: AssigneePickerProps) {
  const { t } = useTranslation();
  const { assignees, isLoading, error } = useMembersData(groupId);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const members = assignees.filter((a) => a.id !== currentUserId);
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [assignees, search, currentUserId]);

  return (
    <div className="border-b border-(--el-card-border)" data-testid="assignee-picker">
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
            data-testid="assignee-search-input"
          />
        </div>
      </div>

      {/* List */}
      <div className="max-h-[250px] overflow-y-auto">
        {isLoading && (
          <p className="py-8 text-center text-sm text-(--el-group-description)">{t('common.loading')}</p>
        )}
        {error && (
          <p className="py-4 text-center text-sm text-(--el-editor-error)">{String(error)}</p>
        )}
        {!isLoading && !error && filtered.length === 0 && (
          <p className="py-4 text-center text-sm text-(--el-group-description)">
            {search ? t('tasks.input.noSearchResults') : t('tasks.input.noMembersAvailable')}
          </p>
        )}
        {filtered.map((member) => {
          const isSelected = member.id === selectedUserId;
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => onSelect(isSelected ? null : member.id)}
              className="flex w-full items-center gap-3 border-b border-(--el-card-border) px-5 py-3 text-left transition-colors hover:bg-(--el-popover-item-hover)"
              data-testid={`assignee-item-${member.id}`}
            >
              <MemberAvatar name={member.name} />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-(--el-group-title)">{member.name}</p>
                <p className="truncate text-xs text-(--el-group-description)">{member.email}</p>
              </div>
              <div
                className={`flex h-5 w-5 items-center justify-center rounded ${isSelected ? 'bg-(--el-btn-primary-bg)' : 'border-2 border-(--el-card-border)'}`}
              >
                {isSelected && <Icon name="check" size={14} color="white" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
