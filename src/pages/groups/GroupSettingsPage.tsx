import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getGroup, getGroupPreferences, updateGroupPreferences } from '@/lib/api';
import type { GroupMemberPreferences } from '@/types/api';
import { Icon } from '@/components/ui/Icon';
import { Switch } from '@/components/ui/Switch';

export function GroupSettingsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: groupData } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => getGroup(groupId!),
    enabled: !!groupId,
  });

  const { data: preferences, isLoading, isError } = useQuery({
    queryKey: ['group-preferences', groupId],
    queryFn: () => getGroupPreferences(groupId!),
    enabled: !!groupId,
  });

  const [muteMessages, setMuteMessages] = useState(false);
  const [muteTasks, setMuteTasks] = useState(false);
  const [isStarred, setIsStarred] = useState(false);

  useEffect(() => {
    if (preferences) {
      setMuteMessages(preferences.muteMessages);
      setMuteTasks(preferences.muteTasks);
      setIsStarred(preferences.isStarred);
    }
  }, [preferences]);

  const handleToggle = async (
    key: keyof GroupMemberPreferences,
    value: boolean,
    setter: (v: boolean) => void,
  ) => {
    if (!groupId) return;

    setter(value);
    try {
      await updateGroupPreferences(groupId, { [key]: value });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    } catch {
      setter(!value);
    }
  };

  const groupColor = groupData?.group.color || '#3B82F6';

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center" data-testid="preferences-loading">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <Icon name="error" size={32} color="var(--color-destructive)" />
        <span className="text-sm">{t('groups.failedToLoadPreferences')}</span>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-6">
      <h1 className="mb-6 text-xl font-semibold text-foreground">{t('groups.navSettings')}</h1>

      <div className="divide-y divide-border rounded-(--radius-card) border border-border bg-surface">
        {/* Mute Messages */}
        <div className="flex items-center justify-between gap-4 px-5 py-4" data-testid="preference-mute-messages">
          <div className="flex items-center gap-4">
            <Icon
              name={muteMessages ? 'notifications_off' : 'chat'}
              size={24}
              color="var(--color-foreground)"
            />
            <div>
              <div className="text-sm font-medium text-foreground">{t('groups.muteMessages')}</div>
              <div className="text-xs text-muted-foreground">{t('groups.muteMessagesDesc')}</div>
            </div>
          </div>
          <Switch
            checked={muteMessages}
            onChange={(v) => handleToggle('muteMessages', v, setMuteMessages)}
            activeColor={groupColor}
          />
        </div>

        {/* Mute Tasks */}
        <div className="flex items-center justify-between gap-4 px-5 py-4" data-testid="preference-mute-tasks">
          <div className="flex items-center gap-4">
            <Icon
              name={muteTasks ? 'notifications_off' : 'task_alt'}
              size={24}
              color="var(--color-foreground)"
            />
            <div>
              <div className="text-sm font-medium text-foreground">{t('groups.muteTasks')}</div>
              <div className="text-xs text-muted-foreground">{t('groups.muteTasksDesc')}</div>
            </div>
          </div>
          <Switch
            checked={muteTasks}
            onChange={(v) => handleToggle('muteTasks', v, setMuteTasks)}
            activeColor={groupColor}
          />
        </div>

        {/* Star Group */}
        <div className="flex items-center justify-between gap-4 px-5 py-4" data-testid="preference-star-group">
          <div className="flex items-center gap-4">
            <Icon
              name="star"
              size={24}
              filled={isStarred}
              color={isStarred ? 'var(--color-accent)' : 'var(--color-foreground)'}
            />
            <div>
              <div className="text-sm font-medium text-foreground">{t('groups.starGroup')}</div>
              <div className="text-xs text-muted-foreground">{t('groups.starGroupDesc')}</div>
            </div>
          </div>
          <Switch
            checked={isStarred}
            onChange={(v) => handleToggle('isStarred', v, setIsStarred)}
            activeColor="var(--color-accent)"
          />
        </div>
      </div>

      {/* Info callout */}
      <div className="mt-4 flex items-start gap-3 rounded-(--radius-card) bg-muted/50 px-4 py-3" data-testid="preferences-info">
        <Icon name="info" size={18} color="var(--color-muted-foreground)" />
        <span className="text-xs text-muted-foreground">{t('groups.preferencesInfo')}</span>
      </div>
    </div>
  );
}
