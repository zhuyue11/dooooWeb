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
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
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
    <div className="border-b border-border" data-testid="assignee-picker">
      {/* Search */}
      <div className="px-4 py-2">
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5">
          <Icon name="search" size={16} color="var(--color-muted-foreground)" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('tasks.input.searchMembers')}
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            data-testid="assignee-search-input"
          />
        </div>
      </div>

      {/* List */}
      <div className="max-h-[250px] overflow-y-auto">
        {isLoading && (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('common.loading')}</p>
        )}
        {error && (
          <p className="py-4 text-center text-sm text-destructive">{String(error)}</p>
        )}
        {!isLoading && !error && filtered.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
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
              className="flex w-full items-center gap-3 border-b border-border px-5 py-3 text-left transition-colors hover:bg-muted/50"
              data-testid={`assignee-item-${member.id}`}
            >
              <MemberAvatar name={member.name} />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{member.name}</p>
                <p className="truncate text-xs text-muted-foreground">{member.email}</p>
              </div>
              <div
                className={`flex h-5 w-5 items-center justify-center rounded ${isSelected ? 'bg-primary' : 'border-2 border-border'}`}
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
