import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { PopoverWrapper } from '@/components/ui/PopoverWrapper';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { GroupMember } from '@/types/api';

const ROLE_BADGE_STYLES: Record<string, string> = {
  OWNER: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  MEMBER: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  VIEWER: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400',
};

const ROLE_KEYS: Record<string, string> = {
  OWNER: 'groups.roleOwner',
  ADMIN: 'groups.roleAdmin',
  MEMBER: 'groups.roleMember',
  VIEWER: 'groups.roleViewer',
};

interface MemberListItemProps {
  member: GroupMember;
  showActions: boolean;
  currentUserRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  onChangeRole: (memberId: string, newRole: 'ADMIN' | 'MEMBER' | 'VIEWER') => Promise<void>;
  onRemoveMember: (memberId: string) => Promise<void>;
}

export function MemberListItem({
  member,
  showActions,
  currentUserRole,
  onChangeRole,
  onRemoveMember,
}: MemberListItemProps) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'role' | 'remove';
    newRole?: 'ADMIN' | 'MEMBER' | 'VIEWER';
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const canChangeRole = currentUserRole === 'OWNER' && member.role !== 'OWNER';
  const canRemove =
    (currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') &&
    member.role !== 'OWNER';

  const hasActions = showActions && (canChangeRole || canRemove);

  const memberName = member.user?.name || member.user?.email || t('groups.unknownMember');
  const memberEmail = member.user?.email || '';
  const initial = (member.user?.name || member.user?.email || '?')[0].toUpperCase();

  const handleConfirm = useCallback(async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      if (confirmAction.type === 'role' && confirmAction.newRole) {
        await onChangeRole(member.id, confirmAction.newRole);
      } else if (confirmAction.type === 'remove') {
        await onRemoveMember(member.id);
      }
      setConfirmAction(null);
    } catch {
      // Error handling is done by the parent
    } finally {
      setActionLoading(false);
    }
  }, [confirmAction, member.id, onChangeRole, onRemoveMember]);

  const roleMenuItems: { label: string; role: 'ADMIN' | 'MEMBER' | 'VIEWER' }[] = [];
  if (canChangeRole) {
    if (member.role !== 'ADMIN') roleMenuItems.push({ label: t('groups.makeAdmin'), role: 'ADMIN' });
    if (member.role !== 'MEMBER') roleMenuItems.push({ label: t('groups.makeMember'), role: 'MEMBER' });
    if (member.role !== 'VIEWER') roleMenuItems.push({ label: t('groups.makeViewer'), role: 'VIEWER' });
  }

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3" data-testid={`member-row-${member.userId}`}>
        {/* Avatar */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
          {initial}
        </div>

        {/* Name + Email */}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">{memberName}</div>
          {memberEmail && (
            <div className="truncate text-xs text-muted-foreground">{memberEmail}</div>
          )}
        </div>

        {/* Role badge */}
        <span
          data-testid={`role-badge-${member.userId}`}
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${ROLE_BADGE_STYLES[member.role] || ROLE_BADGE_STYLES.VIEWER}`}
        >
          {t(ROLE_KEYS[member.role] || ROLE_KEYS.VIEWER)}
        </span>

        {/* Action menu */}
        {hasActions && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              data-testid={`member-actions-${member.userId}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"
            >
              <Icon name="more_vert" size={20} color="var(--color-muted-foreground)" />
            </button>

            {menuOpen && (
              <PopoverWrapper
                onClose={() => setMenuOpen(false)}
                className="!left-auto right-0 min-w-[180px] py-1"
              >
                {roleMenuItems.map((item) => (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmAction({ type: 'role', newRole: item.role });
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted"
                  >
                    {item.label}
                  </button>
                ))}
                {canRemove && roleMenuItems.length > 0 && (
                  <div className="my-1 border-t border-border" />
                )}
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmAction({ type: 'remove' });
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-muted"
                  >
                    {t('groups.removeMember')}
                  </button>
                )}
              </PopoverWrapper>
            )}
          </div>
        )}
      </div>

      {/* Confirm dialog for role change */}
      {confirmAction?.type === 'role' && confirmAction.newRole && (
        <ConfirmDialog
          open
          title={t('groups.changeRole')}
          description={t('groups.changeRoleConfirm', {
            memberName,
            newRole: t(ROLE_KEYS[confirmAction.newRole]),
          })}
          confirmLabel={t('groups.changeMemberRole')}
          variant="primary"
          isLoading={actionLoading}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Confirm dialog for removal */}
      {confirmAction?.type === 'remove' && (
        <ConfirmDialog
          open
          title={t('groups.removeMemberTitle')}
          description={t('groups.removeMemberConfirm', { memberName })}
          confirmLabel={t('groups.removeMember')}
          variant="destructive"
          isLoading={actionLoading}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  );
}
