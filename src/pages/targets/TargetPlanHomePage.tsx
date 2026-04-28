import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useTargets } from '@/hooks/useTargets';
import { createTarget, updateTarget, deleteTarget } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TargetCard } from '@/components/targets/TargetCard';
import { TargetFormModal } from '@/components/targets/TargetFormModal';
import type { TargetFormData } from '@/components/targets/TargetFormModal';
import type { Target, TargetStatus } from '@/types/target';

export function TargetPlanHomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: targets = [], isLoading } = useTargets();

  const [statusFilter, setStatusFilter] = useState<TargetStatus>('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTarget, setEditingTarget] = useState<Target | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Target | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredTargets = useMemo(() => {
    return [...targets]
      .filter((t) => t.status === statusFilter)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [targets, statusFilter]);

  const handleCreateTarget = useCallback(
    async (data: TargetFormData) => {
      await createTarget({ name: data.name, description: data.description });
      await queryClient.invalidateQueries({ queryKey: ['targets'] });
    },
    [queryClient],
  );

  const handleUpdateTarget = useCallback(
    async (data: TargetFormData) => {
      if (!editingTarget) return;
      await updateTarget(editingTarget.id, {
        name: data.name,
        description: data.description,
        status: data.status,
      });
      await queryClient.invalidateQueries({ queryKey: ['targets'] });
    },
    [editingTarget, queryClient],
  );

  const handleDeleteTarget = useCallback(async () => {
    if (!showDeleteConfirm) return;
    setIsDeleting(true);
    try {
      await deleteTarget(showDeleteConfirm.id);
      await queryClient.invalidateQueries({ queryKey: ['targets'] });
      setShowDeleteConfirm(null);
    } finally {
      setIsDeleting(false);
    }
  }, [showDeleteConfirm, queryClient]);

  const isModalOpen = showCreateModal || !!editingTarget;

  const STATUS_FILTERS: { value: TargetStatus; label: string }[] = [
    { value: 'active', label: t('targetPlan.statusActive') },
    { value: 'completed', label: t('targetPlan.statusCompleted') },
    { value: 'archived', label: t('targetPlan.statusArchived') },
  ];

  return (
    <div className="flex h-full flex-col gap-5" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">{t('targetPlan.targets')}</h1>
          {!isLoading && filteredTargets.length > 0 && (
            <span className="text-sm text-muted-foreground">{filteredTargets.length}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                statusFilter === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border text-foreground hover:bg-muted'
              }`}
            >
              {f.label}
            </button>
          ))}

          <button
            type="button"
            data-testid="create-target-button"
            onClick={() => {
              setEditingTarget(null);
              setShowCreateModal(true);
            }}
            className="ml-2 flex items-center gap-1.5 rounded-(--radius-btn) bg-primary px-(--spacing-btn-x) py-(--spacing-btn-y) text-[13px] font-semibold text-primary-foreground hover:opacity-90"
          >
            <Icon name="add" size={16} color="var(--color-primary-foreground)" />
            {t('targetPlan.createTarget')}
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          {t('common.loading')}
        </div>
      ) : filteredTargets.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20">
          <Icon name="flag" size={48} color="var(--color-muted-foreground)" />
          <span className="text-base font-medium text-foreground">{t('targetPlan.noTargets')}</span>
          <span className="text-sm text-muted-foreground">{t('targetPlan.noTargetsDesc')}</span>
          <button
            type="button"
            onClick={() => {
              setEditingTarget(null);
              setShowCreateModal(true);
            }}
            className="mt-2 rounded-(--radius-btn) bg-primary px-(--spacing-btn-x) py-(--spacing-btn-y) text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {t('targetPlan.createTarget')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filteredTargets.map((target) => (
            <TargetCard
              key={target.id}
              target={target}
              onClick={() => navigate(`/targets/${target.id}`)}
            />
          ))}
        </div>
      )}

      {/* AI FAB */}
      <button
        type="button"
        onClick={() => navigate('/ai-chat')}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface shadow-(--shadow-elevated) transition-shadow hover:shadow-(--shadow-elevated)"
        data-testid="ai-fab"
      >
        <Icon name="auto_awesome" size={28} color="var(--color-primary)" />
      </button>

      {/* Target form modal */}
      <TargetFormModal
        open={isModalOpen}
        onClose={() => {
          setShowCreateModal(false);
          setEditingTarget(null);
        }}
        onSubmit={editingTarget ? handleUpdateTarget : handleCreateTarget}
        initialData={
          editingTarget
            ? { name: editingTarget.name, description: editingTarget.description, status: editingTarget.status }
            : undefined
        }
        mode={editingTarget ? 'edit' : 'create'}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!showDeleteConfirm}
        title={t('targetPlan.deleteTarget')}
        description={t('targetPlan.deleteTargetConfirm', { name: showDeleteConfirm?.name })}
        confirmLabel={t('common.delete')}
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteTarget}
        onCancel={() => setShowDeleteConfirm(null)}
      />
    </div>
  );
}
