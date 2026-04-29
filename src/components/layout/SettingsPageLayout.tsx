import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';

interface SettingsPageLayoutProps {
  title: string;
  children: React.ReactNode;
}

export function SettingsPageLayout({ title, children }: SettingsPageLayoutProps) {
  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Link
          to="/settings"
          className="flex items-center justify-center rounded-(--radius-btn) p-1 text-(--el-page-text) opacity-60 transition-colors hover:bg-(--el-settings-hover) hover:opacity-100"
        >
          <Icon name="arrow_back" size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-(--el-page-text)">{title}</h1>
      </div>
      {children}
    </div>
  );
}
