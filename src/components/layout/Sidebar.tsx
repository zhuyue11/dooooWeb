import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home,
  Calendar,
  ListTodo,
  Users,
  FileText,
  Target,
  BarChart3,
  Settings,
  Bell,
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import logo from '@/assets/logo-36.svg';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { path: '/home', icon: Home, labelKey: 'navigation.dashboard' },
  { path: '/calendar', icon: Calendar, labelKey: 'navigation.calendar' },
  { path: '/todo', icon: ListTodo, labelKey: 'navigation.todo' },
  { path: '/groups', icon: Users, labelKey: 'navigation.groups' },
  { path: '/plans', icon: FileText, labelKey: 'navigation.plans' },
  { path: '/targets', icon: Target, labelKey: 'navigation.targets' },
  { path: '/statistics', icon: BarChart3, labelKey: 'navigation.statistics' },
  { path: '/settings', icon: Settings, labelKey: 'navigation.settings' },
] as const;

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-[var(--sidebar-width)] flex-col border-r border-border bg-surface transition-transform duration-200 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 px-4">
          <img src={logo} alt="doooo" className="h-8 w-8" />
          <span className="text-lg font-bold text-foreground">DOOOO</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {NAV_ITEMS.map(({ path, icon: Icon, labelKey }) => (
            <NavLink
              key={path}
              to={path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <Icon size={20} />
              <span>{t(labelKey, labelKey.split('.').pop())}</span>
            </NavLink>
          ))}
        </nav>

        {/* Notifications link */}
        <div className="border-t border-border px-2 py-2">
          <NavLink
            to="/notifications"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`
            }
          >
            <Bell size={20} />
            <span>{t('navigation.notifications', 'Notifications')}</span>
          </NavLink>
        </div>

        {/* User info */}
        {user && (
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{user.name || user.email}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
