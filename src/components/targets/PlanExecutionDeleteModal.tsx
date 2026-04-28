import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { getPlanExecutionStatus } from '@/lib/api';

interface PlanExecutionDeleteModalProps {
  open: boolean;
  onClose: () => void;
  planId: string;
  executionId: string;
  planName: string;
  onConfirm: () => void;
}

export function PlanExecutionDeleteModal({
  open,
  onClose,
  planId,
  executionId,
  planName,
  onConfirm,
}: PlanExecutionDeleteModalProps) {
  const { t } = useTranslation();
  const [executionStatus, setExecutionStatus] = useState<'IN_PROGRESS' | 'COMPLETED' | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !planId || !executionId) {
      setExecutionStatus(undefined);
      return;
    }
    setLoading(true);
    getPlanExecutionStatus(planId, executionId)
      .then((exec) => setExecutionStatus(exec.status))
      .catch(() => setExecutionStatus(undefined))
      .finally(() => setLoading(false));
  }, [open, planId, executionId]);

  if (!open) return null;

  const isCompleted = executionStatus === 'COMPLETED';

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30"
      onClick={onClose}
      data-testid="plan-execution-delete-modal"
    >
      <div
        className="mx-6 w-full max-w-sm rounded-(--radius-modal) bg-surface p-(--spacing-card) shadow-(--shadow-modal) animate-modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* Icon badge */}
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Icon
                name={isCompleted ? 'delete_outline' : 'stop_circle'}
                size={26}
                color="var(--color-primary)"
              />
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-foreground" data-testid="execution-delete-title">
              {isCompleted
                ? t('tasks.planExecutionDeleteTitle', 'Clear Plan Data')
                : t('tasks.planTaskDeleteTitle', 'Stop Plan')}
            </h3>

            {/* Message */}
            <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
              {isCompleted
                ? t('tasks.planExecutionDeleteMessage', 'This task belongs to the completed plan "{{planName}}". Would you like to clear all tasks and events from this plan?', { planName })
                : t('tasks.planTaskDeleteMessage', 'This task belongs to the active plan "{{planName}}" and can\'t be deleted individually. Would you like to stop the plan? All tasks and events will be removed.', { planName })}
            </p>

            {/* Confirm button */}
            <button
              type="button"
              onClick={onConfirm}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-(--radius-btn) bg-destructive py-3 text-[15px] font-semibold text-destructive-foreground transition-opacity hover:opacity-90"
              data-testid="execution-delete-confirm"
            >
              <Icon
                name={isCompleted ? 'delete_outline' : 'stop_circle'}
                size={18}
                color="currentColor"
              />
              {isCompleted
                ? t('tasks.clearPlanData', 'Clear Plan Data')
                : t('tasks.deleteAllPlanTasks', 'Stop Plan')}
            </button>

            {/* Cancel button */}
            <button
              type="button"
              onClick={onClose}
              className="mt-2 w-full py-2.5 text-[15px] font-medium text-muted-foreground transition-opacity hover:opacity-70"
              data-testid="execution-delete-cancel"
            >
              {t('common.cancel')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
