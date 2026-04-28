import { useTranslation } from 'react-i18next';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'destructive',
  isLoading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  if (!open) return null;

  const confirmClass =
    variant === 'destructive'
      ? 'bg-(--el-dialog-confirm-bg) text-(--el-dialog-confirm-text) hover:opacity-90'
      : 'bg-(--el-btn-primary-bg) text-(--el-btn-primary-text) hover:opacity-90';

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-(--el-dialog-overlay)"
      onClick={onCancel}
    >
      <div
        className="mx-6 w-full max-w-sm rounded-(--radius-modal) bg-(--el-dialog-bg) p-(--spacing-card) shadow-(--shadow-modal)"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-(--el-dialog-title)">{title}</h3>
        <p className="mt-2 text-sm text-(--el-dialog-description)">{description}</p>
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-(--radius-btn) border border-(--el-dialog-cancel-border) px-(--spacing-btn-x) py-(--spacing-btn-y) text-sm font-medium text-(--el-dialog-cancel-text) hover:opacity-80 disabled:opacity-50 transition-all duration-(--transition-duration)"
          >
            {cancelLabel || t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`rounded-(--radius-btn) px-(--spacing-btn-x) py-(--spacing-btn-y) text-sm font-semibold disabled:opacity-50 transition-all duration-(--transition-duration) active:scale-(--active-scale) ${confirmClass}`}
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
