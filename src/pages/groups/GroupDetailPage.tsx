import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/contexts/auth-context';
import { getGroup, updateGroup } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import { GroupFormModal } from '@/components/groups/GroupFormModal';
import type { GroupFormData } from '@/components/groups/GroupFormModal';

export function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showEditModal, setShowEditModal] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => getGroup(groupId!),
    enabled: !!groupId,
  });

  const group = data?.group;
  const members = data?.members ?? [];

  const currentUserRole = useMemo(() => {
    if (!user || !members.length) return null;
    return members.find((m) => m.userId === user.id)?.role ?? null;
  }, [user, members]);

  const canEdit = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  const handleUpdateGroup = useCallback(
    async (formData: GroupFormData) => {
      if (!groupId) return;
      await updateGroup(groupId, {
        name: formData.name,
        description: formData.description,
        color: formData.color,
      });
      await queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      await queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    [groupId, queryClient],
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-(--el-group-description)">
        {t('common.loading')}
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <Icon name="error_outline" size={48} color="var(--el-group-description)" />
        <span className="text-base font-medium text-(--el-group-title)">{t('groups.groupNotFound')}</span>
        <button
          type="button"
          onClick={() => navigate('/groups')}
          className="rounded-(--radius-btn) bg-(--el-btn-primary-bg) px-(--spacing-btn-x) py-(--spacing-btn-y) text-sm font-medium text-(--el-btn-primary-text) hover:opacity-90"
        >
          {t('groups.goBack')}
        </button>
      </div>
    );
  }

  const memberCount = members.length;

  return (
    <div className="flex h-full flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/groups')}
          className="flex h-9 w-9 items-center justify-center rounded-(--radius-card) hover:bg-(--el-popover-item-hover)"
          data-testid="back-to-groups"
        >
          <Icon name="arrow_back" size={20} color="var(--el-group-title)" />
        </button>

        {/* Color dot + name */}
        <div
          className="h-9 w-9 shrink-0 rounded-full"
          style={{ backgroundColor: group.color || '#3B82F6' }}
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-(--el-group-title)">{group.name}</h1>
          <span className="text-[13px] text-(--el-group-description)">
            {memberCount} {memberCount === 1 ? t('groups.member') : t('groups.members')}
          </span>
        </div>

        {/* Edit button */}
        {canEdit && (
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-1.5 rounded-(--radius-card) border border-(--el-btn-outline-border) px-3 py-1.5 text-[13px] font-medium text-(--el-btn-outline-text) hover:bg-(--el-btn-outline-hover)"
            data-testid="edit-group-button"
          >
            <Icon name="edit" size={16} color="var(--el-btn-outline-text)" />
            {t('groups.editGroup')}
          </button>
        )}
      </div>

      {/* Description */}
      {group.description && (
        <div className="rounded-(--radius-card) border border-(--el-card-border) bg-(--el-group-bg) p-(--spacing-card)">
          <p className="text-sm leading-relaxed text-(--el-group-title)">{group.description}</p>
        </div>
      )}

      {/* Info section */}
      <div className="rounded-(--radius-card) border border-(--el-card-border) bg-(--el-group-bg) p-(--spacing-card)">
        <h3 className="mb-3 text-sm font-semibold text-(--el-group-title)">{t('groups.groupInfo')}</h3>
        <div className="flex flex-col gap-2.5">
          {/* Members */}
          <div className="flex items-center gap-2.5">
            <Icon name="group" size={18} color="var(--el-group-member-icon)" />
            <span className="text-sm text-(--el-group-member-text)">
              {memberCount} {memberCount === 1 ? t('groups.member') : t('groups.members')}
            </span>
          </div>
          {/* Created date */}
          <div className="flex items-center gap-2.5">
            <Icon name="calendar_today" size={18} color="var(--el-group-description)" />
            <span className="text-sm text-(--el-group-description)">
              {t('groups.createdOn', {
                date: new Date(group.createdAt).toLocaleDateString(),
              })}
            </span>
          </div>
          {/* Owner */}
          {(() => {
            const owner = members.find((m) => m.role === 'OWNER');
            if (!owner?.user) return null;
            return (
              <div className="flex items-center gap-2.5">
                <Icon name="person" size={18} color="var(--el-group-description)" />
                <span className="text-sm text-(--el-group-description)">
                  {t('groups.ownedBy', { name: owner.user.name || owner.user.email })}
                </span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Placeholder for future sections (calendar, chat, members list) */}
      <div className="rounded-(--radius-card) border border-dashed border-(--el-group-placeholder-border) p-(--spacing-card) text-center text-sm text-(--el-group-description)">
        {t('groups.moreFeaturesComing')}
      </div>

      {/* Edit modal */}
      <GroupFormModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleUpdateGroup}
        initialData={{
          name: group.name,
          description: group.description,
          color: group.color,
        }}
        mode="edit"
      />
    </div>
  );
}
