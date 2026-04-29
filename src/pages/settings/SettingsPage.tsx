import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/lib/contexts/theme-context';
import { useLanguage, SUPPORTED_LANGUAGES } from '@/lib/contexts/language-context';
import { useAuth } from '@/lib/contexts/auth-context';

interface SettingsItem {
  path: string;
  icon: string;
  labelKey: string;
  rightValue?: string;
}

interface SettingsSection {
  titleKey: string;
  items: SettingsItem[];
}

function useThemeName() {
  const { t } = useTranslation();
  const { themePattern, colorPalette } = useTheme();

  if (colorPalette) {
    const paletteKeys: Record<string, string> = {
      ocean: 'themeSettings.paletteOcean',
      yellow: 'themeSettings.paletteYellow',
      pink: 'themeSettings.palettePink',
      warm: 'themeSettings.paletteWarm',
      earth: 'themeSettings.paletteEarth',
      fresh: 'themeSettings.paletteFresh',
    };
    return t(paletteKeys[colorPalette] || colorPalette);
  }

  const patternKeys: Record<string, string> = {
    system: 'themeSettings.patternSystem',
    auto: 'themeSettings.patternAuto',
    light: 'themeSettings.patternLight',
    dark: 'themeSettings.patternDark',
  };
  return t(patternKeys[themePattern] || 'themeSettings.patternSystem');
}

function useLanguageName() {
  const { language } = useLanguage();
  const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === language);
  return langInfo?.nativeName || language;
}

export function SettingsPage() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const themeName = useThemeName();
  const languageName = useLanguageName();

  const sections: SettingsSection[] = [
    {
      titleKey: 'settings.sectionAccount',
      items: [
        { path: '/settings/profile', icon: 'person', labelKey: 'settings.profile' },
        { path: '/settings/account', icon: 'info', labelKey: 'settings.account' },
      ],
    },
    {
      titleKey: 'settings.sectionAppearance',
      items: [
        { path: '/settings/theme', icon: 'palette', labelKey: 'settings.theme', rightValue: themeName },
        { path: '/settings/language', icon: 'language', labelKey: 'settings.language', rightValue: languageName },
        { path: '/settings/font', icon: 'text_fields', labelKey: 'settings.font' },
        { path: '/settings/display', icon: 'display_settings', labelKey: 'settings.display' },
      ],
    },
    {
      titleKey: 'settings.sectionNotifications',
      items: [
        { path: '/settings/notifications', icon: 'notifications', labelKey: 'settings.notifications' },
      ],
    },
    {
      titleKey: 'settings.sectionGroupsCollaboration',
      items: [
        { path: '/groups', icon: 'group', labelKey: 'settings.groups' },
      ],
    },
    {
      titleKey: 'settings.sectionProductivity',
      items: [
        { path: '/settings/goals', icon: 'flag', labelKey: 'settings.goals' },
        { path: '/statistics', icon: 'analytics', labelKey: 'settings.statistics' },
        { path: '/settings/activity-history', icon: 'history', labelKey: 'settings.activityHistory' },
      ],
    },
    {
      titleKey: 'settings.sectionSettings',
      items: [
        { path: '/settings/task-defaults', icon: 'task', labelKey: 'settings.taskDefaults' },
        { path: '/settings/calendar', icon: 'calendar_today', labelKey: 'settings.calendarSettings' },
        { path: '/settings/privacy', icon: 'security', labelKey: 'settings.privacy' },
        { path: '/settings/data-management', icon: 'storage', labelKey: 'settings.dataManagement' },
      ],
    },
    {
      titleKey: 'settings.sectionSupport',
      items: [
        { path: '/settings/help', icon: 'help', labelKey: 'settings.help' },
        { path: '/settings/feedback', icon: 'feedback', labelKey: 'settings.feedback' },
        { path: '/settings/report-bug', icon: 'bug_report', labelKey: 'settings.reportBug' },
        { path: '/settings/about', icon: 'info', labelKey: 'settings.about' },
      ],
    },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-(--el-page-text)">
        {t('settings.title')}
      </h1>

      <div className="grid grid-cols-1 items-start gap-(--spacing-section) md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <div
            key={section.titleKey}
            className="rounded-(--radius-card) border border-(--el-settings-border) bg-(--el-settings-bg)"
          >
            <div className="px-4 pt-4 pb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-(--el-settings-label)">
                {t(section.titleKey)}
              </span>
            </div>

            <div className="divide-y divide-(--el-settings-border)">
              {section.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-(--el-page-text) transition-colors hover:bg-(--el-settings-hover)"
                >
                  <Icon name={item.icon} size={20} color="var(--el-settings-label)" />
                  <span className="flex-1">{t(item.labelKey)}</span>
                  {item.rightValue && (
                    <span className="text-xs text-(--el-settings-label)">{item.rightValue}</span>
                  )}
                  <Icon name="chevron_right" size={18} color="var(--el-settings-label)" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-(--spacing-section) flex justify-center">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-(--radius-btn) bg-(--el-btn-destructive-bg) px-(--spacing-btn-x) py-(--spacing-btn-y) text-sm font-medium text-(--el-btn-destructive-text) transition-colors hover:opacity-90"
        >
          <Icon name="logout" size={18} color="var(--el-btn-destructive-text)" />
          {t('auth.logout')}
        </button>
      </div>
    </div>
  );
}
