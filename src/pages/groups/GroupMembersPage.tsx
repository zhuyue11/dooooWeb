import { useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/contexts/auth-context';
import {
  getMembers,
  getGroupInvitations,
  updateGroupMemberRole,
  removeGroupMember,
  cancelGroupInvitation,
} from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import { MemberListItem } from '@/components/groups/MemberListItem';
import { InvitationListItem } from '@/components/groups/InvitationListItem';
import { InviteMemberModal } from '@/components/groups/InviteMemberModal';
import type { GroupMember } from '@/types/api';

export function GroupMembersPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showInviteModal, setShowInviteModal] = useState(false);

  // Fetch members
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['members', groupId],
    queryFn: () => getMembers(groupId!),
    enabled: !!groupId,
  });

  // Fetch pending invitations (filter to PENDING, matching dooooApp useMembersData)
  const { data: invitations = [] } = useQuery({
    queryKey: ['invitations', groupId],
    queryFn: async () => {
      const all = await getGroupInvitations(groupId!);
      return all.filter((inv) => inv.status === 'PENDING');
    },
    enabled: !!groupId,
  });

  // Derive current user's role
  const currentUserRole = useMemo(() => {
    if (!user || !members.length) return null;
    return members.find((m) => m.userId === user.id)?.role ?? null;
  }, [user, members]);

  const canInvite = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';
  const canCancelInvitations = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  // Per-member action permission (matching dooooApp MembersSection:157-161)
  const canManageMember = useCallback(
    (member: GroupMember) => {
      if (!user || !currentUserRole) return false;
      if (member.userId === user.id) return false;
      if (currentUserRole === 'OWNER') return true;
      if (currentUserRole === 'ADMIN' && member.role !== 'OWNER') return true;
      return false;
    },
    [user, currentUserRole],
  );

  // Mutation handlers (matching dooooApp MembersSection:86-110)
  const handleChangeRole = useCallback(
    async (memberId: string, newRole: 'ADMIN' | 'MEMBER' | 'VIEWER') => {
      if (!groupId) return;
      const member = members.find((m) => m.id === memberId);
      if (!member) return;
      await updateGroupMemberRole(groupId, member.userId, newRole);
      await queryClient.invalidateQueries({ queryKey: ['members', groupId] });
      await queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
    [groupId, members, queryClient],
  );

  const handleRemoveMember = useCallback(
    async (memberId: string) => {
      if (!groupId) return;
      const member = members.find((m) => m.id === memberId);
      if (!member) return;
      await removeGroupMember(groupId, member.userId);
      await queryClient.invalidateQueries({ queryKey: ['members', groupId] });
      await queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
    [groupId, members, queryClient],
  );

  const handleCancelInvitation = useCallback(
    async (invitationId: string) => {
      if (!groupId) return;
      await cancelGroupInvitation(groupId, invitationId);
      await queryClient.invalidateQueries({ queryKey: ['invitations', groupId] });
    },
    [groupId, queryClient],
  );

  const handleInviteSuccess = useCallback(() => {
    if (!groupId) return;
    queryClient.invalidateQueries({ queryKey: ['invitations', groupId] });
    queryClient.invalidateQueries({ queryKey: ['members', groupId] });
  }, [groupId, queryClient]);

  // Fetch group name for the invite modal
  const groupData = queryClient.getQueryData<{ group: { name: string } }>(['group', groupId]);
  const groupName = groupData?.group?.name || '';

  if (membersLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-1">
      {/* Header: title + invite button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground" data-testid="members-heading">
          {t('groups.navMembers')} ({members.length})
        </h2>
        {canInvite && (
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            data-testid="invite-member-button"
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Icon name="person_add" size={18} color="currentColor" />
            {t('groups.invite')}
          </button>
        )}
      </div>

      {/* Pending invitations section */}
      {invitations.length > 0 && (
        <div className="rounded-xl border border-border bg-surface" data-testid="pending-invitations-section">
          <div className="border-b border-border bg-muted/30 px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('groups.pendingInvitations')} ({invitations.length})
            </span>
          </div>
          <div className="divide-y divide-border">
            {invitations.map((inv) => (
              <InvitationListItem
                key={inv.id}
                invitation={inv}
                canCancel={canCancelInvitations}
                onCancel={handleCancelInvitation}
              />
            ))}
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="rounded-xl border border-border bg-surface divide-y divide-border" data-testid="members-list">
        {members.map((member) => (
          <MemberListItem
            key={member.id}
            member={member}
            showActions={canManageMember(member)}
            currentUserRole={currentUserRole || 'MEMBER'}
            onChangeRole={handleChangeRole}
            onRemoveMember={handleRemoveMember}
          />
        ))}
      </div>

      {/* Invite modal */}
      <InviteMemberModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        groupId={groupId!}
        groupName={groupName}
        members={members}
        onSuccess={handleInviteSuccess}
      />
    </div>
  );
}
