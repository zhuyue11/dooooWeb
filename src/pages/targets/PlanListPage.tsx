import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePlans, usePlanExecutions } from '@/hooks/usePlans';
import { useAuth } from '@/lib/contexts/auth-context';
import { Icon } from '@/components/ui/Icon';
import { PlanCard } from '@/components/targets/PlanCard';
import type { Plan, PlanFilter, PlanListItem } from '@/types/target';

const PLAN_FILTERS: PlanFilter[] = ['all', 'in_progress', 'planned', 'saved', 'completed', 'discovery'];

const FILTER_LABELS: Record<PlanFilter, string> = {
  all: 'targetPlan.filterAll',
  in_progress: 'targetPlan.inProgress',
  planned: 'targetPlan.planned',
  saved: 'targetPlan.saved',
  completed: 'targetPlan.completed',
  discovery: 'targetPlan.discovery',
};

export function PlanListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: plans = [], isLoading: plansLoading } = usePlans();
  const { data: executions = [], isLoading: executionsLoading } = usePlanExecutions();
  const isLoading = plansLoading || executionsLoading;

  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');

  const planById = useMemo(() => {
    const map = new Map<string, Plan>();
    for (const p of plans) map.set(p.id, p);
    return map;
  }, [plans]);

  const filteredPlanItems = useMemo((): PlanListItem[] => {
    switch (planFilter) {
      case 'all': {
        const inProgressItems: PlanListItem[] = executions
          .filter((e) => e.status === 'IN_PROGRESS')
          .map((e) => ({ kind: 'execution', data: e }));
        const plannedItems: PlanListItem[] = plans
          .filter((p) => p.userId === user?.id && (!p.userPlanStatus || p.userPlanStatus === 'SAVED'))
          .map((p) => ({ kind: 'plan', data: p }));
        const savedItems: PlanListItem[] = plans
          .filter((p) => p.userId !== user?.id && p.userPlanStatus === 'SAVED')
          .map((p) => ({ kind: 'plan', data: p }));
        const completedItems: PlanListItem[] = executions
          .filter((e) => e.status === 'COMPLETED')
          .map((e) => ({ kind: 'execution', data: e }));
        return [...inProgressItems, ...plannedItems, ...savedItems, ...completedItems];
      }
      case 'in_progress':
        return executions
          .filter((e) => e.status === 'IN_PROGRESS')
          .map((e) => ({ kind: 'execution', data: e }));
      case 'planned':
        return plans
          .filter((p) => p.userId === user?.id && (!p.userPlanStatus || p.userPlanStatus === 'SAVED'))
          .map((p) => ({ kind: 'plan', data: p }));
      case 'saved':
        return plans
          .filter((p) => p.userId !== user?.id && p.userPlanStatus === 'SAVED')
          .map((p) => ({ kind: 'plan', data: p }));
      case 'completed':
        return executions
          .filter((e) => e.status === 'COMPLETED')
          .map((e) => ({ kind: 'execution', data: e }));
      case 'discovery':
        return [];
      default:
        return [];
    }
  }, [plans, executions, planFilter, user?.id]);

  return (
    <div className="flex h-full flex-col gap-5" data-testid="plan-list-page" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">{t('targetPlan.plans')}</h1>
          {!isLoading && filteredPlanItems.length > 0 && (
            <span className="text-sm text-muted-foreground">{filteredPlanItems.length}</span>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {PLAN_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              data-testid={`plan-filter-${f}`}
              onClick={() => setPlanFilter(f)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                planFilter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border text-foreground hover:bg-muted'
              }`}
            >
              {t(FILTER_LABELS[f])}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          {t('common.loading')}
        </div>
      ) : filteredPlanItems.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20" data-testid="plan-list-empty">
          <Icon name="assignment" size={48} color="var(--color-muted-foreground)" />
          <span className="text-base font-medium text-foreground">
            {t('targetPlan.noPlans')}
          </span>
          <span className="text-sm text-muted-foreground">
            {planFilter === 'all' || planFilter === 'discovery'
              ? t('targetPlan.noPlansDesc')
              : t('targetPlan.noPlansFilterDesc', 'No plans match this filter')}
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filteredPlanItems.map((item) => (
            <PlanCard
              key={item.kind === 'execution' ? `exec-${item.data.id}` : `plan-${item.data.id}`}
              item={item}
              planFilter={planFilter}
              planById={planById}
              onClick={() => {
                if (item.kind === 'execution') {
                  navigate(`/plans/${item.data.planId}?executionId=${item.data.id}`);
                } else {
                  navigate(`/plans/${item.data.id}`);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* AI FAB */}
      <button
        type="button"
        onClick={() => navigate('/ai-chat')}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface shadow-lg transition-shadow hover:shadow-xl"
        data-testid="ai-fab"
      >
        <Icon name="auto_awesome" size={28} color="var(--color-primary)" />
      </button>
    </div>
  );
}
