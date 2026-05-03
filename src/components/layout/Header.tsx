import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { Logo } from '@/components/ui/Logo';

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const navigate = useNavigate();
  const { data: notificationUnread = 0 } = useUnreadNotificationCount();

  return (
    <header className="flex h-14 items-center gap-3 border-b border-(--el-header-border) bg-(--el-header-bg) px-4 lg:hidden">
      <button
        onClick={onMenuToggle}
        className="flex h-9 w-9 items-center justify-center rounded-(--radius-card) text-(--el-header-icon) hover:bg-(--el-header-icon-hover-bg) hover:text-(--el-header-text)"
      >
        <Icon name="menu" size={20} />
      </button>

      <div className="flex flex-1 items-center gap-2">
        <Logo size={24} />
        <span className="text-base font-bold text-(--el-header-text)">Doooo</span>
      </div>

      <button
        onClick={() => navigate('/notifications')}
        className="relative flex h-9 w-9 items-center justify-center rounded-(--radius-card) text-(--el-header-icon) hover:bg-(--el-header-icon-hover-bg) hover:text-(--el-header-text)"
      >
        <Icon name="notifications" size={20} />
        {notificationUnread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-(--el-header-badge-bg) px-1 text-[10px] font-bold text-(--el-header-badge-text)">
            {notificationUnread > 99 ? '99+' : notificationUnread}
          </span>
        )}
      </button>
    </header>
  );
}
