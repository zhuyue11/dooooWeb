import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';

const SETTINGS_ITEMS = [
  { path: '/settings/profile', icon: 'person', labelKey: 'settings.profile' },
  { path: '/settings/account', icon: 'info', labelKey: 'settings.account' },
  { path: '/settings/theme', icon: 'palette', labelKey: 'settings.theme' },
  { path: '/settings/language', icon: 'language', labelKey: 'settings.language' },
  { path: '/settings/display', icon: 'monitor', labelKey: 'settings.display' },
  { path: '/settings/notifications', icon: 'notifications', labelKey: 'settings.notifications' },
  { path: '/settings/privacy', icon: 'shield', labelKey: 'settings.privacy' },
  { path: '/settings/help', icon: 'help', labelKey: 'settings.help' },
  { path: '/settings/about', icon: 'description', labelKey: 'settings.about' },
] as const;

export function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-(--el-page-text)">
        {t('settings.title', 'Settings')}
      </h1>
      <div className="divide-y divide-(--el-settings-border) rounded-(--radius-card) border border-(--el-settings-border) bg-(--el-settings-bg)">
        {SETTINGS_ITEMS.map(({ path, icon, labelKey }) => (
          <Link
            key={path}
            to={path}
            className="flex items-center gap-3 px-4 py-3 text-sm text-(--el-page-text) transition-colors hover:bg-(--el-settings-hover)"
          >
            <Icon name={icon} size={20} color="var(--el-settings-label)" />
            <span>{t(labelKey, labelKey.split('.').pop())}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
