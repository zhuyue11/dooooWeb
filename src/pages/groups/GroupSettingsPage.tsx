import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';

export function GroupSettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <Icon name="settings" size={48} color="var(--color-muted-foreground)" />
      <span className="text-base font-medium text-foreground">{t('groups.navSettings', 'Settings')}</span>
      <span className="text-sm">{t('groups.moreFeaturesComing')}</span>
    </div>
  );
}
