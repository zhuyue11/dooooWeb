import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/contexts/auth-context';
import { Icon } from '@/components/ui/Icon';
import logo from '@/assets/logo-36.svg';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
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

export function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) {
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
          {/* Header */}
          <div className={`flex h-16 items-center ${collapsed ? 'justify-center px-0' : 'justify-between px-6'}`}>
            <img
              src={logo}
              alt="doooo"
              className={`flex-shrink-0 transition-transform duration-200 ${collapsed ? 'h-7 w-7 -scale-x-100' : 'h-9 w-9'}`}
            />
            {!collapsed && (
              <div className="flex items-center gap-1">
                <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                  <Icon name="search" size={20} />
                </button>
                <NavLink
                  to="/notifications"
                  onClick={onClose}
                  className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Icon name="notifications" size={20} />
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
              {NAV_ITEMS.map(({ path, icon, labelKey, fallback }) => (
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
                      <Icon name={icon} size={20} color={isActive ? 'var(--color-primary)' : undefined} />
                      {!collapsed && <span>{t(labelKey, fallback)}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </nav>

          {/* User info */}
          {user && (
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
          )}
        </aside>

        {/* Expand handle — visible only when collapsed, on desktop */}
        {collapsed && (
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
