import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import type { Target, TargetStatus } from '@/types/target';

interface TargetCardProps {
  target: Target;
  onClick: () => void;
}

const STATUS_CONFIG: Record<TargetStatus, { icon: string; colorVar: string }> = {
  active: { icon: 'flag', colorVar: 'var(--color-primary)' },
  completed: { icon: 'check_circle', colorVar: '#10B981' },
  archived: { icon: 'archive', colorVar: 'var(--color-muted-foreground)' },
};

export function TargetCard({ target, onClick }: TargetCardProps) {
  const { t } = useTranslation();

  const statusLabel: Record<TargetStatus, string> = {
    active: t('targetPlan.statusActive'),
    completed: t('targetPlan.statusCompleted'),
    archived: t('targetPlan.statusArchived'),
  };

  const config = STATUS_CONFIG[target.status];

  return (
    <div
      className="flex cursor-pointer items-center gap-3 rounded-2xl bg-surface px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-md"
      onClick={onClick}
      data-testid={`target-card-${target.id}`}
    >
      <div className="flex flex-1 flex-col gap-1.5">
        {/* Header: name + status badge */}
        <div className="flex items-center justify-between gap-3">
          <span className="flex-1 text-base font-semibold text-foreground">{target.name}</span>
          <div
            className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: config.colorVar + '18', color: config.colorVar }}
          >
            <Icon name={config.icon} size={14} color={config.colorVar} />
            {statusLabel[target.status]}
          </div>
        </div>

        {/* Description */}
        {target.description && (
          <p className="line-clamp-2 text-[13px] text-muted-foreground">{target.description}</p>
        )}
      </div>

      <Icon name="chevron_right" size={22} color="var(--color-primary)" />
    </div>
  );
}
