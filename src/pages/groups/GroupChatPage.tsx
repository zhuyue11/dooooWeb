import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';

export function GroupChatPage() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <Icon name="chat" size={48} color="var(--color-muted-foreground)" />
      <span className="text-base font-medium text-foreground">{t('groups.navChat', 'Chat')}</span>
      <span className="text-sm">{t('groups.moreFeaturesComing')}</span>
    </div>
  );
}
