import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import type { TargetPlan } from '@/types/target';

interface LinkedPlanCardProps {
  targetPlan: TargetPlan;
  onNavigate: (planId: string) => void;
  onUnlink: (planId: string, planName: string) => void;
}

export function LinkedPlanCard({ targetPlan, onNavigate, onUnlink }: LinkedPlanCardProps) {
  const { t } = useTranslation();

  const plan = targetPlan.plan;
  const planName = plan?.name || t('targetPlan.unknownPlan');
  const templateCount = plan?.taskTemplates?.length || 0;

  return (
    <div
      className="group flex cursor-pointer items-center gap-3 rounded-(--radius-card) border border-border bg-surface px-(--spacing-card) py-3.5 transition-all duration-(--transition-duration) hover:shadow-(--shadow-card-hover)"
      onClick={() => onNavigate(targetPlan.planId)}
      data-testid={`plan-card-${targetPlan.planId}`}
    >
      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
        <span className="truncate text-[15px] font-semibold text-foreground">{planName}</span>
        {plan?.description && (
          <span className="truncate text-[13px] text-muted-foreground">{plan.description}</span>
        )}
        <span className="text-[13px] text-muted-foreground">
          {templateCount} {t('targetPlan.templates')}
        </span>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onUnlink(targetPlan.planId, planName);
        }}
        className="flex h-(--btn-height-sm) w-8 shrink-0 items-center justify-center rounded-(--radius-btn) text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        data-testid={`unlink-plan-${targetPlan.planId}`}
        title={t('targetPlan.unlinkPlan')}
      >
        <Icon name="link_off" size={18} />
      </button>

      <Icon name="chevron_right" size={20} color="var(--color-muted-foreground)" />
    </div>
  );
}
