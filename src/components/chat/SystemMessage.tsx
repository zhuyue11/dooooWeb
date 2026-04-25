import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import type { GroupMessage } from '@/types/api';

interface SystemMessageProps {
  message: GroupMessage;
  groupColor?: string;
}

export function SystemMessage({ message, groupColor }: SystemMessageProps) {
  const { t } = useTranslation();

  const content = getTranslatedContent(message, t);
  const iconName = getIconForContent(message.content);
  const accentColor = groupColor || 'var(--color-primary)';

  const time = new Date(message.createdAt).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="flex justify-center py-1" data-testid="system-message">
      <div
        className="flex max-w-[85%] items-center gap-2 rounded-xl border px-3 py-1.5"
        style={{ borderColor: `color-mix(in srgb, ${accentColor} 30%, transparent)` }}
      >
        <Icon name={iconName} size={16} color={accentColor} />
        <span className="text-xs text-muted-foreground">{content}</span>
        <span className="shrink-0 text-[10px] text-muted-foreground">{time}</span>
      </div>
    </div>
  );
}

function getTranslatedContent(
  message: GroupMessage,
  t: (key: string, params?: Record<string, unknown>) => string,
): string {
  if (message.content.startsWith('system.')) {
    const params: Record<string, unknown> = {};

    if (message.attachments) {
      const a = message.attachments as Record<string, unknown>;
      if (a.userName) params.userName = a.userName;
      if (a.taskTitle) params.taskTitle = a.taskTitle;
      if (a.assigneeName) params.assigneeName = a.assigneeName;
      if (a.groupName) params.groupName = a.groupName;
      if (a.roleName) params.roleName = a.roleName;
      if (a.repeatPattern) params.repeatPattern = a.repeatPattern;
    }

    if (message.user?.name) {
      params.userName = params.userName || message.user.name;
    }

    const translated = t(message.content, params);
    // If translation returns the key itself, it's untranslated — show a fallback
    if (translated === message.content) {
      return message.content.replace('system.', '').replace(/_/g, ' ');
    }
    return translated;
  }

  return message.content;
}

function getIconForContent(content: string): string {
  if (content.includes('created')) return 'add_circle';
  if (content.includes('deleted') || content.includes('removed')) return 'remove_circle';
  if (content.includes('updated') || content.includes('edited') || content.includes('changed')) return 'edit';
  if (content.includes('joined') || content.includes('accepted')) return 'group_add';
  if (content.includes('left') || content.includes('declined')) return 'group_remove';
  if (content.includes('role')) return 'admin_panel_settings';
  if (content.includes('canceled') || content.includes('cancelled')) return 'cancel';
  if (content.includes('completed')) return 'check_circle';
  return 'info';
}
