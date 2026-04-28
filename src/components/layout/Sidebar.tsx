import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/contexts/auth-context';
import { useUnreadMessages } from '@/lib/contexts/unread-messages-context';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';

export interface GroupContext {
  groupId: string;
  groupName: string;
  groupColor?: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  groupContext?: GroupContext | null;
}

const NAV_ITEMS = [
  { path: '/home', icon: 'dashboard', labelKey: 'navigation.dashboard', fallback: 'Dashboard' },
  { path: '/todo', icon: 'checklist', labelKey: 'navigation.todo', fallback: 'To-do' },
  { path: '/calendar', icon: 'calendar_today', labelKey: 'navigation.calendar', fallback: 'Calendar' },
  { path: '/groups', icon: 'group', labelKey: 'navigation.groups', fallback: 'Groups' },
  { path: '/plans', icon: 'description', labelKey: 'navigation.plans', fallback: 'Plans' },
  { path: '/targets', icon: 'track_changes', labelKey: 'navigation.targets', fallback: 'Targets' },
  { path: '/statistics', icon: 'trending_up', labelKey: 'navigation.statistics', fallback: 'Statistics' },
  { path: '/settings', icon: 'settings', labelKey: 'navigation.settings', fallback: 'Settings' },
] as const;

const GROUP_NAV_ITEMS = [
  { path: 'tasks', icon: 'checklist', labelKey: 'navigation.todo', fallback: 'To-do' },
  { path: 'calendar', icon: 'calendar_today', labelKey: 'groups.navCalendar', fallback: 'Calendar' },
  { path: 'chat', icon: 'chat', labelKey: 'groups.navChat', fallback: 'Chat' },
  { path: 'members', icon: 'group', labelKey: 'groups.navMembers', fallback: 'Members' },
  { path: 'settings', icon: 'settings', labelKey: 'groups.navSettings', fallback: 'Settings' },
] as const;

