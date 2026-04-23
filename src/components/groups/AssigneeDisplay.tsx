import { Icon } from '@/components/ui/Icon';
import { useTranslation } from 'react-i18next';

interface AssigneeDisplayProps {
  assigneeName: string;
  assigneeId?: string | null;
  currentUserId?: string;
}

export function AssigneeDisplay({ assigneeName, assigneeId, currentUserId }: AssigneeDisplayProps) {
  const { t } = useTranslation();
  const isSelf = assigneeId && assigneeId === currentUserId;

  return (
    <div className="flex items-center gap-3 px-4 py-3" data-testid="assignee-display">
      <Icon name="person" size={18} color="var(--color-muted-foreground)" />
      <span className="w-20 shrink-0 text-[13px] text-muted-foreground">{t('tasks.input.selectAssignee')}</span>
      <span className="text-[13px] font-medium text-foreground">
        {assigneeName}
        {isSelf && (
          <span className="ml-1 text-xs text-muted-foreground">({t('common.you')})</span>
        )}
      </span>
    </div>
  );
}
