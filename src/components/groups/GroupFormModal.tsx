import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';

const COLOR_PRESETS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#6366F1', // indigo
];

export interface GroupFormData {
  name: string;
  description?: string;
  color?: string;
}

interface GroupFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: GroupFormData) => Promise<void>;
  initialData?: { name: string; description?: string; color?: string };
  mode: 'create' | 'edit';
}

export function GroupFormModal({ open, onClose, onSubmit, initialData, mode }: GroupFormModalProps) {
  const { t } = useTranslation();
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name);
        setDescription(initialData.description || '');
        setColor(initialData.color || COLOR_PRESETS[0]);
      } else {
        setName('');
        setDescription('');
        setColor(COLOR_PRESETS[0]);
      }
      setError('');
      setTimeout(() => nameRef.current?.focus(), 100);
    }
  }, [open, initialData]);

  if (!open) return null;

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('groups.groupNameRequired'));
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onSubmit({
        name: trimmed,
        description: description.trim() || undefined,
        color,
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('groups.failedToSaveGroup');
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const isCreate = mode === 'create';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-(--el-modal-overlay)"
      onClick={onClose}
    >
      <div
        className="mx-6 w-full max-w-md rounded-(--radius-modal) bg-(--el-modal-bg) p-(--spacing-card) shadow-(--shadow-modal)"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <h2 className="text-lg font-semibold text-(--el-modal-title-text)">
          {isCreate ? t('groups.createGroup') : t('groups.editGroup')}
        </h2>
        {isCreate && (
          <p className="mt-1 text-[13px] text-(--el-group-description)">{t('groups.ownerInfo')}</p>
        )}

        {/* Form */}
        <div className="mt-5 flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-(--el-input-label)">
              {t('groups.groupNameLabel')}
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => {
                if (e.target.value.length <= 100) setName(e.target.value);
              }}
              placeholder={t('groups.groupNamePlaceholder')}
              className="rounded-(--radius-input) border border-(--el-input-border) bg-transparent px-(--spacing-input-x) py-(--spacing-input-y) text-sm text-(--el-input-text) placeholder:text-(--el-input-placeholder) focus:border-(--el-input-focus) focus:outline-none"
            />
            <span className="text-right text-xs text-(--el-group-description)">{name.length}/100</span>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-(--el-input-label)">
              {t('groups.descriptionLabel')}
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                if (e.target.value.length <= 500) setDescription(e.target.value);
              }}
              placeholder={t('groups.descriptionPlaceholder')}
              rows={3}
              className="resize-none rounded-(--radius-input) border border-(--el-input-border) bg-transparent px-(--spacing-input-x) py-(--spacing-input-y) text-sm text-(--el-input-text) placeholder:text-(--el-input-placeholder) focus:border-(--el-input-focus) focus:outline-none"
            />
            <span className="text-right text-xs text-(--el-group-description)">
              {description.length}/500
            </span>
          </div>

          {/* Color */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-(--el-input-label)">
              {t('groups.colorLabel')}
            </label>
            <div className="flex gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-110"
                  style={{ backgroundColor: c }}
                >
                  {color === c && (
                    <Icon name="check" size={16} color="#ffffff" weight={600} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-(--radius-card) bg-(--el-editor-error)/10 px-3 py-2">
            <Icon name="error" size={16} color="var(--el-editor-error)" />
            <span className="text-sm text-(--el-editor-error)">{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-(--radius-btn) border border-(--el-modal-cancel-border) px-(--spacing-btn-x) py-(--spacing-btn-y) text-sm font-medium text-(--el-modal-cancel-text) hover:bg-(--el-popover-item-hover) disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim() || submitting}
            className="rounded-(--radius-btn) bg-(--el-btn-primary-bg) px-(--spacing-btn-x) py-(--spacing-btn-y) text-sm font-medium text-(--el-btn-primary-text) hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : isCreate ? (
              t('groups.create')
            ) : (
              t('groups.save')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
