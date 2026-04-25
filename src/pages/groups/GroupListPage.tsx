import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/contexts/auth-context';
import { useGroups } from '@/hooks/useGroups';
import { createGroup, updateGroupPreferences } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import { GroupCard } from '@/components/groups/GroupCard';
import { GroupFormModal } from '@/components/groups/GroupFormModal';
import type { GroupFormData } from '@/components/groups/GroupFormModal';
import type { Group } from '@/types/api';

type GroupFilter = 'all' | 'my_group' | 'joined_group';

export function GroupListPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: groups = [], isLoading } = useGroups();

  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<GroupFilter>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleStarToggle = useCallback(async (groupId: string, isStarred: boolean) => {
    // Optimistic update
    queryClient.setQueryData<Group[]>(['groups'], (old) =>
      old?.map((g) =>
        g.id === groupId
          ? { ...g, members: g.members?.map((m) => (m.userId === user!.id ? { ...m, isStarred } : m)) }
          : g,
      ),
    );
    try {
      await updateGroupPreferences(groupId, { isStarred });
    } catch {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    }
  }, [queryClient, user]);

  const handleCreateGroup = useCallback(async (data: GroupFormData) => {
    const group = await createGroup({
      name: data.name,
      description: data.description,
      color: data.color,
    });
    await queryClient.invalidateQueries({ queryKey: ['groups'] });
    navigate(`/groups/${group.id}/tasks`);
  }, [queryClient, navigate]);

  const sortedAndFiltered = useMemo(() => {
    if (!user) return [];

    // Sort: starred first, then by updatedAt desc (matching dooooApp GroupScreen.tsx:58-74)
    const sorted = [...groups].sort((a: Group, b: Group) => {
      const memberA = a.members?.find((m) => m.userId === user.id);
      const memberB = b.members?.find((m) => m.userId === user.id);
      const starA = memberA?.isStarred ?? false;
      const starB = memberB?.isStarred ?? false;

      if (starA && !starB) return -1;
      if (!starA && starB) return 1;

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    // Filter (matching dooooApp GroupScreen.tsx:77-90)
    if (filter === 'my_group') return sorted.filter((g) => g.ownerId === user.id);
    if (filter === 'joined_group') return sorted.filter((g) => g.ownerId !== user.id);
    return sorted;
  }, [groups, filter, user]);

  const filters: { key: GroupFilter; label: string }[] = [
    { key: 'all', label: t('groups.filterAll') },
    { key: 'my_group', label: t('groups.filterMyGroup') },
    { key: 'joined_group', label: t('groups.filterJoinedGroup') },
  ];

  function renderEmptyState() {
    const showCreate = filter !== 'joined_group';
    let title: string;
    let subtitle: string;

    if (filter === 'my_group') {
      title = t('groups.noOwnedGroups');
      subtitle = t('groups.noOwnedGroupsSubtitle');
    } else if (filter === 'joined_group') {
      title = t('groups.noJoinedGroups');
      subtitle = t('groups.noJoinedGroupsSubtitle');
    } else {
      title = t('groups.noGroupsYet');
      subtitle = t('groups.noGroupsSubtitle');
    }

    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20">
        <Icon name="group" size={48} color="var(--color-muted-foreground)" />
        <span className="text-base font-medium text-foreground">{title}</span>
        <span className="text-sm text-muted-foreground">{subtitle}</span>
        {showCreate && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {t('groups.createGroup')}
          </button>
        )}
      </div>
    );
  }

  const groupCountText =
    sortedAndFiltered.length === 1
      ? t('groups.groupCountOne')
      : t('groups.groupCount', { count: sortedAndFiltered.length });

  return (
    <div className="flex h-full flex-col gap-5" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">{t('groups.groups')}</h1>
          {!isLoading && (
            <span className="text-sm text-muted-foreground">{groupCountText}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Filter pills */}
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                filter === f.key
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border text-foreground hover:bg-muted'
              }`}
            >
              {f.label}
            </button>
          ))}

          {/* New Group button */}
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="ml-2 flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-[13px] font-semibold text-primary-foreground hover:opacity-90"
          >
            <Icon name="add" size={16} color="var(--color-primary-foreground)" />
            {t('groups.newGroup')}
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          {t('common.loading')}
        </div>
      ) : sortedAndFiltered.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {sortedAndFiltered.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              currentUserId={user!.id}
              onClick={() => navigate(`/groups/${group.id}/tasks`)}
              onStarToggle={handleStarToggle}
            />
          ))}
        </div>
      )}

      <GroupFormModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateGroup}
        mode="create"
      />
    </div>
  );
}