export function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse, groupContext }: SidebarProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const width = collapsed
    ? 'w-[var(--sidebar-collapsed-width)]'
    : 'w-[var(--sidebar-width)]';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar wrapper — relative so the handle can be positioned outside */}
      <div className="relative flex-shrink-0">
        <aside
          className={`fixed left-0 top-0 z-50 flex h-full flex-col border-r border-border bg-surface transition-all duration-200 lg:static lg:translate-x-0 ${width} ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {groupContext ? (
            <GroupSidebarContent
              groupContext={groupContext}
              collapsed={collapsed}
              onClose={onClose}
              user={user}
            />
          ) : (
            <MainSidebarContent
              collapsed={collapsed}
              onClose={onClose}
              onToggleCollapse={onToggleCollapse}
              user={user}
            />
          )}
        </aside>

        {/* Expand handle — visible only when collapsed, on desktop */}
        {collapsed && !groupContext && (
          <button
            onClick={onToggleCollapse}
            className="absolute right-0 top-1/2 z-50 hidden -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-border bg-surface shadow-sm transition-colors hover:bg-muted lg:flex"
            style={{ width: 24, height: 24 }}
            title="Expand sidebar"
          >
            <Icon name="chevron_right" size={16} />
          </button>
        )}
      </div>
    </>
  );
}

// ── Main sidebar (default app navigation) ──

function MainSidebarContent({
  collapsed,
  onClose,
  onToggleCollapse,
  user,
}: {
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  user: { name?: string; email: string } | null;
}) {
  const { t } = useTranslation();
  const { totalUnread } = useUnreadMessages();
  const { data: notificationUnread = 0 } = useUnreadNotificationCount();

  return (
    <>
      {/* Header */}
      <div className={`flex h-16 items-center ${collapsed ? 'justify-center px-0' : 'justify-between px-6'}`}>
        <Logo
          size={collapsed ? 28 : 36}
          className={`flex-shrink-0 transition-transform duration-200 ${collapsed ? '-scale-x-100' : ''}`}
        />
        {!collapsed && (
          <div className="flex items-center gap-1">
            <NavLink
              to="/search"
              onClick={onClose}
              data-testid="sidebar-search-button"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Icon name="search" size={20} />
            </NavLink>
            <NavLink
              to="/notifications"
              onClick={onClose}
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Icon name="notifications" size={20} />
              {notificationUnread > 0 && (
                <span data-testid="notification-badge" className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                  {notificationUnread > 99 ? '99+' : notificationUnread}
                </span>
              )}
            </NavLink>
            <button
              onClick={onToggleCollapse}
              className="hidden h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:flex"
              title="Collapse sidebar"
            >
              <Icon name="left_panel_close" size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto py-2 ${collapsed ? 'px-2' : 'px-3'}`}>
        <div className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ path, icon, labelKey, fallback }) => {
            const showBadge = path === '/groups' && totalUnread > 0;
            return (
              <NavLink
                key={path}
                to={path}
                onClick={onClose}
                title={collapsed ? t(labelKey, fallback) : undefined}
                className={({ isActive }) =>
                  `flex h-10 items-center gap-3 rounded-lg text-sm transition-colors ${
                    collapsed ? 'justify-center px-0' : 'px-4'
                  } ${
                    isActive
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'font-medium text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="relative">
                      <Icon name={icon} size={20} color={isActive ? 'var(--color-primary)' : undefined} />
                      {showBadge && collapsed && (
                        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                          {totalUnread > 99 ? '99+' : totalUnread}
                        </span>
                      )}
                    </span>
                    {!collapsed && (
                      <>
                        <span className="flex-1">{t(labelKey, fallback)}</span>
                        {showBadge && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-white">
                            {totalUnread > 99 ? '99+' : totalUnread}
                          </span>
                        )}
                      </>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* User info */}
      <SidebarFooter user={user} collapsed={collapsed} />
    </>
  );
}

// ── Group sidebar (when inside a group) ──

function GroupSidebarContent({
  groupContext,
  collapsed,
  onClose,
  user,
}: {
  groupContext: GroupContext;
  collapsed: boolean;
  onClose: () => void;
  user: { name?: string; email: string } | null;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCounts } = useUnreadMessages();
  const basePath = `/groups/${groupContext.groupId}`;
  const chatUnread = unreadCounts[groupContext.groupId] || 0;

  return (
    <>
      {/* Group header: back + color dot + name */}
      <div className={`flex h-16 items-center gap-2 ${collapsed ? 'justify-center px-2' : 'px-4'}`}>
        <button
          type="button"
          onClick={() => navigate('/groups')}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          data-testid="group-sidebar-back"
        >
          <Icon name="arrow_back" size={20} />
        </button>
        {!collapsed && (
          <>
            <div
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: groupContext.groupColor || '#360EFF' }}
            />
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">
              {groupContext.groupName}
            </span>
          </>
        )}
      </div>

      {/* Group navigation */}
      <nav className={`flex-1 overflow-y-auto py-2 ${collapsed ? 'px-2' : 'px-3'}`}>
        <div className="flex flex-col gap-0.5">
          {GROUP_NAV_ITEMS.map(({ path, icon, labelKey, fallback }) => {
            const fullPath = `${basePath}/${path}`;
            const isActive = location.pathname === fullPath || location.pathname.startsWith(`${fullPath}/`);
            const showChatBadge = path === 'chat' && chatUnread > 0;

            return (
              <NavLink
                key={path}
                to={fullPath}
                onClick={onClose}
                title={collapsed ? t(labelKey, fallback) : undefined}
                className={`flex h-10 items-center gap-3 rounded-lg text-sm transition-colors ${
                  collapsed ? 'justify-center px-0' : 'px-4'
                } ${
                  isActive
                    ? 'bg-primary/10 font-semibold text-primary'
                    : 'font-medium text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span className="relative">
                  <Icon name={icon} size={20} color={isActive ? 'var(--color-primary)' : undefined} />
                  {showChatBadge && collapsed && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                      {chatUnread > 99 ? '99+' : chatUnread}
                    </span>
                  )}
                </span>
                {!collapsed && (
                  <>
                    <span className="flex-1">{t(labelKey, fallback)}</span>
                    {showChatBadge && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-white">
                        {chatUnread > 99 ? '99+' : chatUnread}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* User info */}
      <SidebarFooter user={user} collapsed={collapsed} />
    </>
  );
}

// ── Shared footer ──

function SidebarFooter({ user, collapsed }: { user: { name?: string; email: string } | null; collapsed: boolean }) {
  if (!user) return null;
  return (
    <div className={`border-t border-border ${collapsed ? 'px-2' : 'px-4'}`}>
      <div className={`flex h-14 items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
        </div>
        {!collapsed && (
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {user.name || user.email}
          </p>
        )}
      </div>
    </div>
  );
}
