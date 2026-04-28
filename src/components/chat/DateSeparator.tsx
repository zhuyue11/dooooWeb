import { useTranslation } from 'react-i18next';

interface DateSeparatorProps {
  date: string;
}

export function DateSeparator({ date }: DateSeparatorProps) {
  const { t } = useTranslation();

  const label = getDateLabel(date, t);

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-px flex-1 bg-(--el-card-border)" />
      <span className="text-xs font-medium text-(--el-chat-timestamp)">{label}</span>
      <div className="h-px flex-1 bg-(--el-card-border)" />
    </div>
  );
}

function getDateLabel(
  isoDate: string,
  t: (key: string) => string,
): string {
  const date = new Date(isoDate);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return t('chat.today');
  if (diffDays === 1) return t('chat.yesterday');

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}
