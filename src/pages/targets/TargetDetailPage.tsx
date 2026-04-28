import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useTarget } from '@/hooks/useTarget';
import { updateTarget, deleteTarget, unlinkPlanFromTarget } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TargetFormModal } from '@/components/targets/TargetFormModal';
import { LinkedPlanCard } from '@/components/targets/LinkedPlanCard';
import type { TargetFormData } from '@/components/targets/TargetFormModal';
import type { TargetStatus } from '@/types/target';

const STATUS_CONFIG: Record<TargetStatus, { icon: string; colorVar: string; labelKey: string }> = {
  active: { icon: 'flag', colorVar: 'var(--el-target-status-active-text)', labelKey: 'targetPlan.statusActive' },
  completed: { icon: 'check_circle', colorVar: '#10B981', labelKey: 'targetPlan.statusCompleted' },
  archived: { icon: 'archive', colorVar: 'var(--el-target-status-archived-text)', labelKey: 'targetPlan.statusArchived' },
};

export function TargetDetailPage() {
  const { targetId } = useParams<{ targetId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: target, isLoading } = useTarget(targetId);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [unlinkingPlan, setUnlinkingPlan] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);

  const handleUpdate = useCallback(
    async (data: TargetFormData) => {
      if (!targetId) return;
      await updateTarget(targetId, { name: data.name, description: data.description, status: data.status });
      await queryClient.invalidateQueries({ queryKey: ['target', targetId] });
      await queryClient.invalidateQueries({ queryKey: ['targets'] });
    },
    [targetId, queryClient],
  );

  const handleDelete = useCallback(async () => {
    if (!targetId) return;
    setIsDeleting(true);
    try {
      await deleteTarget(targetId);
      await queryClient.invalidateQueries({ queryKey: ['targets'] });
      navigate('/targets');
    } finally {
      setIsDeleting(false);
    }
  }, [targetId, queryClient, navigate]);

  const handleUnlinkPlan = useCallback(async () => {
    if (!targetId || !unlinkingPlan) return;
    setIsUnlinking(true);
    try {
      await unlinkPlanFromTarget(targetId, unlinkingPlan.id);
      await queryClient.invalidateQueries({ queryKey: ['target', targetId] });
      setUnlinkingPlan(null);
    } finally {
      setIsUnlinking(false);
    }
  }, [targetId, unlinkingPlan, queryClient]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-(--el-btn-primary-bg) border-t-transparent" />
      </div>
    );
  }

  // Not found state
  if (!target) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4" style={{ fontFamily: 'Inter, sans-serif' }}>
        <Icon name="flag" size={48} color="var(--el-target-description)" />
        <span className="text-base font-medium text-(--el-target-title)">{t('targetPlan.targetNotFound')}</span>
        <button
          type="button"
          onClick={() => navigate('/targets')}
          className="text-sm font-medium text-(--el-target-chevron) hover:underline"
        >
          {t('targetPlan.targets')}
        </button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[target.status];
  const linkedPlans = target.targetPlans || [];
  const linkedTasks = target.targetTasks || [];

  return (
    <div className="flex h-full flex-col gap-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate('/targets')}
        className="flex w-fit items-center gap-1 text-sm text-(--el-target-description) hover:text-(--el-target-title)"
        data-testid="target-detail-back"
      >
        <Icon name="arrow_back" size={18} />
        {t('targetPlan.targets')}
      </button>

      {/* Header: name + status + actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-bold text-(--el-target-title)" data-testid="target-detail-name">
              {target.name}
            </h1>
            <div
              className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold"
              style={{ backgroundColor: statusConfig.colorVar + '18', color: statusConfig.colorVar }}
              data-testid="target-detail-status"
            >
              <Icon name={statusConfig.icon} size={14} color={statusConfig.colorVar} />
              {t(statusConfig.labelKey)}
            </div>
          </div>

          {target.description && (
            <p className="text-[15px] leading-relaxed text-(--el-target-description)">{target.description}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-1.5 rounded-(--radius-card) border border-(--el-view-edit-border) px-3 py-1.5 text-[13px] font-medium text-(--el-view-edit-text) hover:bg-(--el-btn-outline-hover)"
            data-testid="target-detail-edit"
          >
            <Icon name="edit" size={16} />
            {t('common.edit')}
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 rounded-(--radius-card) border border-(--el-view-delete-border) px-3 py-1.5 text-[13px] font-medium text-(--el-view-delete-text) hover:bg-(--el-btn-destructive-bg)/10"
            data-testid="target-detail-delete"
          >
            <Icon name="delete" size={16} />
            {t('common.delete')}
          </button>
        </div>
      </div>

      <div className="border-t border-(--el-card-border)" />

      {/* Linked Tasks Section */}
      <div data-testid="linked-tasks-section">
        <h2 className="mb-3 text-lg font-bold text-(--el-target-title)">{t('targetPlan.linkedTasks')}</h2>

        {linkedTasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-(--radius-card) border border-dashed border-(--el-card-border) py-10" data-testid="linked-tasks-empty">
            <Icon name="task_alt" size={40} color="var(--el-target-description)" />
            <span className="text-[15px] text-(--el-target-description)">{t('targetPlan.noLinkedTasks')}</span>
            <span className="text-[13px] text-(--el-target-description)">{t('targetPlan.linkTaskHint')}</span>
          </div>
        ) : (
          <div
            className="flex items-center gap-3 rounded-(--radius-card) border border-(--el-card-border) bg-(--el-target-bg) px-4 py-3.5"
            data-testid="linked-tasks-count"
          >
            <Icon name="task_alt" size={24} color="var(--el-target-chevron)" />
            <span className="text-[15px] font-medium text-(--el-target-title)">
              {linkedTasks.length} {t('targetPlan.linkedTasksCount')}
            </span>
          </div>
        )}
      </div>

      {/* Plans Section */}
      <div data-testid="plans-section">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-(--el-target-title)">{t('targetPlan.plans')}</h2>
          <button
            type="button"
            onClick={() => navigate(`/ai-chat?targetId=${targetId}&targetName=${encodeURIComponent(target.name)}`)}
            className="flex items-center gap-1.5 rounded-full bg-(--el-target-status-active-bg) px-3 py-1.5 text-[13px] font-semibold text-(--el-target-status-active-text) hover:bg-(--el-target-status-active-bg)"
            data-testid="generate-plan-button"
          >
            <Icon name="auto_awesome" size={16} color="var(--el-target-chevron)" />
            {t('targetPlan.generatePlan')}
          </button>
        </div>

        {linkedPlans.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-(--radius-card) border border-dashed border-(--el-card-border) py-10" data-testid="plans-empty">
            <Icon name="assignment" size={40} color="var(--el-target-description)" />
            <span className="text-[15px] text-(--el-target-description)">{t('targetPlan.noLinkedPlans')}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {linkedPlans.map((lp) => (
              <LinkedPlanCard
                key={lp.id}
                targetPlan={lp}
                onNavigate={(planId) => navigate(`/plans/${planId}?targetName=${encodeURIComponent(target.name)}`)}
                onUnlink={(planId, planName) => setUnlinkingPlan({ id: planId, name: planName })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      <TargetFormModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleUpdate}
        initialData={{ name: target.name, description: target.description, status: target.status }}
        mode="edit"
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title={t('targetPlan.deleteTarget')}
        description={t('targetPlan.deleteTargetConfirm', { name: target.name })}
        confirmLabel={t('common.delete')}
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Unlink plan confirmation */}
      <ConfirmDialog
        open={!!unlinkingPlan}
        title={t('targetPlan.unlinkPlan')}
        description={t('targetPlan.unlinkPlanConfirm', { name: unlinkingPlan?.name ?? '' })}
        confirmLabel={t('targetPlan.unlink')}
        variant="destructive"
        isLoading={isUnlinking}
        onConfirm={handleUnlinkPlan}
        onCancel={() => setUnlinkingPlan(null)}
      />
    </div>
  );
}
