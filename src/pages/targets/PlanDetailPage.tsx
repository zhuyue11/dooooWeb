import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { useAuth } from '@/lib/contexts/auth-context';
import { usePlan, usePlanTemplates, usePlanExecutionsForPlan } from '@/hooks/usePlans';
import { deletePlan, unsavePlan } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PlanTemplateItem } from '@/components/targets/PlanTemplateItem';
import { PlanExecutionView } from '@/components/targets/PlanExecutionView';
import { PlanTemplateDetailPanel } from '@/components/targets/PlanTemplateDetailPanel';
import { PlanCalendarView } from '@/components/targets/PlanCalendarView';
import { hasUnscheduledTasks } from '@/utils/planScheduler';

const isHtml = (text: string) => /<[^>]+>/.test(text);

export function PlanDetailPage() {
  const { planId } = useParams<{ planId: string }>();
  const [searchParams] = useSearchParams();
  const executionId = searchParams.get('executionId');
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: plan, isLoading: planLoading } = usePlan(planId);
  const { data: templates = [], isLoading: templatesLoading } = usePlanTemplates(planId);
  const { data: executions = [], isLoading: executionsLoading } = usePlanExecutionsForPlan(planId);
  const isLoading = planLoading || templatesLoading || executionsLoading;

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<number | null>(null);
  const [selectedScheduledDate, setSelectedScheduledDate] = useState<Date | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const isOwner = !!plan && !!user && plan.userId === user.id;
  const hasBeenExecuted = executions.length > 0;

  const activeExecution = useMemo(() => {
    if (executionId) {
      return executions.find((e) => e.id === executionId) ?? null;
    }
    const inProgress = executions.filter((e) => e.status === 'IN_PROGRESS');
    return inProgress.length > 0 ? inProgress[inProgress.length - 1] : null;
  }, [executions, executionId]);

  // Simplified scheduled dates: cumulative gapDays from today
  const scheduledDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let cumulativeGap = 0;
    return templates.map((tmpl) => {
      cumulativeGap += tmpl.gapDays;
      const d = new Date(today);
      d.setDate(d.getDate() + cumulativeGap);
      return d;
    });
  }, [templates]);

  // Auto-switch to calendar view when all templates have times set (matching dooooApp)
  useEffect(() => {
    if (templates.length > 0 && !hasUnscheduledTasks(templates)) {
      setViewMode('calendar');
    }
  }, [templates]);

  // Reset scroll position when switching views
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [viewMode]);

  const handleDeletePlan = useCallback(async () => {
    if (!planId) return;
    setIsDeleting(true);
    try {
      await deletePlan(planId);
      await queryClient.invalidateQueries({ queryKey: ['plans'] });
      navigate('/plans');
    } finally {
      setIsDeleting(false);
    }
  }, [planId, queryClient, navigate]);

  const handleRemovePlan = useCallback(async () => {
    if (!planId) return;
    setIsDeleting(true);
    try {
      await unsavePlan(planId);
      await queryClient.invalidateQueries({ queryKey: ['plans'] });
      navigate('/plans');
    } finally {
      setIsDeleting(false);
    }
  }, [planId, queryClient, navigate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Not found state
  if (!plan) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4" style={{ fontFamily: 'Inter, sans-serif' }} data-testid="plan-detail-page">
        <Icon name="assignment" size={48} color="var(--color-muted-foreground)" />
        <span className="text-base font-medium text-foreground">{t('targetPlan.planNotFound')}</span>
        <button
          type="button"
          onClick={() => navigate('/plans')}
          className="text-sm font-medium text-primary hover:underline"
        >
          {t('targetPlan.plans')}
        </button>
      </div>
    );
  }

  // Sanitize HTML description once
  const sanitizedDescription = plan.description && isHtml(plan.description)
    ? DOMPurify.sanitize(plan.description)
    : null;

  return (
    <div className="flex h-full flex-col gap-4" style={{ fontFamily: 'Inter, sans-serif' }} data-testid="plan-detail-page">
      {/* Fixed header area — back, title, description, actions, view toggle */}
      <div className="flex shrink-0 flex-col gap-4">
        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate('/plans')}
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          data-testid="plan-detail-back"
        >
          <Icon name="arrow_back" size={18} />
          {t('targetPlan.plans')}
        </button>

        {/* Header: name + AI badge + actions */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold text-foreground" data-testid="plan-detail-name">
                {plan.name}
              </h1>
              {plan.isAiGenerated && (
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10"
                  data-testid="plan-ai-badge"
                >
                  <Icon name="auto_awesome" size={16} color="var(--color-primary)" />
                </div>
              )}
            </div>

            {plan.description && (
              sanitizedDescription ? (
                <div
                  className="text-[14px] leading-relaxed text-muted-foreground [&_*]:inline [&_br]:hidden [&_li]:before:content-['·_']"
                  dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                />
              ) : (
                <p className="text-[14px] leading-relaxed text-muted-foreground">{plan.description}</p>
              )
            )}
          </div>

          {/* Action buttons — hidden during active execution */}
          {!activeExecution && (
            <div className="flex shrink-0 items-center gap-2">
              {isOwner ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-destructive hover:bg-destructive/10"
                  data-testid="plan-delete-btn"
                >
                  <Icon name="delete" size={16} />
                  {t('common.delete')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowRemoveConfirm(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-destructive hover:bg-destructive/10"
                  data-testid="plan-remove-btn"
                >
                  <Icon name="bookmark_remove" size={16} />
                  {t('common.remove')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* View toggle — only when no active execution and templates exist */}
        {!activeExecution && templates.length > 0 && (
          <div className="flex items-center justify-center gap-1" data-testid="view-toggle">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid="view-toggle-list"
            >
              <Icon
                name="format_list_bulleted"
                size={14}
                color={viewMode === 'list' ? 'var(--color-primary-foreground)' : 'var(--color-muted-foreground)'}
              />
              {t('targetPlan.listView')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid="view-toggle-calendar"
            >
              <Icon
                name="calendar_today"
                size={14}
                color={viewMode === 'calendar' ? 'var(--color-primary-foreground)' : 'var(--color-muted-foreground)'}
              />
              {t('targetPlan.calendarView')}
            </button>
          </div>
        )}
      </div>

      {/* Scrollable content area — only the list/calendar scrolls */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {activeExecution ? (
          <PlanExecutionView execution={activeExecution} />
        ) : viewMode === 'calendar' ? (
          <PlanCalendarView
            templates={templates}
            planArchetype={plan?.archetype}
            onTemplateClick={(index, date) => {
              setSelectedTemplateIndex(index);
              setSelectedScheduledDate(date);
            }}
          />
        ) : templates.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20" data-testid="plan-templates-empty">
            <Icon name="assignment" size={48} color="var(--color-muted-foreground)" />
            <span className="text-base font-medium text-foreground">{t('targetPlan.noTemplates')}</span>
            <span className="text-sm text-muted-foreground">{t('targetPlan.noTemplatesDesc')}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2" data-testid="plan-templates-list">
            {templates.map((template, index) => (
              <PlanTemplateItem
                key={template.id}
                template={template}
                index={index}
                scheduledDate={scheduledDates[index]}
                onClick={() => {
                  setSelectedTemplateIndex(index);
                  setSelectedScheduledDate(null);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Start Plan bottom bar — fixed at bottom, hidden during active execution */}
      {templates.length > 0 && !activeExecution && (
        <div className="flex shrink-0 items-center justify-end bg-background px-4 py-2.5" data-testid="start-plan-bar">
          <button
            type="button"
            onClick={() => navigate(`/plans/${planId}/start`)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            data-testid="start-plan-btn"
          >
            <Icon
              name={hasBeenExecuted ? 'replay' : 'play_arrow'}
              size={16}
              color="var(--color-primary-foreground)"
            />
            {hasBeenExecuted ? t('targetPlan.startPlanAgain') : t('targetPlan.startPlan')}
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title={t('targetPlan.deletePlan')}
        description={t('targetPlan.deletePlanConfirm', { name: plan.name })}
        confirmLabel={t('common.delete')}
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeletePlan}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Remove/Unsave confirmation */}
      <ConfirmDialog
        open={showRemoveConfirm}
        title={t('targetPlan.removePlan')}
        description={t('targetPlan.removePlanConfirm', { name: plan.name })}
        confirmLabel={t('common.remove')}
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleRemovePlan}
        onCancel={() => setShowRemoveConfirm(false)}
      />

      {/* Template detail panel */}
      {selectedTemplateIndex !== null && templates[selectedTemplateIndex] && (
        <PlanTemplateDetailPanel
          template={templates[selectedTemplateIndex]}
          scheduledDate={selectedScheduledDate ?? scheduledDates[selectedTemplateIndex]}
          onClose={() => {
            setSelectedTemplateIndex(null);
            setSelectedScheduledDate(null);
          }}
        />
      )}
    </div>
  );
}
