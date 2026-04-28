import DOMPurify from 'dompurify';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import type { Plan, PlanExecution, PlanListItem, PlanFilter } from '@/types/target';

interface PlanCardProps {
  item: PlanListItem;
  planFilter: PlanFilter;
  planById: Map<string, Plan>;
  onClick: () => void;
}

function StatusBadge({ label, color, icon }: { label: string; color: string; icon: string }) {
  return (
    <div
      className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: color + '18', color }}
    >
      <Icon name={icon} size={14} color={color} />
      {label}
    </div>
  );
}

export function PlanCard({ item, planFilter, planById, onClick }: PlanCardProps) {
  if (item.kind === 'execution') {
    return <ExecutionCard exec={item.data} planById={planById} onClick={onClick} />;
  }

  return <PlanItemCard plan={item.data} planFilter={planFilter} onClick={onClick} />;
}

function ExecutionCard({
  exec,
  planById,
  onClick,
}: {
  exec: PlanExecution;
  planById: Map<string, Plan>;
  onClick: () => void;
}) {
  const { t } = useTranslation();

  const progress = exec.totalCount > 0 ? exec.completedCount / exec.totalCount : 0;
  const pct = Math.round(progress * 100);

  const statusColor = exec.status === 'COMPLETED' ? '#10B981' : 'var(--el-plan-progress-bar)';
  const statusLabel =
    exec.status === 'COMPLETED'
      ? t('targetPlan.completed', 'Completed')
      : t('targetPlan.inProgress', 'In Progress');
  const statusIcon = exec.status === 'COMPLETED' ? 'check_circle' : 'play_circle';

  const isCourse = planById.get(exec.planId)?.archetype === 'skill_learning';

  return (
    <div
      className="flex cursor-pointer items-center gap-3 rounded-(--radius-card) bg-(--el-plan-bg) px-5 py-4 shadow-(--shadow-card) transition-shadow hover:shadow-(--shadow-card-hover)"
      onClick={onClick}
      data-testid={`execution-card-${exec.id}`}
    >
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="flex-1 text-base font-semibold text-(--el-plan-title)">{exec.planName}</span>
          <div className="flex shrink-0 items-center gap-1.5">
            {isCourse && (
              <StatusBadge
                label={t('targetPlan.course', 'Course')}
                color="var(--el-plan-progress-bar)"
                icon="school"
              />
            )}
            <StatusBadge label={statusLabel} color={statusColor} icon={statusIcon} />
          </div>
        </div>

        {exec.planDescription && (
          <div
            className="line-clamp-1 text-[13px] text-(--el-plan-description) [&_*]:inline [&_br]:hidden [&_li]:before:content-['·_']"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(exec.planDescription) }}
          />
        )}

        <div className="mt-1 h-1 overflow-hidden rounded-full bg-(--el-plan-progress-track)">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${pct}%`, backgroundColor: statusColor }}
            role="progressbar"
            aria-valuenow={exec.completedCount}
            aria-valuemax={exec.totalCount}
          />
        </div>
        <span className="text-xs text-(--el-plan-progress-text)">{pct}%</span>
      </div>

      <Icon name="chevron_right" size={22} color="var(--el-plan-chevron)" />
    </div>
  );
}

function getPlanStatusInfo(
  plan: Plan,
  planFilter: PlanFilter,
  t: (key: string, defaultValue: string) => string,
): { label: string; color: string; icon: string } {
  const execs = plan.executionStatuses || [];

  if (planFilter === 'completed' && execs.includes('COMPLETED')) {
    return { label: t('targetPlan.completed', 'Completed'), color: '#10B981', icon: 'check_circle' };
  }
  if (planFilter === 'in_progress' && execs.includes('IN_PROGRESS')) {
    return { label: t('targetPlan.inProgress', 'In Progress'), color: 'var(--el-plan-progress-bar)', icon: 'play_circle' };
  }

  if (execs.includes('IN_PROGRESS')) {
    return { label: t('targetPlan.inProgress', 'In Progress'), color: 'var(--el-plan-progress-bar)', icon: 'play_circle' };
  }
  if (execs.includes('COMPLETED')) {
    return { label: t('targetPlan.completed', 'Completed'), color: '#10B981', icon: 'check_circle' };
  }
  if (plan.userPlanStatus === 'SAVED') {
    return { label: t('targetPlan.saved', 'Saved'), color: 'var(--el-plan-progress-bar)', icon: 'bookmark' };
  }
  return { label: t('targetPlan.planned', 'Planned'), color: 'var(--el-plan-progress-bar)', icon: 'auto_awesome' };
}

function PlanItemCard({
  plan,
  planFilter,
  onClick,
}: {
  plan: Plan;
  planFilter: PlanFilter;
  onClick: () => void;
}) {
  const { t } = useTranslation();

  const templateCount = (plan.taskTemplates?.length ?? 0) + (plan.eventTemplates?.length ?? 0);
  const statusInfo = getPlanStatusInfo(plan, planFilter, t);
  const isCourse = plan.archetype === 'skill_learning';

  return (
    <div
      className="flex cursor-pointer items-center gap-3 rounded-(--radius-card) bg-(--el-plan-bg) px-5 py-4 shadow-(--shadow-card) transition-shadow hover:shadow-(--shadow-card-hover)"
      onClick={onClick}
      data-testid={`plan-card-${plan.id}`}
    >
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="flex-1 text-base font-semibold text-(--el-plan-title)">{plan.name}</span>
          <div className="flex shrink-0 items-center gap-1.5">
            {isCourse && (
              <StatusBadge
                label={t('targetPlan.course', 'Course')}
                color="var(--el-plan-progress-bar)"
                icon="school"
              />
            )}
            <StatusBadge label={statusInfo.label} color={statusInfo.color} icon={statusInfo.icon} />
          </div>
        </div>

        {plan.description && (
          <div
            className="line-clamp-1 text-[13px] text-(--el-plan-description) [&_*]:inline [&_br]:hidden [&_li]:before:content-['·_']"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(plan.description) }}
          />
        )}

        <span className="text-xs text-(--el-plan-description)">
          {templateCount} {templateCount === 1 ? t('targetPlan.template', 'template') : t('targetPlan.templates', 'templates')}
        </span>
      </div>

      <Icon name="chevron_right" size={22} color="var(--el-plan-chevron)" />
    </div>
  );
}
