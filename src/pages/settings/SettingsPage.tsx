import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Info, Palette, Globe, Monitor, Bell, Shield, HelpCircle, FileText } from 'lucide-react';

const SETTINGS_ITEMS = [
  { path: '/settings/profile', icon: User, labelKey: 'settings.profile' },
  { path: '/settings/account', icon: Info, labelKey: 'settings.account' },
  { path: '/settings/theme', icon: Palette, labelKey: 'settings.theme' },
  { path: '/settings/language', icon: Globe, labelKey: 'settings.language' },
  { path: '/settings/display', icon: Monitor, labelKey: 'settings.display' },
  { path: '/settings/notifications', icon: Bell, labelKey: 'settings.notifications' },
  { path: '/settings/privacy', icon: Shield, labelKey: 'settings.privacy' },
  { path: '/settings/help', icon: HelpCircle, labelKey: 'settings.help' },
  { path: '/settings/about', icon: FileText, labelKey: 'settings.about' },
] as const;

export function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-foreground">
        {t('settings.title', 'Settings')}
      </h1>
      <div className="divide-y divide-border rounded-xl border border-border bg-surface">
        {SETTINGS_ITEMS.map(({ path, icon: Icon, labelKey }) => (
          <Link
            key={path}
            to={path}
            className="flex items-center gap-3 px-4 py-3 text-sm text-foreground transition-colors hover:bg-muted"
          >
            <Icon size={20} className="text-muted-foreground" />
            <span>{t(labelKey, labelKey.split('.').pop())}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
