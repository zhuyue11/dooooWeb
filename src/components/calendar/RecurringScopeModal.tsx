import { useTranslation } from 'react-i18next';

interface Props {
  open: boolean;
  mode: 'edit' | 'delete';
  pending?: boolean;
  onThis: () => void;
  onAllFuture: () => void;
  onAll: () => void;
  onClose: () => void;
}

/**
 * Modal asking the user to choose a scope when editing or deleting a single
 * occurrence of a recurring task or event:
 *
 *   - This occurrence
 *   - This and all future occurrences
 *   - All occurrences
 *
 * i18n keys live under `calendar.recurringOptions.*` (the same block both
 * dooooWeb and dooooApp share — see `src/locales/<lang>/translation.json`).
 * Visual style mirrors the inline delete-confirm overlay in `ItemSidePanel.tsx`.
 * The same modal is used for both tasks and events; the parent decides which
 * mutation each button calls.
 */
export function RecurringScopeModal({
  open,
  mode,
  pending = false,
  onThis,
  onAllFuture,
  onAll,
  onClose,
}: Props) {
  const { t } = useTranslation();

  if (!open) return null;

  const isEdit = mode === 'edit';
  const buttonClassPrimary =
    'w-full rounded-lg bg-primary px-4 py-3 text-left text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50';
  const buttonClassNeutral =
    'w-full rounded-lg border border-border px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50';
  const destructiveClass =
    'w-full rounded-lg bg-destructive px-4 py-3 text-left text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50';

  // For delete, the destructive style applies to all three buttons since each is
  // a destructive action. For edit, primary style is used.
  const baseClass = isEdit ? buttonClassPrimary : destructiveClass;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
      onClick={onClose}
      data-testid="recurring-scope-modal"
    >
      <div
        className="mx-6 w-full max-w-sm rounded-xl bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className={baseClass}
            onClick={onThis}
            disabled={pending}
            data-testid="scope-this"
          >
            {t(isEdit ? 'calendar.recurringOptions.editThisOccurrence' : 'calendar.recurringOptions.deleteThisOccurrence')}
          </button>
          <button
            type="button"
            className={buttonClassNeutral}
            onClick={onAllFuture}
            disabled={pending}
            data-testid="scope-future"
          >
            {t(isEdit ? 'calendar.recurringOptions.editAllFuture' : 'calendar.recurringOptions.deleteAllFuture')}
          </button>
          <button
            type="button"
            className={buttonClassNeutral}
            onClick={onAll}
            disabled={pending}
            data-testid="scope-all"
          >
            {t(isEdit ? 'calendar.recurringOptions.editAllOccurrences' : 'calendar.recurringOptions.deleteAllOccurrences')}
          </button>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
            data-testid="scope-cancel"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
