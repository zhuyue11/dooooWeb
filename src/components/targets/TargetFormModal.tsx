import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import type { TargetStatus } from '@/types/target';

export interface TargetFormData {
  name: string;
  description?: string;
  status?: TargetStatus;
}

interface TargetFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TargetFormData) => Promise<void>;
  initialData?: { name: string; description?: string; status?: TargetStatus };
  mode: 'create' | 'edit';
}

const STATUS_OPTIONS: { value: TargetStatus; icon: string; colorVar: string }[] = [
  { value: 'active', icon: 'flag', colorVar: 'var(--el-target-status-active-text)' },
  { value: 'completed', icon: 'check_circle', colorVar: '#10B981' },
  { value: 'archived', icon: 'archive', colorVar: 'var(--el-target-status-archived-text)' },
];

export function TargetFormModal({ open, onClose, onSubmit, initialData, mode }: TargetFormModalProps) {
  const { t } = useTranslation();
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TargetStatus>('active');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name);
        setDescription(initialData.description || '');
        setStatus(initialData.status || 'active');
      } else {
        setName('');
        setDescription('');
        setStatus('active');
      }
      setError('');
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [open, initialData]);

  if (!open) return null;

  const canSubmit = name.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        status,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('targetPlan.failedToSave'));
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel: Record<TargetStatus, string> = {
    active: t('targetPlan.statusActive'),
    completed: t('targetPlan.statusCompleted'),
    archived: t('targetPlan.statusArchived'),
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-(--el-modal-overlay)" onClick={onClose}>
      <div
        className="mx-6 w-full max-w-md rounded-(--radius-modal) bg-(--el-modal-bg) p-(--spacing-card) shadow-(--shadow-modal)"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-(--el-modal-title-text)">
            {mode === 'create' ? t('targetPlan.createTarget') : t('targetPlan.editTarget')}
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-(--el-popover-item-hover)">
            <Icon name="close" size={20} color="var(--el-modal-title-text)" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-(--radius-card) bg-(--el-btn-destructive-bg)/10 px-3 py-2.5">
            <Icon name="error_outline" size={18} color="var(--el-editor-error)" />
            <span className="text-sm text-(--el-editor-error)">{error}</span>
          </div>
        )}

        {/* Name field */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-(--el-editor-field-value)">
            {t('targetPlan.targetName')} <span className="text-(--el-editor-error)">*</span>
          </label>
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('targetPlan.targetNamePlaceholder')}
            maxLength={100}
            className="w-full rounded-(--radius-input) border border-(--el-input-border) bg-(--el-input-bg) px-(--spacing-input-x) py-(--spacing-input-y).5 text-sm text-(--el-input-text) placeholder:text-(--el-input-placeholder) focus:border-(--el-input-focus) focus:outline-none"
          />
          <div className="mt-1 text-right text-xs text-(--el-editor-field-label)">{name.length}/100</div>
        </div>

        {/* Description field */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-(--el-editor-field-value)">
            {t('targetPlan.description')}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('targetPlan.descriptionPlaceholder')}
            maxLength={500}
            rows={3}
            className="w-full resize-none rounded-(--radius-input) border border-(--el-input-border) bg-(--el-input-bg) px-(--spacing-input-x) py-(--spacing-input-y).5 text-sm text-(--el-input-text) placeholder:text-(--el-input-placeholder) focus:border-(--el-input-focus) focus:outline-none"
          />
          <div className="mt-1 text-right text-xs text-(--el-editor-field-label)">{description.length}/500</div>
        </div>

        {/* Status selector (edit mode only) */}
        {mode === 'edit' && (
          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-medium text-(--el-editor-field-value)">
              {t('targetPlan.status')}
            </label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className="flex items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-2 text-sm font-medium transition-colors"
                    style={{
                      borderColor: isSelected ? opt.colorVar : 'var(--el-card-border)',
                      backgroundColor: isSelected ? opt.colorVar + '18' : 'transparent',
                      color: isSelected ? opt.colorVar : 'var(--el-editor-field-label)',
                    }}
                  >
                    <Icon name={opt.icon} size={16} color={isSelected ? opt.colorVar : 'var(--el-editor-field-label)'} />
                    {statusLabel[opt.value]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-(--radius-btn) border border-(--el-btn-outline-border) px-(--spacing-btn-x) py-(--spacing-btn-y) text-sm font-medium text-(--el-btn-outline-text) hover:bg-(--el-btn-outline-hover) disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-(--radius-btn) bg-(--el-btn-primary-bg) px-(--spacing-btn-x) py-(--spacing-btn-y) text-sm font-semibold text-(--el-btn-primary-text) hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : mode === 'create' ? (
              t('targetPlan.create')
            ) : (
              t('targetPlan.save')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
